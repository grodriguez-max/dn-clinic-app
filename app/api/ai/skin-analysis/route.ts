import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createServiceClient } from "@/lib/supabase/server"
import { analyzeSkin } from "@/lib/ai/skin-analysis"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("clinic_id").eq("id", user.id).single()
  if (!profile?.clinic_id) return NextResponse.json({ error: "No clinic" }, { status: 403 })

  const body = await req.json()
  const { patientId, imageBase64, imageUrl } = body

  if (!patientId || !imageBase64) {
    return NextResponse.json({ error: "Missing patientId or imageBase64" }, { status: 400 })
  }

  // Verify patient belongs to this clinic
  const service = createServiceClient()
  const { data: patient } = await service.from("patients").select("id").eq("id", patientId).eq("clinic_id", profile.clinic_id).maybeSingle()
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 })

  const result = await analyzeSkin({
    clinicId: profile.clinic_id,
    patientId,
    imageBase64,
    imageUrl,
  })

  return NextResponse.json(result)
}
