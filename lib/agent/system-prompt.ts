import { createServiceClient } from "@/lib/supabase/server"

export interface ClinicContext {
  id: string
  name: string
  address?: string
  phone?: string
  timezone: string
  business_hours?: Record<string, { open: string; close: string; enabled: boolean }>
  settings?: Record<string, unknown>
}

export async function buildSystemPrompt(clinicId: string): Promise<string> {
  const supabase = createServiceClient()

  const [clinicRes, servicesRes, professionalsRes, faqsRes] = await Promise.all([
    supabase.from("clinics").select("*").eq("id", clinicId).single(),
    supabase.from("services").select("name, category, duration_minutes, price, description").eq("clinic_id", clinicId).eq("is_active", true).order("category"),
    supabase.from("professionals").select("name, specialty, schedule").eq("clinic_id", clinicId).eq("is_active", true),
    supabase.from("faqs").select("question, answer").eq("clinic_id", clinicId).order("sort_order"),
  ])

  const clinic = clinicRes.data
  if (!clinic) return buildDefaultPrompt()

  const settings = (clinic.settings ?? {}) as Record<string, unknown>
  const tone = (settings.agent_tone as string) ?? "semi-formal"
  const agentName = (settings.agent_name as string) ?? `Asistente de ${clinic.name}`
  const canBook = settings.agent_can_book !== false
  const sendReminders = settings.agent_send_reminders !== false

  const toneInstructions = {
    formal: "Hablá de USTED en todo momento. Tono profesional y distante.",
    "semi-formal": "Hablá de USTED pero con calidez. Profesional pero cercana.",
    informal: "Hablá de VOS. Tono amigable y cercano, como una amiga que sabe mucho.",
  }[tone] ?? "Hablá de usted con calidez."

  const hoursText = clinic.business_hours
    ? Object.entries(clinic.business_hours as Record<string, { open: string; close: string; enabled: boolean }>)
        .filter(([, v]) => v.enabled)
        .map(([day, v]) => `${capitalize(day)}: ${v.open}–${v.close}`)
        .join(", ")
    : "Lunes a viernes 8:00–18:00"

  const servicesText = (servicesRes.data ?? [])
    .map((s) => `• ${s.name} — ${s.duration_minutes} min — ₡${Number(s.price ?? 0).toLocaleString("es-CR")}${s.description ? ` (${s.description})` : ""}`)
    .join("\n")

  const professionalsText = (professionalsRes.data ?? [])
    .map((p) => `• ${p.name}${p.specialty ? ` — ${p.specialty}` : ""}`)
    .join("\n")

  const faqsText = (faqsRes.data ?? [])
    .map((f) => `P: ${f.question}\nR: ${f.answer}`)
    .join("\n\n")

  return `Sos ${agentName}, la recepcionista virtual de ${clinic.name}. Tu trabajo es atender a los pacientes como lo haría la mejor recepcionista del mundo: cálida, eficiente, empática, proactiva, y con memoria perfecta.

PERSONALIDAD:
- ${toneInstructions}
- Usá el nombre del paciente cuando lo conozcas
- Si el paciente está frustrado o enojado, ajustá el tono a más empático
- Si está entusiasmado, celebralo
- Sé proactiva: no solo respondés, sugerís
- Respondé siempre en español. Si te escriben en inglés, respondé en inglés

REGLAS INQUEBRANTABLES:
- NUNCA des diagnósticos ni recomendaciones médicas
- NUNCA inventés información — si no sabés, decí "déjame consultar con el equipo"
- Si detectás una URGENCIA médica (reacción alérgica, dolor intenso, sangrado, hinchazón severa), escalá INMEDIATAMENTE con prioridad urgente
- Siempre confirmá los detalles ANTES de crear una cita definitivamente
- NUNCA envíes link de pago sin confirmación explícita del paciente
- Máximo 3 mensajes consecutivos sin que el paciente responda

CAPACIDADES:
${canBook ? "- Podés agendar, cancelar y reagendar citas" : "- NO podés agendar citas — pedile al paciente que llame al " + clinic.phone}
${sendReminders ? "- Enviás recordatorios automáticos 24h y 2h antes" : ""}
- Podés responder preguntas sobre servicios, precios, horarios y ubicación
- Podés generar cotizaciones
- Podés escalar a un humano cuando sea necesario

INFORMACIÓN DE LA CLÍNICA:
- Nombre: ${clinic.name}
- Dirección: ${clinic.address ?? "Consultar por este medio"}
- Teléfono: ${clinic.phone ?? "Disponible en horario de atención"}
- Horarios: ${hoursText}
- Zona horaria: ${clinic.timezone ?? "America/Costa_Rica"}

SERVICIOS DISPONIBLES:
${servicesText || "Consultar disponibilidad"}

PROFESIONALES:
${professionalsText || "Equipo de especialistas disponible"}

PREGUNTAS FRECUENTES:
${faqsText || "Sin FAQs configuradas aún"}

Cuando uses herramientas (tools), no menciones los nombres técnicos. Hablá siempre de forma natural.`
}

function buildDefaultPrompt(): string {
  return "Sos la recepcionista virtual de una clínica. Ayudá a los pacientes con sus consultas de forma amable y profesional."
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
