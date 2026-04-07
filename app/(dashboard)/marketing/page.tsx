// @ts-nocheck
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { MarketingClient } from "./marketing-client"

export default async function MarketingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("clinic_id").eq("id", user.id).single()
  if (!profile?.clinic_id) redirect("/login")

  const clinicId = profile.clinic_id
  const since30d = new Date(Date.now() - 30 * 86400000).toISOString()
  const since7d  = new Date(Date.now() - 7 * 86400000).toISOString()

  const today = new Date().toISOString().split("T")[0]
  const in7d  = new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]

  const [campaignsRes, resultsRes, patientsRes, segmentsRes, missionsRes, tasksRes, calendarRes, outreachRes] = await Promise.all([
    // All campaigns
    supabase
      .from("campaigns")
      .select("id, name, type, channel, status, created_at, message_template, requires_approval, is_automatic")
      .eq("clinic_id", clinicId)
      .order("created_at", { ascending: false })
      .limit(50),

    // Campaign results last 30 days
    supabase
      .from("campaign_results")
      .select("campaign_id, sent_at, delivered, read_at, responded, converted, opt_out, patient_id")
      .gte("sent_at", since30d),

    // Patient segments
    supabase
      .from("patients")
      .select("id, source, tags, opt_out_marketing, created_at, birth_date")
      .eq("clinic_id", clinicId),

    // Recent agent marketing task logs
    supabase
      .from("messages")
      .select("content, metadata, created_at")
      .eq("role", "agent")
      .gte("created_at", since7d)
      .contains("metadata", { type: "marketing_task" })
      .order("created_at", { ascending: false })
      .limit(20),

    // Marketing missions
    supabase
      .from("marketing_missions")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("priority")
      .limit(20),

    // Marketing tasks
    supabase
      .from("marketing_tasks")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("due_date")
      .limit(30),

    // Content calendar next 14 days
    supabase
      .from("content_calendar")
      .select("*")
      .eq("clinic_id", clinicId)
      .gte("scheduled_date", today)
      .lte("scheduled_date", in7d)
      .order("scheduled_date")
      .limit(20),

    // Outreach log recent
    supabase
      .from("outreach_log")
      .select("*")
      .eq("clinic_id", clinicId)
      .order("sent_at", { ascending: false })
      .limit(30),
  ])

  const campaigns = campaignsRes.data ?? []
  const results   = resultsRes.data ?? []
  const patients  = patientsRes.data ?? []
  const taskLogs  = segmentsRes.data ?? []
  const missions  = missionsRes.data ?? []
  const tasks     = tasksRes.data ?? []
  const calendar  = calendarRes.data ?? []
  const outreach  = outreachRes.data ?? []

  // ── Campaign stats ───────────────────────────────────────────────────
  const campaignStats = campaigns.map((c) => {
    const cResults = results.filter((r) => r.campaign_id === c.id)
    const sent       = cResults.length
    const read       = cResults.filter((r) => r.read_at).length
    const converted  = cResults.filter((r) => r.converted).length
    const optOuts    = cResults.filter((r) => r.opt_out).length
    return {
      ...c,
      stats: {
        sent,
        read,
        read_rate: sent > 0 ? Math.round((read / sent) * 100) : 0,
        converted,
        conversion_rate: sent > 0 ? Math.round((converted / sent) * 100) : 0,
        opt_outs: optOuts,
      },
    }
  })

  // ── Overall stats (30d) ──────────────────────────────────────────────
  const totalSent      = results.length
  const totalRead      = results.filter((r) => r.read_at).length
  const totalConverted = results.filter((r) => r.converted).length
  const totalOptOuts   = results.filter((r) => r.opt_out).length

  // ── Patient segments ─────────────────────────────────────────────────
  const now = new Date()
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000)
  const todayMMDD = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`

  const segments = {
    total: patients.filter((p) => !p.opt_out_marketing).length,
    opt_out: patients.filter((p) => p.opt_out_marketing).length,
    leads: patients.filter((p) => (p.tags ?? []).includes("lead") && !p.opt_out_marketing).length,
    instagram: patients.filter((p) => p.source === "instagram" && !p.opt_out_marketing).length,
    birthdays_today: patients.filter((p) => p.birth_date && p.birth_date.slice(5) === todayMMDD && !p.opt_out_marketing).length,
    sources: Object.entries(
      patients.reduce((acc: Record<string, number>, p) => {
        const src = p.source ?? "directo"
        acc[src] = (acc[src] ?? 0) + 1
        return acc
      }, {})
    ).map(([name, count]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), count })).sort((a, b) => b.count - a.count),
  }

  // ── Type breakdown ────────────────────────────────────────────────────
  const byType = [
    "reactivation", "birthday", "post_treatment", "review_request",
    "treatment_reminder", "custom_promo",
  ].map((type) => ({
    type,
    count: campaigns.filter((c) => c.type === type).length,
    label: {
      reactivation: "Reactivación",
      birthday: "Cumpleaños",
      post_treatment: "Post-tratamiento",
      review_request: "Reseña",
      treatment_reminder: "Recordatorio",
      custom_promo: "Promo especial",
    }[type] ?? type,
  }))

  return (
    <MarketingClient
      campaigns={campaignStats}
      stats={{ totalSent, totalRead, totalConverted, totalOptOuts }}
      segments={segments}
      byType={byType}
      taskLogs={taskLogs}
      missions={missions}
      tasks={tasks}
      calendar={calendar}
      outreach={outreach}
    />
  )
}
