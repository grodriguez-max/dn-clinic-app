"use server"

import { createServiceClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { createNotification } from "@/lib/notifications/inapp"
import { syncAppointmentToCalendar } from "@/lib/integrations/google-calendar"

async function recordCashMovementForAppointment(
  service: ReturnType<typeof createServiceClient>,
  clinicId: string,
  appointmentId: string,
  servicePrice: number,
  paymentMethod: string = "cash"
) {
  try {
    const { data: openRegister } = await service
      .from("cash_register")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("status", "open")
      .maybeSingle()
    if (!openRegister) return

    await service.from("cash_movements").insert({
      clinic_id: clinicId,
      register_id: openRegister.id,
      type: "income",
      category: "Servicio",
      amount: servicePrice,
      payment_method: paymentMethod,
      description: "Pago por cita completada",
      appointment_id: appointmentId,
    })
  } catch {
    // Non-fatal
  }
}

export interface AppointmentInput {
  patient_id: string
  professional_id: string
  service_id: string
  start_time: string   // ISO string UTC
  end_time: string     // ISO string UTC
  notes?: string
  room_id?: string
}

export async function createAppointment(
  clinicId: string,
  input: AppointmentInput,
  notifyWhatsApp = false
) {
  const service = createServiceClient()

  // Room conflict check
  if (input.room_id) {
    const { data: conflict } = await service
      .from("appointments")
      .select("id")
      .eq("room_id", input.room_id)
      .not("status", "in", '("cancelled","no_show")')
      .lt("start_time", input.end_time)
      .gt("end_time", input.start_time)
    if (conflict && conflict.length > 0) {
      return { error: "La cabina ya tiene una cita en ese horario. Elegí otra cabina u otro horario." }
    }
  }

  const { data, error } = await service
    .from("appointments")
    .insert({
      clinic_id: clinicId,
      ...input,
      status: "confirmed",
      created_by: "web",
    })
    .select("id")
    .single()

  if (error) return { error: error.message }

  if (notifyWhatsApp) {
    // Fetch details to build the WhatsApp message
    const [patRes, profRes, svcRes] = await Promise.all([
      service.from("patients").select("name, phone").eq("id", input.patient_id).single(),
      service.from("professionals").select("name").eq("id", input.professional_id).single(),
      service.from("services").select("name").eq("id", input.service_id).single(),
    ])

    const patient = patRes.data
    const prof    = profRes.data
    const svc     = svcRes.data

    if (patient?.phone) {
      const apptDate = new Date(input.start_time)
      const dateStr = apptDate.toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" })
      const timeStr = apptDate.toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })
      const message =
        `Hola ${patient.name} 👋\n\n` +
        `Te confirmamos tu cita en nuestra clínica:\n\n` +
        `📅 *Fecha:* ${dateStr}\n` +
        `⏰ *Hora:* ${timeStr}\n` +
        `💆 *Servicio:* ${svc?.name ?? "—"}\n` +
        `👩‍⚕️ *Profesional:* ${prof?.name ?? "—"}\n\n` +
        `Si necesitás cancelar o reagendar, escribinos aquí mismo. ¡Te esperamos! ✨`

      // Send via WhatsApp server
      const whatsappUrl = process.env.WHATSAPP_SERVER_URL
      if (whatsappUrl) {
        try {
          await fetch(`${whatsappUrl}/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to: patient.phone, message }),
          })
        } catch {
          // WhatsApp notification failure is non-fatal
        }
      }
    }
  }

  // In-app notification
  void createNotification({
    clinic_id: clinicId,
    type: "new_appointment",
    title: "Nueva cita agendada",
    description: `Cita creada manualmente desde la agenda`,
    link: "/agenda",
  })

  // Google Calendar sync (non-blocking)
  const [patGcal, profGcal, svcGcal] = await Promise.all([
    service.from("patients").select("name").eq("id", input.patient_id).single(),
    service.from("professionals").select("name").eq("id", input.professional_id).single(),
    service.from("services").select("name").eq("id", input.service_id).single(),
  ])
  void syncAppointmentToCalendar(clinicId, {
    id: data.id,
    title: `${svcGcal.data?.name ?? "Cita"} — ${patGcal.data?.name ?? ""}`,
    description: input.notes ?? "",
    start_time: input.start_time,
    end_time: input.end_time,
  })

  revalidatePath("/agenda")
  revalidatePath("/dashboard")
  return { ok: true, id: data.id }
}

export async function updateAppointment(
  appointmentId: string,
  updates: Partial<AppointmentInput & { status: string; cancellation_reason?: string }>
) {
  const service = createServiceClient()

  // If marking as completed, auto-decrement active package session
  if (updates.status === "completed") {
    const { data: appt } = await service
      .from("appointments")
      .select("patient_id, service_id, status")
      .eq("id", appointmentId)
      .single()

    if (appt && appt.status !== "completed") {
      // Find active patient package for this service
      const { data: pkgs } = await service
        .from("patient_packages")
        .select("id, sessions_used, sessions_total, packages(service_id)")
        .eq("patient_id", appt.patient_id)
        .eq("status", "active")
        .order("expires_at")

      const match = pkgs?.find((p) => ((p.packages as unknown) as { service_id: string } | null)?.service_id === appt.service_id)
      if (match) {
        const newUsed = match.sessions_used + 1
        const newStatus = newUsed >= match.sessions_total ? "completed" : "active"
        await service
          .from("patient_packages")
          .update({ sessions_used: newUsed, status: newStatus })
          .eq("id", match.id)
      }

      // Auto-calculate commission for the professional
      const { data: apptFull } = await service
        .from("appointments")
        .select("professional_id, service_id, clinic_id, services(price)")
        .eq("id", appointmentId)
        .single()

      if (apptFull) {
        const svcPrice = Number((apptFull.services as { price?: number } | null)?.price ?? 0)
        if (svcPrice > 0 && apptFull.professional_id) {
          // Get commission rule (service-specific or default)
          const { data: ruleRows } = await service
            .from("commission_rules")
            .select("commission_type, commission_value")
            .eq("professional_id", apptFull.professional_id)
            .eq("service_id", apptFull.service_id)
            .maybeSingle()

          let commissionPct = 0
          let commissionAmount = 0
          if (ruleRows) {
            if (ruleRows.commission_type === "fixed") {
              commissionAmount = Number(ruleRows.commission_value)
              commissionPct = svcPrice > 0 ? (commissionAmount / svcPrice) * 100 : 0
            } else {
              commissionPct = Number(ruleRows.commission_value)
              commissionAmount = (svcPrice * commissionPct) / 100
            }
          } else {
            // Fall back to professional default
            const { data: prof } = await service
              .from("professionals")
              .select("default_commission_percentage")
              .eq("id", apptFull.professional_id)
              .single()
            commissionPct = Number(prof?.default_commission_percentage ?? 0)
            commissionAmount = (svcPrice * commissionPct) / 100
          }

          if (commissionPct > 0) {
            await service.from("commissions").insert({
              clinic_id: apptFull.clinic_id,
              professional_id: apptFull.professional_id,
              appointment_id: appointmentId,
              service_id: apptFull.service_id,
              service_price: svcPrice,
              commission_percentage: commissionPct,
              commission_amount: commissionAmount,
              status: "pending",
            })
          }

          // Auto-add cash movement if caja is open
          await recordCashMovementForAppointment(service, apptFull.clinic_id, appointmentId, svcPrice)
        }
      }
    }
  }

  const { error } = await service
    .from("appointments")
    .update(updates)
    .eq("id", appointmentId)

  if (error) return { error: error.message }

  // Google Calendar sync (non-blocking)
  if (updates.start_time || updates.end_time || updates.status) {
    const { data: apptSync } = await service
      .from("appointments")
      .select("clinic_id, start_time, end_time, gcal_event_id, patient_id, service_id, notes, patients(name), services(name)")
      .eq("id", appointmentId)
      .single()
    if (apptSync) {
      void syncAppointmentToCalendar(apptSync.clinic_id, {
        id: appointmentId,
        title: `${(apptSync.services as {name?:string}|null)?.name ?? "Cita"} — ${(apptSync.patients as {name?:string}|null)?.name ?? ""}`,
        description: apptSync.notes ?? "",
        start_time: apptSync.start_time,
        end_time: apptSync.end_time,
        gcal_event_id: apptSync.gcal_event_id ?? undefined,
        cancelled: updates.status === "cancelled" || updates.status === "no_show",
      })
    }
  }

  revalidatePath("/agenda")
  revalidatePath("/dashboard")
  return { ok: true }
}

export async function cancelAppointment(appointmentId: string, reason?: string) {
  return updateAppointment(appointmentId, {
    status: "cancelled",
    cancellation_reason: reason ?? "Cancelado desde agenda",
  })
}
