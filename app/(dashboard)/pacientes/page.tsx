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
    .select("id, name, phone, email, birth_date, gender, tags, source, notes, allergies, medical_notes")
    .eq("clinic_id", profile.clinic_id)
    .order("name")

  return (
    <PatientsClient clinicId={profile.clinic_id} initialPatients={patients ?? []} />
  )
}
