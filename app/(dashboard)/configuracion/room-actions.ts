"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface RoomInput {
  name: string
  description?: string
  equipment?: string[]
  is_active?: boolean
}

export async function createRoom(clinicId: string, input: RoomInput) {
  const s = createServiceClient()
  const { data, error } = await s.from("rooms").insert({ clinic_id: clinicId, is_active: true, ...input }).select("id").single()
  if (error) return { error: error.message }
  revalidatePath("/configuracion")
  return { ok: true, id: data.id }
}

export async function updateRoom(id: string, input: Partial<RoomInput>) {
  const s = createServiceClient()
  const { error } = await s.from("rooms").update(input).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/configuracion")
  return { ok: true }
}

export async function deleteRoom(id: string) {
  const s = createServiceClient()
  const { error } = await s.from("rooms").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/configuracion")
  return { ok: true }
}

export async function getRooms(clinicId: string) {
  const s = createServiceClient()
  const { data } = await s.from("rooms").select("id, name, description, equipment, is_active").eq("clinic_id", clinicId).order("name")
  return data ?? []
}

export async function checkRoomAvailability(roomId: string, startTime: string, endTime: string, excludeAppointmentId?: string) {
  const s = createServiceClient()
  let query = s
    .from("appointments")
    .select("id")
    .eq("room_id", roomId)
    .not("status", "in", '("cancelled","no_show")')
    .lt("start_time", endTime)
    .gt("end_time", startTime)

  if (excludeAppointmentId) query = query.neq("id", excludeAppointmentId)
  const { data } = await query
  return (data ?? []).length === 0 // true = available
}
