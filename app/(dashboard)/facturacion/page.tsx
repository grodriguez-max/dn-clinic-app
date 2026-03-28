// @ts-nocheck
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { FacuracionClient } from "./facturacion-client"

export default async function FacuracionPage({
  searchParams,
}: {
  searchParams: { status?: string; period?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single()
  if (!profile?.clinic_id) redirect("/login")

  const clinicId = profile.clinic_id

  const period = searchParams.period ?? "month"
  const now = new Date()
  const ranges: Record<string, Date> = {
    today:   new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    week:    new Date(now.getTime() - 7 * 86400000),
    month:   new Date(now.getFullYear(), now.getMonth(), 1),
    quarter: new Date(now.getFullYear(), now.getMonth() - 3, 1),
  }
  const since = (ranges[period] ?? ranges.month).toISOString()

  const [invoicesRes, patientsRes, servicesRes, pendingApptRes, clinicRes] = await Promise.all([
    // All invoices with patient info
    supabase
      .from("invoices")
      .select("id, invoice_number, invoice_type, subtotal, tax_amount, total, payment_method, status, hacienda_key, hacienda_response, items, created_at, patient_id, appointment_id, patients(name, phone, id_number)")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(200),

    // Patients for select in new invoice form
    supabase
      .from("patients")
      .select("id, name, phone, id_number")
      .eq("clinic_id", clinicId)
      .order("name"),

    // Services for items
    supabase
      .from("services")
      .select("id, name, price, category")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .order("name"),

    // Completed appointments without invoice
    supabase
      .from("appointments")
      .select("id, start_time, patient_id, service_id, patients(name), services(name, price), professionals(name)")
      .eq("clinic_id", clinicId)
      .eq("status", "completed")
      .gte("start_time", since)
      .order("start_time", { ascending: false }),

    // Clinic settings (cedula, alegra status)
    supabase
      .from("clinics")
      .select("name, settings")
      .eq("id", clinicId)
      .single(),
  ])

  const allInvoices = invoicesRes.data ?? []
  const patients    = patientsRes.data ?? []
  const services    = servicesRes.data ?? []
  const clinic      = clinicRes.data
  const settings    = (clinic?.settings ?? {}) as Record<string, unknown>

  // Filter invoices in period (non-voided) for stats
  const periodInvoices = allInvoices.filter(
    (i) => i.status !== "anulada" && new Date(i.created_at) >= new Date(since)
  )

  // Completed appts without invoice
  const invoicedApptIds = new Set(allInvoices.map((i) => i.appointment_id).filter(Boolean))
  const pendingAppts = (pendingApptRes.data ?? []).filter((a) => !invoicedApptIds.has(a.id))

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalRevenue   = periodInvoices.reduce((s, i) => s + Number(i.total), 0)
  const totalTax       = periodInvoices.reduce((s, i) => s + Number(i.tax_amount), 0)
  const avgTicket      = periodInvoices.length > 0 ? Math.round(totalRevenue / periodInvoices.length) : 0
  const voidedCount    = allInvoices.filter((i) => i.status === "anulada" && new Date(i.created_at) >= new Date(since)).length

  const byPayment: Record<string, number> = {}
  periodInvoices.forEach((i) => {
    const m = i.payment_method ?? "otro"
    byPayment[m] = (byPayment[m] ?? 0) + Number(i.total)
  })

  const byType: Record<string, number> = {}
  periodInvoices.forEach((i) => {
    byType[i.invoice_type] = (byType[i.invoice_type] ?? 0) + 1
  })

  const haciendaConnected = !!(settings.alegra_email ?? settings.hacienda_cert)

  return (
    <FacuracionClient
      invoices={allInvoices as any}
      patients={patients}
      services={services}
      pendingAppointments={pendingAppts as any}
      stats={{
        totalRevenue,
        totalTax,
        avgTicket,
        totalInvoices: periodInvoices.length,
        voidedCount,
        byPayment: Object.entries(byPayment).map(([name, total]) => ({ name: cap(name), total })).sort((a, b) => b.total - a.total),
        byType: Object.entries(byType).map(([type, count]) => ({ type, count })),
      }}
      period={period}
      haciendaConnected={haciendaConnected}
      clinicName={clinic?.name ?? ""}
      userRole={profile.role}
    />
  )
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
