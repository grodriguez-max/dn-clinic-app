import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { stripe, PLANS, type PlanId } from "@/lib/billing/stripe"

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const newPlan = body.plan as PlanId
  if (!["starter", "growth", "premium"].includes(newPlan)) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
  }

  const serviceClient = createServiceClient()
  const { data: member } = await serviceClient
    .from("users")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single()

  if (!member || !["owner", "admin"].includes(member.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { data: sub } = await serviceClient
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("clinic_id", member.clinic_id)
    .single()

  if (!sub?.stripe_subscription_id) {
    return NextResponse.json({ error: "Sin suscripción activa de Stripe" }, { status: 400 })
  }

  const planConfig = PLANS[newPlan]
  if (!planConfig.stripePriceId) {
    return NextResponse.json({ error: "Plan de Stripe no configurado" }, { status: 500 })
  }

  // Get current subscription from Stripe and update
  const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id)
  const itemId = stripeSub.items.data[0]?.id
  if (!itemId) return NextResponse.json({ error: "Error de Stripe" }, { status: 500 })

  await stripe.subscriptions.update(sub.stripe_subscription_id, {
    items: [{ id: itemId, price: planConfig.stripePriceId }],
    proration_behavior: "create_prorations",
    metadata: { plan: newPlan },
  })

  // Update local DB
  await serviceClient.from("subscriptions").update({
    plan: newPlan,
    monthly_action_cap: planConfig.actionCap,
  }).eq("clinic_id", member.clinic_id)

  return NextResponse.json({ ok: true, plan: newPlan })
}
