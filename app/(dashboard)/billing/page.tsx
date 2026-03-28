// @ts-nocheck
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { getSubscription, getCurrentMonthUsage } from "@/lib/billing/subscription"
import { PLANS, trialDaysLeft, formatUSD } from "@/lib/billing/stripe"
import { BillingClient } from "./billing-client"

export default async function BillingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const serviceClient = createServiceClient()
  const { data: member } = await serviceClient
    .from("users")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single()

  if (!member) redirect("/dashboard")

  const [sub, usage, invoices] = await Promise.all([
    getSubscription(member.clinic_id),
    getCurrentMonthUsage(member.clinic_id),
    serviceClient
      .from("platform_invoices")
      .select("*")
      .eq("clinic_id", member.clinic_id)
      .order("created_at", { ascending: false })
      .limit(12),
  ])

  const planConfig = sub ? PLANS[sub.plan] : PLANS.trial
  const daysLeft = sub?.status === "trial" ? trialDaysLeft(sub.trial_ends_at) : null
  const baseAmount = planConfig.basePrice
  const actionsAmount = Math.min(usage.total, planConfig.actionCap ?? usage.total)
  const totalEstimate = baseAmount + actionsAmount
  const cappedTotal = planConfig.totalCap !== null
    ? Math.min(totalEstimate, planConfig.totalCap)
    : totalEstimate

  return (
    <BillingClient
      subscription={sub}
      planConfig={planConfig}
      usage={usage}
      baseAmount={baseAmount}
      actionsAmount={actionsAmount}
      totalEstimate={cappedTotal}
      capApplied={planConfig.totalCap !== null && totalEstimate > planConfig.totalCap}
      daysLeft={daysLeft}
      invoices={invoices.data ?? []}
      isOwner={member.role === "owner"}
      allPlans={PLANS}
    />
  )
}
