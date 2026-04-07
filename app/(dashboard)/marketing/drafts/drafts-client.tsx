"use client"

import { useState, useTransition } from "react"
import {
  CheckCircle2, XCircle, MessageSquare, Clock, Instagram, Facebook,
  Mail, Smartphone, ChevronDown, ChevronUp, Sparkles, Send, AlertCircle,
  CalendarDays, Tag, Layers, RefreshCw,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

// ── Types ─────────────────────────────────────────────────────────────────────

interface Draft {
  id: string
  scheduled_date: string
  platform: string
  content_type: string
  pillar?: string
  topic: string
  angle?: string
  copy_draft?: string
  image_brief?: string
  status: string
  notes?: string
  created_at: string
}

interface DraftsClientProps {
  drafts: Draft[]
  pendingTasks: { id: string; title: string; status: string; created_at: string }[]
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  instagram: { label: "Instagram", icon: Instagram, color: "text-pink-600 bg-pink-50 border-pink-200" },
  facebook:  { label: "Facebook",  icon: Facebook,  color: "text-blue-600 bg-blue-50 border-blue-200" },
  whatsapp:  { label: "WhatsApp",  icon: Smartphone, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  email:     { label: "Email",     icon: Mail,       color: "text-amber-600 bg-amber-50 border-amber-200" },
  tiktok:    { label: "TikTok",    icon: Sparkles,   color: "text-slate-800 bg-slate-50 border-slate-200" },
}

const PILLAR_CONFIG: Record<string, { label: string; color: string }> = {
  educativo:    { label: "Educativo",     color: "bg-blue-100 text-blue-700" },
  prueba_social:{ label: "Prueba social", color: "bg-emerald-100 text-emerald-700" },
  tips:         { label: "Tips",          color: "bg-violet-100 text-violet-700" },
  oferta:       { label: "Oferta",        color: "bg-orange-100 text-orange-700" },
  behind_scenes:{ label: "Behind scenes", color: "bg-slate-100 text-slate-700" },
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft:             { label: "Borrador",           color: "bg-slate-100 text-slate-600" },
  awaiting_approval: { label: "Esperando aprobación", color: "bg-amber-100 text-amber-700" },
  approved:          { label: "Aprobado",           color: "bg-emerald-100 text-emerald-700" },
  published:         { label: "Publicado",          color: "bg-teal-100 text-teal-700" },
  cancelled:         { label: "Descartado",         color: "bg-red-100 text-red-600" },
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00")
  return d.toLocaleDateString("es-CR", { weekday: "short", day: "numeric", month: "short" })
}

// ── Draft Card ────────────────────────────────────────────────────────────────

function DraftCard({ draft, onAction }: {
  draft: Draft
  onAction: (id: string, action: "approve" | "request_changes" | "reject", feedback?: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedback, setFeedback] = useState(draft.notes ?? "")
  const [loading, setLoading] = useState<string | null>(null)

  const platform = PLATFORM_CONFIG[draft.platform] ?? { label: draft.platform, icon: Sparkles, color: "text-slate-600 bg-slate-50 border-slate-200" }
  const PlatformIcon = platform.icon
  const pillar = draft.pillar ? PILLAR_CONFIG[draft.pillar] : null
  const status = STATUS_CONFIG[draft.status] ?? STATUS_CONFIG.draft

  const isPending = draft.status === "draft" || draft.status === "awaiting_approval"

  async function handle(action: "approve" | "request_changes" | "reject") {
    setLoading(action)
    await onAction(draft.id, action, action === "request_changes" ? feedback : undefined)
    setLoading(null)
    if (action === "request_changes") setShowFeedback(false)
  }

  return (
    <Card className={cn(
      "transition-all border-l-4",
      draft.status === "approved" && "border-l-emerald-400 opacity-75",
      draft.status === "cancelled" && "border-l-red-300 opacity-50",
      draft.status === "awaiting_approval" && "border-l-amber-400",
      draft.status === "draft" && "border-l-slate-300",
    )}>
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Platform + Status + Pillar */}
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className={cn("inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border", platform.color)}>
                  <PlatformIcon className="w-3 h-3" />
                  {platform.label}
                </span>
                <span className="text-xs text-muted-foreground">{draft.content_type}</span>
                {pillar && (
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", pillar.color)}>
                    {pillar.label}
                  </span>
                )}
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", status.color)}>
                  {status.label}
                </span>
              </div>

              {/* Topic */}
              <p className="font-semibold text-sm leading-snug">{draft.topic}</p>
              {draft.angle && (
                <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Tag className="w-3 h-3" />Ángulo: {draft.angle}
                </p>
              )}

              {/* Date */}
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {formatDate(draft.scheduled_date)}
              </p>
            </div>

            {/* Expand toggle */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-muted-foreground hover:text-foreground transition-colors p-1 shrink-0"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Copy preview (always visible, truncated) */}
          {draft.copy_draft && !expanded && (
            <div className="mt-3 bg-muted/50 rounded-lg p-3">
              <p className="text-xs text-foreground line-clamp-3 whitespace-pre-wrap">{draft.copy_draft}</p>
              <button onClick={() => setExpanded(true)} className="text-[10px] text-primary mt-1 hover:underline">
                Ver completo
              </button>
            </div>
          )}
        </div>

        {/* Expanded content */}
        {expanded && (
          <div className="px-4 pb-4 space-y-4 border-t pt-4">
            {/* Full copy */}
            {draft.copy_draft && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Layers className="w-3 h-3" />COPY DEL POST
                </p>
                <div className="bg-muted rounded-xl p-4 text-sm whitespace-pre-wrap font-mono leading-relaxed border">
                  {draft.copy_draft}
                </div>
              </div>
            )}

            {/* Image brief */}
            {draft.image_brief && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />BRIEF DE IMAGEN
                </p>
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 text-xs text-violet-900 leading-relaxed">
                  {draft.image_brief}
                </div>
              </div>
            )}

            {/* Previous feedback if any */}
            {draft.notes && draft.status === "draft" && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-amber-800">Feedback anterior enviado al agente:</p>
                  <p className="text-xs text-amber-700 mt-0.5">{draft.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions — only for pending drafts */}
        {isPending && (
          <div className="px-4 pb-4 space-y-3">
            {/* Feedback input */}
            {showFeedback && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Escribí tu feedback... ej: 'Hacelo más corto', 'Cambiá el tono a más formal', 'Agregá urgencia'"
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  className="text-sm resize-none"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handle("request_changes")}
                    disabled={!feedback.trim() || loading === "request_changes"}
                    className="gap-1.5 flex-1"
                  >
                    {loading === "request_changes" ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    Enviar al agente
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setShowFeedback(false); setFeedback(draft.notes ?? "") }}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!showFeedback && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handle("approve")}
                  disabled={!!loading}
                >
                  {loading === "approve" ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Aprobar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5"
                  onClick={() => setShowFeedback(true)}
                  disabled={!!loading}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  Pedir cambios
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handle("reject")}
                  disabled={!!loading}
                >
                  <XCircle className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DraftsClient({ drafts: initialDrafts, pendingTasks }: DraftsClientProps) {
  const [drafts, setDrafts] = useState(initialDrafts)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "done">("pending")
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)
  const router = useRouter()

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  async function handleAction(id: string, action: "approve" | "request_changes" | "reject", feedback?: string) {
    const res = await fetch("/api/marketing/drafts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId: id, action, feedback }),
    })
    const data = await res.json()

    if (!res.ok) {
      showToast(data.error ?? "Error al procesar", "err")
      return
    }

    showToast(data.message, "ok")

    // Optimistic update
    setDrafts((prev) => prev.map((d) => {
      if (d.id !== id) return d
      if (action === "approve")         return { ...d, status: "approved" }
      if (action === "reject")          return { ...d, status: "cancelled" }
      if (action === "request_changes") return { ...d, status: "draft", notes: feedback }
      return d
    }))

    router.refresh()
  }

  const filtered = drafts.filter((d) => {
    if (filter === "pending")  return d.status === "draft" || d.status === "awaiting_approval"
    if (filter === "approved") return d.status === "approved"
    if (filter === "done")     return d.status === "published" || d.status === "cancelled"
    return true
  })

  const pendingCount = drafts.filter(d => d.status === "draft" || d.status === "awaiting_approval").length
  const approvedCount = drafts.filter(d => d.status === "approved").length

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 animate-in slide-in-from-bottom-2",
          toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-destructive text-destructive-foreground"
        )}>
          {toast.type === "ok" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Pending agent tasks */}
      {pendingTasks.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                El agente tiene {pendingTasks.length} {pendingTasks.length === 1 ? "edición pendiente" : "ediciones pendientes"}
              </p>
              <div className="space-y-0.5 mt-1">
                {pendingTasks.map((t) => (
                  <p key={t.id} className="text-xs text-amber-700">• {t.title}</p>
                ))}
              </div>
              <p className="text-xs text-amber-600 mt-1.5">El agente actualizará los drafts en su próxima ejecución.</p>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {([
          { key: "pending",  label: "Por revisar",  count: pendingCount },
          { key: "approved", label: "Aprobados",    count: approvedCount },
          { key: "done",     label: "Finalizados",  count: null },
          { key: "all",      label: "Todos",        count: drafts.length },
        ] as const).map(({ key, label, count }) => (
          <Button
            key={key}
            size="sm"
            variant={filter === key ? "default" : "outline"}
            onClick={() => setFilter(key)}
            className="gap-1.5"
          >
            {label}
            {count !== null && (
              <span className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                filter === key ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Drafts grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-20" />
          <p className="text-sm font-medium">
            {filter === "pending" ? "No hay drafts pendientes de revisión" : "Sin contenido en esta categoría"}
          </p>
          <p className="text-xs mt-1">
            {filter === "pending" && "Pedile al agente que genere contenido desde el chat de marketing."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((draft) => (
            <DraftCard key={draft.id} draft={draft} onAction={handleAction} />
          ))}
        </div>
      )}
    </div>
  )
}
