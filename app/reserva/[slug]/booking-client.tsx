"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CheckCircle2, Clock, ChevronLeft, Phone, Mail, Stethoscope, ChevronRight } from "lucide-react"
import { cn, getInitials } from "@/lib/utils"
import { createBooking } from "./actions"

const CATEGORY_LABELS: Record<string, string> = {
  facial: "Facial", inyectables: "Inyectables", laser: "Láser",
  corporal: "Corporal", capilar: "Capilar", dental: "Dental",
  consulta: "Consulta", otro: "Otro",
}

const DAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"]
const MONTHS = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]

interface Service {
  id: string
  name: string
  category?: string
  duration_minutes: number
  price?: number
  description?: string
}

interface Professional {
  id: string
  name: string
  specialty?: string
  photo_url?: string
}

interface Clinic {
  id: string
  name: string
  phone?: string
  email?: string
  logo_url?: string
  business_hours?: Record<string, { open: string; close: string; enabled: boolean }>
  timezone?: string
}

interface Props {
  clinic: Clinic
  services: Service[]
  professionals: Professional[]
}

type Step = "servicio" | "profesional" | "fecha" | "datos" | "confirmacion"

interface BookingData {
  service: Service | null
  professional: Professional | null
  date: string
  time: string
  name: string
  phone: string
  email: string
  notes: string
}

function generateTimeSlots(open: string, close: string, duration: number): string[] {
  const slots: string[] = []
  const [oh, om] = open.split(":").map(Number)
  const [ch, cm] = close.split(":").map(Number)
  let current = oh * 60 + om
  const end = ch * 60 + cm
  while (current + duration <= end) {
    const h = Math.floor(current / 60).toString().padStart(2, "0")
    const m = (current % 60).toString().padStart(2, "0")
    slots.push(`${h}:${m}`)
    current += duration
  }
  return slots
}

function getAvailableDays(businessHours?: Record<string, { open: string; close: string; enabled: boolean }>): number[] {
  if (!businessHours) return [1, 2, 3, 4, 5] // Mon-Fri default
  return Object.entries(businessHours)
    .filter(([, v]) => v.enabled)
    .map(([day]) => DAYS.indexOf(day.toLowerCase()))
    .filter((d) => d >= 0)
}

export function BookingClient({ clinic, services, professionals }: Props) {
  const [step, setStep] = useState<Step>("servicio")
  const [booking, setBooking] = useState<BookingData>({
    service: null, professional: null, date: "", time: "",
    name: "", phone: "", email: "", notes: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [bookingId, setBookingId] = useState<string | null>(null)

  // Calendar state
  const today = new Date()
  const [calMonth, setCalMonth] = useState(today.getMonth())
  const [calYear, setCalYear] = useState(today.getFullYear())

  const availableDays = getAvailableDays(clinic.business_hours)
  const dayOfWeek = new Date(calYear, calMonth, 1).getDay()
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate()

  function prevMonth() {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) }
    else setCalMonth(m => m + 1)
  }

  const timeSlots = booking.date && booking.service
    ? (() => {
        const d = new Date(booking.date)
        const dayName = DAYS[d.getDay()]
        const bh = clinic.business_hours?.[dayName] ?? { open: "08:00", close: "18:00", enabled: true }
        return generateTimeSlots(bh.open, bh.close, booking.service.duration_minutes)
      })()
    : []

  const groupedServices = services.reduce<Record<string, Service[]>>((acc, svc) => {
    const cat = svc.category ?? "otro"
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(svc)
    return acc
  }, {})

  async function handleSubmit() {
    if (!booking.name.trim() || !booking.phone.trim()) {
      setError("Nombre y teléfono son requeridos")
      return
    }
    setLoading(true)
    setError("")
    try {
      const res = await createBooking({
        clinicId: clinic.id,
        serviceId: booking.service!.id,
        professionalId: booking.professional?.id,
        date: booking.date,
        time: booking.time,
        patientName: booking.name,
        patientPhone: booking.phone,
        patientEmail: booking.email || undefined,
        notes: booking.notes || undefined,
      })
      if (res.error) { setError(res.error); return }
      setBookingId(res.id ?? null)
      setStep("confirmacion")
    } finally {
      setLoading(false)
    }
  }

  const stepLabels: Record<Step, string> = {
    servicio: "Servicio", profesional: "Profesional",
    fecha: "Fecha y hora", datos: "Tus datos", confirmacion: "Confirmación",
  }
  const stepOrder: Step[] = ["servicio", "profesional", "fecha", "datos", "confirmacion"]
  const currentStepIdx = stepOrder.indexOf(step)

  return (
    <div className="max-w-lg mx-auto px-4 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        {clinic.logo_url && (
          <img src={clinic.logo_url} alt={clinic.name} className="h-12 mx-auto mb-3 object-contain" />
        )}
        <h1 className="text-2xl font-bold">{clinic.name}</h1>
        <p className="text-muted-foreground text-sm mt-1">Reserva tu cita en línea</p>
      </div>

      {/* Progress */}
      {step !== "confirmacion" && (
        <div className="flex items-center gap-1 mb-8">
          {stepOrder.slice(0, -1).map((s, i) => (
            <div key={s} className="flex items-center gap-1 flex-1">
              <div className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors",
                i < currentStepIdx ? "bg-primary text-white" :
                i === currentStepIdx ? "bg-primary text-white ring-4 ring-primary/20" :
                "bg-muted text-muted-foreground"
              )}>
                {i < currentStepIdx ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              {i < 3 && <div className={cn("h-0.5 flex-1", i < currentStepIdx ? "bg-primary" : "bg-muted")} />}
            </div>
          ))}
        </div>
      )}

      {/* Step: Servicio */}
      {step === "servicio" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">¿Qué servicio necesitas?</h2>
          {Object.entries(groupedServices).map(([cat, svcs]) => (
            <div key={cat}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {CATEGORY_LABELS[cat] ?? cat}
              </p>
              <div className="space-y-2">
                {svcs.map((svc) => (
                  <button
                    key={svc.id}
                    onClick={() => { setBooking((b) => ({ ...b, service: svc })); setStep("profesional") }}
                    className={cn(
                      "w-full text-left p-4 rounded-xl border transition-all hover:border-primary hover:bg-primary/5",
                      booking.service?.id === svc.id ? "border-primary bg-primary/5" : "border-border bg-white"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{svc.name}</p>
                      {svc.price && <p className="text-sm font-semibold">₡{svc.price.toLocaleString("es-CR")}</p>}
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {svc.duration_minutes} min
                      {svc.description && <span className="ml-2 line-clamp-1">{svc.description}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-center py-8 text-muted-foreground text-sm">No hay servicios disponibles</p>
          )}
        </div>
      )}

      {/* Step: Profesional */}
      {step === "profesional" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">¿Con quién deseas atenderte?</h2>

          {/* Sin preferencia */}
          <button
            onClick={() => { setBooking((b) => ({ ...b, professional: null })); setStep("fecha") }}
            className="w-full text-left p-4 rounded-xl border border-border hover:border-primary hover:bg-primary/5 bg-white transition-all"
          >
            <p className="font-medium text-sm">Sin preferencia</p>
            <p className="text-xs text-muted-foreground mt-0.5">Asignar automáticamente</p>
          </button>

          {professionals.map((prof) => (
            <button
              key={prof.id}
              onClick={() => { setBooking((b) => ({ ...b, professional: prof })); setStep("fecha") }}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-all hover:border-primary hover:bg-primary/5",
                booking.professional?.id === prof.id ? "border-primary bg-primary/5" : "border-border bg-white"
              )}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center shrink-0">
                  {prof.photo_url ? (
                    <img src={prof.photo_url} alt={prof.name} className="w-9 h-9 rounded-full object-cover" />
                  ) : (
                    <span className="text-xs font-bold text-primary">{getInitials(prof.name)}</span>
                  )}
                </div>
                <div>
                  <p className="font-medium text-sm">{prof.name}</p>
                  {prof.specialty && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Stethoscope className="w-3 h-3" />{prof.specialty}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}

          <Button variant="ghost" size="sm" onClick={() => setStep("servicio")} className="gap-1.5">
            <ChevronLeft className="w-4 h-4" /> Volver
          </Button>
        </div>
      )}

      {/* Step: Fecha y hora */}
      {step === "fecha" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Selecciona fecha y hora</h2>

          {/* Calendar */}
          <div className="bg-white border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-muted">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <p className="font-medium text-sm capitalize">
                {MONTHS[calMonth]} {calYear}
              </p>
              <button onClick={nextMonth} className="p-1 rounded-lg hover:bg-muted">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5 mb-1">
              {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"].map((d) => (
                <p key={d} className="text-center text-xs text-muted-foreground py-1">{d}</p>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {Array.from({ length: dayOfWeek }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const date = new Date(calYear, calMonth, day)
                const dayIdx = date.getDay()
                const isAvailable = availableDays.includes(dayIdx)
                const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate())
                const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
                const isSelected = booking.date === dateStr

                return (
                  <button
                    key={day}
                    disabled={!isAvailable || isPast}
                    onClick={() => setBooking((b) => ({ ...b, date: dateStr, time: "" }))}
                    className={cn(
                      "aspect-square rounded-lg text-sm font-medium transition-all",
                      isSelected ? "bg-primary text-white" :
                      isAvailable && !isPast ? "hover:bg-primary/10 text-foreground" :
                      "text-muted-foreground/40 cursor-not-allowed"
                    )}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Time slots */}
          {booking.date && (
            <div>
              <p className="text-sm font-medium mb-2">Horarios disponibles</p>
              {timeSlots.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Sin horarios para este día</p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {timeSlots.map((t) => (
                    <button
                      key={t}
                      onClick={() => setBooking((b) => ({ ...b, time: t }))}
                      className={cn(
                        "py-2 rounded-lg text-sm font-medium border transition-all",
                        booking.time === t ? "bg-primary text-white border-primary" : "border-border hover:border-primary hover:bg-primary/5"
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setStep("profesional")} className="gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Volver
            </Button>
            <Button
              disabled={!booking.date || !booking.time}
              onClick={() => setStep("datos")}
              className="flex-1"
            >
              Continuar
            </Button>
          </div>
        </div>
      )}

      {/* Step: Datos personales */}
      {step === "datos" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Tus datos de contacto</h2>

          {/* Resumen */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-1 text-sm">
            <p><span className="text-muted-foreground">Servicio:</span> <span className="font-medium">{booking.service?.name}</span></p>
            {booking.professional && <p><span className="text-muted-foreground">Profesional:</span> <span className="font-medium">{booking.professional.name}</span></p>}
            <p><span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{booking.date} a las {booking.time}</span></p>
            {booking.service?.price && <p><span className="text-muted-foreground">Precio:</span> <span className="font-medium">₡{booking.service.price.toLocaleString("es-CR")}</span></p>}
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nombre completo *</Label>
              <Input
                value={booking.name}
                onChange={(e) => setBooking((b) => ({ ...b, name: e.target.value }))}
                placeholder="María Rodríguez"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Teléfono / WhatsApp *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={booking.phone}
                  onChange={(e) => setBooking((b) => ({ ...b, phone: e.target.value }))}
                  placeholder="+506 8888-0000"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Email <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="email"
                  value={booking.email}
                  onChange={(e) => setBooking((b) => ({ ...b, email: e.target.value }))}
                  placeholder="maria@email.com"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notas <span className="text-muted-foreground font-normal">(opcional)</span></Label>
              <Input
                value={booking.notes}
                onChange={(e) => setBooking((b) => ({ ...b, notes: e.target.value }))}
                placeholder="Alergias, consulta específica..."
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button variant="ghost" size="sm" onClick={() => setStep("fecha")} className="gap-1.5">
              <ChevronLeft className="w-4 h-4" /> Volver
            </Button>
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? "Reservando..." : "Confirmar reserva"}
            </Button>
          </div>
        </div>
      )}

      {/* Step: Confirmación */}
      {step === "confirmacion" && (
        <div className="text-center space-y-4 py-8">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-bold">¡Reserva confirmada!</h2>
            <p className="text-muted-foreground text-sm mt-2">
              Te contactaremos al {booking.phone} para confirmar tu cita.
            </p>
          </div>

          <div className="bg-muted/50 rounded-xl p-4 text-left space-y-2 text-sm">
            <p><span className="text-muted-foreground">Servicio:</span> <span className="font-medium">{booking.service?.name}</span></p>
            {booking.professional && <p><span className="text-muted-foreground">Profesional:</span> <span className="font-medium">{booking.professional.name}</span></p>}
            <p><span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{booking.date} a las {booking.time}</span></p>
            <p><span className="text-muted-foreground">Nombre:</span> <span className="font-medium">{booking.name}</span></p>
          </div>

          {clinic.phone && (
            <p className="text-xs text-muted-foreground">
              ¿Necesitas cambiar tu cita? Llámanos al {clinic.phone}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
