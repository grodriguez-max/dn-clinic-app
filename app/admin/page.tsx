// @ts-nocheck
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AdminClient } from "./admin-client"
import { PLANS } from "@/lib/billing/stripe"

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const serviceClient = createServiceClient()

  // Only Gabriel (role=admin in clinic_members for any clinic, or a special admin flag)
  // We check if user has ANY clinic_member with role=admin
  const { data: adminCheck } = await serviceClient
    .from("users")
    .select("role")
    .eq("id", user.id)
    .eq("role", "admin")
    .limit(1)

  if (!adminCheck?.length) redirect("/dashboard")

  // Get all clinics with subscription info
  const { data: clinics } = await serviceClient
    .from("clinics")
    .select("id, name, slug, created_at")
    .eq("onboarding_completed", true)
    .order("created_at", { ascending: false })

  const { data: subscriptions } = await serviceClient
    .from("subscriptions")
    .select("*")

  const { data: allActions } = await serviceClient
    .from("billable_actions")
    .select("clinic_id, action_type, unit_price, created_at, billed")
    .order("created_at", { ascending: false })
    .limit(1000)

  const { data: allInvoices } = await serviceClient
    .from("platform_invoices")
    .select("clinic_id, total, status, period_start, period_end")
    .order("created_at", { ascending: false })

  // Build clinic stats
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const clinicStats = (clinics ?? []).map((clinic) => {
    const sub = subscriptions?.find((s) => s.clinic_id === clinic.id)
    const plan = sub?.plan ?? "trial"
    const planConfig = PLANS[plan]
    const monthActions = (allActions ?? []).filter(
      (a) => a.clinic_id === clinic.id && a.created_at >= monthStart
    )
    const actionsRevenue = monthActions.reduce((s, a) => s + Number(a.unit_price), 0)
    const totalRevenue = (planConfig?.basePrice ?? 0) + actionsRevenue
    const actionCount = monthActions.length

    return {
      ...clinic,
      plan,
      status: sub?.status ?? "none",
      basePrice: planConfig?.basePrice ?? 0,
      actionsRevenue,
      totalRevenue,
      actionCount,
    }
  })

  // Platform totals
  const mrr = clinicStats.reduce((s, c) => s + (c.status === "active" ? c.basePrice : 0), 0)
  const totalActionsRevenue = clinicStats.reduce((s, c) => s + c.actionsRevenue, 0)
  const totalMonthRevenue = mrr + totalActionsRevenue

  // Cost estimates (configurable)
  const aiTokensCost = 89 // estimate from Anthropic usage
  const hostingCost = 45 // Railway + Vercel
  const totalCost = aiTokensCost + hostingCost
  const margin = totalMonthRevenue - totalCost

  const { data: actionPricing } = await serviceClient
    .from("action_pricing")
    .select("*")
    .order("action_type")

  return (
    <AdminClient
      clinicStats={clinicStats}
      mrr={mrr}
      totalActionsRevenue={totalActionsRevenue}
      totalMonthRevenue={totalMonthRevenue}
      aiTokensCost={aiTokensCost}
      hostingCost={hostingCost}
      totalCost={totalCost}
      margin={margin}
      actionPricing={actionPricing ?? []}
      totalClinics={clinicStats.length}
      activeClinics={clinicStats.filter((c) => c.status === "active").length}
      trialClinics={clinicStats.filter((c) => c.status === "trial").length}
    />
  )
}
