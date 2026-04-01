import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { InventoryClient } from "./inventory-client"

export default async function InventarioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("clinic_id, role").eq("id", user.id).single()
  if (!profile?.clinic_id) redirect("/login")

  const service = createServiceClient()
  const { data: products } = await service
    .from("products")
    .select("id, name, sku, category, description, cost_price, sale_price, stock_quantity, min_stock_alert, unit, supplier")
    .eq("clinic_id", profile.clinic_id)
    .order("name")

  return (
    <InventoryClient
      clinicId={profile.clinic_id}
      initialProducts={products ?? []}
    />
  )
}
