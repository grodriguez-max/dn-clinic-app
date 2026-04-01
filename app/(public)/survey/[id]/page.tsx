"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface Question {
  id: string
  text: string
  type: "rating" | "multiple_choice" | "open_text"
  options?: string[]
  is_required: boolean
}

interface Template {
  id: string
  name: string
  questions: Question[]
  clinic?: { name: string; logo_url?: string }
}

export default function SurveyPage({ params }: { params: { id: string } }) {
  const [template, setTemplate] = useState<Template | null>(null)
  const [responses, setResponses] = useState<Record<string, unknown>>({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(true)

  const { searchParams } = typeof window !== "undefined" ? new URL(window.location.href) : { searchParams: new URLSearchParams() }
  const patientId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("p") : null
  const appointmentId = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("a") : null

  useEffect(() => {
    fetch(`/api/survey/${params.id}`)
      .then((r) => r.json())
      .then((d) => { setTemplate(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [params.id])

  async function handleSubmit() {
    if (!template || !patientId) return
    setLoading(true)
    await fetch(`/api/survey/${params.id}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId, appointmentId, responses }),
    })
    setSubmitted(true)
    setLoading(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!template) return (
    <div className="min-h-screen flex items-center justify-center text-muted-foreground">
      <p>Encuesta no encontrada</p>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="text-center p-8 max-w-sm">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">✓</span>
        </div>
        <h2 className="text-xl font-bold text-emerald-700">¡Gracias por tu opinión!</h2>
        <p className="text-muted-foreground mt-2 text-sm">Tu respuesta nos ayuda a mejorar el servicio.</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-10 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">{template.name}</h1>
          {template.clinic?.name && <p className="text-muted-foreground mt-1">{template.clinic.name}</p>}
        </div>

        {template.questions.map((q, i) => (
          <div key={q.id} className="bg-white rounded-2xl p-5 shadow-sm space-y-3">
            <p className="font-medium text-sm">
              {i + 1}. {q.text}
              {q.is_required && <span className="text-destructive ml-1">*</span>}
            </p>

            {q.type === "rating" && (
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setResponses((r) => ({ ...r, [q.id]: n }))}
                    className={cn(
                      "w-12 h-12 rounded-xl border-2 font-semibold text-lg transition-all",
                      responses[q.id] === n
                        ? "border-primary bg-primary text-white scale-110"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
            )}

            {q.type === "multiple_choice" && (
              <div className="space-y-2">
                {(q.options ?? []).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setResponses((r) => ({ ...r, [q.id]: opt }))}
                    className={cn(
                      "w-full text-left px-4 py-2.5 rounded-lg border-2 text-sm transition-all",
                      responses[q.id] === opt
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border hover:border-primary/40"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {q.type === "open_text" && (
              <textarea
                className="w-full border border-border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                rows={3}
                placeholder="Escribí tu respuesta..."
                value={(responses[q.id] as string) ?? ""}
                onChange={(e) => setResponses((r) => ({ ...r, [q.id]: e.target.value }))}
              />
            )}
          </div>
        ))}

        <Button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12 text-base"
        >
          {loading ? "Enviando..." : "Enviar respuesta"}
        </Button>
      </div>
    </div>
  )
}
