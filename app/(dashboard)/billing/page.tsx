import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PLANS, trialDaysLeft } from "@/lib/billing/stripe"
import { BillingClient } from "./billing-client"

export default async function BillingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  // Use regular client first (respects RLS) then fall back to service for privileged ops
  const { data: member } = await supabase
    .from("users")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single()

  if (!member?.clinic_id) redirect("/dashboard")

  const serviceClient = createServiceClient()

  // Fetch all data independently — silently handle missing tables (migration not yet applied)
  const [subRes, usageRes, invoicesRes] = await Promise.allSettled([
    serviceClient
      .from("subscriptions")
      .select("*")
      .eq("clinic_id", member.clinic_id)
      .single(),
    serviceClient
      .from("billable_actions")
      .select("action_type, amount_usd")
      .eq("clinic_id", member.clinic_id)
      .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    serviceClient
      .from("platform_invoices")
      .select("*")
      .eq("clinic_id", member.clinic_id)
      .order("created_at", { ascending: false })
      .limit(12),
  ])

  const sub = subRes.status === "fulfilled" && subRes.value.data ? subRes.value.data : null

  // Build usage from raw billable_actions rows
  const actionRows = usageRes.status === "fulfilled" && usageRes.value.data ? usageRes.value.data : []
  const byType: Record<string, { count: number; amount: number }> = {}
  for (const row of actionRows) {
    if (!byType[row.action_type]) byType[row.action_type] = { count: 0, amount: 0 }
    byType[row.action_type].count++
    byType[row.action_type].amount += Number(row.amount_usd ?? 0)
  }
  const usage = {
    total: Object.values(byType).reduce((s, v) => s + v.amount, 0),
    byType,
  }

  const invoices = invoicesRes.status === "fulfilled" && invoicesRes.value.data ? invoicesRes.value.data : []

  const planConfig = sub ? (PLANS[sub.plan as keyof typeof PLANS] ?? PLANS.trial) : PLANS.trial
  const daysLeft = sub?.status === "trial" && sub.trial_ends_at ? trialDaysLeft(sub.trial_ends_at) : null
  const baseAmount = planConfig.basePrice
  const actionsAmount = planConfig.actionCap != null ? Math.min(usage.total, planConfig.actionCap) : usage.total
  const totalEstimate = baseAmount + actionsAmount
  const cappedTotal = planConfig.totalCap != null ? Math.min(totalEstimate, planConfig.totalCap) : totalEstimate

  return (
    <BillingClient
      subscription={sub}
      planConfig={planConfig}
      usage={usage}
      baseAmount={baseAmount}
      actionsAmount={actionsAmount}
      totalEstimate={cappedTotal}
      capApplied={planConfig.totalCap != null && totalEstimate > planConfig.totalCap}
      daysLeft={daysLeft}
      invoices={invoices}
      isOwner={member.role === "owner"}
      allPlans={PLANS}
    />
  )
}
