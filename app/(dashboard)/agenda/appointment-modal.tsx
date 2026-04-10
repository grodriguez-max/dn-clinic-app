"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { createAppointment, updateAppointment, cancelAppointment, createRecurringAppointments } from "./actions"
import { getClinicalNotes, saveClinicalNotes } from "./clinical-notes-actions"
import { getPatientActivePackages } from "@/app/(dashboard)/servicios/package-actions"
import { registerAppointmentPayment, getAppointmentPayments } from "./payment-actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"

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
interface Room { id: string; name: string; equipment: string[] }

interface Props {
  open: boolean
  onClose: () => void
  onSaved: () => void
  clinicId: string
  appointment?: ModalAppointment | null
  professionals: Professional[]
  services: Service[]
  patients: Patient[]
  rooms?: Room[]
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
  rooms = [],
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
  const [roomId, setRoomId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true)
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurrenceRule, setRecurrenceRule] = useState<"weekly" | "biweekly" | "monthly">("weekly")
  const [recurrenceCount, setRecurrenceCount] = useState(4)
  const [activePackage, setActivePackage] = useState<{ id: string; name: string; sessions_used: number; sessions_total: number } | null>(null)
  const [payments, setPayments] = useState<Array<{ id: string; amount: number; payment_type: string; payment_method: string; paid_at: string }>>([])
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [payAmount, setPayAmount] = useState("")
  const [payType, setPayType] = useState<"deposit" | "full" | "remaining">("deposit")
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "sinpe" | "transfer">("cash")
  const [soap, setSoap] = useState({ subjective: "", objective: "", assessment: "", plan: "" })
  const [soapTab, setSoapTab] = useState(false)

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
      setRoomId("")
      setDate(prefillDate ?? format(new Date(), "yyyy-MM-dd"))
      setTime(prefillTime ?? "09:00")
      setNotes("")
      setStatus("confirmed")
      setPatientSearch("")
      setIsRecurring(false)
      setRecurrenceRule("weekly")
      setRecurrenceCount(4)
    }
    setError("")
  }, [open, isEdit])

  // Load payments and SOAP notes when editing
  useEffect(() => {
    if (isEdit && appointment?.id) {
      getAppointmentPayments(appointment.id).then(setPayments)
      getClinicalNotes(appointment.id).then(data =>
        setSoap(data ?? { subjective: "", objective: "", assessment: "", plan: "" })
      )
    } else {
      setPayments([])
      setSoap({ subjective: "", objective: "", assessment: "", plan: "" })
    }
    setShowPaymentForm(false)
    setPayAmount("")
    setSoapTab(false)
  }, [open])

  // Detect active package when patient + service change
  useEffect(() => {
    if (!patientId || !serviceId) { setActivePackage(null); return }
    getPatientActivePackages(patientId).then((pkgs) => {
      const match = pkgs.find((p) => p.packages?.service_id === serviceId)
      if (match) {
        setActivePackage({
          id: match.id,
          name: match.packages!.name,
          sessions_used: match.sessions_used,
          sessions_total: match.sessions_total,
        })
      } else {
        setActivePackage(null)
      }
    })
  }, [patientId, serviceId])

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
        // Save SOAP notes (non-blocking on error)
        if (soap.subjective || soap.objective || soap.assessment || soap.plan) {
          await saveClinicalNotes(appointment.id, clinicId, soap)
        }
      } else if (isRecurring) {
        const res = await createRecurringAppointments(clinicId, {
          patient_id: patientId,
          professional_id: profId,
          service_id: serviceId,
          start_time: startUtc,
          end_time: endUtc,
          notes: notes || undefined,
          room_id: roomId || undefined,
        }, recurrenceRule, recurrenceCount, notifyWhatsApp)
        if (res.error) { setError(res.error); return }
      } else {
        const res = await createAppointment(clinicId, {
          patient_id: patientId,
          professional_id: profId,
          service_id: serviceId,
          start_time: startUtc,
          end_time: endUtc,
          notes: notes || undefined,
          room_id: roomId || undefined,
        }, notifyWhatsApp)
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

          {/* Room selector */}
          {rooms.length > 0 && (
            <div className="space-y-1.5">
              <Label>Cabina / Sala <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Select value={roomId} onValueChange={setRoomId}>
                <SelectTrigger><SelectValue placeholder="Sin cabina asignada" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Sin cabina</SelectItem>
                  {rooms.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}{r.equipment.length > 0 && ` · ${r.equipment.slice(0, 2).join(", ")}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Active package indicator */}
          {activePackage && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-200 text-sm">
              <span className="text-violet-500 shrink-0">📦</span>
              <div className="min-w-0">
                <p className="font-medium text-violet-800 text-xs">
                  Sesión {activePackage.sessions_used + 1} de {activePackage.sessions_total} — {activePackage.name}
                </p>
                <p className="text-[11px] text-violet-600">
                  Al completar la cita se descuenta 1 sesión del paquete
                </p>
              </div>
            </div>
          )}

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

          {/* Payments section (edit mode only) */}
          {isEdit && appointment?.id && (
            <div className="space-y-2 pt-1 border-t border-border">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Pagos</p>
                {!showPaymentForm && (
                  <button
                    type="button"
                    onClick={() => setShowPaymentForm(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    + Registrar pago
                  </button>
                )}
              </div>

              {payments.length > 0 && (
                <div className="space-y-1">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-xs px-2 py-1.5 bg-muted/40 rounded-lg">
                      <span className="text-muted-foreground capitalize">
                        {p.payment_type === "deposit" ? "Abono" : p.payment_type === "full" ? "Total" : "Restante"} · {p.payment_method}
                      </span>
                      <span className="font-medium">₡{Number(p.amount).toLocaleString("es-CR")}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-xs px-2 font-semibold">
                    <span>Total pagado</span>
                    <span>₡{payments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString("es-CR")}</span>
                  </div>
                  {selectedService && (
                    <div className="flex items-center justify-between text-xs px-2 text-muted-foreground">
                      <span>Precio servicio</span>
                      <span>₡{selectedService.price.toLocaleString("es-CR")}</span>
                    </div>
                  )}
                  {selectedService && payments.reduce((s, p) => s + Number(p.amount), 0) < selectedService.price && (
                    <div className="flex items-center justify-between text-xs px-2 text-amber-700 font-semibold">
                      <span>Saldo pendiente</span>
                      <span>₡{(selectedService.price - payments.reduce((s, p) => s + Number(p.amount), 0)).toLocaleString("es-CR")}</span>
                    </div>
                  )}
                </div>
              )}

              {showPaymentForm && (
                <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={payType} onValueChange={(v) => setPayType(v as typeof payType)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="deposit">Abono</SelectItem>
                        <SelectItem value="remaining">Saldo restante</SelectItem>
                        <SelectItem value="full">Pago total</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={payMethod} onValueChange={(v) => setPayMethod(v as typeof payMethod)}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Efectivo</SelectItem>
                        <SelectItem value="card">Tarjeta</SelectItem>
                        <SelectItem value="sinpe">SINPE</SelectItem>
                        <SelectItem value="transfer">Transferencia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="Monto (₡)"
                    className="h-8 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs"
                      onClick={() => setShowPaymentForm(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 h-7 text-xs"
                      onClick={async () => {
                        if (!payAmount || Number(payAmount) <= 0) return
                        const res = await registerAppointmentPayment(clinicId, {
                          appointment_id: appointment!.id!,
                          patient_id: patientId,
                          amount: Number(payAmount),
                          payment_type: payType,
                          payment_method: payMethod,
                        })
                        if (!res.error) {
                          const updated = await getAppointmentPayments(appointment!.id!)
                          setPayments(updated)
                          setShowPaymentForm(false)
                          setPayAmount("")
                        }
                      }}
                    >
                      Registrar
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SOAP Notes — only in edit mode */}
          {isEdit && (
            <div className="space-y-2 pt-1 border-t border-border">
              <button
                type="button"
                className="flex items-center justify-between w-full"
                onClick={() => setSoapTab(v => !v)}
              >
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notas clínicas (SOAP)</p>
                <span className="text-xs text-primary">{soapTab ? "▲ Cerrar" : "▼ Expandir"}</span>
              </button>
              {soapTab && (
                <div className="space-y-3">
                  {(["subjective","objective","assessment","plan"] as const).map(field => (
                    <div key={field} className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground font-medium">
                        {field === "subjective" ? "S – Subjetivo (qué dice el paciente)" :
                         field === "objective"  ? "O – Objetivo (observación del profesional)" :
                         field === "assessment" ? "A – Evaluación / diagnóstico" :
                                                  "P – Plan de tratamiento"}
                      </Label>
                      <Textarea
                        value={soap[field]}
                        onChange={e => setSoap(s => ({ ...s, [field]: e.target.value }))}
                        rows={2}
                        placeholder={field === "subjective" ? "Ej: Paciente refiere dolor en zona lumbar..." :
                                     field === "objective"  ? "Ej: Se observa tensión muscular en L4-L5..." :
                                     field === "assessment" ? "Ej: Lumbalgia mecánica..." :
                                                              "Ej: 3 sesiones de terapia manual..."}
                        className="text-xs"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Recurrence — only for new appointments */}
          {!isEdit && (
            <div className="space-y-2 pt-1 border-t border-border">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium">Cita recurrente</p>
                  <p className="text-xs text-muted-foreground">Crear múltiples citas automáticamente</p>
                </div>
                <Switch checked={isRecurring} onCheckedChange={setIsRecurring} />
              </div>
              {isRecurring && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Frecuencia</Label>
                    <Select value={recurrenceRule} onValueChange={v => setRecurrenceRule(v as typeof recurrenceRule)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Semanal</SelectItem>
                        <SelectItem value="biweekly">Quincenal</SelectItem>
                        <SelectItem value="monthly">Mensual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sesiones ({recurrenceCount})</Label>
                    <Input
                      type="number"
                      min={2}
                      max={12}
                      value={recurrenceCount}
                      onChange={e => setRecurrenceCount(Math.max(2, Math.min(12, parseInt(e.target.value) || 2)))}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WhatsApp notification toggle — only for new appointments */}
          {!isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">Notificar al paciente por WhatsApp</p>
                <p className="text-xs text-muted-foreground">Envía confirmación automática con los detalles</p>
              </div>
              <Switch checked={notifyWhatsApp} onCheckedChange={setNotifyWhatsApp} />
            </div>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <div className="flex gap-2 pt-1 flex-wrap">
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
            {isEdit && status !== "no_show" && (
              <Button
                type="button"
                variant="outline"
                className="text-amber-600 border-amber-300 hover:bg-amber-50"
                onClick={() => setStatus("no_show")}
                disabled={loading}
                title="Marcar como no llegó"
              >
                No llegó
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
