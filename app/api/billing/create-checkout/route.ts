import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { stripe, PLANS, type PlanId } from "@/lib/billing/stripe"

export async function POST(req: Request) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const plan = body.plan as PlanId
  if (!["starter", "growth", "premium"].includes(plan)) {
    return NextResponse.json({ error: "Plan inválido" }, { status: 400 })
  }

  const serviceClient = createServiceClient()

  // Get clinic
  const { data: member } = await serviceClient
    .from("users")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single()

  if (!member || !["owner", "admin"].includes(member.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const { data: clinic } = await serviceClient
    .from("clinics")
    .select("name, email")
    .eq("id", member.clinic_id)
    .single()

  if (!clinic) return NextResponse.json({ error: "Clínica no encontrada" }, { status: 404 })

  // Get or create Stripe customer
  const { data: sub } = await serviceClient
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("clinic_id", member.clinic_id)
    .single()

  let customerId = sub?.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: clinic.name,
      email: clinic.email ?? user.email ?? undefined,
      metadata: { clinic_id: member.clinic_id },
    })
    customerId = customer.id
    await serviceClient
      .from("subscriptions")
      .update({ stripe_customer_id: customerId })
      .eq("clinic_id", member.clinic_id)
  }

  const planConfig = PLANS[plan]
  if (!planConfig.stripePriceId) {
    return NextResponse.json({ error: "Plan de Stripe no configurado" }, { status: 500 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: planConfig.stripePriceId, quantity: 1 }],
    success_url: `${appUrl}/billing?success=1&plan=${plan}`,
    cancel_url: `${appUrl}/billing`,
    metadata: { clinic_id: member.clinic_id, plan },
    subscription_data: {
      metadata: { clinic_id: member.clinic_id, plan },
    },
  })

  return NextResponse.json({ url: session.url })
}
