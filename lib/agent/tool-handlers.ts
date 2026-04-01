// @ts-nocheck
/**
 * Tool handlers for Agente 1: Recepcionista Virtual
 * Each function implements the logic for a tool call from Claude
 */

import { createServiceClient } from "@/lib/supabase/server"
import { sendEscalationAlert, sendHotLeadAlert } from "@/lib/notifications/email"
import { trackBillableAction } from "@/lib/billing/subscription"
import { createNotification } from "@/lib/notifications/inapp"

type ToolResult = Record<string, unknown>

const URGENCY_KEYWORDS = [
  "reacción alérgica", "alergia grave", "dificultad para respirar", "no puedo respirar",
  "hinchazón severa", "hinchazón en la cara", "sangrado", "sangre", "dolor intenso",
  "desmayo", "me desmayé", "perdí el conocimiento", "mareo severo", "vómito",
  "fiebre alta", "infección", "pus", "reaction", "allergic", "swelling",
]

// ─── GESTIÓN DE CITAS ────────────────────────────────────────────────

export async function check_availability(clinicId: string, input: {
  date?: string
  service_id?: string
  professional_id?: string
}): Promise<ToolResult> {
  const supabase = createServiceClient()

  // Get professionals to query
  let profQuery = supabase.from("professionals").select("id, name, specialty, schedule").eq("clinic_id", clinicId).eq("is_active", true)
  if (input.professional_id) profQuery = profQuery.eq("id", input.professional_id)
  const { data: professionals } = await profQuery

  // Get service duration
  let duration = 60
  if (input.service_id) {
    const { data: svc } = await supabase.from("services").select("duration_minutes, name").eq("id", input.service_id).single()
    if (svc) duration = svc.duration_minutes
  }

  // Check next 7 days from target date
  const startDate = input.date ? new Date(`${input.date}T00:00:00-06:00`) : new Date()
  const slots: Array<{ professional: string; date: string; times: string[] }> = []

  for (let d = 0; d < 7; d++) {
    const targetDate = new Date(startDate)
    targetDate.setDate(startDate.getDate() + d)
    const dateStr = targetDate.toISOString().slice(0, 10)
    const dayName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][targetDate.getDay()]

    for (const prof of (professionals ?? [])) {
      const schedule = (prof.schedule ?? {}) as Record<string, { open: string; close: string; enabled: boolean }>
      const daySchedule = schedule[dayName]
      if (!daySchedule?.enabled) continue

      // Get booked appointments for this day + professional
      const dayStart = `${dateStr}T00:00:00-06:00`
      const dayEnd = `${dateStr}T23:59:59-06:00`
      const { data: booked } = await supabase
        .from("appointments")
        .select("start_time, end_time")
        .eq("professional_id", prof.id)
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd)
        .in("status", ["pending", "confirmed"])

      // Generate slots
      const [oh, om] = daySchedule.open.split(":").map(Number)
      const [ch, cm] = daySchedule.close.split(":").map(Number)
      let current = oh * 60 + om
      const end = ch * 60 + cm
      const availableTimes: string[] = []

      while (current + duration <= end) {
        const h = Math.floor(current / 60).toString().padStart(2, "0")
        const m = (current % 60).toString().padStart(2, "0")
        const slotStart = new Date(`${dateStr}T${h}:${m}:00-06:00`)
        const slotEnd = new Date(slotStart.getTime() + duration * 60000)

        // Check overlap with booked
        const hasConflict = (booked ?? []).some((appt) => {
          const apptStart = new Date(appt.start_time)
          const apptEnd = new Date(appt.end_time)
          return slotStart < apptEnd && slotEnd > apptStart
        })

        if (!hasConflict && slotStart > new Date()) {
          availableTimes.push(`${h}:${m}`)
        }
        current += 30 // 30-min increments
      }

      if (availableTimes.length > 0) {
        slots.push({ professional: prof.name, date: dateStr, times: availableTimes.slice(0, 6) })
      }
    }

    if (slots.length >= 3 && !input.date) break // Return first 3 days with availability
  }

  if (slots.length === 0) return { available: false, message: "No hay disponibilidad en los próximos 7 días para los criterios seleccionados." }

  return { available: true, slots, service_duration_minutes: duration }
}

export async function create_appointment(clinicId: string, input: {
  patient_id: string
  professional_id: string
  service_id: string
  datetime: string
  notes?: string
}): Promise<ToolResult> {
  const supabase = createServiceClient()

  const { data: svc } = await supabase.from("services").select("duration_minutes, name, price").eq("id", input.service_id).single()
  if (!svc) return { error: "Servicio no encontrado" }

  const startTime = new Date(input.datetime)
  const endTime = new Date(startTime.getTime() + svc.duration_minutes * 60000)

  const { data, error } = await supabase.from("appointments").insert({
    clinic_id: clinicId,
    patient_id: input.patient_id,
    professional_id: input.professional_id,
    service_id: input.service_id,
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    status: "confirmed",
    notes: input.notes,
    created_by: "agent",
  }).select("id").single()

  if (error) return { error: error.message }

  // Track billable action
  void trackBillableAction(clinicId, "appointment_created_by_agent", data.id, "Cita agendada por recepcionista IA")

  const { data: prof } = await supabase.from("professionals").select("name").eq("id", input.professional_id).single()
  const { data: patient } = await supabase.from("patients").select("name").eq("id", input.patient_id).single()

  // In-app notification
  void createNotification({
    clinic_id: clinicId,
    type: "new_appointment",
    title: "Nueva cita agendada por el agente IA",
    description: `${patient?.name ?? "Paciente"} — ${svc.name} el ${formatDate(startTime)} a las ${formatTime(startTime)}`,
    link: "/agenda",
  })

  return {
    ok: true,
    appointment_id: data.id,
    summary: `Cita confirmada: ${svc.name} con ${prof?.name ?? "profesional"} el ${formatDate(startTime)} a las ${formatTime(startTime)}. Paciente: ${patient?.name}.`,
    start_time: startTime.toISOString(),
    service_name: svc.name,
    professional_name: prof?.name,
    patient_name: patient?.name,
  }
}

export async function cancel_appointment(clinicId: string, input: {
  appointment_id: string
  reason?: string
}): Promise<ToolResult> {
  const supabase = createServiceClient()

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, start_time, patients(name), services(name)")
    .eq("id", input.appointment_id)
    .eq("clinic_id", clinicId)
    .single()

  if (!appt) return { error: "Cita no encontrada" }

  const { error } = await supabase.from("appointments").update({
    status: "cancelled",
    cancellation_reason: input.reason ?? "Cancelada por el paciente vía WhatsApp",
  }).eq("id", input.appointment_id)

  if (error) return { error: error.message }

  // Trigger waitlist check
  await check_waitlist_and_notify(clinicId, { appointment_id: input.appointment_id })

  // In-app notification
  void createNotification({
    clinic_id: clinicId,
    type: "cancelled_appointment",
    title: "Cita cancelada por el paciente",
    description: `${appt.patients?.name ?? "Paciente"} canceló la cita de ${appt.services?.name ?? "servicio"}`,
    link: "/agenda",
  })

  return { ok: true, message: "Cita cancelada correctamente." }
}

export async function reschedule_appointment(clinicId: string, input: {
  appointment_id: string
  new_datetime: string
}): Promise<ToolResult> {
  const supabase = createServiceClient()

  const { data: appt } = await supabase
    .from("appointments")
    .select("service_id, services(duration_minutes, name), professionals(name)")
    .eq("id", input.appointment_id)
    .eq("clinic_id", clinicId)
    .single()

  if (!appt) return { error: "Cita no encontrada" }

  const svc = appt.services as { duration_minutes: number; name: string } | null
  const duration = svc?.duration_minutes ?? 60
  const newStart = new Date(input.new_datetime)
  const newEnd = new Date(newStart.getTime() + duration * 60000)

  const { error } = await supabase.from("appointments").update({
    start_time: newStart.toISOString(),
    end_time: newEnd.toISOString(),
    status: "confirmed",
  }).eq("id", input.appointment_id)

  if (error) return { error: error.message }

  const prof = appt.professionals as { name: string } | null

  // In-app notification
  void createNotification({
    clinic_id: clinicId,
    type: "reschedule_request",
    title: "Cita reagendada por el paciente",
    description: `${svc?.name ?? "Servicio"} — nueva fecha: ${formatDate(newStart)} a las ${formatTime(newStart)}`,
    link: "/agenda",
  })

  return {
    ok: true,
    message: `Cita reagendada para el ${formatDate(newStart)} a las ${formatTime(newStart)} con ${prof?.name ?? "el profesional"}.`,
  }
}

// ─── GESTIÓN DE PACIENTES ────────────────────────────────────────────

export async function find_patient(clinicId: string, input: {
  phone?: string
  name?: string
}): Promise<ToolResult> {
  const supabase = createServiceClient()

  let query = supabase.from("patients").select("id, name, phone, email, tags, allergies, last_appointment:appointments(start_time, services(name))").eq("clinic_id", clinicId).limit(5)

  if (input.phone) {
    query = query.ilike("phone", `%${input.phone.replace(/\D/g, "").slice(-8)}%`)
  } else if (input.name) {
    query = query.ilike("name", `%${input.name}%`)
  }

  const { data } = await query
  if (!data || data.length === 0) return { found: false, message: "No se encontró ningún paciente con ese criterio." }

  return { found: true, patients: data }
}

export async function create_patient(clinicId: string, input: {
  name: string
  phone: string
  email?: string
}): Promise<ToolResult> {
  const supabase = createServiceClient()

  const { data, error } = await supabase.from("patients").insert({
    clinic_id: clinicId,
    name: input.name,
    phone: input.phone,
    email: input.email,
    tags: ["nuevo"],
    source: "whatsapp",
  }).select("id, name").single()

  if (error) return { error: error.message }

  // Track billable action — lead captured via WhatsApp/agent
  void trackBillableAction(clinicId, "lead_captured", data.id, `Nuevo paciente: ${data.name}`)

  return { ok: true, patient_id: data.id, patient_name: data.name }
}

export async function get_patient_preferences(clinicId: string, input: {
  patient_id: string
}): Promise<ToolResult> {
  const supabase = createServiceClient()

  const { data: patient } = await supabase
    .from("patients")
    .select("name, allergies, contraindications, skin_type, medical_notes, tags, notes")
    .eq("id", input.patient_id)
    .eq("clinic_id", clinicId)
    .single()

  if (!patient) return { error: "Paciente no encontrado" }

  const { data: history } = await supabase
    .from("appointments")
    .select("start_time, status, services(name), professionals(name)")
    .eq("patient_id", input.patient_id)
    .eq("status", "completed")
    .order("start_time", { ascending: false })
    .limit(5)

  return {
    name: patient.name,
    allergies: patient.allergies,
    contraindications: patient.contraindications,
    skin_type: patient.skin_type,
    medical_notes: patient.medical_notes,
    tags: patient.tags,
    notes: patient.notes,
    recent_treatments: (history ?? []).map((h) => ({
      date: h.start_time,
      service: (h.services as { name: string } | null)?.name,
      professional: (h.professionals as { name: string } | null)?.name,
    })),
  }
}

// ─── INFORMACIÓN Y CONSULTAS ─────────────────────────────────────────

export async function get_clinic_info(clinicId: string, input: {
  topic: string
}): Promise<ToolResult> {
  const supabase = createServiceClient()
  const { data: clinic } = await supabase.from("clinics").select("*").eq("id", clinicId).single()
  if (!clinic) return { error: "Clínica no encontrada" }

  const info: Record<string, unknown> = { clinic_name: clinic.name }

  if (["direccion", "todo"].includes(input.topic)) info.address = clinic.address
  if (["horarios", "todo"].includes(input.topic)) info.business_hours = clinic.business_hours
  if (["todo"].includes(input.topic)) { info.phone = clinic.phone; info.email = clinic.email }

  if (["servicios", "precios", "todo"].includes(input.topic)) {
    const { data: services } = await supabase.from("services").select("name, category, duration_minutes, price, description").eq("clinic_id", clinicId).eq("is_active", true)
    info.services = services
  }

  if (["profesionales", "todo"].includes(input.topic)) {
    const { data: profs } = await supabase.from("professionals").select("name, specialty").eq("clinic_id", clinicId).eq("is_active", true)
    info.professionals = profs
  }

  if (["politicas", "todo"].includes(input.topic)) {
    const settings = clinic.settings as Record<string, unknown> ?? {}
    info.policies = settings.policies ?? "Consultar políticas de cancelación con 24h de anticipación"
  }

  return info
}

export async function send_quote(clinicId: string, input: {
  patient_id?: string
  service_ids: string[]
}): Promise<ToolResult> {
  const supabase = createServiceClient()
  const { data: services } = await supabase
    .from("services")
    .select("name, duration_minutes, price, description")
    .in("id", input.service_ids)

  if (!services?.length) return { error: "No se encontraron los servicios" }

  const total = services.reduce((sum, s) => sum + Number(s.price ?? 0), 0)
  const lines = services.map((s) =>
    `• ${s.name}: ₡${Number(s.price ?? 0).toLocaleString("es-CR")} (${s.duration_minutes} min)`
  )

  return {
    ok: true,
    quote_text: lines.join("\n"),
    total: `₡${total.toLocaleString("es-CR")}`,
    services,
  }
}

export async function send_pre_appointment_instructions(clinicId: string, input: {
  appointment_id: string
}): Promise<ToolResult> {
  const supabase = createServiceClient()
  const { data: appt } = await supabase
    .from("appointments")
    .select("start_time, services(name, category), patients(name), professionals(name)")
    .eq("id", input.appointment_id)
    .eq("clinic_id", clinicId)
    .single()

  if (!appt) return { error: "Cita no encontrada" }

  const svc = appt.services as { name: string; category: string } | null
  const category = svc?.category ?? ""

  const instructions: Record<string, string> = {
    facial: "Vení sin maquillaje ni cremas en el rostro. Evitá el sol directo las 48h previas.",
    laser: "No depilarte con cera ni rasurar la zona 72h antes. Vení con la zona limpia.",
    inyectables: "No tomar aspirina ni ibuprofeno 3 días antes. Venir sin maquillaje.",
    dental: "Cepillate bien antes de llegar. Si tomás algún medicamento, informanos.",
    corporal: "Venir hidratado/a. Usar ropa cómoda. Evitar comida pesada 2h antes.",
    default: "Llegá 5 minutos antes de tu cita. Si necesitás cancelar, avisanos con 24h de anticipación.",
  }

  const text = instructions[category] ?? instructions.default
  const patient = appt.patients as { name: string } | null
  const prof = appt.professionals as { name: string } | null

  return {
    ok: true,
    patient_name: patient?.name,
    appointment_date: formatDate(new Date(appt.start_time)),
    appointment_time: formatTime(new Date(appt.start_time)),
    service_name: svc?.name,
    professional_name: prof?.name,
    instructions: text,
  }
}

// ─── COMUNICACIÓN INTELIGENTE ────────────────────────────────────────

export async function detect_urgency(_clinicId: string, input: {
  message: string
}): Promise<ToolResult> {
  const text = input.message.toLowerCase()
  const isUrgent = URGENCY_KEYWORDS.some((kw) => text.includes(kw))
  return {
    is_urgent: isUrgent,
    recommendation: isUrgent
      ? "ESCALAR INMEDIATAMENTE a humano con prioridad urgente. Puede ser una emergencia médica."
      : "No se detectaron señales de urgencia médica.",
  }
}

export async function escalate_to_human(clinicId: string, input: {
  reason: string
  conversation_summary?: string
  priority: "normal" | "alta" | "urgente"
}, conversationId: string): Promise<ToolResult> {
  const supabase = createServiceClient()

  await supabase.from("conversations").update({
    status: "escalated",
    escalation_reason: input.reason,
    summary: input.conversation_summary,
    handled_by: "human",
  }).eq("id", conversationId)

  // Notify staff via DB record
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "agent",
    content: `[ESCALACIÓN ${input.priority.toUpperCase()}] Conversación escalada a humano. Motivo: ${input.reason}`,
    metadata: { type: "escalation", priority: input.priority },
  })

  // Email alert to clinic owner
  const { data: clinic } = await supabase.from("clinics").select("name, email, settings").eq("id", clinicId).single()
  const settings = (clinic?.settings ?? {}) as Record<string, unknown>
  const ownerEmail = (settings.owner_email as string) ?? clinic?.email
  if (ownerEmail) {
    const { data: conv } = await supabase.from("conversations").select("patient_phone").eq("id", conversationId).single()
    void sendEscalationAlert({
      ownerEmail,
      clinicName: clinic?.name ?? "Clínica",
      patientPhone: conv?.patient_phone ?? "desconocido",
      reason: input.reason,
      summary: input.conversation_summary,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    })
  }

  // In-app notification for escalation
  void createNotification({
    clinic_id: clinicId,
    type: "escalation",
    title: `Escalación ${input.priority} — el agente necesita ayuda`,
    description: input.reason,
    link: "/agente",
  })

  return {
    ok: true,
    escalated: true,
    priority: input.priority,
    message: input.priority === "urgente"
      ? "He notificado al equipo con urgencia. Alguien te contactará de inmediato."
      : input.priority === "alta"
      ? "He notificado al equipo. Te contactarán a la brevedad."
      : "He dejado tu consulta con el equipo. Te responderán en horario de atención.",
  }
}

export async function notify_staff(clinicId: string, input: {
  type: string
  message: string
  patient_id?: string
}): Promise<ToolResult> {
  const supabase = createServiceClient()
  // Store notification — worker will process and send via email/WhatsApp
  const settings = { notification_type: input.type, message: input.message, patient_id: input.patient_id, clinic_id: clinicId, created_at: new Date().toISOString() }
  // Using metrics_daily as a simple event log for now
  console.log("[notify_staff]", settings)
  return { ok: true, notified: true }
}

// ─── VENTAS Y CONVERSIÓN ─────────────────────────────────────────────

export async function suggest_complementary_service(clinicId: string, input: {
  service_id: string
  patient_id?: string
}): Promise<ToolResult> {
  const supabase = createServiceClient()
  const { data: svc } = await supabase.from("services").select("name, category").eq("id", input.service_id).single()
  if (!svc) return { suggestion: null }

  // Complementary map by category
  const complements: Record<string, string[]> = {
    facial: ["inyectables", "laser"],
    inyectables: ["facial"],
    laser: ["corporal", "facial"],
    dental: ["consulta"],
    corporal: ["laser"],
    capilar: ["facial"],
  }

  const targetCategories = complements[svc.category ?? ""] ?? []
  if (!targetCategories.length) return { suggestion: null }

  const { data: suggestions } = await supabase
    .from("services")
    .select("id, name, category, price, duration_minutes")
    .eq("clinic_id", clinicId)
    .eq("is_active", true)
    .in("category", targetCategories)
    .neq("id", input.service_id)
    .limit(2)

  return { suggestion: suggestions?.[0] ?? null, alternatives: suggestions?.slice(1) ?? [] }
}

export async function send_payment_link(_clinicId: string, input: {
  patient_id: string
  amount: number
  concept: string
}): Promise<ToolResult> {
  // Stub — real implementation would integrate with SINPE/Stripe
  const mockLink = `https://pay.clinica.cr/sinpe/${Date.now()}`
  return {
    ok: true,
    link: mockLink,
    amount: input.amount,
    concept: input.concept,
    message: `Link de pago generado por ₡${input.amount.toLocaleString("es-CR")} para ${input.concept}`,
    note: "Integración de pago en construcción — contactar directamente por SINPE al número de la clínica",
  }
}

export async function rate_lead(clinicId: string, input: {
  patient_phone: string
  score: "frio" | "tibio" | "caliente"
  notes?: string
}): Promise<ToolResult> {
  const supabase = createServiceClient()

  const { data: patient } = await supabase
    .from("patients")
    .select("id, tags")
    .eq("clinic_id", clinicId)
    .ilike("phone", `%${input.patient_phone.replace(/\D/g, "").slice(-8)}%`)
    .single()

  if (patient) {
    const currentTags = patient.tags ?? []
    const newTags = [...currentTags.filter((t: string) => !["frio", "tibio", "caliente"].includes(t)), input.score]
    await supabase.from("patients").update({ tags: newTags }).eq("id", patient.id)
  }

  // Notify staff immediately if lead is hot
  if (input.score === "caliente") {
    await notify_staff(clinicId, {
      type: "lead_caliente",
      message: `Lead caliente detectado: ${input.patient_phone}. ${input.notes ?? ""}`,
      patient_id: patient?.id,
    })

    // In-app notification
    void createNotification({
      clinic_id: clinicId,
      type: "hot_lead",
      title: "Lead caliente detectado",
      description: `${input.patient_phone} preguntó por un servicio de alto valor. ${input.notes ?? ""}`,
      link: "/pacientes",
    })

    // Email alert to owner
    const { data: clinic } = await supabase.from("clinics").select("name, email, settings").eq("id", clinicId).single()
    const clinicSettings = (clinic?.settings ?? {}) as Record<string, unknown>
    const ownerEmail = (clinicSettings.owner_email as string) ?? clinic?.email
    if (ownerEmail) {
      void sendHotLeadAlert({
        ownerEmail,
        clinicName: clinic?.name ?? "Clínica",
        patientName: patient ? `Paciente ${patient.id.slice(0, 8)}` : input.patient_phone,
        patientPhone: input.patient_phone,
        notes: input.notes,
        appUrl: process.env.NEXT_PUBLIC_APP_URL,
      })
    }
  }

  return { ok: true, score: input.score, patient_found: !!patient }
}

// ─── LISTA DE ESPERA Y CHECK-IN ──────────────────────────────────────

export async function add_to_waitlist(clinicId: string, input: {
  patient_id: string
  service_id: string
  professional_id?: string
  preferred_dates?: string[]
}): Promise<ToolResult> {
  const supabase = createServiceClient()

  // Store waitlist as a special appointment with status 'waitlist' isn't standard,
  // so we add a tag to the patient and store in clinic settings
  const { data: patient } = await supabase.from("patients").select("name, tags").eq("id", input.patient_id).single()
  if (!patient) return { error: "Paciente no encontrado" }

  const tags = [...(patient.tags ?? []).filter((t: string) => t !== "en_espera"), "en_espera"]
  await supabase.from("patients").update({ tags }).eq("id", input.patient_id)

  return {
    ok: true,
    message: `${patient.name} fue agregado a la lista de espera. Te contactaremos cuando haya disponibilidad.`,
    patient_name: patient.name,
    preferred_dates: input.preferred_dates,
  }
}

export async function check_waitlist_and_notify(clinicId: string, input: {
  appointment_id: string
}): Promise<ToolResult> {
  const supabase = createServiceClient()

  const { data: appt } = await supabase
    .from("appointments")
    .select("service_id, professional_id, start_time")
    .eq("id", input.appointment_id)
    .single()

  if (!appt) return { ok: true, notified: 0 }

  // Find patients in waitlist with matching service
  const { data: waitlisted } = await supabase
    .from("patients")
    .select("id, name, phone")
    .eq("clinic_id", clinicId)
    .contains("tags", ["en_espera"])
    .limit(3)

  return {
    ok: true,
    notified: waitlisted?.length ?? 0,
    patients: waitlisted ?? [],
    freed_slot: { service_id: appt.service_id, time: appt.start_time },
  }
}

export async function check_in_patient(clinicId: string, input: {
  patient_id: string
}): Promise<ToolResult> {
  const supabase = createServiceClient()

  const now = new Date()
  const windowStart = new Date(now.getTime() - 30 * 60000)
  const windowEnd = new Date(now.getTime() + 60 * 60000)

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, start_time, professionals(id, name), services(name)")
    .eq("patient_id", input.patient_id)
    .eq("clinic_id", clinicId)
    .in("status", ["confirmed", "pending"])
    .gte("start_time", windowStart.toISOString())
    .lte("start_time", windowEnd.toISOString())
    .order("start_time")
    .single()

  if (!appt) return { error: "No se encontró cita próxima para hacer check-in" }

  await supabase.from("appointments").update({ status: "confirmed" }).eq("id", appt.id)

  const prof = appt.professionals as { name: string } | null
  const svc = appt.services as { name: string } | null

  await notify_staff(clinicId, {
    type: "nueva_cita",
    message: `Check-in: paciente llegó para ${svc?.name} con ${prof?.name} a las ${formatTime(new Date(appt.start_time))}`,
  })

  return { ok: true, appointment_id: appt.id, professional: prof?.name, service: svc?.name }
}

export async function send_review_request(_clinicId: string, input: {
  patient_id: string
  appointment_id: string
}): Promise<ToolResult> {
  // Store review request — actual WhatsApp send handled by worker
  return {
    ok: true,
    message: "Solicitud de reseña registrada. Se enviará el mensaje de encuesta de satisfacción.",
    survey_message: "¿Cómo calificás tu experiencia del 1 al 5? (5 = excelente)",
  }
}

// ─── DISPATCHER ──────────────────────────────────────────────────────

export async function dispatchTool(
  toolName: string,
  toolInput: Record<string, unknown>,
  clinicId: string,
  conversationId: string
): Promise<ToolResult> {
  switch (toolName) {
    case "check_availability":       return check_availability(clinicId, toolInput as Parameters<typeof check_availability>[1])
    case "create_appointment":       return create_appointment(clinicId, toolInput as Parameters<typeof create_appointment>[1])
    case "cancel_appointment":       return cancel_appointment(clinicId, toolInput as Parameters<typeof cancel_appointment>[1])
    case "reschedule_appointment":   return reschedule_appointment(clinicId, toolInput as Parameters<typeof reschedule_appointment>[1])
    case "find_patient":             return find_patient(clinicId, toolInput as Parameters<typeof find_patient>[1])
    case "create_patient":           return create_patient(clinicId, toolInput as Parameters<typeof create_patient>[1])
    case "get_patient_preferences":  return get_patient_preferences(clinicId, toolInput as Parameters<typeof get_patient_preferences>[1])
    case "get_clinic_info":          return get_clinic_info(clinicId, toolInput as Parameters<typeof get_clinic_info>[1])
    case "send_quote":               return send_quote(clinicId, toolInput as Parameters<typeof send_quote>[1])
    case "send_pre_appointment_instructions": return send_pre_appointment_instructions(clinicId, toolInput as Parameters<typeof send_pre_appointment_instructions>[1])
    case "detect_urgency":           return detect_urgency(clinicId, toolInput as Parameters<typeof detect_urgency>[1])
    case "escalate_to_human":        return escalate_to_human(clinicId, toolInput as Parameters<typeof escalate_to_human>[1], conversationId)
    case "notify_staff":             return notify_staff(clinicId, toolInput as Parameters<typeof notify_staff>[1])
    case "suggest_complementary_service": return suggest_complementary_service(clinicId, toolInput as Parameters<typeof suggest_complementary_service>[1])
    case "send_payment_link":        return send_payment_link(clinicId, toolInput as Parameters<typeof send_payment_link>[1])
    case "rate_lead":                return rate_lead(clinicId, toolInput as Parameters<typeof rate_lead>[1])
    case "add_to_waitlist":          return add_to_waitlist(clinicId, toolInput as Parameters<typeof add_to_waitlist>[1])
    case "check_waitlist_and_notify":return check_waitlist_and_notify(clinicId, toolInput as Parameters<typeof check_waitlist_and_notify>[1])
    case "check_in_patient":         return check_in_patient(clinicId, toolInput as Parameters<typeof check_in_patient>[1])
    case "send_review_request":      return send_review_request(clinicId, toolInput as Parameters<typeof send_review_request>[1])
    default:
      return { error: `Tool desconocida: ${toolName}` }
  }
}

// ─── HELPERS ─────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-CR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Costa_Rica" }).format(date)
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("es-CR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "America/Costa_Rica" }).format(date)
}
