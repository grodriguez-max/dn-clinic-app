"use server"

import { createClient } from "@/lib/supabase/server"
import { createCRInvoice, type CRInvoiceInput, type InvoiceLineItem, type TaxRate } from "@/lib/billing/cr-invoice"
import { revalidatePath } from "next/cache"
import { sendCRInvoiceEmail } from "@/lib/notifications/email"

// ── Create Invoice ─────────────────────────────────────────────────────────────

export interface CreateInvoiceFormData {
  patient_id: string
  appointment_id?: string
  invoice_type: "factura" | "tiquete" | "nota_credito"
  payment_method: "efectivo" | "tarjeta" | "sinpe" | "transferencia" | "credito"
  items: { description: string; quantity: number; unit_price: number; tax_rate: TaxRate; service_id?: string }[]
  receptor_nombre?: string
  receptor_cedula?: string
  receptor_cedula_type?: "fisica" | "juridica" | "dimex" | "nite"
  receptor_email?: string
  notes?: string
  related_invoice_id?: string
}

export async function createInvoice(formData: CreateInvoiceFormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autorizado" }

  const { data: profile } = await supabase.from("users").select("clinic_id").eq("id", user.id).single()
  if (!profile?.clinic_id) return { error: "Sin clínica" }

  const clinicId = profile.clinic_id

  // Get clinic cedula (for clave numérica) + sequence
  const { data: clinic } = await supabase.from("clinics").select("settings, name").eq("id", clinicId).single()
  const settings = (clinic?.settings ?? {}) as Record<string, unknown>
  const emitterCedula = (settings.cedula_juridica as string) ?? "000000000"

  // Next sequence number
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("clinic_id", clinicId)
    .eq("invoice_type", formData.invoice_type)

  const sequence = (count ?? 0) + 1

  const items: InvoiceLineItem[] = formData.items.map((i) => ({
    service_id:  i.service_id,
    description: i.description,
    quantity:    i.quantity,
    unit_price:  i.unit_price,
    tax_rate:    i.tax_rate,
  }))

  const invoiceInput: CRInvoiceInput = {
    clinic_id:      clinicId,
    patient_id:     formData.patient_id,
    appointment_id: formData.appointment_id,
    invoice_type:   formData.invoice_type,
    items,
    payment_method: formData.payment_method,
    receptor:
      formData.receptor_cedula
        ? {
            nombre:       formData.receptor_nombre ?? "",
            cedula:       formData.receptor_cedula,
            cedula_type:  formData.receptor_cedula_type ?? "fisica",
            email:        formData.receptor_email,
          }
        : undefined,
    notes: formData.notes,
    related_invoice_id: formData.related_invoice_id,
  }

  const result = await createCRInvoice(invoiceInput, emitterCedula, sequence)

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      clinic_id:        clinicId,
      patient_id:       formData.patient_id,
      appointment_id:   formData.appointment_id ?? null,
      invoice_number:   result.invoice_number,
      invoice_type:     formData.invoice_type,
      subtotal:         result.subtotal,
      tax_amount:       result.tax_amount,
      total:            result.total,
      payment_method:   formData.payment_method,
      status:           result.status,
      hacienda_key:     result.hacienda_key,
      hacienda_response: result.hacienda_response ?? null,
      items:            result.items_computed,
      notes:            formData.notes ?? null,
      related_invoice_id: formData.related_invoice_id ?? null,
    })
    .select()
    .single()

  if (error) return { error: error.message }

  // If appointment was passed, mark it as invoiced
  if (formData.appointment_id) {
    await supabase.from("appointments").update({ status: "completed" }).eq("id", formData.appointment_id)
  }

  // Send invoice by email to patient if they have an email
  if (formData.receptor_email || invoice?.patient_id) {
    const emailTarget = formData.receptor_email
    if (emailTarget) {
      void sendCRInvoiceEmail({
        patientEmail: emailTarget,
        patientName: formData.receptor_nombre ?? "Paciente",
        clinicName: clinic?.name ?? "Clínica",
        invoiceNumber: invoice.invoice_number,
        invoiceType: formData.invoice_type,
        total: result.total,
        items: formData.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        pdfUrl: process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/invoices/${invoice.id}/pdf`
          : undefined,
      })
    }
  }

  revalidatePath("/facturacion")
  return { success: true, invoice, provider: result.provider }
}

// ── Void Invoice (Anular) ─────────────────────────────────────────────────────

export async function voidInvoice(invoiceId: string, reason: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autorizado" }

  const { data: profile } = await supabase.from("users").select("clinic_id, role").eq("id", user.id).single()
  if (!profile?.clinic_id) return { error: "Sin clínica" }

  // Only owners can void invoices
  if (profile.role !== "owner" && profile.role !== "admin") {
    return { error: "Solo el dueño puede anular facturas" }
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, status, clinic_id, total")
    .eq("id", invoiceId)
    .eq("clinic_id", profile.clinic_id)
    .single()

  if (!invoice) return { error: "Factura no encontrada" }
  if (invoice.status === "anulada") return { error: "Factura ya está anulada" }

  const { error } = await supabase
    .from("invoices")
    .update({
      status: "anulada",
      hacienda_response: { voided_at: new Date().toISOString(), void_reason: reason },
    })
    .eq("id", invoiceId)

  if (error) return { error: error.message }

  revalidatePath("/facturacion")
  return { success: true }
}

// ── Create invoice from appointment ────────────────────────────────────────────

export async function createInvoiceFromAppointment(appointmentId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: "No autorizado" }

  const { data: profile } = await supabase.from("users").select("clinic_id").eq("id", user.id).single()
  if (!profile?.clinic_id) return { error: "Sin clínica" }

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, patient_id, service_id, patients(name, id_number), services(name, price)")
    .eq("id", appointmentId)
    .eq("clinic_id", profile.clinic_id)
    .single()

  if (!appt) return { error: "Cita no encontrada" }

  const service = appt.services as { name?: string; price?: number } | null
  const patient = appt.patients as { name?: string; id_number?: string } | null

  return {
    prefill: {
      patient_id:     appt.patient_id,
      appointment_id: appt.id,
      items: [{
        description: service?.name ?? "Servicio",
        quantity:    1,
        unit_price:  Number(service?.price ?? 0),
        tax_rate:    13 as TaxRate,
        service_id:  appt.service_id,
      }],
      receptor_nombre: patient?.name ?? "",
      receptor_cedula: patient?.id_number ?? "",
    },
  }
}
