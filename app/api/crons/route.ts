// @ts-nocheck
/**
 * Cron endpoint — Railway calls this on schedule
 * GET /api/crons?job=JOBNAME&secret=SECRET
 *
 * 12 cron jobs for Agente 1: Recepcionista Virtual
 */

import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"
import { processMessage } from "@/lib/agent/receptionist"
import { sendNoShowAlert, sendDailySummary, sendTrialEndingEmail, sendPlatformInvoiceEmail } from "@/lib/notifications/email"
import { generateMonthlyInvoice, getSubscription } from "@/lib/billing/subscription"
import { trackBillableAction } from "@/lib/billing/subscription"
import { createNotification } from "@/lib/notifications/inapp"

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
    const result = await runCronJob(job)
    return NextResponse.json({ ok: true, job, result })
  } catch (error) {
    console.error(`[cron:${job}] Error:`, error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

async function runCronJob(job: string): Promise<unknown> {
  const supabase = createServiceClient()

  switch (job) {

    // ── 1. Confirmación 24h antes ───────────────────────────────────────
    case "confirmation_24h": {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const dayStart = new Date(tomorrow); dayStart.setHours(0, 0, 0, 0)
      const dayEnd   = new Date(tomorrow); dayEnd.setHours(23, 59, 59, 999)

      const { data: appts } = await supabase
        .from("appointments")
        .select("id, patient_id, clinic_id, start_time, confirmation_sent, patients(name, phone), services(name), professionals(name)")
        .in("status", ["pending", "confirmed"])
        .eq("confirmation_sent", false)
        .gte("start_time", dayStart.toISOString())
        .lte("start_time", dayEnd.toISOString())

      const results = []
      for (const appt of (appts ?? [])) {
        const patient = appt.patients as { name: string; phone: string } | null
        const service = appt.services as { name: string } | null
        const prof = appt.professionals as { name: string } | null
        if (!patient?.phone) continue

        const time = formatTime(new Date(appt.start_time))
        const dayName = formatDayName(new Date(appt.start_time))
        const message = `Hola ${patient.name} 👋 Te recordamos que mañana, ${dayName} a las ${time}, tenés tu cita de ${service?.name} con ${prof?.name}. ¿Confirmás tu asistencia? Respondé *SÍ* para confirmar o *NO* para cancelar. ¡Te esperamos!`

        const response = await processMessage({ phone: patient.phone, text: `[CRON:confirmation] ${message}`, clinicId: appt.clinic_id, channel: "whatsapp" })
        await supabase.from("appointments").update({ confirmation_sent: true }).eq("id", appt.id)
        results.push({ appointment_id: appt.id, patient: patient.name, sent: true })
      }
      return { processed: results.length, appointments: results }
    }

    // ── 2. Recordatorio 2h antes ────────────────────────────────────────
    case "reminder_2h": {
      const now = new Date()
      const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000)
      const windowStart = new Date(in2h); windowStart.setMinutes(in2h.getMinutes() - 15)
      const windowEnd   = new Date(in2h); windowEnd.setMinutes(in2h.getMinutes() + 15)

      const { data: appts } = await supabase
        .from("appointments")
        .select("id, patient_id, clinic_id, start_time, reminder_sent, patients(name, phone), clinics(address), services(name)")
        .in("status", ["confirmed"])
        .eq("reminder_sent", false)
        .gte("start_time", windowStart.toISOString())
        .lte("start_time", windowEnd.toISOString())

      const results = []
      for (const appt of (appts ?? [])) {
        const patient = appt.patients as { name: string; phone: string } | null
        const clinic = appt.clinics as { address: string } | null
        const service = appt.services as { name: string } | null
        if (!patient?.phone) continue

        const time = formatTime(new Date(appt.start_time))
        const message = `Hola ${patient.name} ⏰ Tu cita de ${service?.name} es en 2 horas a las ${time}. ${clinic?.address ? `📍 Nos encontrás en ${clinic.address}` : ""} ¡Te esperamos!`

        await processMessage({ phone: patient.phone, text: `[CRON:reminder] ${message}`, clinicId: appt.clinic_id })
        await supabase.from("appointments").update({ reminder_sent: true }).eq("id", appt.id)
        results.push({ appointment_id: appt.id, patient: patient.name })
      }
      return { processed: results.length }
    }

    // ── 3. Check-in 30min antes ─────────────────────────────────────────
    case "checkin_30min": {
      const now = new Date()
      const in30 = new Date(now.getTime() + 30 * 60 * 1000)
      const windowStart = new Date(in30); windowStart.setMinutes(in30.getMinutes() - 5)
      const windowEnd   = new Date(in30); windowEnd.setMinutes(in30.getMinutes() + 5)

      const { data: appts } = await supabase
        .from("appointments")
        .select("id, clinic_id, patients(name, phone), services(name)")
        .in("status", ["confirmed"])
        .gte("start_time", windowStart.toISOString())
        .lte("start_time", windowEnd.toISOString())

      const results = []
      for (const appt of (appts ?? [])) {
        const patient = appt.patients as { name: string; phone: string } | null
        const service = appt.services as { name: string } | null
        if (!patient?.phone) continue

        const message = `Hola ${patient.name} 🚗 Tu cita de ${service?.name} es en 30 minutos. ¿Ya estás en camino?`
        await processMessage({ phone: patient.phone, text: `[CRON:checkin] ${message}`, clinicId: appt.clinic_id })
        results.push({ appointment_id: appt.id })
      }
      return { processed: results.length }
    }

    // ── 4. Post no-show (6pm mismo día) ────────────────────────────────
    case "post_noshow": {
      const today = new Date()
      const dayStart = new Date(today); dayStart.setHours(0, 0, 0, 0)
      const dayEnd   = new Date(today); dayEnd.setHours(17, 59, 59, 999)

      const { data: noShows } = await supabase
        .from("appointments")
        .select("id, clinic_id, patients(name, phone), services(name)")
        .eq("status", "no_show")
        .gte("start_time", dayStart.toISOString())
        .lte("start_time", dayEnd.toISOString())

      const results = []
      for (const appt of (noShows ?? [])) {
        const patient = appt.patients as { name: string; phone: string } | null
        const service = appt.services as { name: string } | null
        if (!patient?.phone) continue

        const message = `Hola ${patient.name}, notamos que no pudiste venir hoy para tu ${service?.name}. ¿Todo bien? Si querés reagendar, con gusto te busco disponibilidad esta semana 🗓️`
        await processMessage({ phone: patient.phone, text: `[CRON:noshow] ${message}`, clinicId: appt.clinic_id })
        results.push({ appointment_id: appt.id })
      }
      return { processed: results.length }
    }

    // ── 5. Post-cita 3 días después ─────────────────────────────────────
    case "post_appointment_3d": {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      const windowStart = new Date(threeDaysAgo); windowStart.setHours(0, 0, 0, 0)
      const windowEnd   = new Date(threeDaysAgo); windowEnd.setHours(23, 59, 59, 999)

      const { data: appts } = await supabase
        .from("appointments")
        .select("id, clinic_id, patients(name, phone), services(name, category)")
        .eq("status", "completed")
        .gte("start_time", windowStart.toISOString())
        .lte("start_time", windowEnd.toISOString())

      const results = []
      for (const appt of (appts ?? [])) {
        const patient = appt.patients as { name: string; phone: string } | null
        const service = appt.services as { name: string; category: string } | null
        if (!patient?.phone) continue

        const message = `Hola ${patient.name} 😊 Han pasado 3 días desde tu ${service?.name}. ¿Cómo te sentís? Si tenés alguna consulta, estoy aquí para ayudarte.`
        await processMessage({ phone: patient.phone, text: `[CRON:post_appt] ${message}`, clinicId: appt.clinic_id })
        results.push({ appointment_id: appt.id })
      }
      return { processed: results.length }
    }

    // ── 5b. Encuesta de satisfacción 3 días después ─────────────────────
    case "survey_request_3d": {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      const windowStart = new Date(threeDaysAgo); windowStart.setHours(0, 0, 0, 0)
      const windowEnd   = new Date(threeDaysAgo); windowEnd.setHours(23, 59, 59, 999)

      const { data: appts } = await supabase
        .from("appointments")
        .select("id, clinic_id, patient_id, patients(name, phone), clinics(settings)")
        .eq("status", "completed")
        .gte("start_time", windowStart.toISOString())
        .lte("start_time", windowEnd.toISOString())

      const results = []
      for (const appt of (appts ?? [])) {
        const patient = appt.patients as { name: string; phone: string } | null
        const clinic = appt.clinics as { settings: Record<string, unknown> } | null
        if (!patient?.phone) continue

        // Get clinic's active survey template
        const settings = clinic?.settings ?? {}
        const surveyTemplateId = settings.survey_template_id as string | null
        if (!surveyTemplateId) continue

        // Check if already sent survey for this appointment
        const { data: existing } = await supabase
          .from("survey_responses")
          .select("id")
          .eq("appointment_id", appt.id)
          .maybeSingle()
        if (existing) continue

        const surveyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/survey/${surveyTemplateId}?p=${appt.patient_id}&a=${appt.id}`
        const message = `Hola ${patient.name} 😊 Nos importa tu experiencia. ¿Podés tomarte 1 minuto para calificar tu visita? ${surveyUrl}`

        await processMessage({ phone: patient.phone, text: `[CRON:survey] ${message}`, clinicId: appt.clinic_id })
        results.push({ appointment_id: appt.id, patient: patient.name })
      }
      return { processed: results.length }
    }

    // ── 6. Solicitud de reseña 7 días después ───────────────────────────
    case "review_request_7d": {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const windowStart = new Date(sevenDaysAgo); windowStart.setHours(0, 0, 0, 0)
      const windowEnd   = new Date(sevenDaysAgo); windowEnd.setHours(23, 59, 59, 999)

      const { data: appts } = await supabase
        .from("appointments")
        .select("id, clinic_id, patients(name, phone), services(name), clinics(name, settings)")
        .eq("status", "completed")
        .gte("start_time", windowStart.toISOString())
        .lte("start_time", windowEnd.toISOString())

      const results = []
      for (const appt of (appts ?? [])) {
        const patient = appt.patients as { name: string; phone: string } | null
        const service = appt.services as { name: string } | null
        const clinic = appt.clinics as { name: string; settings: Record<string, unknown> } | null
        if (!patient?.phone) continue

        const googleLink = (clinic?.settings?.google_reviews_link as string) ?? ""
        const message = `Hola ${patient.name} ⭐ Esperamos que hayas quedado feliz con tu ${service?.name}. ¿Del 1 al 5, cómo calificás tu experiencia en ${clinic?.name}? ${googleLink ? `Si fue excelente, nos ayudarías mucho dejando una reseña: ${googleLink}` : ""}`

        await processMessage({ phone: patient.phone, text: `[CRON:review] ${message}`, clinicId: appt.clinic_id })
        results.push({ appointment_id: appt.id })
      }
      return { processed: results.length }
    }

    // ── 7. Follow-up leads no convertidos 3 días ────────────────────────
    case "followup_leads_3d": {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

      // Patients tagged as 'tibio' or 'caliente' but no appointment in last 3 days
      const { data: leads } = await supabase
        .from("patients")
        .select("id, name, phone, clinic_id, tags, created_at")
        .overlaps("tags", ["tibio", "caliente"])
        .gte("created_at", threeDaysAgo.toISOString())

      const results = []
      for (const lead of (leads ?? [])) {
        if (!lead.phone) continue

        // Check if they booked an appointment
        const { data: recentAppt } = await supabase
          .from("appointments")
          .select("id")
          .eq("patient_id", lead.id)
          .gte("created_at", threeDaysAgo.toISOString())
          .single()

        if (recentAppt) continue // Already converted

        const message = `Hola ${lead.name} 😊 Hace unos días consultaste sobre nuestros servicios. ¿Pudiste decidirte? Con gusto te cuento más o buscamos el mejor horario para vos.`
        await processMessage({ phone: lead.phone, text: `[CRON:lead_followup] ${message}`, clinicId: lead.clinic_id })
        results.push({ patient_id: lead.id })
      }
      return { processed: results.length }
    }

    // ── 8. Recordatorio tratamiento periódico (semanal) ─────────────────
    case "periodic_treatment_reminder": {
      const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      const fourMonthsAgo  = new Date(Date.now() - 120 * 24 * 60 * 60 * 1000)

      // Patients whose last appointment was 3-4 months ago (recurring services)
      const { data: patients } = await supabase
        .from("patients")
        .select("id, name, phone, clinic_id")
        .not("phone", "is", null)
        .limit(50)

      const results = []
      for (const patient of (patients ?? [])) {
        const { data: lastAppt } = await supabase
          .from("appointments")
          .select("start_time, services(name, category)")
          .eq("patient_id", patient.id)
          .eq("status", "completed")
          .order("start_time", { ascending: false })
          .limit(1)
          .single()

        if (!lastAppt) continue
        const lastDate = new Date(lastAppt.start_time)
        if (lastDate > threeMonthsAgo || lastDate < fourMonthsAgo) continue

        const service = lastAppt.services as { name: string; category: string } | null
        const monthsAgo = Math.round((Date.now() - lastDate.getTime()) / (30 * 24 * 60 * 60 * 1000))

        const message = `Hola ${patient.name} 💆 Hace ${monthsAgo} meses te hiciste ${service?.name ?? "tu último tratamiento"}. ¿Agendamos el siguiente? ¡Tenemos disponibilidad esta semana!`
        await processMessage({ phone: patient.phone, text: `[CRON:periodic] ${message}`, clinicId: patient.clinic_id })
        results.push({ patient_id: patient.id })
      }
      return { processed: results.length }
    }

    // ── 9. Auto no-show: marca citas no completadas 30 min después de end_time (cada 10 min) ──
    // DETECCIÓN: si end_time ya pasó hace ≥30 min y el status aún es confirmed/pending → no_show
    case "noshow_realtime_alert": {
      const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000)
      const sixtyMinAgo  = new Date(Date.now() - 60 * 60 * 1000)

      const { data: appts } = await supabase
        .from("appointments")
        .select("id, clinic_id, start_time, end_time, patients(name, phone), professionals(name), services(name)")
        .in("status", ["confirmed", "pending"])
        .gte("end_time", sixtyMinAgo.toISOString())   // not too old
        .lte("end_time", thirtyMinAgo.toISOString())  // end_time was ≥30 min ago

      for (const appt of (appts ?? [])) {
        // Mark as no_show
        await supabase.from("appointments").update({ status: "no_show" }).eq("id", appt.id)

        const patient = appt.patients as { name: string; phone: string } | null
        const prof = appt.professionals as { name: string } | null
        const service = appt.services as { name: string } | null

        // Email alert to owner
        const { data: clinicData } = await supabase.from("clinics").select("name, email, settings").eq("id", appt.clinic_id).single()
        const cSettings = (clinicData?.settings ?? {}) as Record<string, unknown>
        const ownerEmail = (cSettings.owner_email as string) ?? clinicData?.email
        if (ownerEmail && patient?.name) {
          void sendNoShowAlert({
            ownerEmail,
            clinicName: clinicData?.name ?? "Clínica",
            patientName: patient.name,
            patientPhone: patient.phone ?? "—",
            serviceName: service?.name ?? "—",
            professionalName: prof?.name ?? "—",
            appointmentTime: new Date(appt.start_time).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" }),
            appUrl: process.env.NEXT_PUBLIC_APP_URL,
          })
        }
        // In-app notification
        void createNotification({
          clinic_id: appt.clinic_id,
          type: "no_show",
          title: "No-show detectado automáticamente",
          description: `${patient?.name ?? "Paciente"} no se presentó para ${service?.name ?? "cita"} con ${prof?.name ?? "profesional"}`,
          link: "/agenda",
        })

        console.log(`[noshow_alert] ${patient?.name} no se presentó para ${service?.name} con ${prof?.name}`)
      }
      return { no_shows_detected: appts?.length ?? 0 }
    }

    // ── 10. Resumen diario al dueño (7am) ───────────────────────────────
    case "daily_summary_owner": {
      const { data: clinics } = await supabase.from("clinics").select("id, name, email, phone, settings").eq("onboarding_completed", true)

      const results = []
      for (const clinic of (clinics ?? [])) {
        const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
        const dayStart = new Date(yesterday); dayStart.setHours(0, 0, 0, 0)
        const dayEnd   = new Date(yesterday); dayEnd.setHours(23, 59, 59, 999)

        const [apptRes, noShowRes, convRes] = await Promise.all([
          supabase.from("appointments").select("id, status").eq("clinic_id", clinic.id).gte("start_time", dayStart.toISOString()).lte("start_time", dayEnd.toISOString()),
          supabase.from("appointments").select("id").eq("clinic_id", clinic.id).eq("status", "no_show").gte("start_time", dayStart.toISOString()).lte("start_time", dayEnd.toISOString()),
          supabase.from("conversations").select("id").eq("clinic_id", clinic.id).gte("started_at", dayStart.toISOString()),
        ])

        const total = apptRes.data?.length ?? 0
        const completed = apptRes.data?.filter((a) => a.status === "completed").length ?? 0
        const noShows = noShowRes.data?.length ?? 0
        const conversations = convRes.data?.length ?? 0

        // New patients today
        const { count: newPats } = await supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinic.id).gte("created_at", dayStart.toISOString()).lte("created_at", dayEnd.toISOString())

        // Tomorrow's appointments count
        const tomorrowStart = new Date(dayEnd); tomorrowStart.setDate(tomorrowStart.getDate() + 1); tomorrowStart.setHours(0, 0, 0, 0)
        const tomorrowEnd   = new Date(tomorrowStart); tomorrowEnd.setHours(23, 59, 59, 999)
        const { count: upcomingTomorrow } = await supabase.from("appointments").select("id", { count: "exact", head: true }).eq("clinic_id", clinic.id).in("status", ["pending", "confirmed"]).gte("start_time", tomorrowStart.toISOString()).lte("start_time", tomorrowEnd.toISOString())

        // Revenue for the day
        const { data: dayInvoices } = await supabase.from("invoices").select("total").eq("clinic_id", clinic.id).neq("status", "anulada").gte("created_at", dayStart.toISOString()).lte("created_at", dayEnd.toISOString())
        const revenue = (dayInvoices ?? []).reduce((s, i) => s + Number(i.total), 0)

        // Email daily summary to owner
        const cliSettings = (clinic.settings ?? {}) as Record<string, unknown>
        const ownerEmail = (cliSettings.owner_email as string) ?? clinic.email
        if (ownerEmail) {
          const escalated = convsRes.data?.length ?? 0 // simplified — would filter by status
          void sendDailySummary({
            ownerEmail,
            clinicName: clinic.name,
            date: dayStart.toLocaleDateString("es-CR", { timeZone: "America/Costa_Rica", day: "2-digit", month: "long", year: "numeric" }),
            appointmentsTotal: total,
            appointmentsCompleted: completed,
            noShows,
            newPatients: newPats ?? 0,
            agentConversations: conversations,
            agentEscalated: escalated,
            revenueEstimate: revenue,
            upcomingTomorrow: upcomingTomorrow ?? 0,
            appUrl: process.env.NEXT_PUBLIC_APP_URL,
          })
        }

        console.log(`[daily_summary] ${clinic.name}: ${total} citas, ${completed} completadas, ${noShows} no-shows, ${conversations} conversaciones agente`)
        results.push({ clinic: clinic.name, total, completed, noShows, conversations })
      }
      return { clinics_processed: results.length, summaries: results }
    }

    // ── 11. Notificación lead caliente (triggered by rate_lead tool) ────
    // This is event-driven, not time-based — handled in tool-handlers.ts
    case "hot_lead_notification": {
      return { message: "Este job es event-driven — se ejecuta desde rate_lead tool" }
    }

    // ── 12. Lista de espera check (triggered by cancel_appointment) ─────
    // This is event-driven — handled in tool-handlers.ts
    case "waitlist_check": {
      return { message: "Este job es event-driven — se ejecuta desde cancel_appointment tool" }
    }

    // ── 13. Métricas nocturnas (pre-cálculo para dashboard) ─────────────
    case "metrics_nightly": {
      const { data: clinics } = await supabase
        .from("clinics")
        .select("id")
        .eq("onboarding_completed", true)

      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      const dayStr = yesterday.toISOString().slice(0, 10) // YYYY-MM-DD
      const dayStart = new Date(`${dayStr}T00:00:00-06:00`)
      const dayEnd   = new Date(`${dayStr}T23:59:59-06:00`)

      const results = []
      for (const clinic of (clinics ?? [])) {
        const [apptsRes, invRes, patsRes, convsRes] = await Promise.all([
          supabase.from("appointments").select("id, status, patient_id, services(price)").eq("clinic_id", clinic.id).gte("start_time", dayStart.toISOString()).lte("start_time", dayEnd.toISOString()),
          supabase.from("invoices").select("id, total").eq("clinic_id", clinic.id).neq("status", "anulada").gte("created_at", dayStart.toISOString()).lte("created_at", dayEnd.toISOString()),
          supabase.from("patients").select("id").eq("clinic_id", clinic.id).gte("created_at", dayStart.toISOString()).lte("created_at", dayEnd.toISOString()),
          supabase.from("conversations").select("id, status").eq("clinic_id", clinic.id).gte("started_at", dayStart.toISOString()).lte("started_at", dayEnd.toISOString()),
        ])

        const appts = apptsRes.data ?? []
        const invs  = invRes.data ?? []
        const pats  = patsRes.data ?? []
        const convs = convsRes.data ?? []

        const totalRevenue = invs.reduce((s, i) => s + Number(i.total), 0)
        const completedAppts = appts.filter((a) => a.status === "completed").length
        const cancelledAppts = appts.filter((a) => a.status === "cancelled").length
        const noShowAppts    = appts.filter((a) => a.status === "no_show").length

        // Unique patients who attended
        const uniquePatients = new Set(appts.filter((a) => a.status === "completed").map((a) => a.patient_id)).size

        await supabase.from("metrics_daily").upsert({
          clinic_id: clinic.id,
          date: dayStr,
          revenue: totalRevenue,
          appointments_total: appts.length,
          appointments_completed: completedAppts,
          appointments_cancelled: cancelledAppts,
          appointments_noshow: noShowAppts,
          new_patients: pats.length,
          active_patients: uniquePatients,
          agent_conversations: convs.length,
          agent_escalated: convs.filter((c) => c.status === "escalated").length,
          agent_resolved: convs.filter((c) => c.status === "resolved").length,
        }, { onConflict: "clinic_id,date" })

        results.push({ clinic_id: clinic.id, date: dayStr, revenue: totalRevenue, appointments: appts.length })
      }
      return { date: dayStr, clinics_processed: results.length, results }
    }

    // ── 14. Trial ending reminder (day 12 of trial) ────────────────────
    case "trial_reminder": {
      const in2days = new Date()
      in2days.setDate(in2days.getDate() + 2)
      const windowStart = in2days.toISOString().slice(0, 10)

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("clinic_id, trial_ends_at")
        .eq("status", "trial")
        .gte("trial_ends_at", in2days.toISOString().slice(0, 10) + "T00:00:00")
        .lte("trial_ends_at", in2days.toISOString().slice(0, 10) + "T23:59:59")

      const results = []
      for (const sub of (subs ?? [])) {
        const { data: clinic } = await supabase.from("clinics").select("name, email, settings").eq("id", sub.clinic_id).single()
        if (!clinic) continue
        const settings = (clinic.settings ?? {}) as Record<string, unknown>
        const ownerEmail = (settings.owner_email as string) ?? clinic.email
        if (!ownerEmail) continue

        const msLeft = new Date(sub.trial_ends_at).getTime() - Date.now()
        const daysLeft = Math.max(1, Math.ceil(msLeft / 86400000))

        void sendTrialEndingEmail({
          ownerEmail,
          clinicName: clinic.name,
          daysLeft,
          appUrl: process.env.NEXT_PUBLIC_APP_URL,
        })
        results.push({ clinic_id: sub.clinic_id, days_left: daysLeft })
      }
      return { processed: results.length, results }
    }

    // ── 15. Billing monthly invoice ───────────────────────────────────────
    case "billing_monthly": {
      const { data: activeSubs } = await supabase
        .from("subscriptions")
        .select("clinic_id, plan, monthly_action_cap")
        .in("status", ["active", "past_due"])

      const results = []
      for (const sub of (activeSubs ?? [])) {
        try {
          await generateMonthlyInvoice(sub.clinic_id)

          // Get the just-created invoice to send email
          const { data: invoice } = await supabase
            .from("platform_invoices")
            .select("*")
            .eq("clinic_id", sub.clinic_id)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .single()

          if (invoice) {
            const { data: clinic } = await supabase.from("clinics").select("name, email, settings").eq("id", sub.clinic_id).single()
            if (clinic) {
              const settings = (clinic.settings ?? {}) as Record<string, unknown>
              const ownerEmail = (settings.owner_email as string) ?? clinic.email
              if (ownerEmail) {
                void sendPlatformInvoiceEmail({
                  ownerEmail,
                  clinicName: clinic.name,
                  invoiceNumber: invoice.invoice_number,
                  period: `${invoice.period_start} — ${invoice.period_end}`,
                  baseAmount: Number(invoice.base_amount),
                  actionsAmount: Number(invoice.actions_amount),
                  total: Number(invoice.total),
                  capApplied: invoice.cap_applied,
                  appUrl: process.env.NEXT_PUBLIC_APP_URL,
                })
              }
            }
            results.push({ clinic_id: sub.clinic_id, invoice_number: invoice.invoice_number, total: invoice.total })
          }
        } catch (err) {
          console.error(`[billing_monthly] Error para clinic ${sub.clinic_id}:`, err)
        }
      }
      return { processed: results.length, results }
    }

    // ── 16. Track confirmed appointments by agent ─────────────────────────
    case "track_confirmations": {
      // Find appointments confirmed via cron (confirmation_sent = true, created_by != agent)
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const { data: confirmedAppts } = await supabase
        .from("appointments")
        .select("id, clinic_id")
        .eq("confirmation_sent", true)
        .eq("status", "confirmed")
        .gte("updated_at", yesterday.toISOString())

      for (const appt of (confirmedAppts ?? [])) {
        void trackBillableAction(appt.clinic_id, "appointment_confirmed_by_agent", appt.id, "Cita confirmada por cron del agente")
      }

      return { processed: (confirmedAppts ?? []).length }
    }

    // ── 17. SINPE — expire pending payments ─────────────────────────────
    case "sinpe_expire": {
      const { expireSinpePayments } = await import("@/lib/payments/sinpe")
      const expired = await expireSinpePayments()
      return { expired }
    }

    // ── 18. ATV Hacienda — check pending invoice status ─────────────────
    case "hacienda_check_pending": {
      const { data: pending } = await supabase
        .from("electronic_invoices")
        .select("clave, clinic_id")
        .eq("estado_hacienda", "pendiente")
        .lt("sent_at", new Date(Date.now() - 5 * 60 * 1000).toISOString()) // older than 5 min
        .limit(50)

      const { checkInvoiceStatus } = await import("@/lib/billing/hacienda")
      let updated = 0
      for (const inv of (pending ?? [])) {
        const result = await checkInvoiceStatus(inv.clinic_id, inv.clave)
        if (result.estado !== "pendiente") updated++
      }
      return { checked: pending?.length ?? 0, updated }
    }

    default:
      return { error: `Job desconocido: ${job}` }
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("es-CR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Costa_Rica" }).format(date)
}

function formatDayName(date: Date): string {
  return new Intl.DateTimeFormat("es-CR", { weekday: "long", timeZone: "America/Costa_Rica" }).format(date)
}
