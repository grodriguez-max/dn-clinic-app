"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface ProfessionalInput {
  name: string
  specialty?: string
  bio?: string
  schedule?: Record<string, unknown>
  is_active?: boolean
}

export async function createProfessional(clinicId: string, input: ProfessionalInput) {
  const service = createServiceClient()
  const { data, error } = await service
    .from("professionals")
    .insert({ clinic_id: clinicId, is_active: true, ...input })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath("/equipo")
  return { ok: true, id: data.id }
}

export async function updateProfessional(id: string, input: Partial<ProfessionalInput>) {
  const service = createServiceClient()
  const { error } = await service.from("professionals").update(input).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/equipo")
  return { ok: true }
}

export async function toggleProfessional(id: string, is_active: boolean) {
  return updateProfessional(id, { is_active })
}

export async function deleteProfessional(id: string) {
  const service = createServiceClient()
  const { error } = await service.from("professionals").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/equipo")
  return { ok: true }
}
