"use server"

import { createServiceClient } from "@/lib/supabase/server"

export interface SoapNote {
  subjective: string
  objective: string
  assessment: string
  plan: string
}

export async function getClinicalNotes(appointmentId: string): Promise<SoapNote | null> {
  const service = createServiceClient()
  const { data } = await service
    .from("clinical_notes")
    .select("subjective, objective, assessment, plan")
    .eq("appointment_id", appointmentId)
    .maybeSingle()
  return data ?? null
}

export async function saveClinicalNotes(
  appointmentId: string,
  clinicId: string,
  note: SoapNote
) {
  const service = createServiceClient()
  const { error } = await service
    .from("clinical_notes")
    .upsert(
      {
        appointment_id: appointmentId,
        clinic_id: clinicId,
        ...note,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "appointment_id" }
    )
  if (error) return { error: error.message }
  return { ok: true }
}
