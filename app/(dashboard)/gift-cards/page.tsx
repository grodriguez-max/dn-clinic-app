import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { GiftCardsClient } from "./gift-cards-client"

export default async function GiftCardsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("clinic_id").eq("id", user.id).single()
  if (!profile?.clinic_id) redirect("/login")

  const service = createServiceClient()
  const [gcRes, patsRes] = await Promise.all([
    service
      .from("gift_cards")
      .select("id, code, amount, balance, status, expires_at, created_at, purchased_by")
      .eq("clinic_id", profile.clinic_id)
      .order("created_at", { ascending: false })
      .limit(100),
    service
      .from("patients")
      .select("id, name")
      .eq("clinic_id", profile.clinic_id)
      .order("name")
      .limit(500),
  ])

  return (
    <GiftCardsClient
      clinicId={profile.clinic_id}
      initialCards={gcRes.data ?? []}
      patients={patsRes.data ?? []}
    />
  )
}
