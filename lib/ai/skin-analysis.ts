/**
 * Skin Analysis — Claude Vision
 *
 * Analyzes patient skin photos using Claude's vision capabilities.
 * Produces structured reports for treatment recommendations.
 *
 * Privacy: Patient consent required. Images are analyzed in-transit
 * and NOT stored by Anthropic (per their API privacy policy).
 * We store only the analysis text and a reference to the patient's
 * own image in Supabase Storage.
 */

import Anthropic from "@anthropic-ai/sdk"
import { createServiceClient } from "@/lib/supabase/server"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SKIN_ANALYSIS_PROMPT = `Sos un dermatólogo estético experto. Analizá esta imagen de piel y proporcioná:

1. **Condiciones observadas**: Lista las condiciones visibles (acné, manchas, arrugas, hiperpigmentación, poros dilatados, deshidratación, etc.) con severidad (leve/moderada/severa).

2. **Tipo de piel estimado**: grasa, seca, mixta, normal, sensible.

3. **Tratamientos recomendados**: Lista los 3-5 tratamientos estéticos más apropiados con breve justificación.

4. **Prioridad de atención**: qué tratar primero y por qué.

5. **Notas**: cualquier condición que requiera evaluación médica antes de tratamientos estéticos.

Respondé en español, en formato estructurado. Sé preciso pero no alarmista. Usá lenguaje profesional pero comprensible para el paciente.`

export interface SkinAnalysisResult {
  raw: string
  conditions: string[]
  skinType: string
  recommendedTreatments: string[]
  priority: string
  notes: string
  imageUrl?: string
}

export async function analyzeSkin(params: {
  clinicId: string
  patientId: string
  imageBase64: string   // base64 encoded JPEG/PNG
  imageUrl?: string     // optional: URL stored in Supabase Storage
}): Promise<{ ok: boolean; analysis?: SkinAnalysisResult; error?: string }> {
  const supabase = createServiceClient()

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",  // Fast + cheap for analysis
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: params.imageBase64,
            },
          },
          {
            type: "text",
            text: SKIN_ANALYSIS_PROMPT,
          },
        ],
      }],
    })

    const rawText = message.content[0].type === "text" ? message.content[0].text : ""

    // Store the analysis
    await supabase.from("ai_generations").insert({
      clinic_id: params.clinicId,
      patient_id: params.patientId,
      type: "skin_analysis",
      prompt: "skin_analysis",
      analysis: rawText,
      result_url: params.imageUrl ?? null,
      model: "claude-haiku-4-5-20251001",
    })

    // Parse structured sections from the response
    const conditions = extractSection(rawText, "Condiciones observadas")
    const skinType = extractSection(rawText, "Tipo de piel estimado")
    const treatments = extractSection(rawText, "Tratamientos recomendados")
    const priority = extractSection(rawText, "Prioridad de atención")
    const notes = extractSection(rawText, "Notas")

    return {
      ok: true,
      analysis: {
        raw: rawText,
        conditions: conditions.split("\n").filter(Boolean).map((s) => s.replace(/^[-*•]\s*/, "")),
        skinType: skinType.trim(),
        recommendedTreatments: treatments.split("\n").filter(Boolean).map((s) => s.replace(/^[-*•\d.]\s*/, "")),
        priority: priority.trim(),
        notes: notes.trim(),
        imageUrl: params.imageUrl,
      },
    }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

function extractSection(text: string, heading: string): string {
  const regex = new RegExp(`\\*\\*${heading}[^*]*\\*\\*[:\\s]*([\\s\\S]*?)(?=\\*\\*|$)`, "i")
  const match = text.match(regex)
  return match?.[1]?.trim() ?? ""
}

export async function getPatientAnalyses(clinicId: string, patientId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from("ai_generations")
    .select("id, type, analysis, result_url, created_at")
    .eq("clinic_id", clinicId)
    .eq("patient_id", patientId)
    .in("type", ["skin_analysis", "before_after"])
    .order("created_at", { ascending: false })
    .limit(20)
  return data ?? []
}
