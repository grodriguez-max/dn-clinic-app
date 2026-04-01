"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase() + "-" + Math.random().toString(36).substring(2, 6).toUpperCase()
}

export async function saveGiftCardSettings(clinicId: string, cfg: { enabled: boolean; preset_amounts: string; validity_days: number }) {
  const s = createServiceClient()
  const { data: clinic } = await s.from("clinics").select("settings").eq("id", clinicId).single()
  const current = (clinic?.settings ?? {}) as Record<string, unknown>
  await s.from("clinics").update({ settings: { ...current, gift_cards: cfg } }).eq("id", clinicId)
  revalidatePath("/configuracion")
  return { ok: true }
}

export async function createGiftCard(clinicId: string, input: {
  amount: number
  purchased_by?: string
  validity_days?: number
}) {
  const s = createServiceClient()
  const code = generateCode()
  const expires_at = new Date()
  expires_at.setDate(expires_at.getDate() + (input.validity_days ?? 365))

  const { data, error } = await s.from("gift_cards").insert({
    clinic_id: clinicId,
    code,
    amount: input.amount,
    balance: input.amount,
    purchased_by: input.purchased_by ?? null,
    status: "active",
    expires_at: expires_at.toISOString(),
  }).select("id, code").single()

  if (error) return { error: error.message }
  return { ok: true, code: data.code, id: data.id }
}

export async function redeemGiftCard(clinicId: string, code: string, amount: number, redeemedBy: string) {
  const s = createServiceClient()
  const { data: gc } = await s.from("gift_cards").select("id, balance, status").eq("clinic_id", clinicId).eq("code", code.toUpperCase()).maybeSingle()

  if (!gc) return { error: "Gift card no encontrada" }
  if (gc.status !== "active") return { error: "Gift card inactiva o vencida" }
  if (Number(gc.balance) < amount) return { error: `Saldo insuficiente (₡${Number(gc.balance).toLocaleString("es-CR")} disponible)` }

  const newBalance = Number(gc.balance) - amount
  const newStatus = newBalance === 0 ? "redeemed" : "active"

  await s.from("gift_cards").update({ balance: newBalance, status: newStatus, redeemed_by: redeemedBy }).eq("id", gc.id)
  return { ok: true, remainingBalance: newBalance }
}

export async function getGiftCards(clinicId: string) {
  const s = createServiceClient()
  const { data } = await s.from("gift_cards").select("id, code, amount, balance, status, expires_at, created_at, patients!purchased_by(name)").eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(50)
  return data ?? []
}

export async function generateReferralCode(patientId: string) {
  return patientId.substring(0, 8).toUpperCase()
}

export async function createReferral(clinicId: string, referrerId: string, rewardType: string, rewardValue: number) {
  const s = createServiceClient()
  const code = await generateReferralCode(referrerId)
  const { data, error } = await s.from("referrals").insert({
    clinic_id: clinicId,
    referrer_id: referrerId,
    referral_code: code,
    reward_type: rewardType,
    reward_value: rewardValue,
    status: "pending",
  }).select("id, referral_code").single()
  if (error) return { error: error.message }
  return { ok: true, code: data.referral_code }
}
