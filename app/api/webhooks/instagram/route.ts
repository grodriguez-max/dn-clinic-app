import { NextRequest, NextResponse } from "next/server"
import { processMessage } from "@/lib/agent/receptionist"
import { sendInstagramMessage } from "@/lib/agent/channels/instagram"
import { createServiceClient } from "@/lib/supabase/server"

// ── Webhook verification (GET) ─────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const mode      = searchParams.get("hub.mode")
  const token     = searchParams.get("hub.verify_token")
  const challenge = searchParams.get("hub.challenge")

  if (mode === "subscribe" && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge ?? "", { status: 200 })
  }
  return new Response("Forbidden", { status: 403 })
}

// ── Incoming message handler (POST) ────────────────────────────────────
export async function POST(req: NextRequest) {
  const body = await req.json()

  // Instagram sends messaging events under entry[].messaging[]
  for (const entry of (body.entry ?? [])) {
    const igAccountId = entry.id as string

    for (const messaging of (entry.messaging ?? [])) {
      const senderId = messaging.sender?.id as string
      const text = messaging.message?.text as string | undefined

      if (!senderId || !text) continue

      // Find which clinic owns this IG account
      const supabase = createServiceClient()
      const { data: clinics } = await supabase
        .from("clinics")
        .select("id, settings")
        .filter("settings->meta_instagram_account_id", "eq", igAccountId)
        .limit(1)

      const clinic = clinics?.[0]
      if (!clinic) continue

      // Process through the agent
      try {
        const response = await processMessage({
          phone: senderId,        // IG uses PSID as unique identifier instead of phone
          text,
          clinicId: clinic.id,
          channel: "instagram",
        })

        // Send reply back via Instagram
        if (response.text) {
          await sendInstagramMessage(senderId, response.text)
        }
      } catch (err) {
        console.error("[instagram webhook] Error processing message:", err)
      }
    }
  }

  // Always return 200 quickly — Meta will retry if we don't
  return NextResponse.json({ ok: true })
}
