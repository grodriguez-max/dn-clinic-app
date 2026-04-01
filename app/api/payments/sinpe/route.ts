import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createSinpePaymentRequest, confirmSinpePayment, buildSinpeQrString } from "@/lib/payments/sinpe"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("clinic_id").eq("id", user.id).single()
  if (!profile?.clinic_id) return NextResponse.json({ error: "No clinic" }, { status: 403 })

  const body = await req.json()
  const { action } = body

  if (action === "create") {
    const { patientId, amount, appointmentId } = body
    if (!patientId || !amount) return NextResponse.json({ error: "Missing fields" }, { status: 400 })

    const result = await createSinpePaymentRequest(profile.clinic_id, patientId, amount, appointmentId)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

    // Get clinic SINPE phone from settings
    const service = createServiceClient()
    const { data: clinic } = await service.from("clinics").select("settings").eq("id", profile.clinic_id).single()
    const sinpePhone = ((clinic?.settings ?? {}) as Record<string, unknown>).sinpe_phone as string | undefined

    const qr = sinpePhone ? buildSinpeQrString(sinpePhone, amount, result.reference!) : null

    return NextResponse.json({ ok: true, reference: result.reference, id: result.id, qr, sinpePhone })
  }

  if (action === "confirm") {
    const { paymentId } = body
    if (!paymentId) return NextResponse.json({ error: "Missing paymentId" }, { status: 400 })
    const result = await confirmSinpePayment(paymentId, user.id)
    return NextResponse.json(result)
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
