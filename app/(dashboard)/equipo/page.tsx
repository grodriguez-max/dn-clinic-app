import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TeamClient } from "./team-client"

export default async function EquipoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("clinic_id").eq("id", user.id).single()
  if (!profile?.clinic_id) redirect("/login")

  const { data: professionals } = await supabase
    .from("professionals")
    .select("id, name, specialty, bio, photo_url, is_active")
    .eq("clinic_id", profile.clinic_id)
    .order("name")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Equipo</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestiona los profesionales de tu clínica</p>
      </div>
      <TeamClient clinicId={profile.clinic_id} initialProfessionals={professionals ?? []} />
    </div>
  )
}
