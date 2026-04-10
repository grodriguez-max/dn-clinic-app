import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import Anthropic from "@anthropic-ai/sdk"
import { buildMarketingSystemPrompt } from "@/lib/agent/marketing-prompt"

const anthropic = new Anthropic()

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { data: profile } = await supabase
    .from("users")
    .select("clinic_id, role")
    .eq("id", user.id)
    .single()

  if (!profile?.clinic_id) return NextResponse.json({ error: "Sin clínica" }, { status: 400 })
  if (!["owner", "admin"].includes(profile.role)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.messages) return NextResponse.json({ error: "Body inválido" }, { status: 400 })
  const { messages } = body as { messages: { role: string; content: string }[] }

  let systemPrompt: string
  try {
    systemPrompt = await buildMarketingSystemPrompt(profile.clinic_id)
  } catch (e) {
    console.error("[marketing/chat] buildMarketingSystemPrompt failed:", e)
    systemPrompt = "Sos el agente de marketing de una clínica estética. Respondé en español."
  }

  const fullSystem = systemPrompt + `\n\nEstás ahora en modo de chat directo con el dueño/a de la clínica. Pueden pedirte:
- Crear campañas específicas (genera el copy completo, segmento objetivo, canal recomendado, hora de envío)
- Analizar métricas de marketing
- Sugerir ideas de contenido
- Redactar mensajes de WhatsApp o email
- Planificar el calendario de contenido

Responde en español. Cuando generes campañas, incluye siempre: CAMPAÑA, SEGMENTO, CANAL, COPY, y ACCIÓN RECOMENDADA en formato estructurado.`

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      system: fullSystem,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    })
    const text = response.content[0].type === "text" ? response.content[0].text : ""
    return NextResponse.json({ reply: text })
  } catch (e) {
    console.error("[marketing/chat] Anthropic error:", e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
