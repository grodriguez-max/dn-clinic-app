import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MetricsClient } from "./metrics-client"

export default async function MetricasPage({
  searchParams,
}: {
  searchParams: { period?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("clinic_id, role").eq("id", user.id).single()
  if (!profile?.clinic_id) redirect("/login")

  const clinicId = profile.clinic_id
  const period = (searchParams.period as "today" | "week" | "month" | "quarter") ?? "month"

  // Date range
  const now = new Date()
  const ranges: Record<string, Date> = {
    today:   new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    week:    new Date(now.getTime() - 7 * 86400000),
    month:   new Date(now.getFullYear(), now.getMonth(), 1),
    quarter: new Date(now.getFullYear(), now.getMonth() - 3, 1),
  }
  const since = (ranges[period] ?? ranges.month).toISOString()

  const [apptsRes, patientsRes, invoicesRes, convsRes, profRes, commissionsRes, pkgSalesRes, surveyRes] = await Promise.all([
    // All appointments in period
    supabase
      .from("appointments")
      .select("id, start_time, status, patient_id, professional_id, service_id, created_by, services(name, category, price), professionals(name)")
      .eq("clinic_id", clinicId)
      .gte("start_time", since)
      .order("start_time"),

    // Patients in period
    supabase
      .from("patients")
      .select("id, name, created_at, source, tags")
      .eq("clinic_id", clinicId)
      .order("created_at"),

    // Invoices in period
    supabase
      .from("invoices")
      .select("id, total, created_at, patient_id, payment_method, status")
      .eq("clinic_id", clinicId)
      .neq("status", "anulada")
      .gte("created_at", since)
      .order("created_at"),

    // Agent conversations in period
    supabase
      .from("conversations")
      .select("id, started_at, status, handled_by, channel")
      .eq("clinic_id", clinicId)
      .gte("started_at", since),

    // Professionals for per-pro stats
    supabase
      .from("professionals")
      .select("id, name")
      .eq("clinic_id", clinicId)
      .eq("is_active", true),

    // Commissions in period
    supabase
      .from("commissions")
      .select("id, professional_id, commission_amount, commission_percentage, status, created_at")
      .eq("clinic_id", clinicId)
      .gte("created_at", since),

    // Package sales in period
    supabase
      .from("patient_packages")
      .select("id, amount_paid, purchased_at, packages(name, price)")
      .eq("clinic_id", clinicId)
      .gte("purchased_at", since),

    // Survey responses in period
    supabase
      .from("survey_responses")
      .select("id, submitted_at, score, responses")
      .eq("clinic_id", clinicId)
      .gte("submitted_at", since),
  ])

  const appointments = apptsRes.data ?? []
  const patients = patientsRes.data ?? []
  const invoices = invoicesRes.data ?? []
  const conversations = convsRes.data ?? []
  const professionals = profRes.data ?? []
  const commissions = commissionsRes.data ?? []
  const pkgSales = pkgSalesRes.data ?? []
  const surveyResponses = surveyRes.data ?? []

  // ── Revenue metrics ──────────────────────────────────────────────────
  const totalRevenue = invoices.reduce((s, i) => s + Number(i.total), 0)

  // Daily revenue (last 30 days)
  const dailyRevenue = buildDailySeries(invoices.map((i) => ({ date: i.created_at, value: Number(i.total) })), since)

  // Revenue by professional
  const revenueByPro = professionals.map((p) => {
    const proAppts = appointments.filter((a) => a.professional_id === p.id && a.status === "completed")
    const rev = proAppts.reduce((s, a) => s + Number((a.services as unknown as Record<string, unknown>)?.price ?? 0), 0)
    return { name: p.name, revenue: rev, appointments: proAppts.length }
  }).sort((a, b) => b.revenue - a.revenue)

  // Revenue by category
  const revByCatMap: Record<string, number> = {}
  appointments.filter((a) => a.status === "completed").forEach((a) => {
    const svc = a.services as { category?: string; price?: number } | null
    const cat = svc?.category ?? "otro"
    revByCatMap[cat] = (revByCatMap[cat] ?? 0) + Number(svc?.price ?? 0)
  })
  const revenueByCategory = Object.entries(revByCatMap).map(([name, value]) => ({ name: capitalize(name), value })).sort((a, b) => b.value - a.value)

  // ── Appointment metrics ───────────────────────────────────────────────
  const apptCounts = {
    total:     appointments.length,
    completed: appointments.filter((a) => a.status === "completed").length,
    cancelled: appointments.filter((a) => a.status === "cancelled").length,
    no_show:   appointments.filter((a) => a.status === "no_show").length,
    pending:   appointments.filter((a) => ["pending", "confirmed"].includes(a.status)).length,
  }

  // Appointments by weekday
  const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  const byWeekday = DAYS.map((day, i) => ({
    day,
    total: appointments.filter((a) => new Date(a.start_time).getDay() === i).length,
  }))

  // Appointments by hour (heatmap data)
  const byHour = Array.from({ length: 16 }, (_, i) => {
    const hour = i + 7 // 7am to 10pm (22:00)
    return {
      hour: `${hour}:00`,
      Mon: appointments.filter((a) => { const d = new Date(a.start_time); return d.getDay() === 1 && d.getHours() === hour }).length,
      Tue: appointments.filter((a) => { const d = new Date(a.start_time); return d.getDay() === 2 && d.getHours() === hour }).length,
      Wed: appointments.filter((a) => { const d = new Date(a.start_time); return d.getDay() === 3 && d.getHours() === hour }).length,
      Thu: appointments.filter((a) => { const d = new Date(a.start_time); return d.getDay() === 4 && d.getHours() === hour }).length,
      Fri: appointments.filter((a) => { const d = new Date(a.start_time); return d.getDay() === 5 && d.getHours() === hour }).length,
      Sat: appointments.filter((a) => { const d = new Date(a.start_time); return d.getDay() === 6 && d.getHours() === hour }).length,
    }
  })

  // Daily appointments trend
  const dailyAppts = buildDailySeries(appointments.map((a) => ({ date: a.start_time, value: 1 })), since)

  // ── Patient metrics ───────────────────────────────────────────────────
  const newPatients = patients.filter((p) => new Date(p.created_at) >= new Date(since)).length
  const returningPatients = appointments
    .filter((a) => a.status === "completed")
    .reduce((set, a) => { set.add(a.patient_id); return set }, new Set<string>()).size

  // Source breakdown
  const sourceMap: Record<string, number> = {}
  patients.forEach((p) => {
    const src = p.source ?? "directo"
    sourceMap[src] = (sourceMap[src] ?? 0) + 1
  })
  const patientsBySource = Object.entries(sourceMap).map(([name, value]) => ({ name: capitalize(name), value }))

  // Retention: patients with ≥2 completed appointments
  const patientApptCount: Record<string, number> = {}
  appointments.filter((a) => a.status === "completed").forEach((a) => {
    patientApptCount[a.patient_id] = (patientApptCount[a.patient_id] ?? 0) + 1
  })
  const retentionRate = Object.keys(patientApptCount).length > 0
    ? Math.round((Object.values(patientApptCount).filter((c) => c >= 2).length / Object.keys(patientApptCount).length) * 100)
    : 0

  // ── Agent metrics ─────────────────────────────────────────────────────
  const agentConvs = conversations.length
  const agentEscalated = conversations.filter((c) => c.status === "escalated").length
  const agentResolved = conversations.filter((c) => c.status === "resolved").length
  const agentAppts = appointments.filter((a) => a.created_by === "agent")
  const humanAppts = appointments.filter((a) => a.created_by !== "agent")
  const agentBookings = agentAppts.length
  const escalationRate = agentConvs > 0 ? Math.round((agentEscalated / agentConvs) * 100) : 0

  // Revenue attributed to agent (sum of prices of completed appointments created by agent)
  const agentRevenue = agentAppts
    .filter((a) => a.status === "completed")
    .reduce((sum, a) => sum + ((a.services as { price?: number } | null)?.price ?? 0), 0)

  // Appts by source: agent vs human (for bar chart)
  const apptsBySource = [
    { name: "Agente IA", value: agentBookings },
    { name: "Manual", value: humanAppts.length },
  ]

  // Daily agent conversations
  const dailyAgentConvs = buildDailySeries(conversations.map((c) => ({ date: c.started_at, value: 1 })), since)

  // ── Commissions metrics ────────────────────────────────────────────────
  const commissionsByPro = professionals.map((p) => {
    const proComms = commissions.filter((c) => c.professional_id === p.id)
    const total = proComms.reduce((s, c) => s + Number(c.commission_amount), 0)
    const pending = proComms.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.commission_amount), 0)
    return { name: p.name, total, pending, count: proComms.length }
  }).sort((a, b) => b.total - a.total)

  const totalCommissions = commissions.reduce((s, c) => s + Number(c.commission_amount), 0)

  // ── Package metrics ────────────────────────────────────────────────────
  const packageRevenue = pkgSales.reduce((s, p) => s + Number(p.amount_paid ?? (p.packages as any)?.price ?? 0), 0)
  const packagesSold = pkgSales.length

  // ── Survey / NPS metrics ───────────────────────────────────────────────
  const avgScore = surveyResponses.length > 0
    ? Math.round((surveyResponses.reduce((s, r) => s + Number(r.score ?? 0), 0) / surveyResponses.length) * 10) / 10
    : 0
  // NPS: promoters (score 5) - detractors (score ≤ 2) as % of total
  const promoters = surveyResponses.filter((r) => Number(r.score ?? 0) >= 5).length
  const detractors = surveyResponses.filter((r) => Number(r.score ?? 0) <= 2).length
  const nps = surveyResponses.length > 0
    ? Math.round(((promoters - detractors) / surveyResponses.length) * 100)
    : 0
  const scoreDistribution = [1, 2, 3, 4, 5].map((n) => ({
    score: n.toString(),
    count: surveyResponses.filter((r) => Number(r.score ?? 0) === n).length,
  }))

  return (
    <MetricsClient
      period={period}
      revenue={{ total: totalRevenue, daily: dailyRevenue, byProfessional: revenueByPro, byCategory: revenueByCategory }}
      appointments={{ counts: apptCounts, byWeekday, byHour, daily: dailyAppts }}
      patients={{ new: newPatients, returning: returningPatients, retentionRate, bySource: patientsBySource, total: patients.length }}
      agent={{
        total: agentConvs,
        escalated: agentEscalated,
        resolved: agentResolved,
        bookings: agentBookings,
        escalationRate,
        daily: dailyAgentConvs,
        agentRevenue,
        apptsBySource,
      }}
      professionals={professionals}
      userRole={profile.role ?? "admin"}
      commissions={{ total: totalCommissions, byProfessional: commissionsByPro }}
      packages={{ sold: packagesSold, revenue: packageRevenue }}
      surveys={{ total: surveyResponses.length, avgScore, nps, scoreDistribution }}
    />
  )
}

// ── Helpers ────────────────────────────────────────────────────────────

function buildDailySeries(events: { date: string; value: number }[], since: string) {
  const map: Record<string, number> = {}
  events.forEach(({ date, value }) => {
    const d = date.slice(0, 10)
    map[d] = (map[d] ?? 0) + value
  })

  // Fill in all dates in range
  const start = new Date(since)
  const end = new Date()
  const series: { date: string; value: number }[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    series.push({ date: key, value: map[key] ?? 0 })
  }
  return series
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
