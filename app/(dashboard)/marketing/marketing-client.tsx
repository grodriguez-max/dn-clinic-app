"use client"

import { useState } from "react"
import {
  Megaphone, Users, TrendingUp, Mail, BarChart3, Bot, Calendar,
  CheckCircle2, XCircle, AlertCircle, Clock, Eye, MousePointerClick,
  RefreshCw, ChevronRight, Star, Send, Filter,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from "recharts"
import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

interface CampaignStats {
  sent: number
  read: number
  read_rate: number
  converted: number
  conversion_rate: number
  opt_outs: number
}

interface Campaign {
  id: string
  name: string
  type: string
  channel: string
  status: string
  created_at: string
  message_template: string
  requires_approval: boolean
  is_automatic: boolean
  stats: CampaignStats
}

interface MarketingClientProps {
  campaigns: Campaign[]
  stats: { totalSent: number; totalRead: number; totalConverted: number; totalOptOuts: number }
  segments: {
    total: number
    opt_out: number
    leads: number
    instagram: number
    birthdays_today: number
    sources: { name: string; count: number }[]
  }
  byType: { type: string; count: number; label: string }[]
  taskLogs: { content: string; metadata: unknown; created_at: string }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  reactivation:       "Reactivación",
  birthday:           "Cumpleaños",
  post_treatment:     "Post-tratamiento",
  review_request:     "Reseña",
  treatment_reminder: "Recordatorio",
  custom_promo:       "Promo especial",
}

const TYPE_COLORS: Record<string, string> = {
  reactivation:       "bg-blue-50 text-blue-700 border-blue-200",
  birthday:           "bg-pink-50 text-pink-700 border-pink-200",
  post_treatment:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  review_request:     "bg-amber-50 text-amber-700 border-amber-200",
  treatment_reminder: "bg-purple-50 text-purple-700 border-purple-200",
  custom_promo:       "bg-orange-50 text-orange-700 border-orange-200",
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  active:    { label: "Activa",    icon: CheckCircle2, className: "text-emerald-600" },
  draft:     { label: "Borrador",  icon: Clock,        className: "text-amber-600" },
  paused:    { label: "Pausada",   icon: AlertCircle,  className: "text-orange-600" },
  completed: { label: "Completada",icon: CheckCircle2, className: "text-slate-500" },
}

const PIE_COLORS = ["#0d9488", "#3b82f6", "#f59e0b", "#ec4899", "#8b5cf6", "#6b7280"]

function fmt(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n)
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 60) return `hace ${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h}h`
  return `hace ${Math.floor(h / 24)}d`
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, sub, color = "text-primary" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg bg-muted", color === "text-primary" && "bg-primary/10")}>
            <Icon className={cn("w-4 h-4", color)} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold font-numeric">{value}</p>
            {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CampaignRow({ c, onClick, selected }: { c: Campaign; onClick: () => void; selected: boolean }) {
  const status = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.draft
  const StatusIcon = status.icon

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors",
        selected && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <StatusIcon className={cn("w-4 h-4", status.className)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium truncate">{c.name}</span>
            <Badge variant="outline" className={cn("text-[10px] border", TYPE_COLORS[c.type])}>
              {TYPE_LABELS[c.type] ?? c.type}
            </Badge>
            {c.is_automatic && (
              <Badge variant="secondary" className="text-[10px]">
                <Bot className="w-2.5 h-2.5 mr-1" />Auto
              </Badge>
            )}
            {c.requires_approval && (
              <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-700 bg-amber-50">
                Pendiente aprobación
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><Send className="w-3 h-3" />{c.stats.sent} enviados</span>
            <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{c.stats.read_rate}% leídos</span>
            <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" />{c.stats.conversion_rate}% convertidos</span>
          </div>
        </div>
        <ChevronRight className={cn("w-4 h-4 text-muted-foreground mt-0.5 shrink-0 transition-transform", selected && "rotate-90")} />
      </div>
    </button>
  )
}

function CampaignDetail({ c }: { c: Campaign }) {
  return (
    <div className="p-5 space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Enviados",     value: c.stats.sent,             icon: Send },
          { label: "Leídos",       value: `${c.stats.read_rate}%`,  icon: Eye },
          { label: "Convertidos",  value: `${c.stats.conversion_rate}%`, icon: MousePointerClick },
          { label: "Respuestas",   value: c.stats.read,             icon: Mail },
          { label: "Opt-outs",     value: c.stats.opt_outs,         icon: XCircle },
          { label: "Canal",        value: c.channel,                icon: Megaphone },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-muted/50 rounded-lg p-3 text-center">
            <Icon className="w-3.5 h-3.5 mx-auto mb-1 text-muted-foreground" />
            <p className="text-lg font-bold font-numeric">{value}</p>
            <p className="text-[10px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      <div>
        <p className="text-xs font-medium text-muted-foreground mb-1.5">Template del mensaje</p>
        <div className="bg-muted rounded-lg p-3 text-xs text-foreground whitespace-pre-wrap line-clamp-6 font-mono">
          {c.message_template}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Creada {new Date(c.created_at).toLocaleDateString("es-CR")}
      </p>
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function MarketingClient({ campaigns, stats, segments, byType, taskLogs }: MarketingClientProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [typeFilter, setTypeFilter] = useState<string>("all")

  const readRate = stats.totalSent > 0 ? Math.round((stats.totalRead / stats.totalSent) * 100) : 0
  const convRate = stats.totalSent > 0 ? Math.round((stats.totalConverted / stats.totalSent) * 100) : 0

  const filteredCampaigns = typeFilter === "all"
    ? campaigns
    : campaigns.filter((c) => c.type === typeFilter)

  const selectedCampaignData = campaigns.find((c) => c.id === selectedCampaign)

  // Chart data: campaigns by type
  const typeChartData = byType.filter((t) => t.count > 0)

  // Chart data: read vs conversion rates for top campaigns
  const topCampaigns = [...campaigns]
    .filter((c) => c.stats.sent > 0)
    .sort((a, b) => b.stats.sent - a.stats.sent)
    .slice(0, 6)
    .map((c) => ({
      name: c.name.length > 20 ? c.name.slice(0, 20) + "…" : c.name,
      Leídos: c.stats.read_rate,
      Convertidos: c.stats.conversion_rate,
    }))

  return (
    <div className="space-y-6">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Send}             label="Mensajes enviados (30d)" value={fmt(stats.totalSent)}    sub="Total marketing" />
        <StatCard icon={Eye}              label="Tasa de lectura"          value={`${readRate}%`}          sub={`${stats.totalRead} leídos`} />
        <StatCard icon={MousePointerClick}label="Tasa de conversión"       value={`${convRate}%`}          sub={`${stats.totalConverted} citas`} color="text-emerald-600" />
        <StatCard icon={Users}            label="Pacientes activos"        value={segments.total}          sub={`${segments.opt_out} opt-out`} color="text-slate-500" />
      </div>

      {/* ── Segments quick view ── */}
      {segments.birthdays_today > 0 && (
        <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 flex items-center gap-3">
          <Star className="w-5 h-5 text-pink-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-pink-900">{segments.birthdays_today} cumpleaños hoy</p>
            <p className="text-xs text-pink-700">El agente enviará las felicitaciones automáticamente a las 9am.</p>
          </div>
        </div>
      )}

      <Tabs defaultValue="campaigns">
        <TabsList>
          <TabsTrigger value="campaigns">
            <Megaphone className="w-3.5 h-3.5 mr-1.5" />Campañas
          </TabsTrigger>
          <TabsTrigger value="analytics">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />Analytics
          </TabsTrigger>
          <TabsTrigger value="segments">
            <Users className="w-3.5 h-3.5 mr-1.5" />Segmentos
          </TabsTrigger>
          <TabsTrigger value="agent">
            <Bot className="w-3.5 h-3.5 mr-1.5" />Agente
          </TabsTrigger>
        </TabsList>

        {/* ── CAMPAÑAS TAB ── */}
        <TabsContent value="campaigns" className="space-y-4 mt-4">
          {/* Type filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={typeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("all")}
            >
              Todas ({campaigns.length})
            </Button>
            {byType.filter((t) => t.count > 0).map((t) => (
              <Button
                key={t.type}
                variant={typeFilter === t.type ? "default" : "outline"}
                size="sm"
                onClick={() => setTypeFilter(t.type)}
              >
                {t.label} ({t.count})
              </Button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            {/* Campaign list */}
            <Card>
              <CardHeader className="pb-0 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">
                  {filteredCampaigns.length} campañas
                </CardTitle>
              </CardHeader>
              <div className="divide-y divide-border mt-2">
                {filteredCampaigns.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    No hay campañas en esta categoría todavía.
                  </div>
                ) : (
                  filteredCampaigns.map((c) => (
                    <CampaignRow
                      key={c.id}
                      c={c}
                      selected={selectedCampaign === c.id}
                      onClick={() => setSelectedCampaign(selectedCampaign === c.id ? null : c.id)}
                    />
                  ))
                )}
              </div>
            </Card>

            {/* Campaign detail */}
            <Card>
              {selectedCampaignData ? (
                <CampaignDetail c={selectedCampaignData} />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 text-center text-muted-foreground">
                  <Megaphone className="w-8 h-8 mb-3 opacity-30" />
                  <p className="text-sm">Seleccioná una campaña para ver sus detalles</p>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>

        {/* ── ANALYTICS TAB ── */}
        <TabsContent value="analytics" className="space-y-4 mt-4">
          <div className="grid lg:grid-cols-2 gap-4">
            {/* Read vs Conversion by campaign */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Lectura vs Conversión por campaña</CardTitle>
              </CardHeader>
              <CardContent>
                {topCampaigns.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Sin datos aún</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={topCampaigns} margin={{ left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} unit="%" />
                      <Tooltip formatter={(v: number) => `${v}%`} />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="Leídos" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Convertidos" fill="#0d9488" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Campaigns by type */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Distribución por tipo</CardTitle>
              </CardHeader>
              <CardContent>
                {typeChartData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">Sin datos aún</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={typeChartData} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={80} innerRadius={50}>
                        {typeChartData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Funnel */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Embudo de marketing (últimos 30 días)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-3 justify-center py-4">
                {[
                  { label: "Enviados",    value: stats.totalSent,      color: "bg-blue-500" },
                  { label: "Leídos",      value: stats.totalRead,      color: "bg-teal-500" },
                  { label: "Convertidos", value: stats.totalConverted, color: "bg-emerald-500" },
                  { label: "Opt-outs",    value: stats.totalOptOuts,   color: "bg-red-400" },
                ].map(({ label, value, color }) => {
                  const maxVal = Math.max(stats.totalSent, 1)
                  const height = Math.max(Math.round((value / maxVal) * 120), 20)
                  return (
                    <div key={label} className="flex flex-col items-center gap-1.5 flex-1">
                      <span className="text-sm font-bold font-numeric">{fmt(value)}</span>
                      <div className={cn("w-full rounded-t-md", color)} style={{ height }} />
                      <span className="text-[10px] text-muted-foreground text-center">{label}</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SEGMENTOS TAB ── */}
        <TabsContent value="segments" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { label: "Pacientes activos",     value: segments.total,          icon: Users,    color: "text-primary" },
              { label: "Leads sin convertir",   value: segments.leads,          icon: TrendingUp, color: "text-blue-600" },
              { label: "Origen Instagram",      value: segments.instagram,      icon: Megaphone, color: "text-pink-600" },
              { label: "Cumpleaños hoy",        value: segments.birthdays_today, icon: Star,    color: "text-amber-500" },
              { label: "Con opt-out",           value: segments.opt_out,        icon: XCircle,  color: "text-red-500" },
            ].map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Pacientes por fuente de origen</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2.5">
                {segments.sources.map((s) => {
                  const pct = segments.total > 0 ? Math.round((s.count / segments.total) * 100) : 0
                  return (
                    <div key={s.name} className="flex items-center gap-3">
                      <span className="text-xs w-24 text-muted-foreground shrink-0">{s.name}</span>
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs font-numeric w-12 text-right">{s.count} ({pct}%)</span>
                    </div>
                  )
                })}
                {segments.sources.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin datos de fuente aún</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <Bot className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium mb-1">Crons activos del Agente Marketing</p>
                  <div className="grid grid-cols-1 gap-1">
                    {[
                      { job: "Reactivación",              schedule: "Lunes 10:00am" },
                      { job: "Cumpleaños",                schedule: "Diario 9:00am" },
                      { job: "Follow-up post-tratamiento", schedule: "Diario 10:15am" },
                      { job: "Solicitud de reseña",       schedule: "Diario 10:30am" },
                      { job: "Recordatorio periódico",    schedule: "Lunes 9:15am" },
                      { job: "Leads tibios",              schedule: "Miércoles 10:00am" },
                      { job: "Reporte semanal",           schedule: "Lunes 8:00am" },
                    ].map((c) => (
                      <div key={c.job} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          {c.job}
                        </span>
                        <span className="text-muted-foreground">{c.schedule}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AGENTE TAB ── */}
        <TabsContent value="agent" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="w-4 h-4" />
                Actividad reciente del Agente Marketing
              </CardTitle>
            </CardHeader>
            <CardContent>
              {taskLogs.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground">
                  <Bot className="w-8 h-8 mx-auto mb-3 opacity-20" />
                  <p>Sin actividad reciente.</p>
                  <p className="text-xs mt-1">El agente ejecuta sus tareas automáticamente según el calendario de crons.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {taskLogs.map((log, i) => {
                    const meta = log.metadata as Record<string, unknown> | null
                    const toolCalls = (meta?.tool_calls as string[]) ?? []
                    const cronJob = meta?.cron_job as string | undefined
                    return (
                      <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/40 text-sm">
                        <RefreshCw className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-xs">{cronJob ?? "manual"}</span>
                            <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(log.created_at)}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{log.content}</p>
                          {toolCalls.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {toolCalls.map((t) => (
                                <Badge key={t} variant="secondary" className="text-[9px] px-1.5 py-0">{t}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Copy que Conecta™ principles */}
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Metodología: Copy que Conecta™
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              {[
                { n: "1", title: "Gancho emocional", desc: "Las primeras 2 líneas conectan con un dolor, aspiración o curiosidad." },
                { n: "2", title: "Beneficio > Característica", desc: '"Piel radiante" en vez de "limpieza facial profunda".' },
                { n: "3", title: "Gatillo psicológico", desc: "Rota entre: prueba social, escasez, urgencia, reciprocidad, contraste." },
                { n: "4", title: "Un objetivo, un CTA", desc: "Cada mensaje tiene un único llamado a la acción claro." },
              ].map((p) => (
                <div key={p.n} className="flex gap-2">
                  <span className="text-primary font-bold shrink-0">{p.n}.</span>
                  <span><strong>{p.title}:</strong> {p.desc}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
