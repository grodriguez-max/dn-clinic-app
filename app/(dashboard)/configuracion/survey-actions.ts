"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

const DEFAULT_QUESTIONS = [
  { id: "q1", text: "¿Cómo calificarías tu experiencia general?", type: "rating", is_required: true },
  { id: "q2", text: "¿Cómo calificarías la atención del profesional?", type: "rating", is_required: true },
  { id: "q3", text: "¿Nos recomendarías a un amigo?", type: "multiple_choice", options: ["Definitivamente sí", "Probablemente sí", "No estoy seguro/a", "Probablemente no"], is_required: false },
  { id: "q4", text: "¿Qué podemos mejorar?", type: "open_text", is_required: false },
]

export async function saveSurveyTemplate(clinicId: string, cfg: { name: string; send_days_after: number }) {
  const s = createServiceClient()

  // Upsert template: update existing active one or create new
  const { data: existing } = await s.from("survey_templates").select("id").eq("clinic_id", clinicId).eq("is_active", true).maybeSingle()

  if (existing) {
    await s.from("survey_templates").update({ name: cfg.name, send_days_after: cfg.send_days_after }).eq("id", existing.id)
  } else {
    await s.from("survey_templates").insert({
      clinic_id: clinicId,
      name: cfg.name,
      questions: DEFAULT_QUESTIONS,
      send_days_after: cfg.send_days_after,
      is_active: true,
    })
  }

  // Also save in clinic settings for easy access
  const { data: clinic } = await s.from("clinics").select("settings").eq("id", clinicId).single()
  const current = (clinic?.settings ?? {}) as Record<string, unknown>
  await s.from("clinics").update({ settings: { ...current, default_survey: cfg } }).eq("id", clinicId)

  revalidatePath("/configuracion")
  return { ok: true }
}

export async function getSurveyTemplate(clinicId: string) {
  const s = createServiceClient()
  const { data } = await s.from("survey_templates").select("*").eq("clinic_id", clinicId).eq("is_active", true).maybeSingle()
  return data
}

export async function submitSurveyResponse(
  templateId: string,
  patientId: string,
  appointmentId: string | null,
  professionalId: string | null,
  responses: Record<string, unknown>
) {
  const s = createServiceClient()

  const { data: tmpl } = await s.from("survey_templates").select("clinic_id").eq("id", templateId).single()
  if (!tmpl) return { error: "Template not found" }

  const { data, error } = await s.from("survey_responses").insert({
    clinic_id: tmpl.clinic_id,
    survey_template_id: templateId,
    patient_id: patientId,
    appointment_id: appointmentId,
    professional_id: professionalId,
    responses,
  }).select("id").single()

  if (error) return { error: error.message }

  // Check for low score → notify owner
  const generalRating = Number(responses["q1"] ?? responses["general"] ?? 5)
  if (generalRating < 3) {
    const { createNotification } = await import("@/lib/notifications/inapp")
    void createNotification({
      clinic_id: tmpl.clinic_id,
      type: "low_survey_score",
      title: "Encuesta con calificación baja",
      description: `Un paciente calificó con ${generalRating}/5. Revisá la respuesta completa.`,
      link: "/metricas?tab=encuestas",
    })
  }

  return { ok: true, id: data.id }
}

export async function getSurveyMetrics(clinicId: string, since: string) {
  const s = createServiceClient()
  const { data } = await s
    .from("survey_responses")
    .select("id, responses, professional_id, submitted_at, professionals(name)")
    .eq("clinic_id", clinicId)
    .gte("submitted_at", since)
    .order("submitted_at", { ascending: false })
  return data ?? []
}
