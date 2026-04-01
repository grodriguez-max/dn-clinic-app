"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface PackageInput {
  name: string
  description?: string
  service_id: string
  total_sessions: number
  price: number
  discount_percentage?: number
  validity_days?: number
  is_active?: boolean
}

export interface PatientPackageInput {
  patient_id: string
  package_id: string
  sessions_total: number
  expires_at: string
  payment_status?: string
  amount_paid?: number
  notes?: string
}

export async function createPackage(clinicId: string, input: PackageInput) {
  const service = createServiceClient()
  const { data, error } = await service
    .from("packages")
    .insert({ clinic_id: clinicId, is_active: true, ...input })
    .select("id")
    .single()
  if (error) return { error: error.message }
  revalidatePath("/servicios")
  return { ok: true, id: data.id }
}

export async function updatePackage(id: string, input: Partial<PackageInput>) {
  const service = createServiceClient()
  const { error } = await service.from("packages").update(input).eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/servicios")
  return { ok: true }
}

export async function togglePackage(id: string, is_active: boolean) {
  return updatePackage(id, { is_active })
}

export async function deletePackage(id: string) {
  const service = createServiceClient()
  const { error } = await service.from("packages").delete().eq("id", id)
  if (error) return { error: error.message }
  revalidatePath("/servicios")
  return { ok: true }
}

export async function assignPackageToPatient(clinicId: string, input: PatientPackageInput) {
  const service = createServiceClient()
  const { data, error } = await service
    .from("patient_packages")
    .insert({
      clinic_id: clinicId,
      sessions_used: 0,
      status: "active",
      ...input,
    })
    .select("id")
    .single()
  if (error) return { error: error.message }
  revalidatePath("/pacientes")
  return { ok: true, id: data.id }
}

export async function usePackageSession(patientPackageId: string) {
  const service = createServiceClient()
  const { data: pkg } = await service
    .from("patient_packages")
    .select("sessions_used, sessions_total")
    .eq("id", patientPackageId)
    .single()
  if (!pkg) return { error: "Paquete no encontrado" }

  const newUsed = pkg.sessions_used + 1
  const newStatus = newUsed >= pkg.sessions_total ? "completed" : "active"

  const { error } = await service
    .from("patient_packages")
    .update({ sessions_used: newUsed, status: newStatus })
    .eq("id", patientPackageId)
  if (error) return { error: error.message }
  revalidatePath("/pacientes")
  revalidatePath("/agenda")
  return { ok: true, newStatus, sessionsUsed: newUsed }
}

export async function getPatientActivePackages(patientId: string) {
  const service = createServiceClient()
  const { data } = await service
    .from("patient_packages")
    .select("id, sessions_used, sessions_total, expires_at, packages(name, service_id)")
    .eq("patient_id", patientId)
    .eq("status", "active")
    .order("expires_at")
  return (data ?? []) as unknown as Array<{
    id: string
    sessions_used: number
    sessions_total: number
    expires_at: string
    packages: { name: string; service_id: string } | null
  }>
}
