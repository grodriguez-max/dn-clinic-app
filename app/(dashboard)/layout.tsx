import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
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

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, onboarding_completed")
    .eq("id", profile.clinic_id)
    .single()

  // Redirect to onboarding if not completed yet
  // (only for non-onboarding routes — handled by middleware later)

  return (
    <AppShell
      user={{
        name: profile.name,
        email: profile.email,
        role: profile.role,
        avatar_url: profile.avatar_url,
      }}
      clinicName={clinic?.name ?? "Mi Clinica"}
    >
      {children}
    </AppShell>
  )
}
