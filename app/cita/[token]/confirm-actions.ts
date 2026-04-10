"use server"

import { createServiceClient } from "@/lib/supabase/server"

export async function confirmAppointmentByToken(token: string) {
  const service = createServiceClient()
  const { data: appt, error } = await service
    .from("appointments")
    .select("id, status, confirmation_confirmed_at")
    .eq("confirmation_token", token)
    .single()

  if (error || !appt) return { error: "Cita no encontrada" }
  if (appt.status === "cancelled") return { error: "Esta cita ya fue cancelada" }
  if (appt.confirmation_confirmed_at) return { ok: true, alreadyConfirmed: true }

  const { error: upErr } = await service
    .from("appointments")
    .update({ confirmation_confirmed_at: new Date().toISOString() })
    .eq("id", appt.id)

  if (upErr) return { error: upErr.message }
  return { ok: true }
}

export async function getAppointmentByToken(token: string) {
  const service = createServiceClient()
  const { data } = await service
    .from("appointments")
    .select("id, start_time, end_time, status, confirmation_confirmed_at, patients(name), professionals(name), services(name), clinics(name,phone)")
    .eq("confirmation_token", token)
    .single()
  return data
}
