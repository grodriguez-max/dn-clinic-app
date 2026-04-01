import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { generateMarketingImage, generateBeforeAfterPreview } from "@/lib/ai/image-generation"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("clinic_id").eq("id", user.id).single()
  if (!profile?.clinic_id) return NextResponse.json({ error: "No clinic" }, { status: 403 })

  const body = await req.json()
  const { type } = body

  if (type === "marketing") {
    const { serviceType, style, customPrompt, format, clinicName } = body
    const result = await generateMarketingImage({
      clinicId: profile.clinic_id,
      clinicName: clinicName ?? "Clínica",
      serviceType: serviceType ?? "general",
      style: style ?? "modern",
      customPrompt,
      format: format ?? "square",
    })
    return NextResponse.json(result)
  }

  if (type === "before_after") {
    const { patientId, beforeImageUrl, treatment } = body
    if (!patientId || !beforeImageUrl || !treatment) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    const result = await generateBeforeAfterPreview({
      clinicId: profile.clinic_id,
      patientId,
      beforeImageUrl,
      treatment,
    })
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: "Invalid type" }, { status: 400 })
}
