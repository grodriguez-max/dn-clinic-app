import { createServiceClient } from "@/lib/supabase/server"

export type NotificationType =
  | "new_appointment"
  | "cancelled_appointment"
  | "no_show"
  | "hot_lead"
  | "escalation"
  | "reschedule_request"
  | "new_review"
  | "marketing_campaign_done"
  | "low_survey_score"
  | "package_expiring"
  | "stock_low"

export interface CreateNotificationInput {
  clinic_id: string
  type: NotificationType
  title: string
  description: string
  link?: string
}

export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const supabase = createServiceClient()
    await supabase.from("notifications").insert({
      clinic_id: input.clinic_id,
      type: input.type,
      title: input.title,
      description: input.description,
      link: input.link ?? null,
      read: false,
    })
  } catch {
    // Never throw — notification failures must not break main flow
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notificationId)
}

export async function markAllNotificationsRead(clinicId: string): Promise<void> {
  const supabase = createServiceClient()
  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("clinic_id", clinicId)
    .eq("read", false)
}
