import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { runMarketingTask } from "@/lib/agent/marketing-agent"

/**
 * POST /api/marketing
 * Manually trigger a marketing task from the dashboard
 * Body: { task: string, context?: Record<string, unknown> }
 */
export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("clinic_id, role").eq("id", user.id).single()
  if (!profile?.clinic_id) return NextResponse.json({ error: "No clinic" }, { status: 403 })

  // Only owners can trigger manual marketing tasks
  if (profile.role !== "owner" && profile.role !== "admin") {
    return NextResponse.json({ error: "Solo el dueño puede ejecutar tareas de marketing manuales" }, { status: 403 })
  }

  const body = await req.json() as { task?: string; context?: Record<string, unknown> }
  if (!body.task) return NextResponse.json({ error: "task is required" }, { status: 400 })

  const result = await runMarketingTask({
    clinicId: profile.clinic_id,
    task: body.task,
    context: body.context,
    triggeredBy: "manual",
  })

  return NextResponse.json(result)
}
