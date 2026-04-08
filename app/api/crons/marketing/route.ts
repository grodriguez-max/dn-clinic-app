// @ts-nocheck
/**
 * Marketing cron endpoint — Railway calls this on schedule
 * GET /api/crons/marketing?job=JOBNAME&secret=SECRET
 *
 * 7 cron jobs for Agente 2: Marketing Agent
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { runMarketingTask } from "@/lib/agent/marketing-agent"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const job = searchParams.get("job")
  const secret = searchParams.get("secret")
  const authHeader = req.headers.get("authorization")
  const authorized =
    secret === process.env.CRON_SECRET ||
    authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (!job) return NextResponse.json({ error: "Missing job param" }, { status: 400 })

  try {
    const result = await runMarketingCronJob(job)
    return NextResponse.json({ ok: true, job, result })
  } catch (error) {
    console.error(`[marketing-cron:${job}] Error:`, error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

async function runMarketingCronJob(job: string): Promise<unknown> {
  const supabase = createServiceClient()

  // Get all active clinics with onboarding complete
  const { data: clinics } = await supabase
    .from("clinics")
    .select("id, name")
    .eq("onboarding_completed", true)

  const activeClinics = clinics ?? []

  switch (job) {

    // ── 1. Reactivación (lunes 10am) ─────────────────────────────────────
    case "reactivation": {
      const results = []
      for (const clinic of activeClinics) {
        const result = await runMarketingTask({
          clinicId: clinic.id,
          task: "Ejecutá la campaña de reactivación para pacientes inactivos hace 60 o más días. Usá el template de reactivación con gancho emocional apropiado para una clínica estética. Ofrecé un incentivo razonable dentro del máximo permitido por la clínica.",
          triggeredBy: "cron",
          cronJob: "reactivation",
        })
        results.push({ clinic: clinic.name, ...result })
      }
      return { clinics_processed: activeClinics.length, results }
    }

    // ── 2. Cumpleaños (diario 9am) ────────────────────────────────────────
    case "birthdays": {
      const results = []
      const today = new Date()
      const monthDay = `${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}` // MM-DD

      for (const clinic of activeClinics) {
        // Find patients with birthday today
        const { data: birthdayPatients } = await supabase
          .from("patients")
          .select("id, name")
          .eq("clinic_id", clinic.id)
          .eq("opt_out_marketing", false)
          .not("birth_date", "is", null)
          .filter("birth_date", "like", `%-${monthDay}`)

        if (!birthdayPatients?.length) {
          results.push({ clinic: clinic.name, birthdays: 0 })
          continue
        }

        for (const patient of birthdayPatients) {
          const result = await runMarketingTask({
            clinicId: clinic.id,
            task: `Enviá la campaña de cumpleaños al paciente con ID ${patient.id} (${patient.name}). Ofrecé un descuento especial de cumpleaños dentro del máximo permitido por la clínica.`,
            triggeredBy: "cron",
            cronJob: "birthdays",
          })
          results.push({ clinic: clinic.name, patient: patient.name, ...result })
        }
      }
      return { clinics_processed: activeClinics.length, birthday_messages: results.length, results }
    }

    // ── 3. Follow-up post-tratamiento 3 días (diario 10am) ───────────────
    case "post_treatment_followup": {
      const results = []
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000)
      const dayStart = new Date(threeDaysAgo); dayStart.setHours(0, 0, 0, 0)
      const dayEnd   = new Date(threeDaysAgo); dayEnd.setHours(23, 59, 59, 999)

      for (const clinic of activeClinics) {
        const { data: appts } = await supabase
          .from("appointments")
          .select("id, patient_id")
          .eq("clinic_id", clinic.id)
          .eq("status", "completed")
          .gte("start_time", dayStart.toISOString())
          .lte("start_time", dayEnd.toISOString())

        if (!appts?.length) continue

        for (const appt of appts) {
          const result = await runMarketingTask({
            clinicId: clinic.id,
            task: `Enviá el follow-up post-tratamiento de 3 días para la cita ID ${appt.id}. Incluí instrucciones de cuidado personalizadas y un CTA suave para agendar la próxima visita.`,
            triggeredBy: "cron",
            cronJob: "post_treatment_followup",
          })
          results.push({ clinic: clinic.name, appointment_id: appt.id, ...result })
        }
      }
      return { clinics_processed: activeClinics.length, followups_sent: results.length }
    }

    // ── 4. Solicitud de reseña 7 días (diario 10am) ───────────────────────
    case "review_request": {
      const results = []
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)
      const dayStart = new Date(sevenDaysAgo); dayStart.setHours(0, 0, 0, 0)
      const dayEnd   = new Date(sevenDaysAgo); dayEnd.setHours(23, 59, 59, 999)

      for (const clinic of activeClinics) {
        const { data: clinicData } = await supabase.from("clinics").select("settings").eq("id", clinic.id).single()
        const googleLink = (clinicData?.settings as Record<string, unknown>)?.google_review_link as string | undefined

        const { data: appts } = await supabase
          .from("appointments")
          .select("id, patient_id, patients(phone, opt_out_marketing)")
          .eq("clinic_id", clinic.id)
          .eq("status", "completed")
          .gte("start_time", dayStart.toISOString())
          .lte("start_time", dayEnd.toISOString())

        for (const appt of (appts ?? [])) {
          const patient = appt.patients as { phone?: string; opt_out_marketing?: boolean } | null
          if (patient?.opt_out_marketing) continue

          const result = await runMarketingTask({
            clinicId: clinic.id,
            task: `La cita ID ${appt.id} fue completada hace 7 días. Si el paciente tuvo una buena experiencia, enviá una solicitud amable para dejar una reseña en Google.${googleLink ? ` Link de Google Reviews: ${googleLink}` : " (No hay link de Google Reviews configurado — pedile al dueño que lo configure en ajustes)"}`,
            triggeredBy: "cron",
            cronJob: "review_request",
          })
          results.push({ clinic: clinic.name, appointment_id: appt.id, ...result })
        }
      }
      return { clinics_processed: activeClinics.length, review_requests: results.length }
    }

    // ── 5. Recordatorio tratamiento periódico (lunes 9am) ─────────────────
    case "periodic_treatment_reminder": {
      const results = []

      for (const clinic of activeClinics) {
        // Find patients whose last treatment was 3-4 months ago (for periodic treatments)
        const threeMonthsAgo = new Date(Date.now() - 90 * 86400000).toISOString()
        const fourMonthsAgo  = new Date(Date.now() - 120 * 86400000).toISOString()

        const { data: patients } = await supabase
          .from("patients")
          .select("id, name")
          .eq("clinic_id", clinic.id)
          .eq("opt_out_marketing", false)

        for (const patient of (patients ?? [])) {
          const { data: lastAppt } = await supabase
            .from("appointments")
            .select("start_time, services(name, category)")
            .eq("patient_id", patient.id)
            .eq("status", "completed")
            .order("start_time", { ascending: false })
            .limit(1)
            .single()

          if (!lastAppt?.start_time) continue
          const lastVisit = new Date(lastAppt.start_time)
          if (lastVisit < new Date(threeMonthsAgo) && lastVisit >= new Date(fourMonthsAgo)) {
            const service = lastAppt.services as { name?: string } | null
            const monthsSince = Math.round((Date.now() - lastVisit.getTime()) / (30 * 86400000))

            const result = await runMarketingTask({
              clinicId: clinic.id,
              task: `Enviá un recordatorio de tratamiento periódico al paciente ID ${patient.id} (${patient.name}). Su último tratamiento fue ${service?.name ?? "un tratamiento"} hace ${monthsSince} meses. Invitalo a reagendar.`,
              triggeredBy: "cron",
              cronJob: "periodic_treatment_reminder",
            })
            results.push({ clinic: clinic.name, patient: patient.name, ...result })
          }
        }
      }
      return { clinics_processed: activeClinics.length, reminders_sent: results.length }
    }

    // ── 6. Follow-up leads tibios (miércoles 10am) ────────────────────────
    case "followup_warm_leads": {
      const results = []
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()

      for (const clinic of activeClinics) {
        const { data: leads } = await supabase
          .from("patients")
          .select("id, name, tags, notes")
          .eq("clinic_id", clinic.id)
          .eq("opt_out_marketing", false)
          .contains("tags", ["lead"])
          .lte("created_at", sevenDaysAgo)

        for (const lead of (leads ?? [])) {
          // Check if they have any appointment (already converted)
          const { count } = await supabase.from("appointments").select("id", { count: "exact", head: true }).eq("patient_id", lead.id)
          if ((count ?? 0) > 0) continue // already converted, skip

          const result = await runMarketingTask({
            clinicId: clinic.id,
            task: `Lead ID ${lead.id} (${lead.name}) preguntó hace 7+ días pero no ha agendado cita. Enviá un follow-up con contenido de valor o testimonio relevante. Notas del lead: ${lead.notes ?? "sin notas"}. No seas agresivo — usá FOMO suave.`,
            triggeredBy: "cron",
            cronJob: "followup_warm_leads",
          })
          results.push({ clinic: clinic.name, lead: lead.name, ...result })
        }
      }
      return { clinics_processed: activeClinics.length, followups_sent: results.length }
    }

    // ── 7. Reporte semanal al dueño (lunes 8am) ───────────────────────────
    case "weekly_report": {
      const results = []

      for (const clinic of activeClinics) {
        const result = await runMarketingTask({
          clinicId: clinic.id,
          task: "Generá el reporte semanal de marketing para el dueño de la clínica. Incluí: campañas enviadas, tasas de lectura y conversión, revenue atribuido, opt-outs, y al menos 2 recomendaciones concretas basadas en los datos. Sé específico con números.",
          triggeredBy: "cron",
          cronJob: "weekly_report",
        })
        results.push({ clinic: clinic.name, ...result })
      }
      return { clinics_processed: activeClinics.length, reports: results }
    }

    default:
      return { error: `Job de marketing desconocido: ${job}` }
  }
}
