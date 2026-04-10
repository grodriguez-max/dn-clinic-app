"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface TimeBlockInput {
  professional_id: string
  date: string        // YYYY-MM-DD
  start_time: string  // HH:MM
  end_time: string    // HH:MM
  reason?: string
}

export async function createTimeBlock(clinicId: string, input: TimeBlockInput) {
  const service = createServiceClient()
  const { error } = await service.from("time_blocks").insert({
    clinic_id: clinicId,
    professional_id: input.professional_id,
    date: input.date,
    start_time: input.start_time,
    end_time: input.end_time,
    reason: input.reason ?? "Bloqueado",
  })
  if (error) return { error: error.message }
  revalidatePath("/agenda")
  return { ok: true }
}

export async function deleteTimeBlock(id: string) {
  const service = createServiceClient()
  const { error } = await service.from("time_blocks").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/agenda")
  return { ok: true }
}
