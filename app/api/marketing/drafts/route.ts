import { NextRequest, NextResponse } from "next/server"
import { createClient, createServiceClient } from "@/lib/supabase/server"

// PATCH /api/marketing/drafts — approve or request changes on a draft
export async function PATCH(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data: profile } = await supabase.from("users").select("clinic_id, role").eq("id", user.id).single()
  if (!profile?.clinic_id) return NextResponse.json({ error: "No clinic" }, { status: 403 })

  const body = await req.json()
  const { draftId, action, feedback } = body as {
    draftId: string
    action: "approve" | "request_changes" | "reject"
    feedback?: string
  }

  if (!draftId || !action) return NextResponse.json({ error: "Missing draftId or action" }, { status: 400 })

  const service = createServiceClient()

  // Verify draft belongs to this clinic
  const { data: draft } = await service
    .from("content_calendar")
    .select("id, topic, platform, clinic_id")
    .eq("id", draftId)
    .eq("clinic_id", profile.clinic_id)
    .single()

  if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 })

  if (action === "approve") {
    await service
      .from("content_calendar")
      .update({ status: "approved", approved_by: user.id, approved_at: new Date().toISOString() })
      .eq("id", draftId)

    return NextResponse.json({ ok: true, message: "Draft aprobado" })
  }

  if (action === "request_changes") {
    if (!feedback?.trim()) return NextResponse.json({ error: "Se requiere feedback" }, { status: 400 })

    // Reset to draft with feedback stored in notes
    await service
      .from("content_calendar")
      .update({ status: "draft", notes: feedback })
      .eq("id", draftId)

    // Create task for the agent to re-generate
    await service.from("marketing_tasks").insert({
      clinic_id: profile.clinic_id,
      title: `Editar draft: "${draft.topic}"`,
      description: feedback,
      status: "pending",
      priority: "high",
      assigned_to: "agent",
      metadata: {
        type: "edit_draft",
        draft_id: draftId,
        platform: draft.platform,
        feedback,
        requested_by: user.id,
      },
    })

    return NextResponse.json({ ok: true, message: "Feedback enviado al agente" })
  }

  if (action === "reject") {
    await service
      .from("content_calendar")
      .update({ status: "cancelled" })
      .eq("id", draftId)

    return NextResponse.json({ ok: true, message: "Draft descartado" })
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 })
}
