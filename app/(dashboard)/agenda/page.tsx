import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AgendaClient } from "./agenda-client"

export default async function AgendaPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("clinic_id")
    .eq("id", user.id)
    .single()

  if (!profile?.clinic_id) redirect("/login")
  const clinicId = profile.clinic_id

  // Fetch reference data for dropdowns
  const [profsResult, svcsResult, patientsResult] = await Promise.all([
    supabase
      .from("professionals")
      .select("id, name, specialty")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("services")
      .select("id, name, duration_minutes, price")
      .eq("clinic_id", clinicId)
      .eq("is_active", true)
      .order("name"),

    supabase
      .from("patients")
      .select("id, name, phone")
      .eq("clinic_id", clinicId)
      .order("name")
      .limit(300),
  ])

  return (
    <div className="flex flex-col h-[calc(100vh-5rem)] relative">
      <AgendaClient
        clinicId={clinicId}
        professionals={profsResult.data ?? []}
        services={svcsResult.data ?? []}
        patients={patientsResult.data ?? []}
      />
    </div>
  )
}
