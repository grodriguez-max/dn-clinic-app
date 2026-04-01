import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/lib/supabase/server"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const code = searchParams.get("code")
  const clinicId = searchParams.get("state")
  const error = searchParams.get("error")

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ""

  if (error || !code || !clinicId) {
    return NextResponse.redirect(`${appUrl}/configuracion?tab=integraciones&error=google_calendar_denied`)
  }

  const clientId = process.env.GOOGLE_CLIENT_ID!
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!
  const redirectUri = `${appUrl}/api/integrations/google-calendar/callback`

  try {
    // Exchange code for tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    })

    if (!tokenRes.ok) {
      return NextResponse.redirect(`${appUrl}/configuracion?tab=integraciones&error=token_exchange_failed`)
    }

    const tokens = await tokenRes.json()

    // Store tokens encrypted in clinic settings
    const supabase = createServiceClient()
    const { data: clinic } = await supabase.from("clinics").select("settings").eq("id", clinicId).single()
    const current = (clinic?.settings ?? {}) as Record<string, unknown>

    await supabase.from("clinics").update({
      settings: {
        ...current,
        google_calendar: {
          connected: true,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: Date.now() + (tokens.expires_in ?? 3600) * 1000,
          connected_at: new Date().toISOString(),
        },
      },
    }).eq("id", clinicId)

    return NextResponse.redirect(`${appUrl}/configuracion?tab=integraciones&success=google_calendar`)
  } catch {
    return NextResponse.redirect(`${appUrl}/configuracion?tab=integraciones&error=unexpected`)
  }
}
