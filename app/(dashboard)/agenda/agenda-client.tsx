"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { addDays, startOfWeek, isSameDay, format } from "date-fns"
import { es } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Plus, Lock, Clock, Printer, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { AppointmentModal, type ModalAppointment } from "./appointment-modal"
import { TimeBlockModal } from "./time-block-modal"
import { WaitlistPanel } from "./waitlist-panel"
import { updateAppointment } from "./actions"

// ─── Constants ────────────────────────────────────────────────────────
const HOUR_HEIGHT  = 64        // px per hour
const DAY_START    = 7         // 07:00
const DAY_END      = 22        // 22:00
const WORK_START   = 8         // shading before 8am
const WORK_END     = 19        // shading after 7pm
const HOURS        = Array.from({ length: DAY_END - DAY_START }, (_, i) => DAY_START + i)

type ViewMode = "day" | "week" | "month"

// ─── Color palette ────────────────────────────────────────────────────
const PROF_COLORS = [
  { bg: "bg-blue-100",    border: "border-l-blue-500",    text: "text-blue-900",    dot: "bg-blue-500"    },
  { bg: "bg-violet-100",  border: "border-l-violet-500",  text: "text-violet-900",  dot: "bg-violet-500"  },
  { bg: "bg-emerald-100", border: "border-l-emerald-500", text: "text-emerald-900", dot: "bg-emerald-500" },
  { bg: "bg-amber-100",   border: "border-l-amber-500",   text: "text-amber-900",   dot: "bg-amber-500"   },
  { bg: "bg-rose-100",    border: "border-l-rose-500",    text: "text-rose-900",    dot: "bg-rose-500"    },
  { bg: "bg-cyan-100",    border: "border-l-cyan-500",    text: "text-cyan-900",    dot: "bg-cyan-500"    },
  { bg: "bg-orange-100",  border: "border-l-orange-500",  text: "text-orange-900",  dot: "bg-orange-500"  },
  { bg: "bg-teal-100",    border: "border-l-teal-500",    text: "text-teal-900",    dot: "bg-teal-500"    },
]

// ─── Types ────────────────────────────────────────────────────────────
interface Professional { id: string; name: string; specialty: string }
interface Service      { id: string; name: string; duration_minutes: number; price: number }
interface Patient      { id: string; name: string; phone?: string }
interface Room         { id: string; name: string; equipment: string[] }

interface Appointment {
  id: string
  start_time: string
  end_time: string
  status: string
  notes?: string
  professional_id: string
  service_id: string
  patient_id: string
  checked_in_at?: string | null
  patients:      { name: string; phone?: string } | null
  professionals: { name: string } | null
  services:      { name: string; duration_minutes: number; buffer_minutes?: number } | null
}

interface TimeBlock {
  id: string
  professional_id: string
  date: string        // YYYY-MM-DD
  start_time: string  // HH:MM:SS
  end_time: string    // HH:MM:SS
  reason: string
}

interface Props {
  clinicId: string
  professionals: Professional[]
  services: Service[]
  patients: Patient[]
  rooms?: Room[]
}

interface ColumnedAppt { appt: Appointment; colIndex: number; totalCols: number }

interface DragState {
  apptId: string
  origStart: string
  durationMs: number
  offsetMin: number  // where within the card the pointer grabbed, in minutes
}

interface ResizeState {
  apptId: string
  startMin: number  // CR minutes from midnight for the appt start
}

// ─── Helpers ──────────────────────────────────────────────────────────
function toCRDate(iso: string): Date {
  return new Date(new Date(iso).getTime() - 6 * 60 * 60 * 1000)
}

function toCRMinutes(iso: string): number {
  const d = toCRDate(iso)
  return d.getUTCHours() * 60 + d.getUTCMinutes()
}

function getNowCR(): number {
  const d = new Date()
  const cr = new Date(d.getTime() - 6 * 60 * 60 * 1000)
  return cr.getUTCHours() * 60 + cr.getUTCMinutes()
}

function fmtTime(mins: number): string {
  const h  = Math.floor(mins / 60)
  const m  = mins % 60
  const ap = h >= 12 ? "pm" : "am"
  const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h
  return `${h12}:${String(m).padStart(2, "0")} ${ap}`
}

function pad(n: number) { return String(n).padStart(2, "0") }

function getMonday(d: Date): Date {
  return startOfWeek(d, { weekStartsOn: 1 })
}

function timeStrToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}

function getConflictIds(appts: Appointment[]): Set<string> {
  const active = appts.filter(a => !["cancelled","no_show"].includes(a.status))
  const ids = new Set<string>()
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i], b = active[j]
      if (a.professional_id === b.professional_id &&
          new Date(a.start_time) < new Date(b.end_time) &&
          new Date(a.end_time)   > new Date(b.start_time)) {
        ids.add(a.id); ids.add(b.id)
      }
    }
  }
  return ids
}

function computeColumns(appts: Appointment[]): ColumnedAppt[] {
  if (!appts.length) return []
  const items = appts
    .map(a => ({ appt: a, s: new Date(a.start_time).getTime(), e: new Date(a.end_time).getTime() }))
    .sort((a, b) => a.s - b.s || b.e - a.e)

  const groups: typeof items[] = []
  for (const item of items) {
    let placed = false
    for (const g of groups) {
      if (g.some(x => item.s < x.e && item.e > x.s)) { g.push(item); placed = true; break }
    }
    if (!placed) groups.push([item])
  }

  const result: ColumnedAppt[] = []
  for (const group of groups) {
    const cols: (typeof items[0])[][] = []
    for (const item of group) {
      let placed = false
      for (const col of cols) {
        if (col[col.length - 1].e <= item.s) { col.push(item); placed = true; break }
      }
      if (!placed) cols.push([item])
    }
    const totalCols = cols.length
    cols.forEach((col, colIndex) =>
      col.forEach(item => result.push({ appt: item.appt, colIndex, totalCols }))
    )
  }
  return result
}

// ─── Component ────────────────────────────────────────────────────────
export function AgendaClient({ clinicId, professionals, services, patients, rooms = [] }: Props) {
  const [view, setView]             = useState<ViewMode>("week")
  const [anchorDate, setAnchorDate] = useState<Date>(() => { const d = new Date(); d.setHours(0,0,0,0); return d })
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [timeBlocks, setTimeBlocks] = useState<TimeBlock[]>([])
  const [loading, setLoading]       = useState(false)
  const [profFilter, setProfFilter] = useState<string | null>(null)
  const [nowMin, setNowMin]         = useState(getNowCR)

  const [modal, setModal] = useState<{
    open: boolean
    appointment: ModalAppointment | null
    prefillDate?: string
    prefillTime?: string
    prefillProfId?: string
  }>({ open: false, appointment: null })

  const [blockModal, setBlockModal] = useState<{
    open: boolean
    prefillDate?: string
    prefillProfId?: string
  }>({ open: false })

  const [waitlistOpen, setWaitlistOpen] = useState(false)

  // Drag & drop
  const dragRef     = useRef<DragState | null>(null)
  const dragMoved   = useRef(false)
  const [dragPos, setDragPos] = useState<{
    apptId: string
    day: Date
    startMin: number  // CR minutes from midnight
    profId?: string   // only set in ProfDayView
  } | null>(null)

  // Resize
  const resizeRef   = useRef<ResizeState | null>(null)
  const [resizePos, setResizePos] = useState<{ apptId: string; endMin: number } | null>(null)

  const gridRef   = useRef<HTMLDivElement>(null)
  const supabase  = createClient()

  const colorMap  = new Map(professionals.map((p, i) => [p.id, PROF_COLORS[i % PROF_COLORS.length]]))
  const weekStart = getMonday(anchorDate)
  const weekDays  = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const today     = (() => { const d = new Date(); d.setHours(0,0,0,0); return d })()

  // Show professional columns in day view when no filter applied
  const profDayMode = view === "day" && !profFilter && professionals.length > 1

  // Tick every minute
  useEffect(() => {
    const t = setInterval(() => setNowMin(getNowCR()), 60_000)
    return () => clearInterval(t)
  }, [])

  // Scroll to current time on view change
  useEffect(() => {
    if (gridRef.current && view !== "month") {
      gridRef.current.scrollTop = Math.max(0, (nowMin - DAY_START * 60) / 60 * HOUR_HEIGHT - 120)
    }
  }, [view]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Fetch ────────────────────────────────────────────────────────
  const fetchAppts = useCallback(async () => {
    setLoading(true)
    let fromStr: string, toStr: string

    if (view === "week") {
      fromStr = format(weekStart, "yyyy-MM-dd")
      toStr   = format(addDays(weekStart, 7), "yyyy-MM-dd")
    } else if (view === "day") {
      fromStr = format(anchorDate, "yyyy-MM-dd")
      toStr   = format(addDays(anchorDate, 1), "yyyy-MM-dd")
    } else {
      const first = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
      fromStr = format(getMonday(first), "yyyy-MM-dd")
      toStr   = format(addDays(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0), 7), "yyyy-MM-dd")
    }

    const [apptRes, blockRes] = await Promise.all([
      supabase
        .from("appointments")
        .select("id, start_time, end_time, status, notes, professional_id, service_id, patient_id, checked_in_at, patients(name,phone), professionals(name), services(name,duration_minutes,buffer_minutes)")
        .eq("clinic_id", clinicId)
        .gte("start_time", `${fromStr}T06:00:00.000Z`)
        .lt("start_time",  `${toStr}T06:00:00.000Z`)
        .order("start_time"),

      supabase
        .from("time_blocks")
        .select("id, professional_id, date, start_time, end_time, reason")
        .eq("clinic_id", clinicId)
        .gte("date", fromStr)
        .lte("date", toStr),
    ])

    setAppointments((apptRes.data ?? []) as unknown as Appointment[])
    setTimeBlocks((blockRes.data ?? []) as TimeBlock[])
    setLoading(false)
  }, [clinicId, view, anchorDate]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchAppts() }, [fetchAppts])

  // ─── Navigation ───────────────────────────────────────────────────
  function goToday() { setAnchorDate(new Date(today)) }
  function goNext()  { setAnchorDate(d => view === "day" ? addDays(d, 1) : view === "week" ? addDays(d, 7) : new Date(d.getFullYear(), d.getMonth() + 1, 1)) }
  function goPrev()  { setAnchorDate(d => view === "day" ? addDays(d, -1) : view === "week" ? addDays(d, -7) : new Date(d.getFullYear(), d.getMonth() - 1, 1)) }

  function getTitle(): string {
    if (view === "day")   return format(anchorDate, "EEEE, d 'de' MMMM yyyy", { locale: es })
    if (view === "month") return format(anchorDate, "MMMM yyyy", { locale: es })
    const end = addDays(weekStart, 6)
    return weekStart.getMonth() === end.getMonth()
      ? format(weekStart, "MMMM yyyy", { locale: es })
      : `${format(weekStart, "MMM", { locale: es })} – ${format(end, "MMM yyyy", { locale: es })}`
  }

  // ─── Data helpers ─────────────────────────────────────────────────
  function getDayAppts(day: Date) {
    return appointments.filter(a => isSameDay(toCRDate(a.start_time), day))
  }

  function filterByProf(appts: Appointment[]) {
    return profFilter ? appts.filter(a => a.professional_id === profFilter) : appts
  }

  function getDayBlocks(day: Date, profId?: string) {
    const dateStr = format(day, "yyyy-MM-dd")
    return timeBlocks.filter(b =>
      b.date === dateStr && (!profId || b.professional_id === profId)
    )
  }

  // ─── Modal helpers ────────────────────────────────────────────────
  function openNew(day: Date, clickY?: number, prefillProfId?: string) {
    const mins = clickY != null ? Math.floor(clickY / HOUR_HEIGHT * 60) + DAY_START * 60 : 9 * 60
    const snap = Math.round(mins / 30) * 30
    setModal({
      open: true,
      appointment: null,
      prefillDate: format(day, "yyyy-MM-dd"),
      prefillTime: `${pad(Math.floor(snap / 60))}:${pad(snap % 60)}`,
      prefillProfId: prefillProfId ?? profFilter ?? undefined,
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

  // ─── Drag & Drop ──────────────────────────────────────────────────
  function startDrag(appt: Appointment, e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation()
    // Capture pointer on the grid container so we receive all move/up events
    if (gridRef.current) gridRef.current.setPointerCapture(e.pointerId)

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const offsetInCard = e.clientY - rect.top
    const offsetMin = Math.max(0, offsetInCard / HOUR_HEIGHT * 60)

    dragRef.current = {
      apptId: appt.id,
      origStart: appt.start_time,
      durationMs: new Date(appt.end_time).getTime() - new Date(appt.start_time).getTime(),
      offsetMin,
    }
    dragMoved.current = false
  }

  function handleGridPointerMove(e: React.PointerEvent<HTMLDivElement>, days: Date[], profIds?: string[]) {
    const gridEl = gridRef.current
    if (!gridEl) return

    // Resize takes priority
    if (resizeRef.current) {
      e.preventDefault()
      dragMoved.current = true
      const rect  = gridEl.getBoundingClientRect()
      const relY  = e.clientY - rect.top + gridEl.scrollTop
      const rawMin = relY / HOUR_HEIGHT * 60 + DAY_START * 60
      const snapped = Math.round(rawMin / 15) * 15
      const clamped = Math.max(resizeRef.current.startMin + 15, Math.min(DAY_END * 60, snapped))
      setResizePos({ apptId: resizeRef.current.apptId, endMin: clamped })
      return
    }

    if (!dragRef.current) return
    e.preventDefault()
    dragMoved.current = true

    const rect = gridEl.getBoundingClientRect()
    const gutterW = 56
    const cols  = profIds ?? days
    const colW  = (rect.width - gutterW) / cols.length

    const relX = e.clientX - rect.left - gutterW
    const relY = e.clientY - rect.top + gridEl.scrollTop

    const colIdx    = Math.max(0, Math.min(cols.length - 1, Math.floor(relX / colW)))
    const rawMin    = relY / HOUR_HEIGHT * 60 + DAY_START * 60 - dragRef.current.offsetMin
    const snapped   = Math.round(rawMin / 15) * 15
    const durMin    = dragRef.current.durationMs / 60000
    const clamped   = Math.max(DAY_START * 60, Math.min(DAY_END * 60 - durMin, snapped))

    setDragPos({
      apptId: dragRef.current.apptId,
      day:    profIds ? days[0] : days[colIdx],
      startMin: clamped,
      profId: profIds ? profIds[colIdx] : undefined,
    })
  }

  async function handleGridPointerUp() {
    // Handle resize
    if (resizeRef.current) {
      const rr = resizeRef.current
      resizeRef.current = null
      if (!dragMoved.current || !resizePos || resizePos.apptId !== rr.apptId) {
        setResizePos(null)
        return
      }
      const appt = appointments.find(a => a.id === rr.apptId)
      if (!appt) { setResizePos(null); return }
      const crDate = format(toCRDate(appt.start_time), "yyyy-MM-dd")
      const h = Math.floor(resizePos.endMin / 60)
      const m = resizePos.endMin % 60
      const newEnd = new Date(`${crDate}T${pad(h)}:${pad(m)}:00-06:00`).toISOString()
      setAppointments(prev => prev.map(a => a.id === rr.apptId ? { ...a, end_time: newEnd } : a))
      setResizePos(null)
      const res = await updateAppointment(rr.apptId, { end_time: newEnd })
      if (res.error) fetchAppts()
      return
    }

    if (!dragRef.current) return
    const dr = dragRef.current
    dragRef.current = null

    if (!dragMoved.current || !dragPos || dragPos.apptId !== dr.apptId) {
      setDragPos(null)
      return
    }

    const crDate   = format(dragPos.day, "yyyy-MM-dd")
    const h        = Math.floor(dragPos.startMin / 60)
    const m        = dragPos.startMin % 60
    const newStart = new Date(`${crDate}T${pad(h)}:${pad(m)}:00-06:00`).toISOString()
    const newEnd   = new Date(new Date(newStart).getTime() + dr.durationMs).toISOString()

    const updates: Record<string, string> = { start_time: newStart, end_time: newEnd }
    if (dragPos.profId) updates.professional_id = dragPos.profId

    // Optimistic update
    setAppointments(prev => prev.map(a =>
      a.id === dr.apptId
        ? { ...a, start_time: newStart, end_time: newEnd, ...(dragPos.profId ? { professional_id: dragPos.profId! } : {}) }
        : a
    ))
    setDragPos(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const res = await updateAppointment(dr.apptId, updates as any)
    if (res.error) fetchAppts()  // revert on error
  }

  // ─── Resize ───────────────────────────────────────────────────────
  function startResize(appt: Appointment, e: React.PointerEvent) {
    e.stopPropagation()
    if (gridRef.current) gridRef.current.setPointerCapture(e.pointerId)
    resizeRef.current = { apptId: appt.id, startMin: toCRMinutes(appt.start_time) }
    dragMoved.current = false
  }

  // ─── Print day ────────────────────────────────────────────────────
  function printDay() {
    const dayAppts = filterByProf(getDayAppts(anchorDate)).filter(a => !["cancelled","no_show"].includes(a.status))
    const dateStr  = format(anchorDate, "EEEE d 'de' MMMM yyyy", { locale: es })
    const rows = dayAppts.map(a => `
      <tr>
        <td>${fmtTime(toCRMinutes(a.start_time))} – ${fmtTime(toCRMinutes(a.end_time))}</td>
        <td>${a.patients?.name ?? "—"}</td>
        <td>${a.services?.name ?? "—"}</td>
        <td>${a.professionals?.name ?? "—"}</td>
        <td>${a.status === "confirmed" ? "Confirmada" : a.status === "pending" ? "Pendiente" : "Completada"}</td>
      </tr>`).join("")
    const html = `<!DOCTYPE html><html><head><title>Agenda – ${dateStr}</title>
      <style>body{font-family:sans-serif;padding:24px;color:#111}h1{font-size:18px;text-transform:capitalize;margin-bottom:4px}p{font-size:12px;color:#666;margin-bottom:16px}table{width:100%;border-collapse:collapse;font-size:13px}th{text-align:left;padding:8px 10px;border-bottom:2px solid #e5e7eb;font-size:11px;text-transform:uppercase;color:#6b7280}td{padding:8px 10px;border-bottom:1px solid #f3f4f6}tr:nth-child(even)td{background:#f9fafb}</style>
      </head><body>
      <h1>${dateStr}</h1><p>${dayAppts.length} cita${dayAppts.length !== 1 ? "s" : ""}</p>
      <table><thead><tr><th>Horario</th><th>Paciente</th><th>Servicio</th><th>Profesional</th><th>Estado</th></tr></thead>
      <tbody>${rows}</tbody></table>
      <script>window.onload=function(){window.print();}</script></body></html>`
    const w = window.open("", "_blank")
    if (w) { w.document.write(html); w.document.close() }
  }

  // ─── Appointment card ─────────────────────────────────────────────
  function ApptCard({ appt, top, height, left, width, isConflict }: {
    appt: Appointment; top: number; height: number; left: string; width: string; isConflict?: boolean
  }) {
    const isDragging  = dragPos?.apptId === appt.id
    const isResizing  = resizePos?.apptId === appt.id
    const checkedIn   = !!appt.checked_in_at
    const displayTop  = isDragging && dragPos
      ? (dragPos.startMin - DAY_START * 60) / 60 * HOUR_HEIGHT
      : top

    const c    = colorMap.get(appt.professional_id) ?? PROF_COLORS[0]
    const displayEndMin = isResizing && resizePos ? resizePos.endMin : toCRMinutes(appt.end_time)
    const displayHeight = isResizing && resizePos
      ? (resizePos.endMin - toCRMinutes(appt.start_time)) / 60 * HOUR_HEIGHT
      : height
    const dur  = displayEndMin - toCRMinutes(appt.start_time)
    const grey = appt.status === "cancelled" || appt.status === "no_show"

    return (
      <div
        data-appt
        onPointerDown={e => startDrag(appt, e)}
        onClick={e => {
          e.stopPropagation()
          if (!dragMoved.current) openEdit(appt)
        }}
        className={cn(
          "absolute border-l-[3px] rounded-md overflow-hidden select-none group",
          "transition-shadow duration-150 hover:shadow-lg hover:z-30 hover:brightness-95",
          isDragging ? "z-50 ring-2 ring-primary/30 cursor-grabbing shadow-xl" : "cursor-grab",
          isResizing && "z-50 ring-2 ring-blue-400/40",
          isConflict && "ring-2 ring-red-400/60",
          c.bg, c.border, c.text,
          grey && "grayscale opacity-50",
          appt.status === "pending" && "opacity-80",
        )}
        style={{ top: displayTop, height: Math.max(22, displayHeight - 2), left, width }}
      >
        <div className={cn("px-2 py-1 h-full relative", dur <= 30 ? "flex items-center gap-2" : "flex flex-col gap-0.5")}>
          <p className={cn("font-semibold truncate leading-tight", dur <= 30 ? "text-[11px]" : "text-xs")}>
            {appt.patients?.name ?? "—"}
          </p>
          <p className="text-[10px] opacity-70 truncate leading-tight">
            {appt.services?.name ?? "—"}
          </p>
          {dur > 50 && (
            <p className="text-[10px] opacity-55 truncate leading-tight">
              {appt.professionals?.name ?? "—"}
            </p>
          )}
          {dur > 75 && (
            <p className="text-[10px] opacity-45 mt-auto">
              {fmtTime(toCRMinutes(appt.start_time))} – {fmtTime(displayEndMin)}
            </p>
          )}

          {/* Check-in indicator / button */}
          {checkedIn ? (
            <div className="absolute top-0.5 right-0.5 text-emerald-600" title="Check-in registrado">
              <CheckCircle2 className="w-3 h-3" />
            </div>
          ) : (appt.status === "confirmed" || appt.status === "pending") && (
            <button
              type="button"
              className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-emerald-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-[9px] leading-none"
              title="Registrar check-in"
              onPointerDown={e => e.stopPropagation()}
              onClick={async (e) => {
                e.stopPropagation()
                const now = new Date().toISOString()
                setAppointments(prev => prev.map(a => a.id === appt.id ? { ...a, checked_in_at: now } : a))
                await updateAppointment(appt.id, { checked_in_at: now })
              }}
            >
              ✓
            </button>
          )}

          {/* Conflict badge */}
          {isConflict && (
            <div className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-red-500" title="Conflicto de horario" />
          )}
        </div>

        {/* Resize handle */}
        <div
          className="absolute bottom-0 left-0 right-0 h-2 cursor-s-resize z-10 hover:bg-black/10 transition-colors"
          onPointerDown={e => startResize(appt, e)}
          onClick={e => e.stopPropagation()}
        />
      </div>
    )
  }

  // ─── Time block chip ──────────────────────────────────────────────
  function BlockChip({ block }: { block: TimeBlock }) {
    const startMin = timeStrToMinutes(block.start_time)
    const endMin   = timeStrToMinutes(block.end_time)
    const top      = (startMin - DAY_START * 60) / 60 * HOUR_HEIGHT
    const height   = (endMin - startMin) / 60 * HOUR_HEIGHT
    return (
      <div
        data-block
        className="absolute left-0 right-0 z-10 bg-gray-200/90 border border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-gray-300/90 transition-colors"
        style={{ top, height: Math.max(18, height - 1) }}
        onClick={e => {
          e.stopPropagation()
          setBlockModal({ open: true, prefillDate: block.date, prefillProfId: block.professional_id })
        }}
        title={`${block.reason} (${block.start_time.slice(0,5)}–${block.end_time.slice(0,5)})`}
      >
        <div className="flex items-center gap-1 px-1">
          <Lock className="w-2.5 h-2.5 text-gray-500 shrink-0" />
          {height > 24 && (
            <span className="text-[10px] text-gray-500 font-medium truncate">{block.reason}</span>
          )}
        </div>
      </div>
    )
  }

  // ─── Working hours shade ──────────────────────────────────────────
  function WorkingHoursShade() {
    const totalH = HOURS.length * HOUR_HEIGHT
    return (
      <>
        {WORK_START > DAY_START && (
          <div
            className="absolute left-0 right-0 bg-gray-100/60 pointer-events-none"
            style={{ top: 0, height: (WORK_START - DAY_START) * HOUR_HEIGHT }}
          />
        )}
        {WORK_END < DAY_END && (
          <div
            className="absolute left-0 right-0 bg-gray-100/60 pointer-events-none"
            style={{ top: (WORK_END - DAY_START) * HOUR_HEIGHT, height: (DAY_END - WORK_END) * HOUR_HEIGHT }}
          />
        )}
      </>
    )
  }

  // ─── Shared column renderer ───────────────────────────────────────
  function DayColumn({
    day,
    appts,
    blocks,
    isToday,
    profId,
    days,
    profIds,
  }: {
    day: Date
    appts: Appointment[]
    blocks: TimeBlock[]
    isToday: boolean
    profId?: string
    days: Date[]
    profIds?: string[]
  }) {
    const totalH   = HOURS.length * HOUR_HEIGHT
    const nowTop   = (nowMin - DAY_START * 60) / 60 * HOUR_HEIGHT
    const showNow  = isToday && nowMin >= DAY_START * 60 && nowMin < DAY_END * 60
    const columned = computeColumns(appts)
    const conflicts = getConflictIds(appts)

    return (
      <div
        className="flex-1 min-w-0 relative border-l border-border/25 cursor-pointer"
        style={{ height: totalH }}
        onClick={e => {
          if ((e.target as HTMLElement).closest("[data-appt],[data-block]")) return
          const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
          openNew(day, e.clientY - rect.top, profId)
        }}
      >
        {/* Hour + half-hour lines */}
        {HOURS.map((_, i) => (
          <div key={i} className="absolute left-0 right-0 pointer-events-none" style={{ top: i * HOUR_HEIGHT }}>
            <div className="border-t border-border/20" />
            <div className="border-t border-border/10 border-dashed" style={{ marginTop: HOUR_HEIGHT / 2 }} />
          </div>
        ))}

        {/* Working hours shading */}
        <WorkingHoursShade />

        {/* Today tint */}
        {isToday && <div className="absolute inset-0 bg-blue-500/[0.03] pointer-events-none" />}

        {/* Time blocks */}
        {blocks.map(b => <BlockChip key={b.id} block={b} />)}

        {/* Current time line */}
        {showNow && (
          <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: nowTop }}>
            <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 -ml-1" />
            <div className="flex-1 h-px bg-red-400" />
          </div>
        )}

        {/* Buffer strips */}
        {columned.map(({ appt }) => {
          const bufMin = (appt.services as { buffer_minutes?: number } | null)?.buffer_minutes ?? 0
          if (!bufMin) return null
          const eMin   = toCRMinutes(appt.end_time)
          const bufTop = (eMin - DAY_START * 60) / 60 * HOUR_HEIGHT
          const bufH   = bufMin / 60 * HOUR_HEIGHT
          return (
            <div
              key={`buf-${appt.id}`}
              className="absolute left-0 right-0 bg-amber-50/80 border-t border-amber-200/60 pointer-events-none z-5"
              style={{ top: bufTop, height: Math.max(4, bufH) }}
              title={`Buffer: ${bufMin} min`}
            />
          )
        })}

        {/* Appointment blocks */}
        {columned.map(({ appt, colIndex, totalCols }) => {
          const sMin   = toCRMinutes(appt.start_time)
          const eMin   = toCRMinutes(appt.end_time)
          const top    = Math.max(0, (sMin - DAY_START * 60) / 60 * HOUR_HEIGHT)
          const height = (eMin - sMin) / 60 * HOUR_HEIGHT
          const colW   = (100 - 1) / totalCols
          const left   = colIndex * colW + 0.5
          return (
            <ApptCard
              key={appt.id}
              appt={appt}
              top={top}
              height={height}
              left={`${left}%`}
              width={`${colW - 0.5}%`}
              isConflict={conflicts.has(appt.id)}
            />
          )
        })}
      </div>
    )
  }

  // ─── Shared time grid ─────────────────────────────────────────────
  function TimeGrid({ days, profIds }: { days: Date[]; profIds?: string[] }) {
    const totalH = HOURS.length * HOUR_HEIGHT
    return (
      <div
        className="flex"
        style={{ minHeight: totalH }}
        onPointerMove={e => handleGridPointerMove(e, days, profIds)}
        onPointerUp={handleGridPointerUp}
        onPointerCancel={() => { dragRef.current = null; setDragPos(null); resizeRef.current = null; setResizePos(null) }}
      >
        {/* Time gutter */}
        <div className="w-14 shrink-0 select-none relative">
          {HOURS.map(h => (
            <div key={h} className="relative" style={{ height: HOUR_HEIGHT }}>
              <span className="absolute -top-[9px] right-2 text-[11px] text-muted-foreground/50 tabular-nums font-medium">
                {pad(h)}:00
              </span>
            </div>
          ))}
        </div>

        {/* Day columns */}
        {days.map((day, di) => {
          const profId   = profIds ? profIds[di] : undefined
          const appts    = profId
            ? getDayAppts(day).filter(a => a.professional_id === profId)
            : filterByProf(getDayAppts(day))
          const blocks   = getDayBlocks(day, profId)
          const isToday  = isSameDay(day, today)
          return (
            <DayColumn
              key={profId ?? day.toISOString()}
              day={day}
              appts={appts}
              blocks={blocks}
              isToday={isToday}
              profId={profId}
              days={days}
              profIds={profIds}
            />
          )
        })}
      </div>
    )
  }

  // ─── Week view ────────────────────────────────────────────────────
  const DAY_SHORT = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

  function WeekView() {
    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="sticky top-0 z-10 bg-white border-b border-border/30 flex shrink-0">
          <div className="w-14 shrink-0" />
          {weekDays.map((day, i) => {
            const isThisToday = isSameDay(day, today)
            const count = filterByProf(getDayAppts(day)).filter(a => !["cancelled","no_show"].includes(a.status)).length
            return (
              <div
                key={i}
                className="flex-1 min-w-0 py-2.5 flex flex-col items-center gap-0.5 cursor-pointer hover:bg-muted/20 transition-colors border-l border-border/20 first:border-l-0"
                onClick={() => { setAnchorDate(day); setView("day") }}
              >
                <span className={cn("text-[10px] font-bold uppercase tracking-widest", isThisToday ? "text-blue-500" : "text-muted-foreground/60")}>
                  {DAY_SHORT[i]}
                </span>
                <span className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors",
                  isThisToday ? "bg-blue-600 text-white" : "text-foreground hover:bg-muted"
                )}>
                  {format(day, "d")}
                </span>
                {count > 0 && (
                  <div className="flex gap-px items-center">
                    {[...Array(Math.min(count, 4))].map((_, j) => (
                      <div key={j} className="w-1 h-1 rounded-full bg-blue-400" />
                    ))}
                    {count > 4 && <span className="text-[9px] text-muted-foreground">+{count - 4}</span>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="flex-1 overflow-y-auto" ref={gridRef}>
          <TimeGrid days={weekDays} />
        </div>
      </div>
    )
  }

  // ─── Day view (single column or per-professional columns) ─────────
  function DayView() {
    const isThisToday = isSameDay(anchorDate, today)
    const count = (profDayMode
      ? getDayAppts(anchorDate)
      : filterByProf(getDayAppts(anchorDate))
    ).filter(a => !["cancelled","no_show"].includes(a.status)).length

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-border/30 shrink-0">
          {profDayMode ? (
            /* Professional columns header */
            <div className="flex">
              <div className="w-14 shrink-0 flex items-end pb-2 pl-2">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                  isThisToday ? "bg-blue-600 text-white" : "bg-muted text-foreground"
                )}>
                  {format(anchorDate, "d")}
                </div>
              </div>
              {professionals.map(prof => {
                const c = colorMap.get(prof.id) ?? PROF_COLORS[0]
                const profCount = getDayAppts(anchorDate).filter(a =>
                  a.professional_id === prof.id && !["cancelled","no_show"].includes(a.status)
                ).length
                return (
                  <div key={prof.id} className="flex-1 min-w-0 py-2.5 flex flex-col items-center gap-0.5 border-l border-border/20 first:border-l-0">
                    <div className={cn("w-2.5 h-2.5 rounded-full", c.dot)} />
                    <span className="text-[11px] font-semibold text-foreground truncate px-1">
                      {prof.name.split(" ")[0]}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{profCount} {profCount === 1 ? "cita" : "citas"}</span>
                  </div>
                )
              })}
            </div>
          ) : (
            /* Single day header */
            <div className="flex items-center gap-3 px-4 py-2.5">
              <div className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shrink-0",
                isThisToday ? "bg-blue-600 text-white" : "bg-muted text-foreground"
              )}>
                {format(anchorDate, "d")}
              </div>
              <div>
                <p className={cn("text-sm font-semibold capitalize", isThisToday && "text-blue-600")}>
                  {format(anchorDate, "EEEE d 'de' MMMM", { locale: es })}
                </p>
                <p className="text-xs text-muted-foreground">{count} {count === 1 ? "cita" : "citas"}</p>
              </div>
            </div>
          )}
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto" ref={gridRef}>
          {profDayMode ? (
            <TimeGrid
              days={professionals.map(() => anchorDate)}
              profIds={professionals.map(p => p.id)}
            />
          ) : (
            <TimeGrid days={[anchorDate]} />
          )}
        </div>
      </div>
    )
  }

  // ─── Month view ───────────────────────────────────────────────────
  function MonthView() {
    const y     = anchorDate.getFullYear()
    const m     = anchorDate.getMonth()
    const first = new Date(y, m, 1)
    const last  = new Date(y, m + 1, 0)
    const gStart = getMonday(first)
    const rows  = Math.ceil((last.getDate() + (first.getDay() === 0 ? 6 : first.getDay() - 1)) / 7)
    const days  = Array.from({ length: rows * 7 }, (_, i) => addDays(gStart, i))

    return (
      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-border/30 bg-white sticky top-0 z-10 shrink-0">
          {DAY_SHORT.map(d => (
            <div key={d} className="py-2 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {d}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-7 divide-x divide-y divide-border/20">
            {days.map((day, i) => {
              const inMonth     = day.getMonth() === m
              const isThisToday = isSameDay(day, today)
              const dayAppts    = filterByProf(getDayAppts(day)).filter(a => !["cancelled","no_show"].includes(a.status))
              const MAX = 3
              return (
                <div
                  key={i}
                  className={cn(
                    "min-h-[96px] p-1.5 cursor-pointer transition-colors hover:bg-blue-50/40",
                    !inMonth && "bg-muted/5",
                  )}
                  onClick={() => { setAnchorDate(day); setView("day") }}
                >
                  <div className={cn(
                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold mb-1 mx-auto",
                    isThisToday ? "bg-blue-600 text-white" : inMonth ? "text-foreground" : "text-muted-foreground/25"
                  )}>
                    {format(day, "d")}
                  </div>
                  <div className="space-y-px">
                    {dayAppts.slice(0, MAX).map(a => {
                      const c = colorMap.get(a.professional_id) ?? PROF_COLORS[0]
                      return (
                        <div
                          key={a.id}
                          className={cn("rounded text-[10px] px-1.5 py-px truncate font-medium leading-relaxed", c.bg, c.text)}
                          onClick={e => { e.stopPropagation(); openEdit(a) }}
                        >
                          {fmtTime(toCRMinutes(a.start_time))} · {a.patients?.name ?? "—"}
                        </div>
                      )
                    })}
                    {dayAppts.length > MAX && (
                      <p className="text-[10px] text-muted-foreground/70 pl-1">+{dayAppts.length - MAX} más</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-border/40 shadow-sm overflow-hidden">

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 shrink-0 flex-wrap gap-y-2">

        {/* Navigation */}
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goPrev}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs ml-1 font-medium" onClick={goToday}>
            Hoy
          </Button>
        </div>

        {/* Title */}
        <h2 className="text-sm font-semibold capitalize flex items-center gap-2 min-w-[170px]">
          {getTitle()}
          {loading && (
            <span className="w-3.5 h-3.5 rounded-full border-2 border-primary/40 border-t-primary animate-spin inline-block shrink-0" />
          )}
        </h2>

        <div className="flex-1" />

        {/* Professional filter chips */}
        {professionals.length > 0 && (
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 max-w-xs shrink-0">
            <button
              onClick={() => setProfFilter(null)}
              className={cn(
                "shrink-0 px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                !profFilter ? "bg-foreground text-background shadow-sm" : "bg-muted text-muted-foreground hover:bg-muted/70"
              )}
            >
              Todos
            </button>
            {professionals.map(p => {
              const c = colorMap.get(p.id) ?? PROF_COLORS[0]
              const active = profFilter === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setProfFilter(active ? null : p.id)}
                  className={cn(
                    "shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all whitespace-nowrap",
                    active ? cn(c.bg, c.text, "shadow-sm") : "bg-muted text-muted-foreground hover:bg-muted/70"
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full shrink-0", c.dot)} />
                  {p.name.split(" ")[0]}
                </button>
              )
            })}
          </div>
        )}

        {/* View switcher */}
        <div className="flex rounded-lg border border-border overflow-hidden shrink-0">
          {(["day", "week", "month"] as ViewMode[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium transition-colors border-l border-border/50 first:border-l-0",
                view === v ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted/40"
              )}
            >
              {v === "day" ? "Día" : v === "week" ? "Semana" : "Mes"}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setBlockModal({ open: true, prefillDate: format(anchorDate, "yyyy-MM-dd") })}
          >
            <Lock className="w-3.5 h-3.5 mr-1" />
            Bloquear
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => setWaitlistOpen(true)}
          >
            <Clock className="w-3.5 h-3.5 mr-1" />
            Espera
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={printDay}
            title="Imprimir agenda del día"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            Imprimir
          </Button>
          <Button size="sm" className="h-8" onClick={() => openNew(anchorDate)}>
            <Plus className="w-4 h-4 mr-1.5" />
            Nueva cita
          </Button>
        </div>
      </div>

      {/* Calendar content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {view === "week"  && <WeekView />}
        {view === "day"   && <DayView />}
        {view === "month" && <MonthView />}
      </div>

      {/* Appointment modal */}
      <AppointmentModal
        open={modal.open}
        onClose={() => setModal(m => ({ ...m, open: false }))}
        onSaved={fetchAppts}
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

      {/* Time block modal */}
      <TimeBlockModal
        open={blockModal.open}
        onClose={() => setBlockModal(m => ({ ...m, open: false }))}
        onSaved={fetchAppts}
        clinicId={clinicId}
        professionals={professionals}
        prefillDate={blockModal.prefillDate}
        prefillProfId={blockModal.prefillProfId}
        existingBlocks={timeBlocks}
      />

      {/* Waitlist panel */}
      <WaitlistPanel
        open={waitlistOpen}
        onClose={() => setWaitlistOpen(false)}
        clinicId={clinicId}
        professionals={professionals}
        services={services}
        patients={patients}
      />
    </div>
  )
}
