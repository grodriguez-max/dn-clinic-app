import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const serviceClient = createServiceClient()
  const { data: member } = await serviceClient
    .from("users")
    .select("clinic_id")
    .eq("id", user.id)
    .single()

  if (!member) return NextResponse.json({ error: "No clinic" }, { status: 404 })

  const { data: invoices } = await serviceClient
    .from("platform_invoices")
    .select("*")
    .eq("clinic_id", member.clinic_id)
    .order("created_at", { ascending: false })
    .limit(24)

  return NextResponse.json({ invoices: invoices ?? [] })
}
