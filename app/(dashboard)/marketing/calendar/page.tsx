"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Sparkles, RefreshCw, Check, X, Instagram, MessageCircle, Clock, Bookmark } from "lucide-react"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface ContentPost {
  day: string
  pillar: string
  platform: string
  time: string
  title: string
  copy: string
  status: "draft" | "approved" | "rejected"
}

const PILLAR_COLORS: Record<string, string> = {
  "Educativo":    "bg-blue-100 text-blue-700",
  "Prueba social": "bg-purple-100 text-purple-700",
  "Tips":          "bg-amber-100 text-amber-700",
  "Oferta":        "bg-emerald-100 text-emerald-700",
}

export default function MarketingCalendarPage() {
  const [posts, setPosts] = useState<ContentPost[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedPost, setExpandedPost] = useState<number | null>(null)
  const [generated, setGenerated] = useState(false)

  async function generateCalendar() {
    setLoading(true)
    setGenerated(false)
    try {
      const res = await fetch("/api/marketing/calendar", { method: "POST" })
      const data = await res.json()
      setPosts((data.posts as ContentPost[]).map((p) => ({ ...p, status: "draft" })))
      setGenerated(true)
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  function updateStatus(i: number, status: ContentPost["status"]) {
    setPosts((prev) => prev.map((p, j) => j === i ? { ...p, status } : p))
  }

  const approved = posts.filter((p) => p.status === "approved").length
  const pending  = posts.filter((p) => p.status === "draft").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/marketing" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Calendario de Contenido</h1>
          <p className="text-sm text-muted-foreground">Plan semanal generado por el agente de marketing</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          {generated && (
            <div className="text-sm text-muted-foreground">
              {approved}/{posts.length} aprobados
            </div>
          )}
          <Button onClick={generateCalendar} disabled={loading}>
            {loading ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Generando...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" />{generated ? "Regenerar" : "Generar plan semanal"}</>
            )}
          </Button>
        </div>
      </div>

      {!generated && !loading && (
        <div className="bg-white border border-border rounded-xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-violet-500" />
          </div>
          <h3 className="font-semibold text-lg mb-2">Tu CMO virtual listo para planificar</h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            El agente analizará tu clínica y generará un plan de contenido semanal balanceado con copy listo para publicar.
          </p>
          <Button onClick={generateCalendar} size="lg">
            <Sparkles className="w-4 h-4 mr-2" />
            Generar plan semanal
          </Button>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="bg-muted/30 border border-border rounded-xl p-4 h-48 animate-pulse" />
          ))}
        </div>
      )}

      {generated && !loading && (
        <>
          {/* Stats bar */}
          <div className="flex gap-3 text-sm flex-wrap">
            {Object.entries(
              posts.reduce((acc: Record<string, number>, p) => {
                acc[p.pillar] = (acc[p.pillar] ?? 0) + 1
                return acc
              }, {})
            ).map(([pillar, count]) => (
              <span key={pillar} className={cn("px-3 py-1 rounded-full text-xs font-medium", PILLAR_COLORS[pillar] ?? "bg-gray-100 text-gray-700")}>
                {pillar}: {count} posts
              </span>
            ))}
          </div>

          {/* Posts grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {posts.map((post, i) => (
              <div
                key={i}
                className={cn(
                  "bg-white border rounded-xl overflow-hidden transition-all cursor-pointer hover:shadow-md",
                  post.status === "approved" && "border-emerald-300 bg-emerald-50/30",
                  post.status === "rejected" && "border-red-200 opacity-60",
                  post.status === "draft" && "border-border",
                )}
                onClick={() => setExpandedPost(expandedPost === i ? null : i)}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-muted-foreground">{post.day}</span>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />{post.time}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", PILLAR_COLORS[post.pillar] ?? "bg-gray-100 text-gray-600")}>
                      {post.pillar}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{post.platform}</span>
                  </div>
                  <p className="text-sm font-semibold line-clamp-2 mb-2">{post.title}</p>

                  {expandedPost === i && (
                    <p className="text-xs text-muted-foreground whitespace-pre-wrap mb-3 border-t border-border/60 pt-2">
                      {post.copy}
                    </p>
                  )}

                  {/* Status badge */}
                  {post.status === "approved" && (
                    <div className="flex items-center gap-1 text-xs text-emerald-700 font-medium mt-2">
                      <Check className="w-3 h-3" />Aprobado
                    </div>
                  )}
                  {post.status === "rejected" && (
                    <div className="flex items-center gap-1 text-xs text-red-600 font-medium mt-2">
                      <X className="w-3 h-3" />Rechazado
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                {post.status === "draft" && (
                  <div className="flex border-t border-border">
                    <button
                      onClick={(e) => { e.stopPropagation(); updateStatus(i, "approved") }}
                      className="flex-1 py-2 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <Check className="w-3 h-3" />Aprobar
                    </button>
                    <div className="w-px bg-border" />
                    <button
                      onClick={(e) => { e.stopPropagation(); updateStatus(i, "rejected") }}
                      className="flex-1 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center gap-1"
                    >
                      <X className="w-3 h-3" />Rechazar
                    </button>
                  </div>
                )}
                {post.status !== "draft" && (
                  <div className="border-t border-border">
                    <button
                      onClick={(e) => { e.stopPropagation(); updateStatus(i, "draft") }}
                      className="w-full py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                      Revertir a borrador
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {approved > 0 && (
            <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
              <div className="text-sm">
                <span className="font-semibold text-emerald-800">{approved} posts aprobados</span>
                {" "}<span className="text-emerald-700">listos para publicar</span>
              </div>
              <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                <Bookmark className="w-3.5 h-3.5 mr-1.5" />
                Exportar aprobados
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
