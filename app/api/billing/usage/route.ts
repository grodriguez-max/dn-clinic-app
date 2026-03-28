import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getCurrentMonthUsage, getSubscription } from "@/lib/billing/subscription"
import { PLANS } from "@/lib/billing/stripe"

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: member } = await serviceClient
    .from("users")
    .select("clinic_id")
    .eq("id", user.id)
    .single()

  if (!member) return NextResponse.json({ error: "No clinic" }, { status: 404 })

  const [usage, sub] = await Promise.all([
    getCurrentMonthUsage(member.clinic_id),
    getSubscription(member.clinic_id),
  ])

  const plan = sub?.plan ?? "trial"
  const planConfig = PLANS[plan]
  const baseAmount = planConfig.basePrice
  const totalAmount = baseAmount + usage.total
  const cap = planConfig.totalCap
  const capApplied = cap !== null && totalAmount > cap

  return NextResponse.json({
    base_amount: baseAmount,
    actions_amount: Math.min(usage.total, planConfig.actionCap ?? usage.total),
    actions_detail: usage.byType,
    total: capApplied ? cap : totalAmount,
    cap_applied: capApplied,
    cap: cap,
    plan,
  })
}
