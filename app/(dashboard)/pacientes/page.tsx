import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { PatientsClient } from "./patients-client"

export default async function PacientesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("clinic_id").eq("id", user.id).single()
  if (!profile?.clinic_id) redirect("/login")

  const { data: patients } = await supabase
    .from("patients")
    .select("id, name, phone, email, birth_date, gender, tags, source, notes, allergies, medical_notes, created_at")
    .eq("clinic_id", profile.clinic_id)
    .order("name")

  // Compute LTV: count completed appointments + sum of service prices per patient
  const { data: completedAppts } = await supabase
    .from("appointments")
    .select("patient_id, services(price)")
    .eq("clinic_id", profile.clinic_id)
    .eq("status", "completed")

  // Build LTV map: patient_id → { visits, total_spent }
  const ltvMap: Record<string, { visits: number; total_spent: number }> = {}
  for (const appt of (completedAppts ?? [])) {
    const pid = appt.patient_id
    if (!ltvMap[pid]) ltvMap[pid] = { visits: 0, total_spent: 0 }
    ltvMap[pid].visits++
    ltvMap[pid].total_spent += (appt.services as { price?: number } | null)?.price ?? 0
  }

  const patientsWithLtv = (patients ?? []).map((p) => ({
    ...p,
    total_visits: ltvMap[p.id]?.visits ?? 0,
    total_spent: ltvMap[p.id]?.total_spent ?? 0,
  }))

  return (
    <PatientsClient clinicId={profile.clinic_id} initialPatients={patientsWithLtv} />
  )
}
