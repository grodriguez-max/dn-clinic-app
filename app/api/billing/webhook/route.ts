import { NextResponse } from "next/server"
import { headers } from "next/headers"
import { stripe, PLANS, type PlanId } from "@/lib/billing/stripe"
import { createServiceClient } from "@/lib/supabase/server"
import {
  sendTrialEndingEmail,
  sendPaymentSucceededEmail,
  sendPaymentFailedEmail,
} from "@/lib/notifications/email"
import type Stripe from "stripe"

export async function POST(req: Request) {
  const body = await req.text()
  const sig = headers().get("stripe-signature")

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret)
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session
      const clinicId = session.metadata?.clinic_id
      const plan = session.metadata?.plan as PlanId
      if (!clinicId || !plan) break

      const planConfig = PLANS[plan]
      const now = new Date()
      const periodEnd = new Date(now)
      periodEnd.setMonth(periodEnd.getMonth() + 1)

      await supabase.from("subscriptions").update({
        plan,
        status: "active",
        stripe_subscription_id: session.subscription as string,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        monthly_action_cap: planConfig.actionCap,
        trial_ends_at: null,
      }).eq("clinic_id", clinicId)

      // Send confirmation email
      const { data: clinic } = await supabase
        .from("clinics")
        .select("name, email, settings")
        .eq("id", clinicId)
        .single()

      if (clinic) {
        const settings = (clinic.settings ?? {}) as Record<string, unknown>
        const ownerEmail = (settings.owner_email as string) ?? clinic.email
        if (ownerEmail) {
          void sendPaymentSucceededEmail({
            ownerEmail,
            clinicName: clinic.name,
            plan: planConfig.name,
            amount: planConfig.basePrice,
            appUrl: process.env.NEXT_PUBLIC_APP_URL,
          })
        }
      }
      break
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice
      const subId = invoice.subscription as string
      if (!subId) break

      await supabase.from("subscriptions").update({
        status: "active",
      }).eq("stripe_subscription_id", subId)

      // Update period dates
      const sub = await stripe.subscriptions.retrieve(subId)
      await supabase.from("subscriptions").update({
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }).eq("stripe_subscription_id", subId)
      break
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice
      const subId = invoice.subscription as string
      if (!subId) break

      await supabase.from("subscriptions").update({
        status: "past_due",
      }).eq("stripe_subscription_id", subId)

      // Notify owner
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("clinic_id")
        .eq("stripe_subscription_id", subId)
        .single()

      if (sub) {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("name, email, settings")
          .eq("id", sub.clinic_id)
          .single()

        if (clinic) {
          const settings = (clinic.settings ?? {}) as Record<string, unknown>
          const ownerEmail = (settings.owner_email as string) ?? clinic.email
          if (ownerEmail) {
            void sendPaymentFailedEmail({
              ownerEmail,
              clinicName: clinic.name,
              appUrl: process.env.NEXT_PUBLIC_APP_URL,
            })
          }
        }
      }
      break
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription
      const clinicId = sub.metadata?.clinic_id
      if (!clinicId) break

      const status = sub.status === "active" ? "active"
        : sub.status === "past_due" ? "past_due"
        : sub.status === "canceled" ? "cancelled"
        : sub.status === "paused" ? "paused"
        : "active"

      await supabase.from("subscriptions").update({
        status,
        current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
      }).eq("clinic_id", clinicId)
      break
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription
      const clinicId = sub.metadata?.clinic_id
      if (!clinicId) break

      await supabase.from("subscriptions").update({
        status: "cancelled",
        stripe_subscription_id: null,
      }).eq("clinic_id", clinicId)
      break
    }
  }

  return NextResponse.json({ received: true })
}
