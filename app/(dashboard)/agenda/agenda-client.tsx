"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { format, addDays, startOfWeek, isSameDay } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AppointmentModal, type ModalAppointment } from "./appointment-modal"

// ---------- constants ----------
const HOUR_HEIGHT = 56   // px per hour
const DAY_START   = 7    // 7:00 AM
const DAY_END     = 22   // 10:00 PM
const HOURS       = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)

// Soft palette per professional index
const PROF_COLORS = [
  "bg-blue-100 border-blue-300 text-blue-800",
  "bg-violet-100 border-violet-300 text-violet-800",
  "bg-emerald-100 border-emerald-300 text-emerald-800",
  "bg-amber-100 border-amber-300 text-amber-800",
  "bg-pink-100 border-pink-300 text-pink-800",
  "bg-cyan-100 border-cyan-300 text-cyan-800",
]

const STATUS_OVERLAY: Record<string, string> = {
  cancelled: "opacity-40 line-through",
  no_show:   "opacity-50",
}

// ---------- types ----------
interface Professional { id: string; name: string; specialty: string }
interface Service      { id: string; name: string; duration_minutes: number; price: number }
interface Patient      { id: string; name: string; phone?: string }

interface Appointment {
  id: string
  start_time: string
  end_time: string
  status: string
  notes?: string
  professional_id: string
  service_id: string
  patient_id: string
  patients:      { name: string; phone?: string } | null
  professionals: { name: string } | null
  services:      { name: string; duration_minutes: number } | null
}

interface Room { id: string; name: string; equipment: string[] }

interface Props {
  clinicId: string
  professionals: Professional[]
  services: Service[]
  patients: Patient[]
  rooms?: Room[]
}

// ---------- overlap layout ----------
// Returns colIndex (0-based) and totalCols for each appointment in a day,
// so they can be positioned side-by-side without overlapping.
function computeColumns(appts: Appointment[]): { appt: Appointment; colIndex: number; totalCols: number }[] {
  if (appts.length === 0) return []

  const sorted = [...appts].sort(
    (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
  )

  const colEnds: number[] = [] // tracks end-time (ms) of the last appt in each column
  const indexed: { appt: Appointment; colIndex: number }[] = []

  for (const appt of sorted) {
    const startMs = new Date(appt.start_time).getTime()
    const endMs   = new Date(appt.end_time).getTime()

    let placed = false
    for (let i = 0; i < colEnds.length; i++) {
      if (colEnds[i] <= startMs) {
        colEnds[i] = endMs
        indexed.push({ appt, colIndex: i })
        placed = true
        break
      }
    }
    if (!placed) {
      indexed.push({ appt, colIndex: colEnds.length })
      colEnds.push(endMs)
    }
  }

  // For each appt, totalCols = how many appts overlap with it (including itself)
  return indexed.map((r) => {
    const sMs = new Date(r.appt.start_time).getTime()
    const eMs = new Date(r.appt.end_time).getTime()
    const totalCols = indexed.filter(({ appt }) => {
      const s = new Date(appt.start_time).getTime()
      const e = new Date(appt.end_time).getTime()
      return s < eMs && e > sMs
    }).length
    return { ...r, totalCols }
  })
}

// ---------- helpers ----------
// CR = UTC-6
function utcToCRMinutes(iso: string): number {
  const d = new Date(iso)
  const cr = new Date(d.getTime() - 6 * 60 * 60 * 1000)
  return cr.getHours() * 60 + cr.getMinutes()
}

function isoToCRDate(iso: string): Date {
  const d = new Date(iso)
  return new Date(d.getTime() - 6 * 60 * 60 * 1000)
}

function crDateStr(d: Date): string {
  const cr = new Date(d.getTime() - 6 * 60 * 60 * 1000)
  return cr.toISOString().split("T")[0]
}

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

// ---------- component ----------
export function AgendaClient({ clinicId, professionals, services, patients, rooms = [] }: Props) {
  // Week starting on Monday
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const now = new Date()
    return startOfWeek(now, { weekStartsOn: 1 })
  })

  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(false)
  const [modal, setModal] = useState<{
    open: boolean
    appointment: ModalAppointment | null
    prefillDate?: string
    prefillTime?: string
    prefillProfId?: string
  }>({ open: false, appointment: null })

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const profColorMap = new Map(professionals.map((p, i) => [p.id, PROF_COLORS[i % PROF_COLORS.length]]))

  // Fetch appointments for the visible week
  const fetchWeek = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const start = new Date(`${format(weekStart, "yyyy-MM-dd")}T06:00:00.000Z`)
    const end   = addDays(start, 7)

    const { data } = await supabase
      .from("appointments")
      .select(`
        id, start_time, end_time, status, notes, professional_id, service_id, patient_id,
        patients ( name, phone ),
        professionals ( name ),
        services ( name, duration_minutes )
      `)
      .eq("clinic_id", clinicId)
      .gte("start_time", start.toISOString())
      .lt("start_time", end.toISOString())
      .order("start_time")

    setAppointments((data ?? []) as unknown as Appointment[])
    setLoading(false)
  }, [clinicId, weekStart])

  useEffect(() => { fetchWeek() }, [fetchWeek])

  function prevWeek() { setWeekStart((d) => addDays(d, -7)) }
  function nextWeek() { setWeekStart((d) => addDays(d, 7)) }
  function goToday()  { setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 })) }

  function openNew(date: Date, startMinutes: number, profId?: string) {
    const snap = Math.round(startMinutes / 30) * 30  // snap to 30-min
    setModal({
      open: true,
      appointment: null,
      prefillDate: format(date, "yyyy-MM-dd"),
      prefillTime: minutesToTimeStr(snap),
      prefillProfId: profId,
    })
  }

  function openEdit(appt: Appointment) {
    setModal({
      open: true,
      appointment: {
        id: appt.id,
        patient_id: appt.patient_id,
        professional_id: appt.professional_id,
        service_id: appt.service_id,
        start_time: appt.start_time,
        end_time: appt.end_time,
        notes: appt.notes,
        status: appt.status,
        patientName: appt.patients?.name ?? "",
      },
    })
  }

  const today = new Date()
  const isCurrentWeek = isSameDay(weekStart, startOfWeek(today, { weekStartsOn: 1 }))

  const monthLabel = format(weekStart, "MMMM yyyy", { locale: es })

  return (
    <div className="flex flex-col h-full">
      {/* ---- Toolbar ---- */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <span className="text-sm font-semibold capitalize flex-1">{monthLabel}</span>
        {!isCurrentWeek && (
          <Button variant="outline" size="sm" onClick={goToday} className="h-8">
            <Calendar className="w-3.5 h-3.5 mr-1.5" />
            Hoy
          </Button>
        )}
        <Button
          size="sm"
          className="h-8"
          onClick={() => setModal({ open: true, appointment: null })}
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Nueva cita
        </Button>
      </div>

      {/* ---- Calendar grid ---- */}
      <div className="flex-1 overflow-auto rounded-xl border border-border bg-white">
        {/* Day headers */}
        <div className="sticky top-0 z-20 bg-white border-b border-border flex">
          <div className="w-14 shrink-0" /> {/* time gutter */}
          {weekDays.map((day) => {
            const isToday = isSameDay(day, today)
            return (
              <div
                key={day.toISOString()}
                className="flex-1 min-w-0 py-2.5 text-center border-l border-border first:border-l-0"
              >
                <p className={cn("text-[11px] font-medium uppercase tracking-wide", isToday ? "text-primary" : "text-muted-foreground")}>
                  {format(day, "EEE", { locale: es })}
                </p>
                <p className={cn(
                  "text-lg font-semibold leading-tight mt-0.5 mx-auto w-8 h-8 flex items-center justify-center rounded-full",
                  isToday && "bg-primary text-white"
                )}>
                  {format(day, "d")}
                </p>
              </div>
            )
          })}
        </div>

        {/* Scrollable time grid */}
        <div className="flex relative">
          {/* Time gutter */}
          <div className="w-14 shrink-0 select-none">
            {HOURS.map((h) => (
              <div
                key={h}
                className="relative text-right pr-2"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2.5 right-2 text-[10px] text-muted-foreground tabular-nums">
                  {String(h).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day) => {
            const dayAppts = appointments.filter((a) => {
              const crDate = isoToCRDate(a.start_time)
              return isSameDay(crDate, day)
            })

            return (
              <div
                key={day.toISOString()}
                className="flex-1 min-w-0 border-l border-border relative"
                style={{ height: HOUR_HEIGHT * HOURS.length }}
                onClick={(e) => {
                  // Click on empty area → new appointment
                  if ((e.target as HTMLElement).closest("[data-appt]")) return
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  const y = e.clientY - rect.top
                  const minutes = Math.floor((y / HOUR_HEIGHT) * 60) + DAY_START * 60
                  openNew(day, minutes)
                }}
              >
                {/* Hour lines */}
                {HOURS.map((h, i) => (
                  <div
                    key={h}
                    className="absolute left-0 right-0 border-t border-border/40"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}
                {/* Half-hour lines */}
                {HOURS.map((h, i) => (
                  <div
                    key={`${h}-half`}
                    className="absolute left-0 right-0 border-t border-border/20 border-dashed"
                    style={{ top: i * HOUR_HEIGHT + HOUR_HEIGHT / 2 }}
                  />
                ))}

                {/* Appointments — positioned side-by-side when overlapping */}
                {computeColumns(dayAppts).map(({ appt, colIndex, totalCols }) => {
                  const startMin  = utcToCRMinutes(appt.start_time)
                  const endMin    = utcToCRMinutes(appt.end_time)
                  const top       = Math.max(0, (startMin - DAY_START * 60) / 60 * HOUR_HEIGHT)
                  const height    = Math.max(20, (endMin - startMin) / 60 * HOUR_HEIGHT - 2)
                  const colWidth  = 100 / totalCols
                  const leftPct   = colIndex * colWidth
                  const colorClass = profColorMap.get(appt.professional_id) ?? PROF_COLORS[0]
                  const overlay    = STATUS_OVERLAY[appt.status] ?? ""
                  const svcName    = appt.services?.name ?? "Servicio"
                  const patName    = appt.patients?.name ?? "Paciente"
                  const profName   = appt.professionals?.name ?? ""

                  return (
                    <div
                      key={appt.id}
                      data-appt="true"
                      onClick={(e) => { e.stopPropagation(); openEdit(appt) }}
                      className={cn(
                        "absolute rounded-md border px-1.5 py-1 cursor-pointer",
                        "hover:brightness-95 transition-all overflow-hidden select-none",
                        colorClass,
                        overlay,
                      )}
                      style={{
                        top,
                        height,
                        left: `${leftPct + 0.5}%`,
                        width: `${colWidth - 1}%`,
                      }}
                    >
                      <p className="text-[11px] font-semibold leading-tight truncate">{patName}</p>
                      {height > 30 && (
                        <p className="text-[10px] leading-tight truncate opacity-80">{svcName}</p>
                      )}
                      {height > 46 && profName && (
                        <p className="text-[10px] leading-tight truncate opacity-70">{profName}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-xl pointer-events-none">
          <p className="text-sm text-muted-foreground animate-pulse">Cargando citas...</p>
        </div>
      )}

      {/* Modal */}
      <AppointmentModal
        open={modal.open}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onSaved={fetchWeek}
        clinicId={clinicId}
        appointment={modal.appointment}
        professionals={professionals}
        services={services}
        patients={patients}
        rooms={rooms}
        prefillDate={modal.prefillDate}
        prefillTime={modal.prefillTime}
        prefillProfId={modal.prefillProfId}
      />
    </div>
  )
}
