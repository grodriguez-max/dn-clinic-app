"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { createClient } from "@/lib/supabase/server"
import type { WizardData, WizardProfessional, WizardService } from "./types"
import { redirect } from "next/navigation"

export async function saveClinicData(
  clinicId: string,
  data: Pick<WizardData, "clinicName" | "address" | "phone" | "email" | "timezone" | "businessHours">
) {
  const service = createServiceClient()
  const { error } = await service
    .from("clinics")
    .update({
      name: data.clinicName,
      address: data.address || null,
      phone: data.phone || null,
      email: data.email || null,
      timezone: data.timezone,
      business_hours: data.businessHours,
    })
    .eq("id", clinicId)

  if (error) return { error: error.message }
  return { ok: true }
}

export async function saveProfessionals(clinicId: string, professionals: WizardProfessional[]) {
  const service = createServiceClient()

  // Delete existing professionals for this clinic (clean re-save)
  await service.from("professionals").delete().eq("clinic_id", clinicId)

  if (professionals.length === 0) return { ok: true, savedIds: [] }

  const { data, error } = await service
    .from("professionals")
    .insert(
      professionals.map((p) => ({
        clinic_id: clinicId,
        name: p.name,
        specialty: p.specialty,
        schedule: p.schedule,
        is_active: true,
      }))
    )
    .select("id")

  if (error) return { error: error.message }
  return { ok: true, savedIds: data?.map((r) => r.id) ?? [] }
}

export async function saveServices(
  clinicId: string,
  services: WizardService[],
  professionals: WizardProfessional[]
) {
  const service = createServiceClient()
  const selected = services.filter((s) => s.selected)

  // Delete existing services for this clinic
  await service.from("services").delete().eq("clinic_id", clinicId)

  if (selected.length === 0) return { ok: true }

  const { data: savedServices, error } = await service
    .from("services")
    .insert(
      selected.map((s) => ({
        clinic_id: clinicId,
        name: s.name,
        category: s.category,
        duration_minutes: s.duration_minutes,
        price: s.price,
        is_active: true,
      }))
    )
    .select("id")

  if (error) return { error: error.message }

  // Link services to professionals
  const links: { service_id: string; professional_id: string }[] = []
  savedServices?.forEach((savedSvc, i) => {
    const svc = selected[i]
    for (const tempId of svc.professionalTempIds) {
      const prof = professionals.find((p) => p.tempId === tempId)
      if (prof?.savedId) {
        links.push({ service_id: savedSvc.id, professional_id: prof.savedId })
      }
    }
  })

  if (links.length > 0) {
    await service.from("service_professionals").insert(links)
  }

  return { ok: true }
}

export async function saveAgentConfig(
  clinicId: string,
  config: Pick<WizardData, "agentName" | "agentTone" | "welcomeMessage" | "agentCanBook" | "autoReminders">,
  faqs: WizardData["faqs"]
) {
  const service = createServiceClient()

  const { error } = await service
    .from("clinics")
    .update({
      settings: {
        agent_name: config.agentName,
        agent_tone: config.agentTone,
        welcome_message: config.welcomeMessage,
        agent_can_book: config.agentCanBook,
        auto_reminders: config.autoReminders,
        agent_schedule_24h: false,
        currency: "CRC",
      },
    })
    .eq("id", clinicId)

  if (error) return { error: error.message }

  // Replace FAQs
  await service.from("faqs").delete().eq("clinic_id", clinicId)
  if (faqs.length > 0) {
    await service.from("faqs").insert(
      faqs.map((faq, i) => ({
        clinic_id: clinicId,
        question: faq.question,
        answer: faq.answer,
        sort_order: i,
      }))
    )
  }

  return { ok: true }
}

export async function completeOnboarding(clinicId: string) {
  const service = createServiceClient()
  await service
    .from("clinics")
    .update({ onboarding_completed: true })
    .eq("id", clinicId)

  redirect("/dashboard")
}
