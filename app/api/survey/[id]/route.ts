import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const s = createServiceClient()
  const { data, error } = await s
    .from("survey_templates")
    .select("id, name, questions, clinics(name, logo_url)")
    .eq("id", params.id)
    .eq("is_active", true)
    .single()
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ...data, clinic: (data as any).clinics })
}
