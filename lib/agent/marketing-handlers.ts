// @ts-nocheck
/**
 * Tool handlers for Agente 2: Marketing Agent
 * 15 tools — campaigns, social content, leads, email, analytics
 */

import { createServiceClient } from "@/lib/supabase/server"
import { trackBillableAction } from "@/lib/billing/subscription"

type ToolInput = Record<string, unknown>

export async function dispatchMarketingTool(
  clinicId: string,
  toolName: string,
  toolInput: ToolInput,
): Promise<string> {
  try {
    switch (toolName) {
      case "send_reactivation_campaign":    return await sendReactivationCampaign(clinicId, toolInput)
      case "send_birthday_campaign":        return await sendBirthdayCampaign(clinicId, toolInput)
      case "send_post_treatment_followup":  return await sendPostTreatmentFollowup(clinicId, toolInput)
      case "send_treatment_reminder":       return await sendTreatmentReminder(clinicId, toolInput)
      case "send_referral_request":         return await sendReferralRequest(clinicId, toolInput)
      case "send_seasonal_promo":           return await sendSeasonalPromo(clinicId, toolInput)
      case "generate_social_post":          return await generateSocialPost(clinicId, toolInput)
      case "create_content_calendar":       return await createContentCalendar(clinicId, toolInput)
      case "capture_instagram_lead":        return await captureInstagramLead(clinicId, toolInput)
      case "followup_unconverted_lead":     return await followupUnconvertedLead(clinicId, toolInput)
      case "track_campaign_results":        return await trackCampaignResults(clinicId, toolInput)
      case "get_marketing_segments":        return await getMarketingSegments(clinicId, toolInput)
      case "send_email_sequence":           return await sendEmailSequence(clinicId, toolInput)
      case "create_email_template":         return await createEmailTemplate(clinicId, toolInput)
      case "generate_marketing_report":     return await generateMarketingReport(clinicId, toolInput)
      default:
        return JSON.stringify({ error: `Tool desconocida: ${toolName}` })
    }
  } catch (err) {
    console.error(`[marketing-tool:${toolName}]`, err)
    return JSON.stringify({ error: String(err) })
  }
}

// ── HELPERS ──────────────────────────────────────────────────────────────────

function crTime(): string {
  return new Intl.DateTimeFormat("es-CR", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Costa_Rica",
  }).format(new Date())
}

function isWithinSendingHours(): boolean {
  const hour = parseInt(crTime().split(":")[0], 10)
  return hour >= 9 && hour < 19
}

async function sendWhatsApp(phone: string, message: string, clinicId: string): Promise<{ sent: boolean; note?: string }> {
  // In production: call whatsapp server or queue the message
  // For now: log + insert into outbound_messages queue
  const supabase = createServiceClient()

  if (!isWithinSendingHours()) {
    return { sent: false, note: "Fuera del horario de envío (9am–7pm CR)" }
  }

  await supabase.from("messages").insert({
    conversation_id: null, // outbound marketing messages don't require an active conversation
    role: "agent",
    content: message,
    metadata: { type: "marketing", clinic_id: clinicId, phone, sent_at: new Date().toISOString() },
  })

  console.log(`[marketing] WhatsApp → ${phone}: ${message.slice(0, 80)}...`)
  return { sent: true }
}

async function checkOptOut(patientId: string): Promise<boolean> {
  const supabase = createServiceClient()
  const { data } = await supabase.from("patients").select("opt_out_marketing").eq("id", patientId).single()
  return data?.opt_out_marketing ?? false
}

async function recordCampaignResult(
  campaignId: string,
  patientId: string,
  sent: boolean,
): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from("campaign_results").insert({
    campaign_id: campaignId,
    patient_id: patientId,
    sent_at: sent ? new Date().toISOString() : null,
    delivered: sent,
  })
}

// ── CAMPAIGN TOOLS ────────────────────────────────────────────────────────────

async function sendReactivationCampaign(clinicId: string, input: ToolInput): Promise<string> {
  const supabase = createServiceClient()
  const { segment_criteria, message_template, discount_percent } = input as {
    segment_criteria: { days_inactive?: number; service_category?: string; tags?: string[] }
    message_template: string
    discount_percent?: number
  }

  const daysInactive = segment_criteria.days_inactive ?? 60
  const since = new Date(Date.now() - daysInactive * 86400000).toISOString()

  // Find patients whose last appointment was before `since`
  const { data: candidates } = await supabase
    .from("patients")
    .select("id, name, phone, tags")
    .eq("clinic_id", clinicId)
    .eq("opt_out_marketing", false)
    .not("phone", "is", null)

  if (!candidates?.length) return JSON.stringify({ sent: 0, message: "No se encontraron candidatos" })

  // Filter: last appointment before `since`
  const qualified: typeof candidates = []
  for (const patient of candidates) {
    const { data: lastAppt } = await supabase
      .from("appointments")
      .select("start_time")
      .eq("patient_id", patient.id)
      .eq("status", "completed")
      .order("start_time", { ascending: false })
      .limit(1)
      .single()

    const lastVisit = lastAppt?.start_time
    if (!lastVisit || new Date(lastVisit) < new Date(since)) {
      qualified.push(patient)
    }
    if (qualified.length >= 50) break // safety cap
  }

  // Create campaign record
  const { data: campaign } = await supabase.from("campaigns").insert({
    clinic_id: clinicId,
    name: `Reactivación ${daysInactive}d — ${new Date().toLocaleDateString("es-CR")}`,
    type: "reactivation",
    channel: "whatsapp",
    segment_query: segment_criteria,
    message_template,
    is_automatic: true,
    requires_approval: false,
    status: "active",
  }).select().single()

  // Send messages
  let sent = 0
  const errors: string[] = []
  for (const patient of qualified) {
    const message = message_template
      .replace(/{nombre}/g, patient.name)
      .replace(/{descuento}/g, discount_percent ? `${discount_percent}%` : "")
    const result = await sendWhatsApp(patient.phone, message, clinicId)
    if (result.sent) {
      sent++
      if (campaign) await recordCampaignResult(campaign.id, patient.id, true)
      void trackBillableAction(clinicId, "campaign_message_sent", campaign?.id, "Mensaje reactivación")
    } else {
      errors.push(result.note ?? "error")
    }
  }

  return JSON.stringify({
    success: true,
    campaign_id: campaign?.id,
    candidates: qualified.length,
    sent,
    errors: errors.length > 0 ? errors.slice(0, 3) : undefined,
  })
}

async function sendBirthdayCampaign(clinicId: string, input: ToolInput): Promise<string> {
  const supabase = createServiceClient()
  const { patient_id, discount_percent, custom_message } = input as {
    patient_id: string
    discount_percent: number
    custom_message?: string
  }

  const optOut = await checkOptOut(patient_id)
  if (optOut) return JSON.stringify({ sent: false, reason: "Paciente con opt-out de marketing" })

  const { data: patient } = await supabase.from("patients").select("name, phone").eq("id", patient_id).single()
  if (!patient?.phone) return JSON.stringify({ sent: false, reason: "Paciente sin teléfono" })

  const message = custom_message ?? `¡Feliz cumpleaños ${patient.name}! 🎂🎉\n\nEn ${clinicId} queremos celebrar con vos. Como regalo especial, tenés un ${discount_percent}% de descuento en tu próximo tratamiento este mes.\n\nEscribinos "CUMPLE" para activar tu descuento y agendar. ¡Merecés consentirte! ✨\n\n_Respondé STOP para no recibir más mensajes_`

  const { sent } = await sendWhatsApp(patient.phone, message, clinicId)
  if (sent) void trackBillableAction(clinicId, "campaign_message_sent", patient_id, "Mensaje cumpleaños")

  return JSON.stringify({ success: sent, patient: patient.name, discount_percent })
}

async function sendPostTreatmentFollowup(clinicId: string, input: ToolInput): Promise<string> {
  const supabase = createServiceClient()
  const { appointment_id, include_next_visit_cta = true } = input as {
    appointment_id: string
    include_next_visit_cta?: boolean
  }

  const { data: appt } = await supabase
    .from("appointments")
    .select("patient_id, patients(name, phone), services(name, category, description)")
    .eq("id", appointment_id)
    .single()

  if (!appt) return JSON.stringify({ error: "Cita no encontrada" })

  const patient = appt.patients as { name: string; phone: string } | null
  const service = appt.services as { name: string; category?: string } | null
  if (!patient?.phone) return JSON.stringify({ sent: false, reason: "Sin teléfono" })

  const optOut = await checkOptOut(appt.patient_id)
  if (optOut) return JSON.stringify({ sent: false, reason: "opt-out activado" })

  const ctaText = include_next_visit_cta
    ? "\n\nCuando quieras agendar tu próxima visita, escribinos y te buscamos el mejor horario. 😊"
    : ""

  const message = `Hola ${patient.name} 👋\n\n¿Cómo te sentís 3 días después de tu ${service?.name}? Esperamos que estés notando los resultados.\n\nRecordatorio rápido de cuidados:\n• Mantené la zona bien hidratada\n• Protección solar todos los días es clave\n• Evitá exposición directa al sol esta semana\n\nSi tenés alguna consulta, estamos a tu disposición.${ctaText}\n\n_Respondé STOP para no recibir más mensajes_`

  const { sent } = await sendWhatsApp(patient.phone, message, clinicId)
  if (sent) void trackBillableAction(clinicId, "campaign_message_sent", appointment_id, "Seguimiento post-tratamiento")
  return JSON.stringify({ success: sent, patient: patient.name, service: service?.name })
}

async function sendTreatmentReminder(clinicId: string, input: ToolInput): Promise<string> {
  const supabase = createServiceClient()
  const { patient_id, service_name, months_since_last, suggested_service_id } = input as {
    patient_id: string
    service_name: string
    months_since_last: number
    suggested_service_id?: string
  }

  const optOut = await checkOptOut(patient_id)
  if (optOut) return JSON.stringify({ sent: false, reason: "opt-out activado" })

  const { data: patient } = await supabase.from("patients").select("name, phone").eq("id", patient_id).single()
  if (!patient?.phone) return JSON.stringify({ sent: false, reason: "Sin teléfono" })

  const message = `Hola ${patient.name} 👋\n\nHace ${months_since_last} ${months_since_last === 1 ? "mes" : "meses"} de tu último ${service_name}. ¡Es momento de darle amor a tu piel de nuevo! ✨\n\nEscribinos para agendar y te guardamos el mejor horario con tu profesional de confianza.\n\n_Respondé STOP para no recibir más mensajes_`

  const { sent } = await sendWhatsApp(patient.phone, message, clinicId)
  return JSON.stringify({ success: sent, patient: patient.name, service_name, months_since_last })
}

async function sendReferralRequest(clinicId: string, input: ToolInput): Promise<string> {
  const supabase = createServiceClient()
  const { patient_id, referral_discount } = input as { patient_id: string; referral_discount: number }

  // Verify patient has ≥2 completed appointments
  const { count } = await supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .eq("patient_id", patient_id)
    .eq("status", "completed")

  if ((count ?? 0) < 2) return JSON.stringify({ sent: false, reason: "Paciente necesita ≥2 citas completadas para referidos" })

  const optOut = await checkOptOut(patient_id)
  if (optOut) return JSON.stringify({ sent: false, reason: "opt-out activado" })

  const { data: patient } = await supabase.from("patients").select("name, phone").eq("id", patient_id).single()
  if (!patient?.phone) return JSON.stringify({ sent: false, reason: "Sin teléfono" })

  const message = `Hola ${patient.name} 😊\n\n¡Nos encanta tenerte como paciente! Si conocés a alguien que querría conocer nuestros tratamientos, tenemos algo especial para vos:\n\n🎁 Por cada persona que nos referís, ambos reciben ${referral_discount}% de descuento en su próximo tratamiento.\n\nSolo compartí nuestro número con quien conozcas y que nos mencione tu nombre al escribir. ¡Así de fácil!\n\n_Respondé STOP para no recibir más mensajes_`

  const { sent } = await sendWhatsApp(patient.phone, message, clinicId)
  return JSON.stringify({ success: sent, patient: patient.name, referral_discount })
}

async function sendSeasonalPromo(clinicId: string, input: ToolInput): Promise<string> {
  const supabase = createServiceClient()
  const { campaign_name, segment, message, valid_until, service_id } = input as {
    campaign_name: string
    segment: { tags?: string[]; service_history?: string[]; min_visits?: number }
    message: string
    valid_until?: string
    service_id?: string
  }

  // Build patient query
  let query = supabase.from("patients").select("id, name, phone").eq("clinic_id", clinicId).eq("opt_out_marketing", false).not("phone", "is", null)
  if (segment.tags?.length) query = query.overlaps("tags", segment.tags)

  const { data: patients } = await query.limit(100)
  if (!patients?.length) return JSON.stringify({ sent: 0, message: "No se encontraron pacientes en el segmento" })

  const { data: campaign } = await supabase.from("campaigns").insert({
    clinic_id: clinicId,
    name: campaign_name,
    type: "custom_promo",
    channel: "whatsapp",
    segment_query: segment,
    message_template: message,
    is_automatic: false,
    requires_approval: false,
    status: "active",
    schedule: valid_until ? { valid_until } : null,
  }).select().single()

  let sent = 0
  for (const patient of patients) {
    const personalizedMsg = message.replace(/{nombre}/g, patient.name)
    const result = await sendWhatsApp(patient.phone, personalizedMsg, clinicId)
    if (result.sent) {
      sent++
      if (campaign) await recordCampaignResult(campaign.id, patient.id, true)
    }
  }

  return JSON.stringify({ success: true, campaign_id: campaign?.id, patients_targeted: patients.length, sent })
}

// ── SOCIAL CONTENT TOOLS ──────────────────────────────────────────────────────

async function generateSocialPost(clinicId: string, input: ToolInput): Promise<string> {
  const supabase = createServiceClient()
  const { topic, platform, content_pillar, psychological_trigger } = input as {
    topic: string
    platform: string
    content_pillar: string
    psychological_trigger?: string
  }

  const { data: clinic } = await supabase.from("clinics").select("name, settings").eq("id", clinicId).single()
  const brandName = clinic?.name ?? "la clínica"

  // Generate post structure — in production this calls Anthropic to generate rich content
  // For now: return a structured draft that the marketing agent uses in its response
  const draft = {
    id: `draft_${Date.now()}`,
    status: "draft_pending_approval",
    platform,
    content_pillar,
    psychological_trigger: psychological_trigger ?? "prueba_social",
    copy: `[DRAFT — requiere aprobación del dueño]\n\nTema: ${topic}\nPilar: ${content_pillar}\nPlataforma: ${platform}\nGatillo: ${psychological_trigger ?? "prueba_social"}\n\nCopy generado para ${brandName}:\n[El agente generará el copy completo en la respuesta]`,
    image_brief: `Imagen para ${topic} en estilo profesional médico/wellness. Colores de marca de ${brandName}.`,
    hashtags: `#clinicaestética #belleza #${topic.replace(/\s/g, "")} #costarica #pielradiante`,
    suggested_time: "Martes o jueves entre 7pm-9pm (mayor engagement)",
    created_at: new Date().toISOString(),
  }

  // Save as draft post
  await supabase.from("campaigns").insert({
    clinic_id: clinicId,
    name: `Post ${platform} — ${topic}`,
    type: "custom_promo",
    channel: "whatsapp",
    segment_query: { platform, content_pillar },
    message_template: draft.copy,
    is_automatic: false,
    requires_approval: true,
    status: "draft",
  })

  return JSON.stringify(draft)
}

async function createContentCalendar(clinicId: string, input: ToolInput): Promise<string> {
  const supabase = createServiceClient()
  const { weeks = 2, posts_per_week = 3, platforms = ["instagram_feed", "instagram_story"], focus_services } = input as {
    weeks: number
    posts_per_week: number
    platforms?: string[]
    focus_services?: string[]
  }

  const { data: services } = await supabase.from("services").select("id, name, category").eq("clinic_id", clinicId).eq("is_active", true)

  const pillars = ["educativo", "prueba_social", "tips_practicos", "oferta", "behind_the_scenes"]
  const pillarWeights = { educativo: 0.30, prueba_social: 0.25, tips_practicos: 0.25, oferta: 0.10, behind_the_scenes: 0.10 }

  const calendar = []
  const startDate = new Date()

  for (let week = 0; week < weeks; week++) {
    const weekPosts = []
    for (let post = 0; post < posts_per_week; post++) {
      const daysOffset = week * 7 + Math.floor((post / posts_per_week) * 7)
      const postDate = new Date(startDate.getTime() + daysOffset * 86400000)
      const pillar = pillars[Math.floor(Math.random() * pillars.length)]
      const platform = platforms[post % platforms.length]
      const service = services?.[Math.floor(Math.random() * (services?.length ?? 1))]

      weekPosts.push({
        date: postDate.toISOString().slice(0, 10),
        platform,
        content_pillar: pillar,
        suggested_topic: `${service?.name ?? "tratamiento"} — ${pillar}`,
        status: "pending_creation",
      })
    }
    calendar.push({ week: week + 1, posts: weekPosts })
  }

  return JSON.stringify({
    status: "draft_pending_approval",
    weeks,
    posts_per_week,
    total_posts: weeks * posts_per_week,
    calendar,
    note: "Calendario generado como DRAFT. El dueño debe aprobar antes de publicar.",
  })
}

async function captureInstagramLead(clinicId: string, input: ToolInput): Promise<string> {
  const supabase = createServiceClient()
  const { instagram_username, comment_text, post_topic, phone } = input as {
    instagram_username: string
    comment_text: string
    post_topic: string
    phone?: string
  }

  // Find or create patient record
  let patientId: string | null = null
  if (phone) {
    const { data: existing } = await supabase.from("patients").select("id").eq("clinic_id", clinicId).eq("phone", phone).single()
    patientId = existing?.id ?? null
  }

  if (!patientId) {
    const { data: newPatient } = await supabase.from("patients").insert({
      clinic_id: clinicId,
      name: instagram_username,
      phone: phone ?? null,
      source: "instagram",
      tags: ["lead", "instagram"],
      notes: `Lead desde Instagram. Comentó: "${comment_text}" en post sobre ${post_topic}`,
    }).select().single()
    patientId = newPatient?.id ?? null
  }

  const dmMessage = `¡Hola! 👋 Vi que te interesó nuestro contenido sobre ${post_topic}.\n\nCon gusto te doy más información. ¿Cuál es tu consulta o en qué te puedo ayudar? 😊\n\nEstamos aquí para asesorarte.`

  const result = phone
    ? await sendWhatsApp(phone, dmMessage, clinicId)
    : { sent: false, note: "Sin teléfono — solo registrado como lead" }

  return JSON.stringify({
    success: true,
    patient_id: patientId,
    instagram_username,
    dm_sent: result.sent,
    note: result.note ?? "Lead registrado en CRM",
  })
}

// ── LEAD MANAGEMENT ───────────────────────────────────────────────────────────

async function followupUnconvertedLead(clinicId: string, input: ToolInput): Promise<string> {
  const supabase = createServiceClient()
  const { patient_id, days_since_inquiry, service_of_interest } = input as {
    patient_id: string
    days_since_inquiry: number
    service_of_interest?: string
  }

  const optOut = await checkOptOut(patient_id)
  if (optOut) return JSON.stringify({ sent: false, reason: "opt-out activado" })

  const { data: patient } = await supabase.from("patients").select("name, phone").eq("id", patient_id).single()
  if (!patient?.phone) return JSON.stringify({ sent: false, reason: "Sin teléfono" })

  const serviceRef = service_of_interest ? ` sobre ${service_of_interest}` : ""
  const message = `Hola ${patient.name} 👋\n\nHace unos días nos preguntaste${serviceRef}. Quería compartirte el resultado de una paciente que recientemente pasó por un tratamiento similar:\n\n✨ "Súper satisfecha con los resultados — lo recomiendo 100%"\n\nSi todavía estás pensándolo, con gusto respondemos cualquier duda. ¿Qué te impide dar el paso? A veces una consulta gratuita ayuda a tomar la decisión. 😊\n\n_Respondé STOP para no recibir más mensajes_`

  const { sent } = await sendWhatsApp(patient.phone, message, clinicId)
  return JSON.stringify({ success: sent, patient: patient.name, days_since_inquiry, service_of_interest })
}

async function trackCampaignResults(clinicId: string, input: ToolInput): Promise<string> {
  const supabase = createServiceClient()
  const { campaign_id } = input as { campaign_id: string }

  const { data: campaign } = await supabase.from("campaigns").select("name, type, created_at").eq("id", campaign_id).eq("clinic_id", clinicId).single()
  if (!campaign) return JSON.stringify({ error: "Campaña no encontrada" })

  const { data: results } = await supabase.from("campaign_results").select("*").eq("campaign_id", campaign_id)
  const r = results ?? []

  const total = r.length
  const delivered = r.filter((x) => x.delivered).length
  const read = r.filter((x) => x.read_at).length
  const responded = r.filter((x) => x.responded).length
  const converted = r.filter((x) => x.converted).length
  const optOuts = r.filter((x) => x.opt_out).length

  // Revenue from converted appointments
  let revenueAttributed = 0
  for (const res of r.filter((x) => x.conversion_appointment_id)) {
    const { data: inv } = await supabase.from("invoices").select("total").eq("appointment_id", res.conversion_appointment_id).eq("clinic_id", clinicId).single()
    revenueAttributed += Number(inv?.total ?? 0)
  }

  return JSON.stringify({
    campaign_name: campaign.name,
    campaign_type: campaign.type,
    total_sent: total,
    delivered,
    read,
    responded,
    converted,
    opt_outs: optOuts,
    revenue_attributed: revenueAttributed,
    conversion_rate: total > 0 ? `${Math.round((converted / total) * 100)}%` : "0%",
    read_rate: total > 0 ? `${Math.round((read / total) * 100)}%` : "0%",
  })
}

async function getMarketingSegments(clinicId: string, _input: ToolInput): Promise<string> {
  const supabase = createServiceClient()

  const now = new Date()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000).toISOString()
  const today = now.toISOString().slice(5, 10) // MM-DD

  const [totalPats, inactiveCount, birthdayCount, leadCount] = await Promise.all([
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("opt_out_marketing", false),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("opt_out_marketing", false),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("opt_out_marketing", false),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("opt_out_marketing", false).contains("tags", ["lead"]),
  ])

  return JSON.stringify({
    segments: [
      { name: "Todos los pacientes activos", size: totalPats.count ?? 0, type: "all" },
      { name: "Inactivos 60+ días (reactivación)", size: Math.floor((totalPats.count ?? 0) * 0.3), type: "reactivation", note: "Estimado — usar send_reactivation_campaign para exactitud" },
      { name: "Cumpleaños hoy", size: birthdayCount.count ?? 0, type: "birthday" },
      { name: "Leads sin convertir", size: leadCount.count ?? 0, type: "unconverted_leads" },
    ],
    note: "Segmentos disponibles para campañas. Usá las herramientas de campaña para envíos precisos con filtros adicionales.",
  })
}

// ── EMAIL SEQUENCES ───────────────────────────────────────────────────────────

async function sendEmailSequence(clinicId: string, input: ToolInput): Promise<string> {
  const supabase = createServiceClient()
  const { patient_id, sequence_type, appointment_id } = input as {
    patient_id: string
    sequence_type: "bienvenida" | "reactivacion" | "post_tratamiento"
    appointment_id?: string
  }

  const optOut = await checkOptOut(patient_id)
  if (optOut) return JSON.stringify({ sent: false, reason: "opt-out activado" })

  const { data: patient } = await supabase.from("patients").select("name, email, phone").eq("id", patient_id).single()
  if (!patient?.email && !patient?.phone) return JSON.stringify({ sent: false, reason: "Sin email ni teléfono" })

  const sequences = {
    bienvenida: { emails: 3, days: [0, 5, 10], description: "Bienvenida + tips + testimonios + oferta segunda visita" },
    reactivacion: { emails: 2, days: [0, 7], description: "Te extrañamos + oferta limitada" },
    post_tratamiento: { emails: 2, days: [3, 14], description: "Instrucciones cuidado + oferta complementario" },
  }

  const seq = sequences[sequence_type]

  // In production: use Resend to send actual emails and schedule follow-ups
  // For now: log the sequence and save as pending emails
  const scheduled = seq.days.map((day, i) => ({
    email: i + 1,
    send_at: new Date(Date.now() + day * 86400000).toISOString().slice(0, 10),
    status: day === 0 ? "pending_send_now" : "scheduled",
  }))

  console.log(`[email-sequence:${sequence_type}] ${patient.name} (${patient.email}) — ${seq.emails} emails`)

  return JSON.stringify({
    success: true,
    patient: patient.name,
    sequence_type,
    description: seq.description,
    emails_scheduled: seq.emails,
    schedule: scheduled,
    note: "Integración con Resend requerida para envíos reales. ENV: RESEND_API_KEY",
  })
}

async function createEmailTemplate(clinicId: string, input: ToolInput): Promise<string> {
  const supabase = createServiceClient()
  const { template_type, subject, body, segment } = input as {
    template_type: string
    subject: string
    body: string
    segment?: Record<string, unknown>
  }

  await supabase.from("campaigns").insert({
    clinic_id: clinicId,
    name: `Email Template: ${template_type} — ${subject.slice(0, 40)}`,
    type: "custom_promo",
    channel: "email" as any,
    segment_query: segment ?? {},
    message_template: `SUBJECT: ${subject}\n\n${body}`,
    is_automatic: false,
    requires_approval: true,
    status: "draft",
  })

  return JSON.stringify({
    success: true,
    status: "draft_pending_approval",
    template_type,
    subject,
    segment,
    note: "Template guardado como DRAFT. Requiere aprobación del dueño antes de usar.",
  })
}

// ── ANALYTICS ─────────────────────────────────────────────────────────────────

async function generateMarketingReport(clinicId: string, input: ToolInput): Promise<string> {
  const supabase = createServiceClient()
  const { period_days = 7, include_recommendations = true } = input as {
    period_days?: number
    include_recommendations?: boolean
  }

  const since = new Date(Date.now() - period_days * 86400000).toISOString()

  const [campaignsRes, resultsRes, newPatsRes] = await Promise.all([
    supabase.from("campaigns").select("id, name, type, status, created_at").eq("clinic_id", clinicId).gte("created_at", since),
    supabase.from("campaign_results").select("delivered, read_at, responded, converted, opt_out").gte("sent_at", since),
    supabase.from("patients").select("id", { count: "exact", head: true }).eq("clinic_id", clinicId).eq("source", "instagram").gte("created_at", since),
  ])

  const campaigns = campaignsRes.data ?? []
  const results = resultsRes.data ?? []
  const instagramLeads = newPatsRes.count ?? 0

  const totalSent = results.length
  const totalRead = results.filter((r) => r.read_at).length
  const totalConverted = results.filter((r) => r.converted).length
  const totalOptOuts = results.filter((r) => r.opt_out).length
  const readRate = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0
  const conversionRate = totalSent > 0 ? Math.round((totalConverted / totalSent) * 100) : 0

  const report: Record<string, unknown> = {
    period_days,
    generated_at: new Date().toLocaleString("es-CR", { timeZone: "America/Costa_Rica" }),
    campaigns_sent: campaigns.length,
    messages_sent: totalSent,
    messages_read: totalRead,
    read_rate: `${readRate}%`,
    conversions: totalConverted,
    conversion_rate: `${conversionRate}%`,
    opt_outs: totalOptOuts,
    instagram_leads: instagramLeads,
    active_campaigns: campaigns.filter((c) => c.status === "active").length,
  }

  if (include_recommendations) {
    const recs = []
    if (readRate < 40) recs.push("La tasa de lectura está baja. Probá mensajes más cortos y con gancho emocional en la primera línea.")
    if (conversionRate < 10) recs.push("Pocos leads se convierten en citas. Considerá agregar un CTA más directo + oferta de tiempo limitado.")
    if (totalOptOuts > totalSent * 0.05) recs.push("La tasa de opt-out es alta. Reducí la frecuencia de mensajes — máximo 1 por semana por paciente.")
    if (campaigns.filter((c) => c.type === "birthday").length === 0) recs.push("No enviaste campañas de cumpleaños esta semana. Activá el cron de cumpleaños para hacerlo automático.")
    if (recs.length === 0) recs.push("Buen rendimiento general. Continuá con la frecuencia actual y considerá A/B testing en asuntos de email.")
    report.recommendations = recs
  }

  return JSON.stringify(report)
}
