import { NextRequest, NextResponse } from "next/server"
import { submitSurveyResponse } from "@/app/(dashboard)/configuracion/survey-actions"

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { patientId, appointmentId, responses } = await req.json()
  if (!patientId) return NextResponse.json({ error: "Missing patientId" }, { status: 400 })
  const result = await submitSurveyResponse(params.id, patientId, appointmentId ?? null, null, responses)
  return NextResponse.json(result)
}
