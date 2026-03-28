import { createClient } from "@/lib/supabase/server"
import { redirect, notFound } from "next/navigation"
import { PatientDetailClient } from "./patient-detail-client"

export default async function PatientDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("clinic_id").eq("id", user.id).single()
  if (!profile?.clinic_id) redirect("/login")

  const { data: patient } = await supabase
    .from("patients")
    .select("*")
    .eq("id", params.id)
    .eq("clinic_id", profile.clinic_id)
    .single()

  if (!patient) notFound()

  const [appointmentsRes, recordsRes, conversationsRes, invoicesRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, start_time, end_time, status, notes, professionals(name), services(name, price)")
      .eq("patient_id", params.id)
      .order("start_time", { ascending: false })
      .limit(50),

    supabase
      .from("clinical_records")
      .select("id, record_date, chief_complaint, diagnosis, treatment, recommendations, professionals(name)")
      .eq("patient_id", params.id)
      .order("record_date", { ascending: false })
      .limit(20),

    supabase
      .from("conversations")
      .select("id, channel, status, started_at, resolved_at, summary")
      .eq("patient_id", params.id)
      .order("started_at", { ascending: false })
      .limit(20),

    supabase
      .from("invoices")
      .select("id, invoice_number, invoice_type, total, status, payment_method, created_at")
      .eq("patient_id", params.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (
    <PatientDetailClient
      patient={patient}
      appointments={(appointmentsRes.data ?? []) as any[]}
      records={(recordsRes.data ?? []) as any[]}
      conversations={conversationsRes.data ?? []}
      invoices={invoicesRes.data ?? []}
    />
  )
}
