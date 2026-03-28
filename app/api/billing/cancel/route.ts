import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { stripe } from "@/lib/billing/stripe"

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: member } = await serviceClient
    .from("users")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single()

  if (!member || member.role !== "owner") {
    return NextResponse.json({ error: "Solo el dueño puede cancelar" }, { status: 403 })
  }

  const { data: sub } = await serviceClient
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("clinic_id", member.clinic_id)
    .single()

  if (sub?.stripe_subscription_id) {
    // Cancel at period end — client keeps access until end of billing cycle
    await stripe.subscriptions.update(sub.stripe_subscription_id, {
      cancel_at_period_end: true,
    })
  }

  await serviceClient.from("subscriptions").update({
    status: "cancelled",
  }).eq("clinic_id", member.clinic_id)

  return NextResponse.json({ ok: true })
}
