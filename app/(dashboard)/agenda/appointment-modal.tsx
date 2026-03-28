"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { createAppointment, updateAppointment, cancelAppointment } from "./actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"

export interface ModalAppointment {
  id?: string
  patient_id?: string
  professional_id?: string
  service_id?: string
  start_time?: string
  end_time?: string
  notes?: string
  status?: string
  patientName?: string
}

interface Professional { id: string; name: string; specialty: string }
interface Service { id: string; name: string; duration_minutes: number; price: number }
interface Patient { id: string; name: string; phone?: string }

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clinicId: string
  appointment?: ModalAppointment | null
  professionals: Professional[]
  services: Service[]
  patients: Patient[]
  // Pre-fill when clicking an empty slot
  prefillDate?: string   // YYYY-MM-DD
  prefillTime?: string   // HH:MM (CR local)
  prefillProfId?: string
}

const STATUS_OPTIONS = [
  { value: "confirmed",  label: "Confirmada" },
  { value: "pending",    label: "Pendiente" },
  { value: "completed",  label: "Completada" },
  { value: "no_show",    label: "No llegó" },
  { value: "cancelled",  label: "Cancelada" },
]

// Costa Rica = UTC-6
function crToUtc(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00-06:00`).toISOString()
}

function utcToCRDate(iso: string): string {
  const d = new Date(iso)
  const cr = new Date(d.getTime() - 6 * 60 * 60 * 1000)
  return cr.toISOString().split("T")[0]
}

function utcToCRTime(iso: string): string {
  const d = new Date(iso)
  const cr = new Date(d.getTime() - 6 * 60 * 60 * 1000)
  return cr.toISOString().substring(11, 16)
}

export function AppointmentModal({
  open,
  onClose,
  onSaved,
  clinicId,
  appointment,
  professionals,
  services,
  patients,
  prefillDate,
  prefillTime,
  prefillProfId,
}: Props) {
  const isEdit = !!appointment?.id

  const [patientSearch, setPatientSearch] = useState("")
  const [patientId, setPatientId] = useState("")
  const [profId, setProfId] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [notes, setNotes] = useState("")
  const [status, setStatus] = useState("confirmed")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  // Populate form when modal opens
  useEffect(() => {
    if (!open) return
    if (isEdit && appointment) {
      setPatientId(appointment.patient_id ?? "")
      setProfId(appointment.professional_id ?? "")
      setServiceId(appointment.service_id ?? "")
      setDate(appointment.start_time ? utcToCRDate(appointment.start_time) : "")
      setTime(appointment.start_time ? utcToCRTime(appointment.start_time) : "")
      setNotes(appointment.notes ?? "")
      setStatus(appointment.status ?? "confirmed")
      setPatientSearch(appointment.patientName ?? "")
    } else {
      setPatientId("")
      setProfId(prefillProfId ?? professionals[0]?.id ?? "")
      setServiceId("")
      setDate(prefillDate ?? format(new Date(), "yyyy-MM-dd"))
      setTime(prefillTime ?? "09:00")
      setNotes("")
      setStatus("confirmed")
      setPatientSearch("")
    }
    setError("")
  }, [open, isEdit])

  // When service changes, compute end time
  const selectedService = services.find((s) => s.id === serviceId)

  // Filter patients by search
  const filteredPatients = patientSearch.length >= 2
    ? patients.filter((p) =>
        p.name.toLowerCase().includes(patientSearch.toLowerCase()) ||
        (p.phone ?? "").includes(patientSearch)
      ).slice(0, 8)
    : []

  const showPatientDropdown = filteredPatients.length > 0 && !patientId

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!patientId) { setError("Seleccioná un paciente"); return }
    if (!profId) { setError("Seleccioná un profesional"); return }
    if (!serviceId) { setError("Seleccioná un servicio"); return }
    if (!date || !time) { setError("Ingresá fecha y hora"); return }

    setLoading(true)
    setError("")
    try {
      const startUtc = crToUtc(date, time)
      const duration = selectedService?.duration_minutes ?? 60
      const endUtc = new Date(new Date(startUtc).getTime() + duration * 60_000).toISOString()

      if (isEdit && appointment?.id) {
        const res = await updateAppointment(appointment.id, {
          patient_id: patientId,
          professional_id: profId,
          service_id: serviceId,
          start_time: startUtc,
          end_time: endUtc,
          notes: notes || undefined,
          status,
        })
        if (res.error) { setError(res.error); return }
      } else {
        const res = await createAppointment(clinicId, {
          patient_id: patientId,
          professional_id: profId,
          service_id: serviceId,
          start_time: startUtc,
          end_time: endUtc,
          notes: notes || undefined,
        })
        if (res.error) { setError(res.error); return }
      }
      onSaved()
      onClose()
    } finally {
      setLoading(false)
    }
  }

  async function handleCancel() {
    if (!appointment?.id) return
    if (!confirm("¿Cancelar esta cita?")) return
    setLoading(true)
    await cancelAppointment(appointment.id)
    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar cita" : "Nueva cita"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Patient */}
          <div className="space-y-1.5">
            <Label>Paciente</Label>
            {patientId ? (
              <div className="flex items-center gap-2 p-2.5 border border-border rounded-lg bg-muted/30">
                <span className="text-sm flex-1">
                  {patients.find((p) => p.id === patientId)?.name ?? patientSearch}
                </span>
                <button
                  type="button"
                  onClick={() => { setPatientId(""); setPatientSearch("") }}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Cambiar
                </button>
              </div>
            ) : (
              <div className="relative">
                <Input
                  value={patientSearch}
                  onChange={(e) => { setPatientSearch(e.target.value); setPatientId("") }}
                  placeholder="Buscar paciente..."
                  autoComplete="off"
                />
                {showPatientDropdown && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-lg shadow-lg overflow-hidden">
                    {filteredPatients.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => { setPatientId(p.id); setPatientSearch(p.name) }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                      >
                        <span className="font-medium">{p.name}</span>
                        {p.phone && <span className="text-muted-foreground ml-2">{p.phone}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Professional */}
          <div className="space-y-1.5">
            <Label>Profesional</Label>
            <Select value={profId} onValueChange={setProfId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Service */}
          <div className="space-y-1.5">
            <Label>Servicio</Label>
            <Select value={serviceId} onValueChange={setServiceId}>
              <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
              <SelectContent>
                {services.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} · {s.duration_minutes}min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date + time */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hora</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                step="900"
              />
            </div>
          </div>

          {/* Duration hint */}
          {selectedService && (
            <p className="text-xs text-muted-foreground -mt-2">
              Duración: {selectedService.duration_minutes} min · Precio: ₡{selectedService.price.toLocaleString("es-CR")}
            </p>
          )}

          {/* Status (only when editing) */}
          {isEdit && (
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Observaciones..."
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            {isEdit && (
              <Button
                type="button"
                variant="outline"
                className="text-destructive border-destructive/30 hover:bg-destructive/5"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancelar cita
              </Button>
            )}
            <div className="flex-1" />
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cerrar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : isEdit ? "Guardar" : "Crear cita"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
