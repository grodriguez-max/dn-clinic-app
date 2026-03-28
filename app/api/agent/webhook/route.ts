/**
 * Webhook endpoint — receives messages from WhatsApp Baileys server
 * POST /api/agent/webhook
 * Body: { phone, text, clinicSlug, secret }
 */

import { NextRequest, NextResponse } from "next/server"
import { processMessage } from "@/lib/agent/receptionist"
import { createServiceClient } from "@/lib/supabase/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { phone, text, clinicSlug, secret } = body

    // Verify webhook secret
    if (secret !== process.env.WHATSAPP_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (!phone || !text || !clinicSlug) {
      return NextResponse.json({ error: "Missing required fields: phone, text, clinicSlug" }, { status: 400 })
    }

    // Resolve clinic by slug
    const supabase = createServiceClient()
    const { data: clinic } = await supabase
      .from("clinics")
      .select("id, name, onboarding_completed, whatsapp_connected")
      .eq("slug", clinicSlug)
      .single()

    if (!clinic) return NextResponse.json({ error: "Clinic not found" }, { status: 404 })
    if (!clinic.onboarding_completed) return NextResponse.json({ error: "Clinic not active" }, { status: 403 })

    // Process the message through the agent
    const result = await processMessage({
      phone,
      text,
      clinicId: clinic.id,
      channel: "whatsapp",
    })

    return NextResponse.json({
      text: result.text,
      conversationId: result.conversationId,
      escalated: result.escalated,
    })
  } catch (error) {
    console.error("[webhook] Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Health check
export async function GET() {
  return NextResponse.json({ status: "ok", service: "dn-clinic-agent-webhook" })
}
