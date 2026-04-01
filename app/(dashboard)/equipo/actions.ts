"use server"

import { createClient, createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { can } from "@/lib/permissions"

export interface ProfessionalInput {
  name: string
  specialty?: string
  bio?: string
  photo_url?: string
  curriculum_url?: string
  certifications?: string[]
  schedule?: Record<string, unknown>
  is_active?: boolean
}

async function getCallerRole(): Promise<string | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from("users").select("role").eq("id", user.id).single()
  return data?.role ?? null
}

/**
 * Upload a file to Supabase Storage bucket 'professional-documents' (private).
 * Returns the storage path.
 */
export async function uploadProfessionalDocument(
  professionalId: string,
  fileType: "photo" | "curriculum" | "certification",
  formData: FormData
): Promise<{ path?: string; publicUrl?: string; error?: string }> {
  const role = await getCallerRole()
  if (!can(role ?? "", "view_professional_docs") && fileType !== "photo") {
    return { error: "Sin permisos para subir documentos" }
  }

  const file = formData.get("file") as File | null
  if (!file) return { error: "No se encontró el archivo" }

  const service = createServiceClient()
  const ext = file.name.split(".").pop() ?? "bin"
  const timestamp = Date.now()
  const path = `${professionalId}/${fileType}/${timestamp}.${ext}`

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  const { error } = await service.storage
    .from("professional-documents")
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    })

  if (error) return { error: error.message }

  // For photos, get a public URL (photos bucket is public)
  // For private docs (curriculum, certifications), return the path only
  if (fileType === "photo") {
    const { data } = service.storage.from("professional-documents").getPublicUrl(path)
    return { path, publicUrl: data.publicUrl }
  }

  return { path }
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
  const role = await getCallerRole()
  if (!can(role ?? "", "delete_professional")) return { error: "Sin permisos para eliminar profesionales" }

  const service = createServiceClient()
  const { error } = await service.from("professionals").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/equipo")
  return { ok: true }
}
