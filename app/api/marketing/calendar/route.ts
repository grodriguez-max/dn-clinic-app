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

  let systemPrompt: string
  try {
    systemPrompt = await buildMarketingSystemPrompt(profile.clinic_id)
  } catch (e) {
    console.error("[marketing/calendar] buildMarketingSystemPrompt failed:", e)
    systemPrompt = "Sos el agente de marketing de una clínica estética. Respondé en español con JSON válido."
  }

  const today = new Date().toLocaleDateString("es-CR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: `Hoy es ${today}. Generá un plan de contenido para esta semana (7 días) basado en los pilares de contenido:
- Educativo 30%
- Prueba social / testimonios 25%
- Tips y lifestyle 25%
- Oferta / promoción 20%

Para cada día, generá UN POST con este formato JSON exacto:
{
  "day": "Lunes 1 Abril",
  "pillar": "Educativo",
  "platform": "Instagram",
  "time": "09:00",
  "title": "título del post",
  "copy": "copy completo del post con emojis y hashtags",
  "status": "draft"
}

Respondé SOLO con un array JSON válido de 7 objetos, sin texto adicional.`,
      }],
    })

    const text = response.content[0].type === "text" ? response.content[0].text : "[]"
    const match = text.match(/\[[\s\S]*\]/)
    const posts = match ? JSON.parse(match[0]) : []
    return NextResponse.json({ posts })
  } catch (e) {
    console.error("[marketing/calendar] Anthropic error:", e)
    return NextResponse.json({ error: String(e), posts: [] }, { status: 500 })
  }
}
