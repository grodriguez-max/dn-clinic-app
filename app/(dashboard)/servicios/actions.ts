"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { can } from "@/lib/permissions"

async function getCallerRole(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from("users").select("role").eq("id", user.id).single()
  return data?.role ?? null
}

export interface ServiceInput {
  name: string
  category?: string
  duration_minutes: number
  price: number
  description?: string
  is_active?: boolean
}

export async function createService(clinicId: string, input: ServiceInput) {
  const service = createServiceClient()
  const { data, error } = await service
    .from("services")
    .insert({ clinic_id: clinicId, is_active: true, ...input })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath("/servicios")
  return { ok: true, id: data.id }
}

export async function updateService(id: string, input: Partial<ServiceInput>) {
  const service = createServiceClient()
  const { error } = await service.from("services").update(input).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/servicios")
  return { ok: true }
}

export async function toggleService(id: string, is_active: boolean) {
  return updateService(id, { is_active })
}

export async function deleteService(id: string) {
  const role = await getCallerRole()
  if (!can(role ?? "", "delete_service")) return { error: "Sin permisos para eliminar servicios" }

  const service = createServiceClient()
  const { error } = await service.from("services").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/servicios")
  return { ok: true }
}
