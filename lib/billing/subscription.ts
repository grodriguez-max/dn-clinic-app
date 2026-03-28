import { createServiceClient } from "@/lib/supabase/server"
import { PLANS, type PlanId } from "./stripe"

export interface Subscription {
  id: string
  clinic_id: string
  plan: PlanId
  status: "trial" | "active" | "past_due" | "cancelled" | "paused"
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  monthly_action_cap: number | null
}

// ─── Get subscription (creates trial if none exists) ─────────────────────────
export async function getSubscription(clinicId: string): Promise<Subscription | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("clinic_id", clinicId)
    .single()

  if (error || !data) return null
  return data as Subscription
}

// ─── Create trial subscription for a new clinic ──────────────────────────────
export async function createTrialSubscription(clinicId: string): Promise<void> {
  const supabase = createServiceClient()
  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  await supabase.from("subscriptions").upsert({
    clinic_id: clinicId,
    plan: "trial",
    status: "trial",
    trial_ends_at: trialEndsAt.toISOString(),
    monthly_action_cap: null,
  }, { onConflict: "clinic_id" })
}

// ─── Track billable action ────────────────────────────────────────────────────
export async function trackBillableAction(
  clinicId: string,
  actionType: string,
  referenceId?: string,
  description?: string
): Promise<void> {
  try {
    const supabase = createServiceClient()

    // Get current subscription
    const sub = await getSubscription(clinicId)
    if (!sub || sub.status === "cancelled") return

    // Get action price
    const { data: pricing } = await supabase
      .from("action_pricing")
      .select("unit_price")
      .eq("action_type", actionType)
      .eq("is_active", true)
      .single()

    if (!pricing) return

    // Check monthly cap
    if (sub.monthly_action_cap !== null && sub.monthly_action_cap > 0) {
      const { data: usageData } = await supabase
        .from("billable_actions")
        .select("unit_price")
        .eq("clinic_id", clinicId)
        .eq("billed", false)

      const currentUsage = (usageData ?? []).reduce((sum, a) => sum + Number(a.unit_price), 0)
      if (currentUsage >= sub.monthly_action_cap) return
    }

    // Get billing period
    const now = new Date()
    const periodStart = sub.current_period_start
      ? new Date(sub.current_period_start).toISOString().slice(0, 10)
      : new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
    const periodEnd = sub.current_period_end
      ? new Date(sub.current_period_end).toISOString().slice(0, 10)
      : new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

    await supabase.from("billable_actions").insert({
      clinic_id: clinicId,
      action_type: actionType,
      unit_price: pricing.unit_price,
      reference_id: referenceId ?? null,
      description: description ?? null,
      billed: false,
      billing_period_start: periodStart,
      billing_period_end: periodEnd,
    })
  } catch {
    // Never let billing tracking crash the main flow
  }
}

// ─── Get current month usage ──────────────────────────────────────────────────
export async function getCurrentMonthUsage(clinicId: string): Promise<{
  total: number
  byType: Record<string, { count: number; amount: number }>
}> {
  const supabase = createServiceClient()
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

  const { data } = await supabase
    .from("billable_actions")
    .select("action_type, unit_price")
    .eq("clinic_id", clinicId)
    .eq("billed", false)
    .gte("created_at", periodStart)

  const byType: Record<string, { count: number; amount: number }> = {}
  let total = 0

  for (const row of (data ?? [])) {
    const key = row.action_type
    if (!byType[key]) byType[key] = { count: 0, amount: 0 }
    byType[key].count++
    byType[key].amount += Number(row.unit_price)
    total += Number(row.unit_price)
  }

  return { total, byType }
}

// ─── Check if feature is allowed by plan ─────────────────────────────────────
export function planAllows(
  plan: PlanId,
  feature: "marketing_agent" | "export_metrics" | "api_access" | "custom_domain"
): boolean {
  switch (feature) {
    case "marketing_agent":
      return plan !== "starter" // growth, premium, trial all include marketing
    case "export_metrics":
      return plan !== "starter"
    case "api_access":
      return plan === "premium"
    case "custom_domain":
      return plan === "premium"
    default:
      return true
  }
}

// ─── Check patient limit ──────────────────────────────────────────────────────
export async function checkPatientLimit(clinicId: string): Promise<{
  allowed: boolean
  current: number
  max: number | null
}> {
  const supabase = createServiceClient()
  const sub = await getSubscription(clinicId)
  const plan = (sub?.plan ?? "trial") as PlanId
  const max = PLANS[plan]?.maxPatients ?? null

  if (max === null) return { allowed: true, current: 0, max: null }

  const { count } = await supabase
    .from("patients")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)

  return { allowed: (count ?? 0) < max, current: count ?? 0, max }
}

// ─── Generate platform invoice for a clinic ───────────────────────────────────
export async function generateMonthlyInvoice(clinicId: string): Promise<void> {
  const supabase = createServiceClient()
  const sub = await getSubscription(clinicId)
  if (!sub || sub.status === "cancelled" || sub.plan === "trial") return

  const planConfig = PLANS[sub.plan]
  const now = new Date()

  // Get unbilled actions this period
  const { data: actions } = await supabase
    .from("billable_actions")
    .select("action_type, unit_price")
    .eq("clinic_id", clinicId)
    .eq("billed", false)

  if (!actions?.length && planConfig.basePrice === 0) return

  // Aggregate by type
  const byType: Record<string, { count: number; unit: number; total: number }> = {}
  let actionsTotal = 0

  for (const a of (actions ?? [])) {
    const key = a.action_type
    if (!byType[key]) byType[key] = { count: 0, unit: Number(a.unit_price), total: 0 }
    byType[key].count++
    byType[key].total += Number(a.unit_price)
    actionsTotal += Number(a.unit_price)
  }

  // Apply cap
  let capApplied = false
  if (planConfig.actionCap !== null && actionsTotal > planConfig.actionCap) {
    actionsTotal = planConfig.actionCap
    capApplied = true
  }

  const baseAmount = planConfig.basePrice
  const total = baseAmount + actionsTotal

  // Invoice number: INV-YYYYMM-XXXXX
  const { count: invCount } = await supabase
    .from("platform_invoices")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)

  const invoiceNumber = `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String((invCount ?? 0) + 1).padStart(5, "0")}`

  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)

  // Insert invoice
  const { data: invoice } = await supabase.from("platform_invoices").insert({
    clinic_id: clinicId,
    subscription_id: sub.id,
    invoice_number: invoiceNumber,
    period_start: periodStart,
    period_end: periodEnd,
    base_amount: baseAmount,
    actions_amount: actionsTotal,
    actions_detail: byType,
    cap_applied: capApplied,
    total,
    status: "pending",
  }).select("id").single()

  if (!invoice) return

  // Mark actions as billed
  await supabase
    .from("billable_actions")
    .update({ billed: true })
    .eq("clinic_id", clinicId)
    .eq("billed", false)
}
