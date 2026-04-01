import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { AppShell } from "@/components/layout/app-shell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, role, avatar_url, clinic_id")
    .eq("id", authUser.id)
    .single()

  if (!profile) redirect("/login")

  const service = createServiceClient()
  const [clinicRes, branchesRes] = await Promise.all([
    service.from("clinics").select("name, onboarding_completed").eq("id", profile.clinic_id).single(),
    service.from("branches").select("id, name, is_main").eq("clinic_id", profile.clinic_id).order("is_main", { ascending: false }),
  ])

  return (
    <AppShell
      user={{
        name: profile.name,
        email: profile.email,
        role: profile.role,
        avatar_url: profile.avatar_url,
      }}
      clinicName={clinicRes.data?.name ?? "Mi Clinica"}
      clinicId={profile.clinic_id}
      branches={branchesRes.data ?? []}
    >
      {children}
    </AppShell>
  )
}
