import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OnboardingWizard } from "./wizard"

export default async function OnboardingPage() {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("clinic_id")
    .eq("id", user.id)
    .single()

  if (!profile?.clinic_id) redirect("/login")

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, onboarding_completed")
    .eq("id", profile.clinic_id)
    .single()

  if (!clinic) redirect("/login")

  if (clinic.onboarding_completed) redirect("/dashboard")

  return (
    <OnboardingWizard
      clinicId={clinic.id}
      initialClinicName={clinic.name}
    />
  )
}
