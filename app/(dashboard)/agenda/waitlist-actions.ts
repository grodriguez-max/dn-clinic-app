"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface WaitlistInput {
  patient_id: string
  professional_id?: string
  service_id?: string
  preferred_date?: string   // YYYY-MM-DD
  preferred_time?: "morning" | "afternoon" | "any"
  notes?: string
}

export async function addToWaitlist(clinicId: string, input: WaitlistInput) {
  const service = createServiceClient()
  const { error } = await service.from("waitlist").insert({
    clinic_id: clinicId,
    ...input,
    preferred_time: input.preferred_time ?? "any",
    status: "waiting",
  })
  if (error) return { error: error.message }
  revalidatePath("/agenda")
  return { ok: true }
}

export async function removeFromWaitlist(id: string) {
  const service = createServiceClient()
  const { error } = await service.from("waitlist").update({ status: "cancelled" }).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/agenda")
  return { ok: true }
}

export async function getWaitlist(clinicId: string) {
  const service = createServiceClient()
  const { data } = await service
    .from("waitlist")
    .select("id, status, preferred_date, preferred_time, notes, created_at, patients(name,phone), professionals(name), services(name)")
    .eq("clinic_id", clinicId)
    .eq("status", "waiting")
    .order("created_at")
    .limit(50)
  return (data ?? []) as unknown as Array<{
    id: string
    status: string
    preferred_date: string | null
    preferred_time: string
    notes: string | null
    created_at: string
    patients: { name: string; phone: string } | null
    professionals: { name: string } | null
    services: { name: string } | null
  }>
}
