"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MessageSquare, Zap, AlertTriangle, CheckCircle2, Clock, Bot, Wifi, WifiOff, ChevronRight, User } from "lucide-react"
import { cn, formatDateTime } from "@/lib/utils"

interface Conversation {
  id: string
  channel: string
  status: string
  handled_by: string
  started_at: string
  resolved_at?: string
  summary?: string
  escalation_reason?: string
  patient_phone?: string
  patients?: { name: string } | null
}

interface Props {
  clinic: {
    name: string
    whatsapp_connected: boolean
    settings: Record<string, unknown>
  }
  conversations: Conversation[]
  stats: {
    today: number
    active: number
    escalated: number
    resolved: number
    total_week: number
    tokens_week: { input: number; output: number }
  }
}

const STATUS_COLORS: Record<string, string> = {
  active:    "bg-blue-100 text-blue-700",
  resolved:  "bg-emerald-100 text-emerald-700",
  escalated: "bg-red-100 text-red-600",
}

const STATUS_LABELS: Record<string, string> = {
  active:    "Activa",
  resolved:  "Resuelta",
  escalated: "Escalada",
}

const CHANNEL_ICONS: Record<string, string> = {
  whatsapp: "💬",
  web:      "🌐",
  email:    "📧",
}

// Rough cost estimate: Haiku ~$0.25/MTok input, $1.25/MTok output
function estimateCost(input: number, output: number): string {
  const cost = (input / 1_000_000) * 0.25 + (output / 1_000_000) * 1.25
  return `$${cost.toFixed(3)}`
}

export function AgentClient({ clinic, conversations, stats }: Props) {
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [filter, setFilter] = useState<string>("all")

  const filtered = conversations.filter((c) => filter === "all" || c.status === filter)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Agente Recepcionista</h1>
          <p className="text-sm text-muted-foreground mt-1">Monitoreo de conversaciones y actividad IA</p>
        </div>
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border",
          clinic.whatsapp_connected
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : "bg-red-50 text-red-600 border-red-200"
        )}>
          {clinic.whatsapp_connected
            ? <><Wifi className="w-3.5 h-3.5" /> WhatsApp conectado</>
            : <><WifiOff className="w-3.5 h-3.5" /> WhatsApp desconectado</>
          }
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<MessageSquare className="w-4 h-4" />} label="Hoy" value={stats.today} color="blue" />
        <StatCard icon={<Zap className="w-4 h-4" />} label="Activas" value={stats.active} color="yellow" />
        <StatCard icon={<AlertTriangle className="w-4 h-4" />} label="Escaladas" value={stats.escalated} color="red" />
        <StatCard icon={<CheckCircle2 className="w-4 h-4" />} label="Resueltas" value={stats.resolved} color="green" />
      </div>

      {/* Token usage */}
      <div className="card-premium p-4">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-4 h-4 text-primary" />
          <p className="text-sm font-medium">Uso IA — últimos 7 días</p>
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold">{stats.total_week}</p>
            <p className="text-xs text-muted-foreground">Conversaciones</p>
          </div>
          <div>
            <p className="text-lg font-bold">{((stats.tokens_week.input + stats.tokens_week.output) / 1000).toFixed(1)}K</p>
            <p className="text-xs text-muted-foreground">Tokens totales</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600">{estimateCost(stats.tokens_week.input, stats.tokens_week.output)}</p>
            <p className="text-xs text-muted-foreground">Costo estimado</p>
          </div>
        </div>
      </div>

      {/* Conversations */}
      <Tabs defaultValue="conversaciones">
        <TabsList>
          <TabsTrigger value="conversaciones">Conversaciones</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>

        <TabsContent value="conversaciones" className="mt-4">
          <div className={cn("grid gap-4", selected ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
            {/* List */}
            <div className="space-y-3">
              {/* Filter pills */}
              <div className="flex gap-2 flex-wrap">
                {["all", "active", "escalated", "resolved"].map((f) => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition-all",
                      filter === f ? "bg-primary text-white border-primary" : "bg-muted text-muted-foreground border-border hover:border-primary"
                    )}
                  >
                    {f === "all" ? `Todas (${conversations.length})` : STATUS_LABELS[f]}
                  </button>
                ))}
              </div>

              <div className="card-premium overflow-hidden">
                {filtered.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground text-sm">Sin conversaciones</div>
                ) : (
                  <div className="divide-y divide-border">
                    {filtered.map((conv) => {
                      const patientName = conv.patients?.name ?? conv.patient_phone ?? "Desconocido"
                      return (
                        <button
                          key={conv.id}
                          onClick={() => setSelected(selected?.id === conv.id ? null : conv)}
                          className={cn(
                            "w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-muted/30 transition-colors",
                            selected?.id === conv.id && "bg-primary/5"
                          )}
                        >
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0 text-sm">
                            {CHANNEL_ICONS[conv.channel] ?? "💬"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">{patientName}</p>
                              <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0", STATUS_COLORS[conv.status])}>
                                {STATUS_LABELS[conv.status] ?? conv.status}
                              </span>
                            </div>
                            {conv.summary ? (
                              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{conv.summary}</p>
                            ) : conv.escalation_reason ? (
                              <p className="text-xs text-red-500 mt-0.5 line-clamp-1">↑ {conv.escalation_reason}</p>
                            ) : null}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-muted-foreground">{formatDateTime(conv.started_at)}</p>
                            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground ml-auto mt-1" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Detail */}
            {selected && (
              <div className="card-premium p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <p className="font-medium">{selected.patients?.name ?? selected.patient_phone ?? "Desconocido"}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDateTime(selected.started_at)}
                      {selected.resolved_at && ` → ${formatDateTime(selected.resolved_at)}`}
                    </p>
                  </div>
                  <span className={cn("px-2 py-1 rounded-full text-xs font-medium", STATUS_COLORS[selected.status])}>
                    {STATUS_LABELS[selected.status]}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Canal</span>
                    <span className="font-medium capitalize">{selected.channel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Atendido por</span>
                    <span className="font-medium">{selected.handled_by === "agent" ? "🤖 Agente IA" : "👤 Humano"}</span>
                  </div>
                  {selected.status === "escalated" && selected.escalation_reason && (
                    <div className="p-2 bg-red-50 rounded-lg">
                      <p className="text-xs font-medium text-red-700">Motivo de escalación:</p>
                      <p className="text-xs text-red-600 mt-0.5">{selected.escalation_reason}</p>
                    </div>
                  )}
                  {selected.summary && (
                    <div className="p-2 bg-muted/50 rounded-lg">
                      <p className="text-xs font-medium text-muted-foreground mb-1">Resumen:</p>
                      <p className="text-xs">{selected.summary}</p>
                    </div>
                  )}
                </div>

                <ConversationMessages conversationId={selected.id} />
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <div className="card-premium p-4 space-y-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Configuración del agente</p>
            <div className="space-y-3 text-sm">
              <ConfigRow label="Nombre" value={(clinic.settings.agent_name as string) ?? `Asistente de ${clinic.name}`} />
              <ConfigRow label="Tono" value={(clinic.settings.agent_tone as string) ?? "semi-formal"} />
              <ConfigRow label="Puede agendar citas" value={clinic.settings.agent_can_book !== false ? "Sí" : "No"} />
              <ConfigRow label="Envía recordatorios" value={clinic.settings.agent_send_reminders !== false ? "Sí" : "No"} />
              <ConfigRow label="Modelo simple" value="Claude Haiku (≤4 turnos)" />
              <ConfigRow label="Modelo complejo" value="Claude Sonnet (>4 turnos / urgencia)" />
            </div>
            <p className="text-xs text-muted-foreground">Para editar, ir a Configuración → Agente Recepcionista.</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  const colorMap: Record<string, string> = {
    blue:   "bg-blue-50 text-blue-600",
    yellow: "bg-amber-50 text-amber-600",
    red:    "bg-red-50 text-red-600",
    green:  "bg-emerald-50 text-emerald-600",
  }
  return (
    <div className="card-premium p-4">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", colorMap[color])}>
        {icon}
      </div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function ConfigRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  )
}

function ConversationMessages({ conversationId }: { conversationId: string }) {
  // In a real implementation this would fetch messages live
  // For now show a placeholder — messages load on client side
  return (
    <div className="pt-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Mensajes</p>
      <div className="text-center py-6 text-xs text-muted-foreground border border-dashed border-border rounded-lg">
        <Clock className="w-4 h-4 mx-auto mb-1 opacity-40" />
        Vista de mensajes disponible en próxima actualización
      </div>
    </div>
  )
}
