import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ServicesClient } from "./services-client"

export default async function ServiciosPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("clinic_id").eq("id", user.id).single()
  if (!profile?.clinic_id) redirect("/login")

  const [servicesRes, packagesRes] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, category, duration_minutes, price, description, is_active")
      .eq("clinic_id", profile.clinic_id)
      .order("category")
      .order("name"),

    supabase
      .from("packages")
      .select("id, name, description, service_id, total_sessions, price, discount_percentage, validity_days, is_active")
      .eq("clinic_id", profile.clinic_id)
      .order("name"),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Servicios</h1>
        <p className="text-sm text-muted-foreground mt-1">Gestiona el catálogo de servicios y paquetes de tu clínica</p>
      </div>
      <ServicesClient
        clinicId={profile.clinic_id}
        initialServices={servicesRes.data ?? []}
        initialPackages={(packagesRes.data ?? []) as any[]}
      />
    </div>
  )
}
