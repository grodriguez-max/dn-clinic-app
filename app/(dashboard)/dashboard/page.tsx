import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { format, addDays } from "date-fns"
import { es } from "date-fns/locale"
import {
  CalendarCheck2,
  TrendingUp,
  UserPlus,
  XCircle,
  Bot,
  PhoneCall,
  Clock,
} from "lucide-react"
import { cn, formatTime } from "@/lib/utils"

// Costa Rica is UTC-6 (no DST)
const CR_OFFSET_MS = 6 * 60 * 60 * 1000

function getCRDateBounds() {
  const utcNow = new Date()
  // Shift to CR local time to get the correct local date
  const crLocalDate = new Date(utcNow.getTime() - CR_OFFSET_MS)
  const dateStr = crLocalDate.toISOString().split("T")[0] // YYYY-MM-DD

  // Local midnight in CR = 06:00 UTC
  const todayStart = new Date(`${dateStr}T06:00:00.000Z`)
  const todayEnd = addDays(todayStart, 1)

  // Start of current month in CR
  const [y, m] = dateStr.split("-").map(Number)
  const monthStart = new Date(`${y}-${String(m).padStart(2, "0")}-01T06:00:00.000Z`)
  const monthEnd = m === 12
    ? new Date(`${y + 1}-01-01T06:00:00.000Z`)
    : new Date(`${y}-${String(m + 1).padStart(2, "0")}-01T06:00:00.000Z`)

  // Start of current ISO week (Monday) in CR
  const dow = crLocalDate.getDay() // 0=Sun
  const daysFromMonday = dow === 0 ? 6 : dow - 1
  const weekStartDate = new Date(crLocalDate.getTime() - daysFromMonday * 24 * 60 * 60 * 1000)
  const weekDateStr = weekStartDate.toISOString().split("T")[0]
  const weekStart = new Date(`${weekDateStr}T06:00:00.000Z`)

  return { todayStart, todayEnd, monthStart, monthEnd, weekStart, crLocalDate }
}

type ApptStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show" | "rescheduled"

const STATUS_CONFIG: Record<ApptStatus, { label: string; className: string }> = {
  pending:     { label: "Pendiente",   className: "bg-amber-100 text-amber-700 border-amber-200" },
  confirmed:   { label: "Confirmada",  className: "bg-blue-100 text-blue-700 border-blue-200" },
  completed:   { label: "Completada",  className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  cancelled:   { label: "Cancelada",   className: "bg-red-100 text-red-700 border-red-200" },
  no_show:     { label: "No llegó",    className: "bg-orange-100 text-orange-700 border-orange-200" },
  rescheduled: { label: "Reagendada",  className: "bg-purple-100 text-purple-700 border-purple-200" },
}

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `₡${(amount / 1_000_000).toFixed(1)}M`
  if (amount >= 1_000) return `₡${(amount / 1_000).toFixed(0)}k`
  return `₡${amount.toFixed(0)}`
}

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("users")
    .select("name, clinic_id")
    .eq("id", user.id)
    .single()

  if (!profile?.clinic_id) redirect("/login")
  const clinicId = profile.clinic_id

  const { data: clinic } = await supabase
    .from("clinics")
    .select("name, settings, whatsapp_connected")
    .eq("id", clinicId)
    .single()

  const { todayStart, todayEnd, monthStart, monthEnd, weekStart, crLocalDate } = getCRDateBounds()
  const todayStartISO = todayStart.toISOString()
  const todayEndISO = todayEnd.toISOString()

  // --- Parallel queries ---
  const [
    todayApptsResult,
    noShowsResult,
    monthRevenueResult,
    newPatientsResult,
    nextApptsResult,
  ] = await Promise.all([
    // Count of today's appointments (not cancelled)
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("start_time", todayStartISO)
      .lt("start_time", todayEndISO)
      .neq("status", "cancelled"),

    // No-shows this week
    supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .eq("status", "no_show")
      .gte("start_time", weekStart.toISOString()),

    // Revenue this month: completed appointments → service prices
    supabase
      .from("appointments")
      .select("services(price)")
      .eq("clinic_id", clinicId)
      .eq("status", "completed")
      .gte("start_time", monthStart.toISOString())
      .lt("start_time", monthEnd.toISOString()),

    // New patients this month
    supabase
      .from("patients")
      .select("*", { count: "exact", head: true })
      .eq("clinic_id", clinicId)
      .gte("created_at", monthStart.toISOString())
      .lt("created_at", monthEnd.toISOString()),

    // Next appointments today (list, max 8)
    supabase
      .from("appointments")
      .select(`
        id, start_time, end_time, status,
        patients ( name, phone ),
        professionals ( name ),
        services ( name, duration_minutes, price )
      `)
      .eq("clinic_id", clinicId)
      .gte("start_time", todayStartISO)
      .lt("start_time", todayEndISO)
      .neq("status", "cancelled")
      .order("start_time")
      .limit(8),
  ])

  // Compute metrics
  const citasHoy = todayApptsResult.count ?? 0

  const noShowsWeek = noShowsResult.count ?? 0

  const revenueMonth = (monthRevenueResult.data ?? []).reduce((sum, row) => {
    const price = (row.services as { price?: number } | null)?.price ?? 0
    return sum + Number(price)
  }, 0)

  const newPatients = newPatientsResult.count ?? 0

  const appointments = nextApptsResult.data ?? []

  const todayLabel = format(crLocalDate, "EEEE d 'de' MMMM", { locale: es })

  const agentName: string = (clinic?.settings as Record<string, string> | null)?.agentName ?? "Recepcionista IA"
  const agentTone: string = (clinic?.settings as Record<string, string> | null)?.agentTone ?? "semi_formal"
  const toneLabel: Record<string, string> = {
    formal: "Formal (usted)",
    semi_formal: "Semi-formal",
    informal: "Informal (vos)",
  }

  const metrics = [
    {
      label: "Citas hoy",
      value: citasHoy,
      icon: CalendarCheck2,
      color: "text-blue-600",
      bg: "bg-blue-50",
      suffix: "",
    },
    {
      label: "No-shows (semana)",
      value: noShowsWeek,
      icon: XCircle,
      color: "text-orange-600",
      bg: "bg-orange-50",
      suffix: "",
    },
    {
      label: "Revenue del mes",
      value: formatCurrency(revenueMonth),
      icon: TrendingUp,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      suffix: null,
    },
    {
      label: "Pacientes nuevos",
      value: newPatients,
      icon: UserPlus,
      color: "text-purple-600",
      bg: "bg-purple-50",
      suffix: "este mes",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div>
        <h2 className="text-2xl font-semibold text-foreground">
          Hola, {profile.name.split(" ")[0]} 👋
        </h2>
        <p className="text-sm text-muted-foreground capitalize mt-1">{todayLabel}</p>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className="card-premium p-5">
            <div className="flex items-start justify-between">
              <p className="text-xs text-muted-foreground font-medium leading-tight">{m.label}</p>
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", m.bg)}>
                <m.icon className={cn("w-4 h-4", m.color)} />
              </div>
            </div>
            <p className="text-2xl font-semibold font-numeric mt-3 tabular-nums">
              {m.value}
            </p>
            {m.suffix && (
              <p className="text-xs text-muted-foreground mt-0.5">{m.suffix}</p>
            )}
          </div>
        ))}
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Today appointments */}
        <div className="xl:col-span-2 card-premium">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold">Citas de hoy</p>
            <span className="text-xs text-muted-foreground capitalize">{todayLabel}</span>
          </div>

          {appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <CalendarCheck2 className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Sin citas para hoy</p>
              <p className="text-xs text-muted-foreground mt-1">
                Las citas agendadas aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {appointments.map((appt) => {
                const patient = appt.patients as unknown as { name: string; phone?: string } | null
                const prof = appt.professionals as unknown as { name: string } | null
                const svc = appt.services as unknown as { name: string; duration_minutes: number; price?: number } | null
                const status = appt.status as ApptStatus
                const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending

                return (
                  <div key={appt.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                    {/* Time */}
                    <div className="w-14 shrink-0 text-center">
                      <p className="text-sm font-semibold tabular-nums">{formatTime(appt.start_time)}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5 mt-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {svc?.duration_minutes ?? "—"}m
                      </p>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-8 bg-border shrink-0" />

                    {/* Patient + service */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{patient?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {svc?.name ?? "—"} · {prof?.name ?? "—"}
                      </p>
                    </div>

                    {/* Status badge */}
                    <span
                      className={cn(
                        "shrink-0 text-[11px] font-medium px-2 py-0.5 rounded-full border",
                        cfg.className
                      )}
                    >
                      {cfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Agent widget */}
        <div className="card-premium flex flex-col">
          <div className="px-5 py-4 border-b border-border">
            <p className="text-sm font-semibold">Recepcionista IA</p>
          </div>

          <div className="flex-1 p-5 space-y-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bot className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">{agentName}</p>
                <p className="text-xs text-muted-foreground">{toneLabel[agentTone] ?? agentTone}</p>
              </div>
            </div>

            {/* Status rows */}
            <div className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5" />
                  WhatsApp
                </span>
                {clinic?.whatsapp_connected ? (
                  <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    Conectado
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground">No conectado</span>
                )}
              </div>

              <div className="flex items-center justify-between py-2 border-b border-border/60">
                <span className="text-xs text-muted-foreground">Agendamiento auto</span>
                <span className="text-xs font-medium">
                  {(clinic?.settings as Record<string, boolean> | null)?.agentCanBook
                    ? "Activado"
                    : "Desactivado"}
                </span>
              </div>

              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-muted-foreground">Recordatorios</span>
                <span className="text-xs font-medium">
                  {(clinic?.settings as Record<string, boolean> | null)?.autoReminders
                    ? "24h + 2h"
                    : "Desactivados"}
                </span>
              </div>
            </div>

            {/* CTA */}
            {!clinic?.whatsapp_connected && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center">
                <p className="text-xs text-amber-700 font-medium">WhatsApp pendiente</p>
                <p className="text-[11px] text-amber-600 mt-0.5">
                  Configura la conexion en Agente IA
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
