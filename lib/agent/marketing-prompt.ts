import { createServiceClient } from "@/lib/supabase/server"
import fs from "fs"
import path from "path"

// Load static MD files from lib/agent/marketing/
function loadMD(filename: string): string {
  try {
    const filePath = path.join(process.cwd(), "lib", "agent", "marketing", filename)
    return fs.readFileSync(filePath, "utf-8")
  } catch {
    return `[${filename} no disponible]`
  }
}

export async function buildMarketingSystemPrompt(clinicId: string): Promise<string> {
  const supabase = createServiceClient()

  // Load static knowledge files
  const soul = loadMD("SOUL.md")
  const skills = loadMD("SKILLS.md")
  const kb = loadMD("KB.md")
  const templates = loadMD("TEMPLATES.md")
  const swipeFile = loadMD("SWIPE-FILE.md")
  const heartbeat = loadMD("HEARTBEAT.md")

  // Load dynamic clinic data from Supabase in parallel
  const [
    clinicRes,
    servicesRes,
    professionalsRes,
    missionsRes,
    tasksRes,
    calendarRes,
    outreachRes,
    campaignStatsRes,
  ] = await Promise.all([
    supabase.from("clinics").select("name, settings, business_hours").eq("id", clinicId).single(),
    supabase.from("services").select("id, name, category, price, description").eq("clinic_id", clinicId).eq("is_active", true),
    supabase.from("professionals").select("name, specialty").eq("clinic_id", clinicId).eq("is_active", true),
    supabase.from("marketing_missions").select("*").eq("clinic_id", clinicId).eq("status", "active").order("priority"),
    supabase.from("marketing_tasks").select("*").eq("clinic_id", clinicId).in("status", ["pending", "in_progress", "awaiting_approval"]).order("due_date"),
    supabase.from("content_calendar").select("*").eq("clinic_id", clinicId).gte("scheduled_date", new Date().toISOString().split("T")[0]).lte("scheduled_date", new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]).order("scheduled_date"),
    supabase.from("outreach_log").select("*").eq("clinic_id", clinicId).in("status", ["sent", "follow_up_1"]).lte("follow_up_due", new Date().toISOString().split("T")[0]).order("follow_up_due").limit(20),
    supabase.from("campaigns").select("type, status, sent_count, response_count, created_at").eq("clinic_id", clinicId).order("created_at", { ascending: false }).limit(10),
  ])

  const clinic = clinicRes.data
  const settings = (clinic?.settings ?? {}) as Record<string, unknown>

  const tone = (settings.agent_tone as string) ?? "semi-formal"
  const brandName = clinic?.name ?? "la clínica"
  const maxDiscount = (settings.max_discount_percent as number) ?? 20
  const requiresApproval = (settings.marketing_requires_approval as boolean) ?? true
  const googleReviewLink = (settings.google_review_link as string) ?? ""

  const toneGuidelines: Record<string, string> = {
    formal: "Usá 'usted'. Lenguaje profesional y cálido. Sin emojis excesivos.",
    "semi-formal": "Usá 'usted' o 'vos' según el contexto. Cercano pero profesional. Emojis con moderación.",
    informal: "Usá 'vos'. Tono amigable y cercano. Emojis permitidos.",
  }

  // Format dynamic sections
  const servicesList = (servicesRes.data ?? [])
    .map((s) => `- ${s.name} (${s.category ?? "general"}): ₡${Number(s.price ?? 0).toLocaleString("es-CR")}${s.description ? ` — ${s.description}` : ""}`)
    .join("\n") || "- Sin servicios configurados"

  const professionalsList = (professionalsRes.data ?? [])
    .map((p) => `- ${p.name}${p.specialty ? ` — ${p.specialty}` : ""}`)
    .join("\n") || "- Sin profesionales configurados"

  const activeMissions = (missionsRes.data ?? [])
  const missionsSummary = activeMissions.length > 0
    ? activeMissions.map((m) =>
        `[${m.priority.toUpperCase()}] ${m.title}${m.target_metric ? ` — Meta: ${m.target_metric}` : ""}${m.due_date ? ` — Vence: ${m.due_date}` : ""}${m.current_value != null && m.target_value != null ? ` — Progreso: ${m.current_value}/${m.target_value}` : ""}`
      ).join("\n")
    : "Sin misiones activas configuradas. Sugerí una misión basada en el estado de la agenda y los pacientes inactivos."

  const pendingTasks = (tasksRes.data ?? [])
  const tasksSummary = pendingTasks.length > 0
    ? pendingTasks.map((t) =>
        `[${t.status.toUpperCase()}] ${t.title}${t.due_date ? ` — Vence: ${t.due_date}` : ""}${t.assigned_to ? ` — Responsable: ${t.assigned_to}` : ""}`
      ).join("\n")
    : "Sin tareas pendientes."

  const weekCalendar = (calendarRes.data ?? [])
  const calendarSummary = weekCalendar.length > 0
    ? weekCalendar.map((c) =>
        `${c.scheduled_date} | ${c.platform} | ${c.content_type} | ${c.pillar ?? "sin pilar"} | [${c.status.toUpperCase()}] ${c.topic}`
      ).join("\n")
    : "Sin contenido programado para esta semana. Generá un plan si te lo piden."

  const followUpsDue = (outreachRes.data ?? [])
  const outreachSummary = followUpsDue.length > 0
    ? `${followUpsDue.length} contactos con follow-up pendiente:\n` +
      followUpsDue.map((o) =>
        `- ${o.contact_name ?? o.contact_phone ?? "desconocido"} | ${o.channel} | Estado: ${o.status} | Vence: ${o.follow_up_due}`
      ).join("\n")
    : "Sin follow-ups de outreach pendientes."

  const recentCampaigns = (campaignStatsRes.data ?? [])
  const campaignsSummary = recentCampaigns.length > 0
    ? recentCampaigns.map((c) =>
        `- ${c.type} | ${c.status} | Enviados: ${c.sent_count ?? 0} | Respuestas: ${c.response_count ?? 0}`
      ).join("\n")
    : "Sin campañas recientes."

  return `${soul}

---

# CONTEXTO DE LA CLÍNICA: ${brandName}

## Tono de comunicación
${toneGuidelines[tone] ?? toneGuidelines["semi-formal"]}

## Servicios activos
${servicesList}

## Equipo
${professionalsList}

## Configuración de marketing
- Descuento máximo permitido: ${maxDiscount}%
- Aprobación requerida para publicar: ${requiresApproval ? "SÍ — todo va como DRAFT" : "NO — puede ejecutar directamente"}
${googleReviewLink ? `- Link de Google Reviews: ${googleReviewLink}` : "- Link de Google Reviews: no configurado"}

---

# ESTADO OPERATIVO ACTUAL

## Misiones activas
${missionsSummary}

## Tareas pendientes
${tasksSummary}

## Calendario de contenido — próximos 7 días
${calendarSummary}

## Follow-ups de outreach vencidos
${outreachSummary}

## Campañas recientes (últimas 10)
${campaignsSummary}

---

# BASE DE CONOCIMIENTO

${kb}

---

# SKILLS DISPONIBLES

${skills}

---

# TEMPLATES DE MENSAJES

${templates}

---

# SWIPE FILE — Copy de referencia

${swipeFile}

---

# HEARTBEAT — Protocolo de revisión

${heartbeat}

---

# REGLA FINAL

Tu éxito se mide por dos métricas: **citas generadas** y **pacientes que regresan**. Si una campaña no genera respuestas, cambiá el ángulo. Si el contenido no genera engagement, cambiá el formato. Iterá basado en datos, no en suposiciones. Cada acción debe poder rastrearse hasta un resultado medible.`
}
