import Stripe from "stripe"

// ─── Stripe client ────────────────────────────────────────────────────────────
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder", {
  apiVersion: "2024-06-20",
  typescript: true,
})

// ─── Plan config ──────────────────────────────────────────────────────────────
export type PlanId = "trial" | "starter" | "growth" | "premium"

export const PLANS: Record<PlanId, {
  name: string
  basePrice: number          // USD/mes
  actionCap: number | null   // tope mensual de acciones (null = sin tope)
  totalCap: number | null    // tope total mensual (base + acciones)
  maxPatients: number | null
  maxProfessionals: number | null
  agents: 1 | 2
  stripePriceId: string      // configurar en .env
}> = {
  trial: {
    name: "Trial",
    basePrice: 0,
    actionCap: null,
    totalCap: null,
    maxPatients: 2000,        // mismos límites que Growth
    maxProfessionals: 8,
    agents: 2,
    stripePriceId: "",
  },
  starter: {
    name: "Starter",
    basePrice: 99,
    actionCap: 100,
    totalCap: 199,
    maxPatients: 500,
    maxProfessionals: 3,
    agents: 1,
    stripePriceId: process.env.STRIPE_PRICE_STARTER ?? "",
  },
  growth: {
    name: "Growth",
    basePrice: 199,
    actionCap: 300,
    totalCap: 499,
    maxPatients: 2000,
    maxProfessionals: 8,
    agents: 2,
    stripePriceId: process.env.STRIPE_PRICE_GROWTH ?? "",
  },
  premium: {
    name: "Premium",
    basePrice: 299,
    actionCap: null,
    totalCap: null,
    maxPatients: null,
    maxProfessionals: null,
    agents: 2,
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM ?? "",
  },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount)
}

export function getTrialEndsAt(): Date {
  const d = new Date()
  d.setDate(d.getDate() + 14)
  return d
}

export function trialDaysLeft(trialEndsAt: string | null): number {
  if (!trialEndsAt) return 0
  const ms = new Date(trialEndsAt).getTime() - Date.now()
  return Math.max(0, Math.ceil(ms / 86400000))
}
