import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ConfiguracionClient } from "./configuracion-client"

export default async function ConfiguracionPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.clinic_id) redirect("/dashboard")

  const [clinicRes, usersRes, roomsRes] = await Promise.all([
    supabase
      .from("clinics")
      .select("id, name, slug, address, phone, email, logo_url, business_hours, settings, whatsapp_connected")
      .eq("id", profile.clinic_id)
      .single(),
    supabase
      .from("users")
      .select("id, name, email, role")
      .eq("clinic_id", profile.clinic_id)
      .order("created_at"),
    supabase
      .from("rooms")
      .select("id, name, description, equipment, is_active")
      .eq("clinic_id", profile.clinic_id)
      .order("name"),
  ])

  if (!clinicRes.data) redirect("/dashboard")

  const clinicWithRooms = { ...clinicRes.data, rooms: roomsRes.data ?? [] }

  return (
    <ConfiguracionClient
      clinic={clinicWithRooms as any}
      users={usersRes.data ?? []}
      currentUserRole={profile.role}
    />
  )
}
