"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface CommissionRule {
  service_id: string | null
  commission_type: "percentage" | "fixed"
  commission_value: number
}

export async function saveCommissionRules(
  clinicId: string,
  professionalId: string,
  defaultPct: number,
  rules: CommissionRule[]
) {
  const service = createServiceClient()

  // Update default commission on professional
  await service
    .from("professionals")
    .update({ default_commission_percentage: defaultPct })
    .eq("id", professionalId)

  // Delete existing rules for this professional and re-insert
  await service.from("commission_rules").delete().eq("professional_id", professionalId)

  if (rules.length > 0) {
    const toInsert = rules
      .filter((r) => r.commission_value > 0)
      .map((r) => ({
        clinic_id: clinicId,
        professional_id: professionalId,
        service_id: r.service_id || null,
        commission_type: r.commission_type,
        commission_value: r.commission_value,
      }))
    if (toInsert.length > 0) {
      await service.from("commission_rules").insert(toInsert)
    }
  }

  revalidatePath("/equipo")
  return { ok: true }
}

export async function getProfessionalCommissions(
  professionalId: string,
  since?: string
) {
  const service = createServiceClient()
  let query = service
    .from("commissions")
    .select("id, service_price, commission_percentage, commission_amount, status, paid_at, created_at, appointments(start_time, patients(name)), services(name)")
    .eq("professional_id", professionalId)
    .order("created_at", { ascending: false })

  if (since) query = query.gte("created_at", since)

  const { data } = await query.limit(100)
  return (data ?? []) as unknown as Array<{
    id: string
    service_price: number
    commission_percentage: number
    commission_amount: number
    status: string
    paid_at: string | null
    created_at: string
    appointments: { start_time: string; patients: { name: string } | null } | null
    services: { name: string } | null
  }>
}

export async function markCommissionsPaid(commissionIds: string[]) {
  const service = createServiceClient()
  const { error } = await service
    .from("commissions")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .in("id", commissionIds)
  if (error) return { error: error.message }
  revalidatePath("/equipo")
  revalidatePath("/metricas")
  return { ok: true }
}

export async function getCommissionRules(professionalId: string) {
  const service = createServiceClient()
  const { data } = await service
    .from("commission_rules")
    .select("id, service_id, commission_type, commission_value")
    .eq("professional_id", professionalId)
  return data ?? []
}
