"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function saveClinicSettings(
  clinicId: string,
  data: {
    name: string
    address: string
    phone: string
    email: string
    business_hours: Record<string, unknown>
  }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { error } = await supabase
    .from("clinics")
    .update({
      name: data.name,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      business_hours: data.business_hours,
    })
    .eq("id", clinicId)

  if (error) return { error: error.message }
  revalidatePath("/configuracion")
  return { success: true }
}

export async function saveAgentSettings(
  clinicId: string,
  agentData: Record<string, unknown>
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  // Merge into existing settings
  const { data: clinic } = await supabase
    .from("clinics")
    .select("settings")
    .eq("id", clinicId)
    .single()

  const current = (clinic?.settings ?? {}) as Record<string, unknown>
  const updated = { ...current, ...agentData }

  const { error } = await supabase
    .from("clinics")
    .update({ settings: updated })
    .eq("id", clinicId)

  if (error) return { error: error.message }
  revalidatePath("/configuracion")
  return { success: true }
}

export async function saveNotificationSettings(
  clinicId: string,
  notifData: Record<string, unknown>
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autenticado" }

  const { data: clinic } = await supabase
    .from("clinics")
    .select("settings")
    .eq("id", clinicId)
    .single()

  const current = (clinic?.settings ?? {}) as Record<string, unknown>
  const updated = { ...current, notifications: notifData }

  const { error } = await supabase
    .from("clinics")
    .update({ settings: updated })
    .eq("id", clinicId)

  if (error) return { error: error.message }
  revalidatePath("/configuracion")
  return { success: true }
}
