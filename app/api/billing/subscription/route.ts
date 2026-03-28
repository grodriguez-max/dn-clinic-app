import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { getSubscription } from "@/lib/billing/subscription"
import { PLANS, trialDaysLeft } from "@/lib/billing/stripe"

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

  const sub = await getSubscription(member.clinic_id)
  if (!sub) return NextResponse.json({ error: "No subscription" }, { status: 404 })

  const planConfig = PLANS[sub.plan]

  return NextResponse.json({
    ...sub,
    plan_config: planConfig,
    trial_days_left: sub.status === "trial" ? trialDaysLeft(sub.trial_ends_at) : null,
  })
}
