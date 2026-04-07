import { createClient, createServiceClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { DraftsClient } from "./drafts-client"
import Link from "next/link"
import { ArrowLeft, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"

export default async function DraftsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase.from("users").select("clinic_id, role").eq("id", user.id).single()
  if (!profile?.clinic_id) redirect("/login")

  const clinicId = profile.clinic_id
  const service = createServiceClient()

  const [draftsRes, tasksRes] = await Promise.all([
    service
      .from("content_calendar")
      .select("id, scheduled_date, platform, content_type, pillar, topic, angle, copy_draft, image_brief, status, notes, created_at")
      .eq("clinic_id", clinicId)
      .not("status", "eq", "published")
      .order("scheduled_date", { ascending: true })
      .limit(50),

    service
      .from("marketing_tasks")
      .select("id, title, status, created_at")
      .eq("clinic_id", clinicId)
      .eq("status", "pending")
      .contains("metadata", { type: "edit_draft" })
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  const drafts = draftsRes.data ?? []
  const pendingTasks = tasksRes.data ?? []

  const pendingCount = drafts.filter(d => d.status === "draft" || d.status === "awaiting_approval").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link href="/marketing">
            <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
              <ArrowLeft className="w-4 h-4" />
              Marketing
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Drafts de contenido</h1>
            <p className="text-sm text-muted-foreground">
              {pendingCount > 0
                ? `${pendingCount} ${pendingCount === 1 ? "draft" : "drafts"} esperando tu revisión`
                : "Todo al día — sin drafts pendientes"}
            </p>
          </div>
        </div>
        <Link href="/marketing/chat">
          <Button variant="outline" size="sm" className="gap-1.5">
            <MessageSquare className="w-4 h-4" />
            Pedirle más contenido al agente
          </Button>
        </Link>
      </div>

      <DraftsClient drafts={drafts} pendingTasks={pendingTasks} />
    </div>
  )
}
