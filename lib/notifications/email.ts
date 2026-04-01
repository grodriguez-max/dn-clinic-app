/**
 * Email notifications via Resend
 * ENV: RESEND_API_KEY, RESEND_FROM (e.g. "noreply@tuclinica.com")
 *
 * Falls back to console.log in development / when RESEND_API_KEY is missing
 */

interface EmailPayload {
  to: string | string[]
  subject: string
  html: string
  from?: string
  reply_to?: string
}

interface SendResult {
  success: boolean
  id?: string
  error?: string
}

async function sendEmail(payload: EmailPayload): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY
  const from = payload.from ?? process.env.RESEND_FROM ?? "noreply@dnclinicas.com"

  if (!apiKey) {
    console.log(`[email:no-key] TO: ${payload.to} | SUBJECT: ${payload.subject}`)
    return { success: true, id: "dev-console" }
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ from, to: payload.to, subject: payload.subject, html: payload.html, reply_to: payload.reply_to }),
    })
    const data = await res.json() as { id?: string; message?: string }
    if (!res.ok) return { success: false, error: data.message ?? "Resend error" }
    return { success: true, id: data.id }
  } catch (err) {
    console.error("[email:send]", err)
    return { success: false, error: String(err) }
  }
}

// ── HTML template helper ───────────────────────────────────────────────────────

function baseTemplate(title: string, content: string, clinicName = "DN Clínicas"): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <!-- Header -->
        <tr>
          <td style="background:#0d9488;padding:20px 28px;">
            <p style="color:white;font-size:16px;font-weight:700;margin:0;">${clinicName}</p>
            <p style="color:rgba(255,255,255,0.75);font-size:12px;margin:2px 0 0;">Sistema de Gestión</p>
          </td>
        </tr>
        <!-- Content -->
        <tr>
          <td style="padding:28px;">
            ${content}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 28px;border-top:1px solid #f0f0f0;background:#fafafa;">
            <p style="font-size:11px;color:#9ca3af;margin:0;">Este es un mensaje automático de ${clinicName}. No responder a este email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

function alertBox(type: "info" | "warning" | "error" | "success", content: string): string {
  const colors = {
    info:    { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af" },
    warning: { bg: "#fffbeb", border: "#fde68a", text: "#92400e" },
    error:   { bg: "#fef2f2", border: "#fecaca", text: "#991b1b" },
    success: { bg: "#f0fdf4", border: "#bbf7d0", text: "#14532d" },
  }
  const c = colors[type]
  return `<div style="background:${c.bg};border:1px solid ${c.border};border-radius:8px;padding:12px 16px;margin:12px 0;">
    <p style="color:${c.text};font-size:13px;margin:0;">${content}</p>
  </div>`
}

function h2(text: string): string {
  return `<h2 style="font-size:18px;font-weight:700;color:#111827;margin:0 0 16px;">${text}</h2>`
}

function p(text: string, muted = false): string {
  return `<p style="font-size:14px;color:${muted ? "#6b7280" : "#374151"};margin:8px 0;line-height:1.6;">${text}</p>`
}

function kv(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 0;font-size:12px;color:#6b7280;white-space:nowrap;padding-right:16px;">${label}</td>
    <td style="padding:6px 0;font-size:13px;color:#111827;font-weight:500;">${value}</td>
  </tr>`
}

function table(rows: string[]): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0;">${rows.join("")}</table>`
}

function btn(text: string, href: string): string {
  return `<a href="${href}" style="display:inline-block;background:#0d9488;color:white;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:600;margin-top:16px;">${text}</a>`
}

// ── Notification functions ─────────────────────────────────────────────────────

/** No-show alert: sent to owner/staff when patient doesn't show up */
export async function sendNoShowAlert(opts: {
  ownerEmail: string
  clinicName: string
  patientName: string
  patientPhone: string
  serviceName: string
  professionalName: string
  appointmentTime: string
  appUrl?: string
}): Promise<SendResult> {
  const html = baseTemplate(
    `No-show: ${opts.patientName}`,
    `${h2("⚠️ Paciente no se presentó")}
     ${p("Un paciente no llegó a su cita programada:")}
     ${table([
       kv("Paciente",      opts.patientName),
       kv("Teléfono",      opts.patientPhone),
       kv("Servicio",      opts.serviceName),
       kv("Profesional",   opts.professionalName),
       kv("Hora cita",     opts.appointmentTime),
     ])}
     ${alertBox("warning", "El agente IA intentará contactar al paciente para reagendar automáticamente.")}
     ${opts.appUrl ? btn("Ver en el sistema", `${opts.appUrl}/agenda`) : ""}`,
    opts.clinicName,
  )

  return sendEmail({
    to: opts.ownerEmail,
    subject: `⚠️ No-show: ${opts.patientName} — ${opts.serviceName}`,
    html,
  })
}

/** Escalation alert: agent escalated to human */
export async function sendEscalationAlert(opts: {
  ownerEmail: string
  clinicName: string
  patientPhone: string
  patientName?: string
  reason: string
  summary?: string
  appUrl?: string
}): Promise<SendResult> {
  const html = baseTemplate(
    "Conversación escalada al equipo",
    `${h2("🚨 Agente IA necesita ayuda humana")}
     ${p("Una conversación fue escalada y requiere atención del equipo:")}
     ${table([
       kv("Paciente",  opts.patientName ?? opts.patientPhone),
       kv("Teléfono",  opts.patientPhone),
       kv("Razón",     opts.reason),
     ])}
     ${opts.summary ? alertBox("info", `Resumen: ${opts.summary}`) : ""}
     ${alertBox("error", "Respondé lo antes posible — el paciente está esperando.")}
     ${opts.appUrl ? btn("Ver conversación", `${opts.appUrl}/agente`) : ""}`,
    opts.clinicName,
  )

  return sendEmail({
    to: opts.ownerEmail,
    subject: `🚨 Escalación: ${opts.patientName ?? opts.patientPhone} — ${opts.reason.slice(0, 50)}`,
    html,
  })
}

/** Hot lead alert: patient scored as "caliente" */
export async function sendHotLeadAlert(opts: {
  ownerEmail: string
  clinicName: string
  patientName: string
  patientPhone: string
  notes?: string
  appUrl?: string
}): Promise<SendResult> {
  const html = baseTemplate(
    `Lead caliente: ${opts.patientName}`,
    `${h2("🔥 Lead caliente detectado")}
     ${p("El agente clasificó a este contacto como lead caliente — alta probabilidad de conversión:")}
     ${table([
       kv("Nombre",   opts.patientName),
       kv("Teléfono", opts.patientPhone),
       kv("Notas",    opts.notes ?? "—"),
     ])}
     ${alertBox("success", "Contactalo pronto para maximizar la conversión. El tiempo de respuesta es clave.")}
     ${opts.appUrl ? btn("Ver en el sistema", `${opts.appUrl}/pacientes`) : ""}`,
    opts.clinicName,
  )

  return sendEmail({
    to: opts.ownerEmail,
    subject: `🔥 Lead caliente: ${opts.patientName} (${opts.patientPhone})`,
    html,
  })
}

/** Daily summary to owner at 7am */
export async function sendDailySummary(opts: {
  ownerEmail: string
  clinicName: string
  date: string
  appointmentsTotal: number
  appointmentsCompleted: number
  noShows: number
  newPatients: number
  agentConversations: number
  agentEscalated: number
  revenueEstimate?: number
  upcomingTomorrow?: number
  appUrl?: string
}): Promise<SendResult> {
  const completionRate = opts.appointmentsTotal > 0
    ? Math.round((opts.appointmentsCompleted / opts.appointmentsTotal) * 100)
    : 0

  const revenueStr = opts.revenueEstimate
    ? new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(opts.revenueEstimate)
    : "—"

  const html = baseTemplate(
    `Resumen ${opts.date} — ${opts.clinicName}`,
    `${h2(`📋 Resumen del día — ${opts.date}`)}
     ${table([
       kv("Citas programadas",  String(opts.appointmentsTotal)),
       kv("Completadas",        `${opts.appointmentsCompleted} (${completionRate}%)`),
       kv("No-shows",           String(opts.noShows)),
       kv("Pacientes nuevos",   String(opts.newPatients)),
       kv("Ingresos estimados", revenueStr),
     ])}
     <hr style="border:none;border-top:1px solid #f0f0f0;margin:16px 0;" />
     ${h2("🤖 Agente IA")}
     ${table([
       kv("Conversaciones",    String(opts.agentConversations)),
       kv("Escaladas a humano", String(opts.agentEscalated)),
       kv("Resueltas por IA",   String(opts.agentConversations - opts.agentEscalated)),
     ])}
     ${opts.upcomingTomorrow !== undefined ? alertBox("info", `Mañana hay ${opts.upcomingTomorrow} citas programadas.`) : ""}
     ${opts.appUrl ? btn("Ver dashboard", `${opts.appUrl}/dashboard`) : ""}`,
    opts.clinicName,
  )

  return sendEmail({
    to: opts.ownerEmail,
    subject: `📋 Resumen ${opts.date} — ${opts.clinicName}`,
    html,
  })
}

/** Appointment confirmation to patient (email fallback when no WhatsApp) */
export async function sendAppointmentConfirmation(opts: {
  patientEmail: string
  patientName: string
  clinicName: string
  serviceName: string
  professionalName: string
  dateTime: string
  clinicAddress?: string
  clinicPhone?: string
}): Promise<SendResult> {
  const html = baseTemplate(
    `Confirmación de cita — ${opts.clinicName}`,
    `${h2(`✅ Tu cita está confirmada`)}
     ${p(`Hola <strong>${opts.patientName}</strong>, confirmamos tu próxima cita:`)}
     ${table([
       kv("Servicio",     opts.serviceName),
       kv("Profesional",  opts.professionalName),
       kv("Fecha y hora", opts.dateTime),
       kv("Clínica",      opts.clinicName),
       ...(opts.clinicAddress ? [kv("Dirección", opts.clinicAddress)] : []),
       ...(opts.clinicPhone   ? [kv("Teléfono",  opts.clinicPhone)]   : []),
     ])}
     ${alertBox("info", "Si necesitás cancelar o reagendar, contactanos con al menos 24 horas de anticipación.")}`,
    opts.clinicName,
  )

  return sendEmail({
    to: opts.patientEmail,
    subject: `✅ Cita confirmada: ${opts.serviceName} — ${opts.dateTime}`,
    html,
  })
}

/** Weekly marketing report to owner */
export async function sendWeeklyMarketingReport(opts: {
  ownerEmail: string
  clinicName: string
  period: string
  campaignsSent: number
  readRate: number
  conversionRate: number
  revenueAttributed: number
  optOuts: number
  recommendations: string[]
  appUrl?: string
}): Promise<SendResult> {
  const revenueStr = new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC", maximumFractionDigits: 0 }).format(opts.revenueAttributed)
  const recItems = opts.recommendations.map((r) => `<li style="font-size:13px;color:#374151;margin:6px 0;">${r}</li>`).join("")

  const html = baseTemplate(
    `Reporte Marketing — ${opts.period}`,
    `${h2(`📊 Reporte de Marketing — ${opts.period}`)}
     ${table([
       kv("Mensajes enviados",    String(opts.campaignsSent)),
       kv("Tasa de lectura",      `${opts.readRate}%`),
       kv("Tasa de conversión",   `${opts.conversionRate}%`),
       kv("Revenue atribuido",    revenueStr),
       kv("Opt-outs",             String(opts.optOuts)),
     ])}
     ${opts.recommendations.length > 0 ? `
       <div style="margin-top:16px;">
         <p style="font-size:13px;font-weight:600;color:#111827;margin:0 0 8px;">Recomendaciones del agente:</p>
         <ul style="margin:0;padding-left:20px;">${recItems}</ul>
       </div>
     ` : ""}
     ${opts.appUrl ? btn("Ver panel de marketing", `${opts.appUrl}/marketing`) : ""}`,
    opts.clinicName,
  )

  return sendEmail({
    to: opts.ownerEmail,
    subject: `📊 Reporte Marketing ${opts.period} — ${opts.clinicName}`,
    html,
  })
}

// ─── BILLING EMAILS ───────────────────────────────────────────────────────────

/** Trial ending in N days */
export async function sendTrialEndingEmail(opts: {
  ownerEmail: string
  clinicName: string
  daysLeft: number
  appUrl?: string
}): Promise<SendResult> {
  const html = baseTemplate(
    "Tu trial termina pronto",
    `${h2(`⏰ Tu período de prueba termina en ${opts.daysLeft} días`)}
     ${p(`Hola! Tu trial de DN Clínicas termina en <strong>${opts.daysLeft} días</strong>.`)}
     ${p("Si no elegís un plan, los agentes de IA se pausarán y tu agenda quedará en modo básico. Tus datos nunca se borran.")}
     ${table([
       kv("Plan recomendado", "Growth — $199/mes"),
       kv("Incluye", "Recepcionista IA + Agente Marketing + Métricas completas"),
       kv("Tope mensual", "$499/mes (base + acciones de agentes)"),
     ])}
     ${alertBox("warning", "Sin tarjeta de crédito durante el trial. Elegís el plan solo cuando estés listo.")}
     ${opts.appUrl ? btn("Elegir mi plan ahora", `${opts.appUrl}/billing`) : ""}`,
    opts.clinicName,
  )

  return sendEmail({
    to: opts.ownerEmail,
    subject: `⏰ Tu trial de DN Clínicas termina en ${opts.daysLeft} días`,
    html,
  })
}

/** Payment succeeded */
export async function sendPaymentSucceededEmail(opts: {
  ownerEmail: string
  clinicName: string
  plan: string
  amount: number
  appUrl?: string
}): Promise<SendResult> {
  const amountStr = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(opts.amount)

  const html = baseTemplate(
    "Pago procesado correctamente",
    `${h2("✅ Pago procesado correctamente")}
     ${p(`Tu suscripción al plan <strong>${opts.plan}</strong> está activa.`)}
     ${table([
       kv("Plan", opts.plan),
       kv("Cobro base", `${amountStr}/mes`),
       kv("Estado", "Activo"),
     ])}
     ${p("Además del cobro base, se factura por resultado de los agentes al final de cada período.")}
     ${opts.appUrl ? btn("Ver mi suscripción", `${opts.appUrl}/billing`) : ""}`,
    opts.clinicName,
  )

  return sendEmail({
    to: opts.ownerEmail,
    subject: `✅ Pago confirmado — Plan ${opts.plan} activo`,
    html,
  })
}

/** Payment failed */
export async function sendPaymentFailedEmail(opts: {
  ownerEmail: string
  clinicName: string
  appUrl?: string
}): Promise<SendResult> {
  const html = baseTemplate(
    "Problema con tu pago",
    `${h2("⚠️ No pudimos procesar tu pago")}
     ${alertBox("error", "Hubo un problema al cobrar tu suscripción. Actualizá tu método de pago para mantener el servicio activo.")}
     ${p("Los agentes de IA se pausarán si el pago no se resuelve en 72 horas.")}
     ${opts.appUrl ? btn("Actualizar método de pago", `${opts.appUrl}/billing`) : ""}`,
    opts.clinicName,
  )

  return sendEmail({
    to: opts.ownerEmail,
    subject: "⚠️ Problema con tu pago — DN Clínicas",
    html,
  })
}

/** Monthly platform invoice */
export async function sendPlatformInvoiceEmail(opts: {
  ownerEmail: string
  clinicName: string
  invoiceNumber: string
  period: string
  baseAmount: number
  actionsAmount: number
  total: number
  capApplied: boolean
  appUrl?: string
}): Promise<SendResult> {
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n)

  const html = baseTemplate(
    `Factura ${opts.invoiceNumber}`,
    `${h2(`🧾 Resumen de facturación — ${opts.period}`)}
     ${p(`Aquí está el resumen de uso de tus agentes este período.`)}
     ${table([
       kv("Período", opts.period),
       kv("Cargo base del plan", fmt(opts.baseAmount)),
       kv("Cargo por acciones de agentes", fmt(opts.actionsAmount)),
       opts.capApplied ? kv("Tope aplicado", "Sí — no se cobra más allá del tope de tu plan") : kv("Tope aplicado", "No"),
       kv("Total", `<strong>${fmt(opts.total)}</strong>`),
     ])}
     ${alertBox("success", "Este cobro se procesará automáticamente en tu método de pago registrado.")}
     ${opts.appUrl ? btn("Ver detalle completo", `${opts.appUrl}/billing`) : ""}`,
    opts.clinicName,
  )

  return sendEmail({
    to: opts.ownerEmail,
    subject: `🧾 Factura ${opts.invoiceNumber} — ${fmt(opts.total)} — ${opts.clinicName}`,
    html,
  })
}

// ── CR Invoice email (send to patient when invoice is created) ────────────────
export async function sendCRInvoiceEmail(opts: {
  patientEmail: string
  patientName: string
  clinicName: string
  invoiceNumber: string
  invoiceType: string
  total: number
  items: { description: string; quantity: number; unit_price: number }[]
  pdfUrl?: string
  appUrl?: string
}): Promise<SendResult> {
  const fmt = (n: number) => new Intl.NumberFormat("es-CR", { style: "currency", currency: "CRC" }).format(n)
  const typeLabel: Record<string, string> = {
    factura: "Factura Electrónica",
    tiquete: "Tiquete Electrónico",
    nota_credito: "Nota de Crédito",
  }
  const label = typeLabel[opts.invoiceType] ?? opts.invoiceType

  const itemRows = opts.items
    .map((i) => kv(`${i.description} (x${i.quantity})`, fmt(i.quantity * i.unit_price)))
    .join("")

  const html = baseTemplate(
    `${label} ${opts.invoiceNumber}`,
    `${h2(`🧾 ${label} — ${opts.clinicName}`)}
     ${p(`Hola ${opts.patientName}, aquí está tu comprobante de pago.`)}
     ${table([kv("N° Comprobante", opts.invoiceNumber), itemRows, kv("<strong>Total</strong>", `<strong>${fmt(opts.total)}</strong>`)])}
     ${opts.pdfUrl ? btn("Ver / Descargar PDF", opts.pdfUrl) : ""}
     ${p("Conservá este comprobante para tus registros. ¡Gracias por tu visita!")}`,
    opts.clinicName,
  )

  return sendEmail({
    to: opts.patientEmail,
    subject: `🧾 Comprobante ${opts.invoiceNumber} — ${opts.clinicName}`,
    html,
  })
}
