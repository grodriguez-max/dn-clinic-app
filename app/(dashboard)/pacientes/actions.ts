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

export interface PatientInput {
  name: string
  phone?: string
  email?: string
  birth_date?: string
  gender?: string
  tags?: string[]
  source?: string
  notes?: string
  allergies?: string
  medical_notes?: string
}

export async function createPatient(clinicId: string, input: PatientInput) {
  const service = createServiceClient()
  const { data, error } = await service
    .from("patients")
    .insert({ clinic_id: clinicId, ...input })
    .select("id")
    .single()

  if (error) return { error: error.message }
  revalidatePath("/pacientes")
  return { ok: true, id: data.id }
}

export async function updatePatient(id: string, input: PatientInput) {
  const service = createServiceClient()
  const { error } = await service.from("patients").update(input).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/pacientes")
  return { ok: true }
}

export async function deletePatient(id: string) {
  const role = await getCallerRole()
  if (!can(role ?? "", "delete_patient")) return { error: "Sin permisos para eliminar pacientes" }

  const service = createServiceClient()
  const { error } = await service.from("patients").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/pacientes")
  return { ok: true }
}
