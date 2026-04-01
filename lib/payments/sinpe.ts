/**
 * SINPE Móvil — Costa Rica
 *
 * SINPE Móvil works by transferring to a phone number or IBAN.
 * No public API exists for automated confirmation — confirmation is manual
 * (staff marks received) or via bank SMS parsing webhook.
 *
 * This module handles:
 * 1. Creating a payment request with a reference code
 * 2. Generating a SINPE Móvil QR (BN format — most compatible)
 * 3. Manual confirmation by staff
 * 4. Optional: BCR/BN webhook for auto-confirmation (requires bank agreement)
 */

import { createServiceClient } from "@/lib/supabase/server"

function generateReference(): string {
  // 6-char alphanumeric code patient includes in transfer note
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

/**
 * SINPE Móvil QR string format (BN / standard):
 * sinpe-movil://<phone>?amount=<amount>&note=<note>
 */
export function buildSinpeQrString(phone: string, amount: number, reference: string): string {
  const cleanPhone = phone.replace(/\D/g, "").replace(/^506/, "")
  return `sinpe-movil://${cleanPhone}?amount=${amount.toFixed(0)}&note=REF${reference}`
}

/**
 * SINPE Móvil deep link (opens banking apps directly)
 */
export function buildSinpeDeepLink(phone: string, amount: number, reference: string): string {
  const cleanPhone = phone.replace(/\D/g, "").replace(/^506/, "")
  return `https://sinpe.bncr.fi.cr/sinpemovil?phone=${cleanPhone}&amount=${amount.toFixed(0)}&description=REF${reference}`
}

export async function createSinpePaymentRequest(
  clinicId: string,
  patientId: string,
  amount: number,
  appointmentId?: string,
  expiresInHours = 24
): Promise<{ ok: boolean; reference?: string; id?: string; error?: string }> {
  const supabase = createServiceClient()
  const reference = generateReference()
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)

  const { data, error } = await supabase.from("sinpe_payments").insert({
    clinic_id: clinicId,
    patient_id: patientId,
    appointment_id: appointmentId ?? null,
    amount,
    reference_code: reference,
    status: "pending",
    expires_at: expiresAt.toISOString(),
  }).select("id").single()

  if (error) return { ok: false, error: error.message }
  return { ok: true, reference, id: data.id }
}

export async function confirmSinpePayment(
  paymentId: string,
  confirmedByUserId: string
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createServiceClient()
  const { error } = await supabase
    .from("sinpe_payments")
    .update({
      status: "confirmed",
      confirmed_by: confirmedByUserId,
      confirmed_at: new Date().toISOString(),
    })
    .eq("id", paymentId)
    .eq("status", "pending")
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

export async function expireSinpePayments(): Promise<number> {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("sinpe_payments")
    .update({ status: "expired" })
    .eq("status", "pending")
    .lt("expires_at", new Date().toISOString())
    .select("id")
  return data?.length ?? 0
}

export async function getPendingSinpePayments(clinicId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("sinpe_payments")
    .select("id, amount, reference_code, status, expires_at, created_at, patient_id, appointment_id, patients(name, phone)")
    .eq("clinic_id", clinicId)
    .in("status", ["pending"])
    .order("created_at", { ascending: false })
  return data ?? []
}
