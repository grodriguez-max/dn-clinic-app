import { createServiceClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { BookingClient } from "./booking-client"

export default async function ReservaPage({ params }: { params: { slug: string } }) {
  const supabase = createServiceClient()

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id, name, phone, email, logo_url, business_hours, timezone")
    .eq("slug", params.slug)
    .eq("onboarding_completed", true)
    .single()

  if (!clinic) notFound()

  const [servicesRes, professionalsRes] = await Promise.all([
    supabase
      .from("services")
      .select("id, name, category, duration_minutes, price, description")
      .eq("clinic_id", clinic.id)
      .eq("is_active", true)
      .order("category")
      .order("name"),

    supabase
      .from("professionals")
      .select("id, name, specialty, photo_url")
      .eq("clinic_id", clinic.id)
      .eq("is_active", true)
      .order("name"),
  ])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      <BookingClient
        clinic={clinic}
        services={servicesRes.data ?? []}
        professionals={professionalsRes.data ?? []}
      />
    </div>
  )
}
