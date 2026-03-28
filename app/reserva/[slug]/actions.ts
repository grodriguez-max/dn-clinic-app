"use server"

import { createServiceClient } from "@/lib/supabase/server"

interface BookingInput {
  clinicId: string
  serviceId: string
  professionalId?: string
  date: string
  time: string
  patientName: string
  patientPhone: string
  patientEmail?: string
  notes?: string
}

export async function createBooking(input: BookingInput) {
  const supabase = createServiceClient()

  // Resolve professional: use given or pick any active one
  let professionalId = input.professionalId
  if (!professionalId) {
    const { data: profs } = await supabase
      .from("professionals")
      .select("id")
      .eq("clinic_id", input.clinicId)
      .eq("is_active", true)
      .limit(1)
      .single()
    if (!profs) return { error: "No hay profesionales disponibles" }
    professionalId = profs.id
  }

  // Get service duration
  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", input.serviceId)
    .single()
  if (!service) return { error: "Servicio no encontrado" }

  // Build start/end times (Costa Rica = UTC-6)
  const startTime = new Date(`${input.date}T${input.time}:00-06:00`)
  const endTime = new Date(startTime.getTime() + service.duration_minutes * 60 * 1000)

  // Find or create patient by phone
  let patientId: string
  const { data: existingPatient } = await supabase
    .from("patients")
    .select("id")
    .eq("clinic_id", input.clinicId)
    .eq("phone", input.patientPhone)
    .single()

  if (existingPatient) {
    patientId = existingPatient.id
  } else {
    const { data: newPatient, error: patientError } = await supabase
      .from("patients")
      .insert({
        clinic_id: input.clinicId,
        name: input.patientName,
        phone: input.patientPhone,
        email: input.patientEmail,
        tags: ["nuevo"],
        source: "web",
      })
      .select("id")
      .single()

    if (patientError || !newPatient) return { error: "Error al registrar paciente" }
    patientId = newPatient.id
  }

  // Create appointment
  const { data: appt, error: apptError } = await supabase
    .from("appointments")
    .insert({
      clinic_id: input.clinicId,
      patient_id: patientId,
      professional_id: professionalId,
      service_id: input.serviceId,
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      status: "pending",
      notes: input.notes,
      created_by: "web",
    })
    .select("id")
    .single()

  if (apptError || !appt) return { error: "Error al crear la cita" }

  return { ok: true, id: appt.id }
}
