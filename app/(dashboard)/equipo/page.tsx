import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { TeamClient } from "./team-client"

export default async function EquipoPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("clinic_id, role").eq("id", user.id).single()
  if (!profile?.clinic_id) redirect("/login")

  const [profRes, servicesRes] = await Promise.all([
    supabase
      .from("professionals")
      .select("id, name, specialty, bio, photo_url, is_active, default_commission_percentage")
      .eq("clinic_id", profile.clinic_id)
      .order("name"),
    supabase
      .from("services")
      .select("id, name, price")
      .eq("clinic_id", profile.clinic_id)
      .eq("is_active", true)
      .order("name"),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Equipo</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestiona los profesionales de tu clínica</p>
      </div>
      <TeamClient
        clinicId={profile.clinic_id}
        initialProfessionals={(profRes.data ?? []) as any[]}
        services={servicesRes.data ?? []}
        isOwner={profile.role === "owner"}
      />
    </div>
  )
}
