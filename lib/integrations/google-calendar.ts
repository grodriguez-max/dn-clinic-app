import { createServiceClient } from "@/lib/supabase/server"

interface GCalSettings {
  connected: boolean
  access_token: string
  refresh_token: string
  expires_at: number
}

async function getValidAccessToken(settings: GCalSettings): Promise<string | null> {
  // If token is still valid (with 60s buffer), return it
  if (Date.now() < settings.expires_at - 60_000) return settings.access_token

  // Refresh the token
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        refresh_token: settings.refresh_token,
        grant_type: "refresh_token",
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.access_token as string
  } catch {
    return null
  }
}

export async function syncAppointmentToCalendar(clinicId: string, appointment: {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  location?: string
  gcal_event_id?: string
  cancelled?: boolean
}): Promise<void> {
  try {
    const supabase = createServiceClient()
    const { data: clinic } = await supabase.from("clinics").select("settings").eq("id", clinicId).single()
    const settings = (clinic?.settings ?? {}) as Record<string, unknown>
    const gcal = settings.google_calendar as GCalSettings | undefined

    if (!gcal?.connected || !gcal.access_token) return

    const token = await getValidAccessToken(gcal)
    if (!token) return

    const calendarId = (settings.google_calendar_id as string) ?? "primary"
    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
    const headers = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" }

    const eventBody = {
      summary: appointment.title,
      description: appointment.description ?? "",
      location: appointment.location ?? "",
      start: { dateTime: appointment.start_time, timeZone: "America/Costa_Rica" },
      end: { dateTime: appointment.end_time, timeZone: "America/Costa_Rica" },
      status: appointment.cancelled ? "cancelled" : "confirmed",
    }

    if (appointment.gcal_event_id) {
      // Update or cancel existing event
      await fetch(`${baseUrl}/${appointment.gcal_event_id}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify(eventBody),
      })
    } else {
      // Create new event and store event_id back
      const res = await fetch(baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(eventBody),
      })
      if (res.ok) {
        const event = await res.json()
        // Store gcal_event_id on appointment
        await supabase.from("appointments").update({ gcal_event_id: event.id }).eq("id", appointment.id)
      }
    }
  } catch {
    // Non-fatal: calendar sync failures never block main flow
  }
}
