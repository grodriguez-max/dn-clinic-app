import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"
import * as XLSX from "xlsx"

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("clinic_id").eq("id", user.id).single()
  if (!profile?.clinic_id) return NextResponse.json({ error: "No clinic" }, { status: 403 })

  const { searchParams } = req.nextUrl
  const period = searchParams.get("period") ?? "month"
  const format = searchParams.get("format") ?? "xlsx"

  const clinicId = profile.clinic_id
  const now = new Date()
  const ranges: Record<string, Date> = {
    today:   new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    week:    new Date(now.getTime() - 7 * 86400000),
    month:   new Date(now.getFullYear(), now.getMonth(), 1),
    quarter: new Date(now.getFullYear(), now.getMonth() - 3, 1),
  }
  const since = (ranges[period] ?? ranges.month).toISOString()

  // Use service client to avoid RLS issues in API route
  const supa = createServiceClient()

  const [apptsRes, patientsRes, invoicesRes, convsRes] = await Promise.all([
    supa
      .from("appointments")
      .select("id, start_time, status, patient_id, services(name, category, price), professionals(name), patients(name, phone)")
      .eq("clinic_id", clinicId)
      .gte("start_time", since)
      .order("start_time"),

    supa
      .from("patients")
      .select("id, name, phone, email, created_at, source, tags")
      .eq("clinic_id", clinicId)
      .order("created_at"),

    supa
      .from("invoices")
      .select("id, total, created_at, payment_method, status, patients(name)")
      .eq("clinic_id", clinicId)
      .neq("status", "anulada")
      .gte("created_at", since)
      .order("created_at"),

    supa
      .from("conversations")
      .select("id, started_at, status, handled_by, channel, summary, escalation_reason")
      .eq("clinic_id", clinicId)
      .gte("started_at", since),
  ])

  const appointments = apptsRes.data ?? []
  const patients = patientsRes.data ?? []
  const invoices = invoicesRes.data ?? []
  const conversations = convsRes.data ?? []

  const periodLabel = { today: "Hoy", week: "Últimos 7 días", month: "Este mes", quarter: "Último trimestre" }[period] ?? period

  if (format === "csv") {
    // Simple CSV of appointments
    const rows = appointments.map((a) => {
      const svc = a.services as { name?: string; price?: number } | null
      const prof = a.professionals as { name?: string } | null
      const pat = a.patients as { name?: string; phone?: string } | null
      return [
        a.id,
        new Date(a.start_time).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" }),
        a.status,
        pat?.name ?? "",
        pat?.phone ?? "",
        svc?.name ?? "",
        prof?.name ?? "",
        svc?.price ?? 0,
      ].join(",")
    })
    const header = "ID,Fecha,Estado,Paciente,Teléfono,Servicio,Profesional,Precio"
    const csv = [header, ...rows].join("\n")
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="citas-${period}.csv"`,
      },
    })
  }

  // ── Build XLSX workbook ──────────────────────────────────────────────
  const wb = XLSX.utils.book_new()

  // Sheet 1: Citas
  const apptRows = appointments.map((a) => {
    const svc = a.services as { name?: string; category?: string; price?: number } | null
    const prof = a.professionals as { name?: string } | null
    const pat = a.patients as { name?: string; phone?: string } | null
    return {
      "Fecha": new Date(a.start_time).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" }),
      "Estado": a.status,
      "Paciente": pat?.name ?? "",
      "Teléfono": pat?.phone ?? "",
      "Servicio": svc?.name ?? "",
      "Categoría": svc?.category ?? "",
      "Profesional": prof?.name ?? "",
      "Precio (₡)": svc?.price ?? 0,
    }
  })
  const wsAppts = XLSX.utils.json_to_sheet(apptRows)
  wsAppts["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 24 }, { wch: 14 }, { wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsAppts, "Citas")

  // Sheet 2: Facturación
  const invRows = invoices.map((i) => {
    const pat = i.patients as { name?: string } | null
    return {
      "Fecha": new Date(i.created_at).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" }),
      "Paciente": pat?.name ?? "",
      "Total (₡)": Number(i.total),
      "Método de pago": i.payment_method ?? "",
      "Estado": i.status,
    }
  })
  const wsInv = XLSX.utils.json_to_sheet(invRows)
  wsInv["!cols"] = [{ wch: 22 }, { wch: 24 }, { wch: 12 }, { wch: 18 }, { wch: 12 }]
  XLSX.utils.book_append_sheet(wb, wsInv, "Facturación")

  // Sheet 3: Pacientes nuevos en período
  const patRows = patients
    .filter((p) => new Date(p.created_at) >= new Date(since))
    .map((p) => ({
      "Nombre": p.name,
      "Teléfono": p.phone ?? "",
      "Email": p.email ?? "",
      "Fecha registro": new Date(p.created_at).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" }),
      "Fuente": p.source ?? "directo",
      "Tags": Array.isArray(p.tags) ? p.tags.join(", ") : "",
    }))
  const wsPat = XLSX.utils.json_to_sheet(patRows)
  wsPat["!cols"] = [{ wch: 24 }, { wch: 14 }, { wch: 28 }, { wch: 22 }, { wch: 14 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsPat, "Pacientes nuevos")

  // Sheet 4: Agente IA
  const convRows = conversations.map((c) => ({
    "Fecha": new Date(c.started_at).toLocaleString("es-CR", { timeZone: "America/Costa_Rica" }),
    "Canal": c.channel,
    "Estado": c.status,
    "Atendido por": c.handled_by,
    "Resumen": c.summary ?? "",
    "Razón escalación": c.escalation_reason ?? "",
  }))
  const wsConv = XLSX.utils.json_to_sheet(convRows)
  wsConv["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 40 }, { wch: 30 }]
  XLSX.utils.book_append_sheet(wb, wsConv, "Agente IA")

  // Sheet 5: Resumen ejecutivo
  const totalRevenue = invoices.reduce((s, i) => s + Number(i.total), 0)
  const completedAppts = appointments.filter((a) => a.status === "completed").length
  const cancelledAppts = appointments.filter((a) => a.status === "cancelled").length
  const noShowAppts = appointments.filter((a) => a.status === "no_show").length
  const newPats = patients.filter((p) => new Date(p.created_at) >= new Date(since)).length
  const agentResolved = conversations.filter((c) => c.status === "resolved").length
  const agentEscalated = conversations.filter((c) => c.status === "escalated").length

  const summaryRows = [
    { "Métrica": "Período", "Valor": periodLabel },
    { "Métrica": "Ingresos totales (₡)", "Valor": totalRevenue },
    { "Métrica": "Ticket promedio (₡)", "Valor": invoices.length > 0 ? Math.round(totalRevenue / invoices.length) : 0 },
    { "Métrica": "Total citas", "Valor": appointments.length },
    { "Métrica": "Citas completadas", "Valor": completedAppts },
    { "Métrica": "Citas canceladas", "Valor": cancelledAppts },
    { "Métrica": "No-shows", "Valor": noShowAppts },
    { "Métrica": "Tasa completación", "Valor": appointments.length > 0 ? `${Math.round((completedAppts / appointments.length) * 100)}%` : "0%" },
    { "Métrica": "Pacientes nuevos", "Valor": newPats },
    { "Métrica": "Conversaciones agente", "Valor": conversations.length },
    { "Métrica": "Resueltas por agente", "Valor": agentResolved },
    { "Métrica": "Escaladas a humano", "Valor": agentEscalated },
    { "Métrica": "Tasa escalación", "Valor": conversations.length > 0 ? `${Math.round((agentEscalated / conversations.length) * 100)}%` : "0%" },
    { "Métrica": "Generado", "Valor": new Date().toLocaleString("es-CR", { timeZone: "America/Costa_Rica" }) },
  ]
  const wsSummary = XLSX.utils.json_to_sheet(summaryRows)
  wsSummary["!cols"] = [{ wch: 28 }, { wch: 20 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="metricas-${period}.xlsx"`,
    },
  })
}
