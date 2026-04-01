"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface BranchInput {
  name: string
  address?: string
  phone?: string
  email?: string
  is_main?: boolean
}

export async function createBranch(clinicId: string, input: BranchInput) {
  const s = createServiceClient()
  const { data, error } = await s
    .from("branches")
    .insert({ clinic_id: clinicId, ...input })
    .select("id")
    .single()
  if (error) return { error: error.message }
  revalidatePath("/configuracion")
  return { ok: true, id: data.id }
}

export async function updateBranch(branchId: string, input: Partial<BranchInput>) {
  const s = createServiceClient()
  const { error } = await s.from("branches").update(input).eq("id", branchId)
  if (error) return { error: error.message }
  revalidatePath("/configuracion")
  return { ok: true }
}

export async function deleteBranch(branchId: string) {
  const s = createServiceClient()
  const { error } = await s.from("branches").delete().eq("id", branchId)
  if (error) return { error: error.message }
  revalidatePath("/configuracion")
  return { ok: true }
}

export async function getBranches(clinicId: string) {
  const s = createServiceClient()
  const { data } = await s
    .from("branches")
    .select("id, name, address, phone, email, is_main")
    .eq("clinic_id", clinicId)
    .order("is_main", { ascending: false })
  return data ?? []
}
