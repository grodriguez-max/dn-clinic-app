import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { AgentClient } from "./agent-client"

export default async function AgentePage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("clinic_id").eq("id", user.id).single()
  if (!profile?.clinic_id) redirect("/login")

  const clinicId = profile.clinic_id

  // Last 7 days
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [convRes, clinicRes] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, channel, status, handled_by, started_at, resolved_at, summary, escalation_reason, patient_phone, patients(name)")
      .eq("clinic_id", clinicId)
      .gte("started_at", since)
      .order("started_at", { ascending: false })
      .limit(50),

    supabase
      .from("clinics")
      .select("name, whatsapp_connected, settings")
      .eq("id", clinicId)
      .single(),
  ])

  // Stats: conversations today
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const conversations = convRes.data ?? []
  const todayConvs = conversations.filter((c) => new Date(c.started_at) >= today)
  const escalated = conversations.filter((c) => c.status === "escalated").length
  const resolved = conversations.filter((c) => c.status === "resolved").length
  const active = conversations.filter((c) => c.status === "active").length

  // Token usage this week
  const { data: messages } = await supabase
    .from("messages")
    .select("metadata, created_at")
    .eq("conversations.clinic_id", clinicId)
    .gte("created_at", since)
    .not("metadata", "is", null)
    .limit(500)

  const tokenStats = (messages ?? []).reduce(
    (acc, m) => {
      const meta = m.metadata as { tokens_in?: number; tokens_out?: number; model?: string } | null
      if (!meta) return acc
      return {
        input: acc.input + (meta.tokens_in ?? 0),
        output: acc.output + (meta.tokens_out ?? 0),
      }
    },
    { input: 0, output: 0 }
  )

  return (
    <AgentClient
      clinic={{
        name: clinicRes.data?.name ?? "",
        whatsapp_connected: clinicRes.data?.whatsapp_connected ?? false,
        settings: (clinicRes.data?.settings ?? {}) as Record<string, unknown>,
      }}
      conversations={conversations as unknown as Parameters<typeof AgentClient>[0]["conversations"]}
      stats={{
        today: todayConvs.length,
        active,
        escalated,
        resolved,
        total_week: conversations.length,
        tokens_week: tokenStats,
      }}
    />
  )
}
