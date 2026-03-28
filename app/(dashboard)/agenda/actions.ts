"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface AppointmentInput {
  patient_id: string
  professional_id: string
  service_id: string
  start_time: string   // ISO string UTC
  end_time: string     // ISO string UTC
  notes?: string
}

export async function createAppointment(clinicId: string, input: AppointmentInput) {
  const service = createServiceClient()
  const { data, error } = await service
    .from("appointments")
    .insert({
      clinic_id: clinicId,
      ...input,
      status: "confirmed",
      created_by: "web",
    })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath("/agenda")
  revalidatePath("/dashboard")
  return { ok: true, id: data.id }
}

export async function updateAppointment(
  appointmentId: string,
  updates: Partial<AppointmentInput & { status: string; cancellation_reason?: string }>
) {
  const service = createServiceClient()
  const { error } = await service
    .from("appointments")
    .update(updates)
    .eq("id", appointmentId)

  if (error) return { error: error.message }
  revalidatePath("/agenda")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function cancelAppointment(appointmentId: string, reason?: string) {
  return updateAppointment(appointmentId, {
    status: "cancelled",
    cancellation_reason: reason ?? "Cancelado desde agenda",
  })
}
