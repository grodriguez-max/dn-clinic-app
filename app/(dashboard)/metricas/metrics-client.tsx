"use client"

import { useRouter, usePathname } from "next/navigation"
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts"
import { TrendingUp, Users, CalendarCheck, Bot, Download, FileSpreadsheet, Printer } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn, formatCurrency } from "@/lib/utils"

// ── Types ──────────────────────────────────────────────────────────────

interface DailySeries { date: string; value: number }

interface Props {
  period: "today" | "week" | "month" | "quarter"
  revenue: {
    total: number
    daily: DailySeries[]
    byProfessional: { name: string; revenue: number; appointments: number }[]
    byCategory: { name: string; value: number }[]
  }
  appointments: {
    counts: { total: number; completed: number; cancelled: number; no_show: number; pending: number }
    byWeekday: { day: string; total: number }[]
    byHour: Record<string, number | string>[]
    daily: DailySeries[]
  }
  patients: {
    new: number
    returning: number
    retentionRate: number
    bySource: { name: string; value: number }[]
    total: number
  }
  agent: {
    total: number
    escalated: number
    resolved: number
    bookings: number
    escalationRate: number
    daily: DailySeries[]
  }
  professionals: { id: string; name: string }[]
}

// ── Colors ─────────────────────────────────────────────────────────────

const PALETTE = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#f97316"]
const PERIOD_LABELS = { today: "Hoy", week: "7 días", month: "Este mes", quarter: "Trimestre" }

// ── Formatters ─────────────────────────────────────────────────────────

function shortDate(d: string) {
  const date = new Date(d)
  return `${date.getDate()}/${date.getMonth() + 1}`
}

function revenueTooltip({ active, payload, label }: Record<string, unknown>) {
  if (!active || !(payload as unknown[])?.length) return null
  return (
    <div className="bg-white border border-border rounded-lg px-3 py-2 shadow text-xs">
      <p className="text-muted-foreground mb-1">{String(label)}</p>
      <p className="font-semibold">{formatCurrency(Number((payload as {value:number}[])[0].value))}</p>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────

export function MetricsClient({ period, revenue, appointments, patients, agent, professionals }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function setPeriod(p: string) {
    router.push(`${pathname}?period=${p}`)
  }

  const noShowRate = appointments.counts.total > 0
    ? Math.round((appointments.counts.no_show / appointments.counts.total) * 100)
    : 0

  const completionRate = appointments.counts.total > 0
    ? Math.round((appointments.counts.completed / appointments.counts.total) * 100)
    : 0

  const avgTicket = appointments.counts.completed > 0
    ? revenue.total / appointments.counts.completed
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Métricas</h1>
          <p className="text-sm text-muted-foreground mt-1">Análisis de negocio de tu clínica</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            {Object.entries(PERIOD_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPeriod(key)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  period === key ? "bg-primary text-white" : "text-muted-foreground hover:bg-muted"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {/* Export buttons */}
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.open(`/api/metrics/export?period=${period}&format=xlsx`, "_blank")}>
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Excel
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => window.print()}>
            <Printer className="w-3.5 h-3.5" />
            PDF
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard icon={<TrendingUp className="w-4 h-4" />} label="Revenue" value={formatCurrency(revenue.total)} sub={`Ticket promedio: ${formatCurrency(avgTicket)}`} color="violet" />
        <KpiCard icon={<CalendarCheck className="w-4 h-4" />} label="Citas" value={appointments.counts.total.toString()} sub={`${completionRate}% completadas`} color="blue" />
        <KpiCard icon={<Users className="w-4 h-4" />} label="Pacientes nuevos" value={patients.new.toString()} sub={`Retención: ${patients.retentionRate}%`} color="emerald" />
        <KpiCard icon={<Bot className="w-4 h-4" />} label="Agente IA" value={agent.total.toString()} sub={`${agent.escalationRate}% escaladas`} color="amber" />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="revenue">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="citas">Citas</TabsTrigger>
          <TabsTrigger value="pacientes">Pacientes</TabsTrigger>
          <TabsTrigger value="agente">Agente</TabsTrigger>
        </TabsList>

        {/* ── Revenue Tab ────────────────────────────────────────────── */}
        <TabsContent value="revenue" className="mt-4 space-y-4">
          {/* Daily revenue area chart */}
          <ChartCard title="Revenue diario" subtitle={formatCurrency(revenue.total)}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={revenue.daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₡${(v/1000).toFixed(0)}k`} width={48} />
                <Tooltip content={revenueTooltip as unknown as React.FC} />
                <Area type="monotone" dataKey="value" stroke="#6366f1" strokeWidth={2} fill="url(#revGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Revenue by professional */}
            <ChartCard title="Por profesional">
              {revenue.byProfessional.length === 0 ? <EmptyChart /> : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={revenue.byProfessional} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₡${(v/1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="revenue" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </ChartCard>

            {/* Revenue by category donut */}
            <ChartCard title="Por categoría">
              {revenue.byCategory.length === 0 ? <EmptyChart /> : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={revenue.byCategory} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                        {revenue.byCategory.map((_, i) => (
                          <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 flex-1">
                    {revenue.byCategory.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                        <span className="text-muted-foreground flex-1 truncate">{item.name}</span>
                        <span className="font-medium">{formatCurrency(item.value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ChartCard>
          </div>

          {/* Pro table */}
          {revenue.byProfessional.length > 0 && (
            <ChartCard title="Reporte por profesional">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 font-medium text-muted-foreground">Profesional</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Citas</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Revenue</th>
                      <th className="text-right py-2 font-medium text-muted-foreground">Ticket prom.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {revenue.byProfessional.map((p) => (
                      <tr key={p.name}>
                        <td className="py-2 font-medium">{p.name}</td>
                        <td className="py-2 text-right text-muted-foreground">{p.appointments}</td>
                        <td className="py-2 text-right font-semibold">{formatCurrency(p.revenue)}</td>
                        <td className="py-2 text-right text-muted-foreground">{p.appointments > 0 ? formatCurrency(p.revenue / p.appointments) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
        </TabsContent>

        {/* ── Citas Tab ──────────────────────────────────────────────── */}
        <TabsContent value="citas" className="mt-4 space-y-4">
          {/* Funnel */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <FunnelCard label="Agendadas" value={appointments.counts.total} color="blue" pct={100} />
            <FunnelCard label="Completadas" value={appointments.counts.completed} color="emerald" pct={completionRate} />
            <FunnelCard label="Canceladas" value={appointments.counts.cancelled} color="amber" pct={appointments.counts.total > 0 ? Math.round(appointments.counts.cancelled / appointments.counts.total * 100) : 0} />
            <FunnelCard label="No asistió" value={appointments.counts.no_show} color="red" pct={noShowRate} />
          </div>

          {/* Daily trend */}
          <ChartCard title="Citas por día">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={appointments.daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Citas" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By weekday */}
            <ChartCard title="Por día de semana">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={appointments.byWeekday}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="total" name="Citas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            {/* Horas pico */}
            <ChartCard title="Horas pico (lun–sáb)">
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={appointments.byHour} margin={{ left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
                  {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                    <Line key={d} type="monotone" dataKey={d} stroke={PALETTE[i]} dot={false} strokeWidth={1.5} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </TabsContent>

        {/* ── Pacientes Tab ──────────────────────────────────────────── */}
        <TabsContent value="pacientes" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <StatBox label="Pacientes nuevos" value={patients.new} />
            <StatBox label="Atendidos en período" value={patients.returning} />
            <StatBox label="Tasa de retención" value={`${patients.retentionRate}%`} highlight />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* By source */}
            <ChartCard title="Origen de pacientes">
              {patients.bySource.length === 0 ? <EmptyChart /> : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie data={patients.bySource} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                        {patients.bySource.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 flex-1">
                    {patients.bySource.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2 text-xs">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PALETTE[i % PALETTE.length] }} />
                        <span className="flex-1">{item.name}</span>
                        <span className="font-medium">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ChartCard>

            {/* Retention visual */}
            <ChartCard title="Retención" subtitle={`${patients.retentionRate}% volvió al menos una vez`}>
              <div className="flex items-center justify-center h-32">
                <div className="relative w-32 h-32">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f0f0f0" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9" fill="none"
                      stroke="#10b981" strokeWidth="3"
                      strokeDasharray={`${patients.retentionRate} ${100 - patients.retentionRate}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold">{patients.retentionRate}%</span>
                  </div>
                </div>
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        {/* ── Agente Tab ─────────────────────────────────────────────── */}
        <TabsContent value="agente" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatBox label="Conversaciones" value={agent.total} />
            <StatBox label="Citas agendadas" value={agent.bookings} />
            <StatBox label="Resueltas" value={agent.resolved} />
            <StatBox label="Tasa escalación" value={`${agent.escalationRate}%`} highlight={agent.escalationRate > 20} />
          </div>

          <ChartCard title="Conversaciones por día">
            {agent.daily.every((d) => d.value === 0) ? <EmptyChart label="Sin conversaciones en el período" /> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={agent.daily} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="agentGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" name="Conversaciones" stroke="#f59e0b" strokeWidth={2} fill="url(#agentGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <div className="card-premium p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Eficiencia del agente</p>
            <div className="space-y-3">
              <ProgressRow label="Sin escalación" value={100 - agent.escalationRate} color="emerald" />
              <ProgressRow label="Resueltas autónomamente" value={agent.total > 0 ? Math.round(agent.resolved / agent.total * 100) : 0} color="blue" />
              <ProgressRow label="Citas generadas" value={appointments.counts.total > 0 ? Math.round(agent.bookings / appointments.counts.total * 100) : 0} color="violet" />
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────────

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  const colorMap: Record<string, string> = {
    violet: "bg-violet-50 text-violet-600",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
  }
  return (
    <div className="card-premium p-4">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", colorMap[color])}>
        {icon}
      </div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  )
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="card-premium p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}

function FunnelCard({ label, value, color, pct }: { label: string; value: number; color: string; pct: number }) {
  const colorMap: Record<string, string> = {
    blue: "text-blue-600 bg-blue-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    red: "text-red-600 bg-red-50",
  }
  const barColorMap: Record<string, string> = {
    blue: "bg-blue-400",
    emerald: "bg-emerald-400",
    amber: "bg-amber-400",
    red: "bg-red-400",
  }
  return (
    <div className="card-premium p-4">
      <p className={cn("text-2xl font-bold", colorMap[color]?.split(" ")[0])}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
      <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barColorMap[color])} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground mt-1">{pct}%</p>
    </div>
  )
}

function StatBox({ label, value, highlight }: { label: string; value: number | string; highlight?: boolean }) {
  return (
    <div className="card-premium p-4">
      <p className={cn("text-2xl font-bold", highlight && "text-primary")}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  )
}

function ProgressRow({ label, value, color }: { label: string; value: number; color: string }) {
  const barColorMap: Record<string, string> = { emerald: "bg-emerald-500", blue: "bg-blue-500", violet: "bg-violet-500" }
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full", barColorMap[color])} style={{ width: `${value}%` }} />
      </div>
    </div>
  )
}

function EmptyChart({ label = "Sin datos para este período" }: { label?: string }) {
  return (
    <div className="h-32 flex items-center justify-center text-xs text-muted-foreground">{label}</div>
  )
}
