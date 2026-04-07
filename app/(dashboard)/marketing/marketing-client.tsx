"use client"

import { useState } from "react"
import {
  Megaphone, Users, TrendingUp, Mail, BarChart3, Bot, Calendar,
  CheckCircle2, XCircle, AlertCircle, Clock, Eye, MousePointerClick,
  RefreshCw, ChevronRight, Star, Send, Filter, MessageSquare, Sparkles,
  Target, ListTodo, CalendarDays, Radio, Flag, ArrowUpRight,
} from "lucide-react"
import Link from "next/link"
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

interface Mission {
  id: string; title: string; description?: string; status: string; priority: string
  target_metric?: string; current_value?: number; target_value?: number; due_date?: string; phase?: string
}
interface Task {
  id: string; title: string; description?: string; status: string; priority: string
  assigned_to?: string; due_date?: string; mission_id?: string
}
interface CalendarEntry {
  id: string; scheduled_date: string; platform: string; content_type: string
  pillar?: string; topic: string; angle?: string; copy_draft?: string; status: string
}
interface OutreachEntry {
  id: string; contact_name?: string; contact_phone?: string; channel: string
  template_used?: string; status: string; response_text?: string; sent_at: string; follow_up_due?: string
}

interface MarketingClientProps {
  campaigns: Campaign[]
  stats: { totalSent: number; totalRead: number; totalConverted: number; totalOptOuts: number }
  segments: {
    total: number; opt_out: number; leads: number; instagram: number
    birthdays_today: number; sources: { name: string; count: number }[]
  }
  byType: { type: string; count: number; label: string }[]
  taskLogs: { content: string; metadata: unknown; created_at: string }[]
  missions: Mission[]
  tasks: Task[]
  calendar: CalendarEntry[]
  outreach: OutreachEntry[]
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

export function MarketingClient({ campaigns, stats, segments, byType, taskLogs, missions, tasks, calendar, outreach }: MarketingClientProps) {
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
      {/* ── Quick actions ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/marketing/chat" className="group flex items-center gap-4 bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-200 rounded-xl p-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <p className="font-semibold text-violet-900">Chat con el agente</p>
            <p className="text-xs text-violet-600 mt-0.5">Pedile campañas, copy y estrategia</p>
          </div>
          <ChevronRight className="w-4 h-4 text-violet-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link href="/marketing/drafts" className="group relative flex items-center gap-4 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Flag className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-amber-900">Aprobar drafts</p>
            <p className="text-xs text-amber-600 mt-0.5">Revisá y aprobá el contenido del agente</p>
          </div>
          <ChevronRight className="w-4 h-4 text-amber-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
        </Link>
        <Link href="/marketing/calendar" className="group flex items-center gap-4 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-emerald-900">Calendario</p>
            <p className="text-xs text-emerald-600 mt-0.5">Plan semanal generado por IA</p>
          </div>
          <ChevronRight className="w-4 h-4 text-emerald-400 ml-auto group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

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
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="campaigns"><Megaphone className="w-3.5 h-3.5 mr-1.5" />Campañas</TabsTrigger>
          <TabsTrigger value="missions">
            <Target className="w-3.5 h-3.5 mr-1.5" />Misiones
            {missions.filter(m => m.status === "active").length > 0 && (
              <span className="ml-1 bg-primary text-primary-foreground text-[9px] rounded-full px-1.5">{missions.filter(m => m.status === "active").length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="tasks">
            <ListTodo className="w-3.5 h-3.5 mr-1.5" />Tareas
            {tasks.filter(t => t.status === "pending" || t.status === "in_progress").length > 0 && (
              <span className="ml-1 bg-amber-500 text-white text-[9px] rounded-full px-1.5">{tasks.filter(t => t.status === "pending" || t.status === "in_progress").length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="calendar"><CalendarDays className="w-3.5 h-3.5 mr-1.5" />Calendario</TabsTrigger>
          <TabsTrigger value="outreach"><Radio className="w-3.5 h-3.5 mr-1.5" />Outreach</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="w-3.5 h-3.5 mr-1.5" />Analytics</TabsTrigger>
          <TabsTrigger value="segments"><Users className="w-3.5 h-3.5 mr-1.5" />Segmentos</TabsTrigger>
          <TabsTrigger value="agent"><Bot className="w-3.5 h-3.5 mr-1.5" />Agente</TabsTrigger>
          <TabsTrigger value="ia_imagenes"><Sparkles className="w-3.5 h-3.5 mr-1.5" />IA Imágenes</TabsTrigger>
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

        {/* ── MISIONES TAB ── */}
        <TabsContent value="missions" className="space-y-4 mt-4">
          {missions.length === 0 ? (
            <Card><CardContent className="py-14 text-center text-muted-foreground">
              <Target className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Sin misiones activas</p>
              <p className="text-xs mt-1">El agente creará misiones automáticamente o podés definirlas desde el chat.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {missions.map((m) => {
                const progress = m.target_value && m.current_value != null
                  ? Math.min(Math.round((m.current_value / m.target_value) * 100), 100) : null
                const priorityColor: Record<string, string> = {
                  urgent: "bg-red-50 border-red-200 text-red-700",
                  high:   "bg-orange-50 border-orange-200 text-orange-700",
                  medium: "bg-blue-50 border-blue-200 text-blue-700",
                  low:    "bg-slate-50 border-slate-200 text-slate-600",
                }
                const statusColor: Record<string, string> = {
                  active:    "text-emerald-600", paused: "text-amber-600",
                  completed: "text-slate-400",   cancelled: "text-red-400",
                }
                return (
                  <Card key={m.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="font-semibold text-sm">{m.title}</span>
                            <Badge variant="outline" className={cn("text-[10px] border", priorityColor[m.priority])}>
                              {m.priority}
                            </Badge>
                            {m.phase && <Badge variant="secondary" className="text-[10px]">{m.phase}</Badge>}
                          </div>
                          {m.description && <p className="text-xs text-muted-foreground">{m.description}</p>}
                          {m.target_metric && <p className="text-xs text-muted-foreground mt-1">Meta: {m.target_metric}</p>}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <div className={cn("w-2 h-2 rounded-full", m.status === "active" ? "bg-emerald-500" : "bg-slate-300")} />
                          <span className={cn("text-xs font-medium", statusColor[m.status])}>{m.status}</span>
                        </div>
                      </div>
                      {progress !== null && (
                        <div>
                          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                            <span>Progreso</span>
                            <span>{m.current_value}/{m.target_value} — {progress}%</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5">
                            <div className="bg-primary h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
                          </div>
                        </div>
                      )}
                      {m.due_date && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />Vence: {new Date(m.due_date).toLocaleDateString("es-CR")}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── TAREAS TAB ── */}
        <TabsContent value="tasks" className="space-y-4 mt-4">
          {tasks.length === 0 ? (
            <Card><CardContent className="py-14 text-center text-muted-foreground">
              <ListTodo className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Sin tareas pendientes</p>
              <p className="text-xs mt-1">El agente irá creando tareas a medida que ejecuta sus misiones.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {(["urgent","high","medium","low"] as const).map((priority) => {
                const group = tasks.filter(t => t.priority === priority)
                if (group.length === 0) return null
                const priorityLabel: Record<string, string> = { urgent:"Urgente", high:"Alta", medium:"Media", low:"Baja" }
                const priorityBg: Record<string, string> = {
                  urgent: "bg-red-50 border-red-200", high: "bg-orange-50 border-orange-200",
                  medium: "bg-blue-50 border-blue-200", low: "bg-slate-50 border-slate-200",
                }
                const statusIcon: Record<string, React.ElementType> = {
                  pending: Clock, in_progress: RefreshCw, awaiting_approval: AlertCircle,
                  completed: CheckCircle2, cancelled: XCircle,
                }
                const statusLabel: Record<string, string> = {
                  pending: "Pendiente", in_progress: "En progreso",
                  awaiting_approval: "Esperando aprobación", completed: "Completada", cancelled: "Cancelada",
                }
                return (
                  <div key={priority}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{priorityLabel[priority]}</p>
                    <div className="space-y-2">
                      {group.map((t) => {
                        const SIcon = statusIcon[t.status] ?? Clock
                        const isOverdue = t.due_date && t.status !== "completed" && new Date(t.due_date) < new Date()
                        return (
                          <div key={t.id} className={cn("rounded-lg border p-3 flex items-start gap-3", priorityBg[priority])}>
                            <SIcon className={cn("w-4 h-4 mt-0.5 shrink-0",
                              t.status === "completed" ? "text-emerald-500" :
                              t.status === "awaiting_approval" ? "text-amber-500" :
                              t.status === "in_progress" ? "text-blue-500" : "text-muted-foreground"
                            )} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{t.title}</span>
                                <Badge variant="secondary" className="text-[9px]">{statusLabel[t.status] ?? t.status}</Badge>
                                {isOverdue && <Badge variant="destructive" className="text-[9px]">Vencida</Badge>}
                              </div>
                              {t.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>}
                              <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                {t.assigned_to && <span>Asignada a: {t.assigned_to}</span>}
                                {t.due_date && <span className={cn(isOverdue && "text-red-500 font-medium")}>Vence: {new Date(t.due_date).toLocaleDateString("es-CR")}</span>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── CALENDARIO TAB ── */}
        <TabsContent value="calendar" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Contenido programado para los próximos 7 días</p>
            <Link href="/marketing/calendar">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                <Sparkles className="w-3.5 h-3.5" />Generar con IA
                <ArrowUpRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          {calendar.length === 0 ? (
            <Card><CardContent className="py-14 text-center text-muted-foreground">
              <CalendarDays className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Sin contenido programado esta semana</p>
              <p className="text-xs mt-1">Generá un plan de contenido con el agente IA.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {calendar.map((entry) => {
                const pillarColor: Record<string, string> = {
                  educativo:    "bg-blue-50 text-blue-700 border-blue-200",
                  prueba_social:"bg-emerald-50 text-emerald-700 border-emerald-200",
                  tips:         "bg-violet-50 text-violet-700 border-violet-200",
                  oferta:       "bg-orange-50 text-orange-700 border-orange-200",
                  behind_scenes:"bg-slate-50 text-slate-700 border-slate-200",
                }
                const statusBadge: Record<string, string> = {
                  draft:             "bg-slate-100 text-slate-600",
                  awaiting_approval: "bg-amber-100 text-amber-700",
                  approved:          "bg-emerald-100 text-emerald-700",
                  published:         "bg-teal-100 text-teal-700",
                  cancelled:         "bg-red-100 text-red-600",
                }
                const platformIcon: Record<string, string> = {
                  instagram: "IG", facebook: "FB", whatsapp: "WA", email: "EM", tiktok: "TK",
                }
                return (
                  <Card key={entry.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="text-center min-w-[44px]">
                          <p className="text-xs text-muted-foreground">{new Date(entry.scheduled_date + "T12:00:00").toLocaleDateString("es-CR", { weekday: "short" })}</p>
                          <p className="text-lg font-bold leading-none">{new Date(entry.scheduled_date + "T12:00:00").getDate()}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-bold bg-muted px-1.5 py-0.5 rounded">{platformIcon[entry.platform] ?? entry.platform}</span>
                            <span className="text-xs text-muted-foreground">{entry.content_type}</span>
                            {entry.pillar && (
                              <Badge variant="outline" className={cn("text-[10px] border", pillarColor[entry.pillar])}>
                                {entry.pillar.replace("_", " ")}
                              </Badge>
                            )}
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", statusBadge[entry.status] ?? statusBadge.draft)}>
                              {entry.status.replace("_", " ")}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{entry.topic}</p>
                          {entry.angle && <p className="text-xs text-muted-foreground mt-0.5">Ángulo: {entry.angle}</p>}
                          {entry.copy_draft && (
                            <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2 bg-muted/50 rounded p-2 font-mono">{entry.copy_draft}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ── OUTREACH TAB ── */}
        <TabsContent value="outreach" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{outreach.length} contactos registrados</p>
          </div>
          {outreach.length === 0 ? (
            <Card><CardContent className="py-14 text-center text-muted-foreground">
              <Radio className="w-8 h-8 mx-auto mb-3 opacity-20" />
              <p className="text-sm font-medium">Sin registros de outreach</p>
              <p className="text-xs mt-1">El agente registrará aquí cada contacto de seguimiento individual.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-2">
              {outreach.map((o) => {
                const statusConfig: Record<string, { label: string; color: string }> = {
                  sent:         { label: "Enviado",   color: "bg-blue-100 text-blue-700" },
                  delivered:    { label: "Entregado", color: "bg-blue-100 text-blue-700" },
                  responded:    { label: "Respondió", color: "bg-emerald-100 text-emerald-700" },
                  interested:   { label: "Interesado",color: "bg-teal-100 text-teal-700" },
                  not_interested:{ label: "Sin interés",color: "bg-slate-100 text-slate-600" },
                  opted_out:    { label: "Opt-out",   color: "bg-red-100 text-red-600" },
                  follow_up_1:  { label: "Follow-up 1",color: "bg-amber-100 text-amber-700" },
                  follow_up_2:  { label: "Follow-up 2",color: "bg-orange-100 text-orange-700" },
                  cold:         { label: "Frío",      color: "bg-slate-100 text-slate-500" },
                }
                const sc = statusConfig[o.status] ?? { label: o.status, color: "bg-slate-100 text-slate-600" }
                const isFollowUpDue = o.follow_up_due && new Date(o.follow_up_due) <= new Date()
                return (
                  <div key={o.id} className="rounded-lg border bg-card p-3 flex items-start gap-3">
                    <div className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5", sc.color)}>
                      {sc.label}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{o.contact_name ?? o.contact_phone ?? "Desconocido"}</span>
                        <Badge variant="secondary" className="text-[9px]">{o.channel}</Badge>
                        {isFollowUpDue && <Badge variant="destructive" className="text-[9px]">Follow-up vencido</Badge>}
                      </div>
                      {o.template_used && <p className="text-[10px] text-muted-foreground">Template: {o.template_used}</p>}
                      {o.response_text && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1 italic">"{o.response_text}"</p>
                      )}
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                        <span>{relativeTime(o.sent_at)}</span>
                        {o.follow_up_due && <span className={cn(isFollowUpDue && "text-red-500 font-medium")}>Follow-up: {new Date(o.follow_up_due).toLocaleDateString("es-CR")}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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
        {/* ── IA IMÁGENES TAB ── */}
        <TabsContent value="ia_imagenes" className="space-y-4 mt-4">
          <ImageGeneratorPanel />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── Image Generator Panel ─────────────────────────────────────────────────────

function ImageGeneratorPanel() {
  const [serviceType, setServiceType] = useState("general")
  const [style, setStyle] = useState("modern")
  const [format, setFormat] = useState("square")
  const [customPrompt, setCustomPrompt] = useState("")
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setGenerating(true)
    setResult(null)
    setError(null)
    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "marketing",
          serviceType,
          style,
          format,
          customPrompt: customPrompt || undefined,
          clinicName: "Mi Clínica",
        }),
      })
      const data = await res.json()
      if (data.ok) setResult(data.url)
      else setError(data.error ?? "Error generando imagen")
    } catch (err) {
      setError(String(err))
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-500" />
          Generador de imágenes con IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Tipo de servicio</label>
            <select
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
            >
              {[["general","General"],["facial","Facial / Skincare"],["laser","Láser"],["botox","Botox"],["fillers","Fillers"],["massage","Masajes"],["hair","Cabello"],["nails","Uñas"]].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Estilo</label>
            <select
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            >
              {[["modern","Moderno"],["elegant","Elegante"],["warm","Cálido"],["fresh","Fresco"],["luxe","Luxury"]].map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Formato</label>
            <select
              className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
            >
              <option value="square">Cuadrado (Instagram 1:1)</option>
              <option value="portrait">Vertical (Stories 4:5)</option>
              <option value="landscape">Horizontal (Banner)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Prompt personalizado (opcional)</label>
          <textarea
            className="mt-1 w-full border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            rows={2}
            placeholder="Descripción adicional para la imagen..."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
          />
        </div>
        <Button onClick={generate} disabled={generating} className="gap-2">
          <Sparkles className="w-4 h-4" />
          {generating ? "Generando..." : "Generar imagen"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {result && (
          <div className="space-y-2">
            <img src={result} alt="Generated" className="rounded-xl border border-border w-full max-w-sm" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => window.open(result!, "_blank")}>
                Abrir en nueva pestaña
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                const a = document.createElement("a"); a.href = result!; a.download = "marketing.png"; a.click()
              }}>
                Descargar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
