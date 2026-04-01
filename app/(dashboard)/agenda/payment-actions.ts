"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface PaymentInput {
  appointment_id: string
  patient_id: string
  amount: number
  payment_type: "deposit" | "full" | "remaining" | "refund"
  payment_method: "cash" | "card" | "sinpe" | "transfer" | "online"
}

export async function registerAppointmentPayment(clinicId: string, input: PaymentInput) {
  const service = createServiceClient()
  const { data, error } = await service
    .from("appointment_payments")
    .insert({
      clinic_id: clinicId,
      ...input,
      status: "completed",
      paid_at: new Date().toISOString(),
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath("/agenda")
  return { ok: true, id: data.id }
}

export async function getAppointmentPayments(appointmentId: string) {
  const service = createServiceClient()
  const { data } = await service
    .from("appointment_payments")
    .select("id, amount, payment_type, payment_method, status, paid_at")
    .eq("appointment_id", appointmentId)
    .neq("status", "refunded")
    .order("paid_at")
  return data ?? []
}

export async function saveDepositPolicy(clinicId: string, policy: {
  deposit_required: boolean
  deposit_type: "percentage" | "fixed"
  deposit_amount: number
  refund_policy_hours: number
  deposit_services: string[]
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: clinic } = await supabase.from("clinics").select("settings").eq("id", clinicId).single()
  const current = (clinic?.settings ?? {}) as Record<string, unknown>
  const updated = { ...current, deposit_policy: policy }

  const serviceClient = createServiceClient()
  const { error } = await serviceClient.from("clinics").update({ settings: updated }).eq("id", clinicId)
  if (error) return { error: error.message }
  revalidatePath("/configuracion")
  return { success: true }
}
