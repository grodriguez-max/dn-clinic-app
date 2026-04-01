/**
 * AI Image Generation — fal.ai
 *
 * Required env vars:
 *   FAL_KEY — from fal.ai dashboard (Settings → API Keys)
 *
 * Install: npm install @fal-ai/serverless-client
 *
 * Use cases:
 *   1. Marketing images for Instagram/WhatsApp campaigns
 *   2. Before/After treatment previews (requires patient consent)
 *   3. Service promotional banners
 */

import { createServiceClient } from "@/lib/supabase/server"

// We call the fal.ai REST API directly to avoid requiring the SDK
// in environments where the package might not be installed yet.
const FAL_BASE = "https://fal.run"

async function falRun(model: string, input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const key = process.env.FAL_KEY
  if (!key) throw new Error("FAL_KEY not configured")

  const res = await fetch(`${FAL_BASE}/${model}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Key ${key}`,
    },
    body: JSON.stringify(input),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`fal.ai error: ${err}`)
  }
  return res.json()
}

// ─── Marketing Image Generation ────────────────────────────────────────

export type MarketingImageStyle = "modern" | "elegant" | "warm" | "fresh" | "luxe"
export type ServiceType = "facial" | "laser" | "botox" | "fillers" | "massage" | "hair" | "nails" | "general"

const STYLE_PROMPTS: Record<MarketingImageStyle, string> = {
  modern:  "modern minimalist design, clean white background, soft shadows",
  elegant: "luxury elegant aesthetic, gold accents, dark background, premium feel",
  warm:    "warm tones, cozy spa atmosphere, soft candlelight, natural textures",
  fresh:   "fresh bright colors, natural light, clean and airy, wellness aesthetic",
  luxe:    "ultra-premium, marble textures, rose gold, sophisticated, aspirational",
}

const SERVICE_PROMPTS: Record<ServiceType, string> = {
  facial:   "facial treatment, glowing skin, beauty ritual, skincare",
  laser:    "laser skin treatment, advanced technology, professional medical aesthetic",
  botox:    "anti-aging treatment, youthful skin, professional clinic setting",
  fillers:  "lip enhancement, natural beauty, professional aesthetic clinic",
  massage:  "relaxing massage therapy, spa ambiance, wellness retreat",
  hair:     "hair treatment, beautiful glossy hair, salon atmosphere",
  nails:    "nail art, manicure, beautiful hands, nail salon",
  general:  "aesthetic clinic, beauty treatment, professional medical spa",
}

export async function generateMarketingImage(params: {
  clinicId: string
  clinicName: string
  serviceType: ServiceType
  style: MarketingImageStyle
  customPrompt?: string
  format?: "square" | "portrait" | "landscape"
  patientId?: string
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  const supabase = createServiceClient()

  const sizeMap = {
    square: { width: 1024, height: 1024 },
    portrait: { width: 832, height: 1216 },
    landscape: { width: 1216, height: 832 },
  }
  const size = sizeMap[params.format ?? "square"]

  const prompt = params.customPrompt ?? [
    `Professional aesthetic clinic promotional photo for ${params.serviceType} service at ${params.clinicName},`,
    SERVICE_PROMPTS[params.serviceType],
    STYLE_PROMPTS[params.style],
    "photorealistic, high quality, no text, no watermark, no logos",
  ].join(" ")

  try {
    const result = await falRun("fal-ai/flux/schnell", {
      prompt,
      image_size: size,
      num_inference_steps: 4,  // schnell is fast
      num_images: 1,
      enable_safety_checker: true,
    })

    const images = result.images as Array<{ url: string }> | undefined
    const url = images?.[0]?.url
    if (!url) return { ok: false, error: "No image returned" }

    // Log generation
    await supabase.from("ai_generations").insert({
      clinic_id: params.clinicId,
      patient_id: params.patientId ?? null,
      type: "marketing_image",
      prompt,
      result_url: url,
      model: "fal-ai/flux/schnell",
    })

    return { ok: true, url }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}

// ─── Before/After Preview ──────────────────────────────────────────────

export async function generateBeforeAfterPreview(params: {
  clinicId: string
  patientId: string
  beforeImageUrl: string
  treatment: string
}): Promise<{ ok: boolean; url?: string; error?: string }> {
  const supabase = createServiceClient()

  const prompt = [
    `Realistic, subtle aesthetic improvement after ${params.treatment} treatment,`,
    "same person, natural result, professional medical photography,",
    "no dramatic changes, realistic outcome, clinical lighting",
  ].join(" ")

  try {
    const result = await falRun("fal-ai/flux/dev/image-to-image", {
      image_url: params.beforeImageUrl,
      prompt,
      strength: 0.35,  // low strength = subtle change
      num_inference_steps: 25,
      guidance_scale: 7.5,
      num_images: 1,
      enable_safety_checker: true,
    })

    const images = result.images as Array<{ url: string }> | undefined
    const url = images?.[0]?.url
    if (!url) return { ok: false, error: "No image returned" }

    await supabase.from("ai_generations").insert({
      clinic_id: params.clinicId,
      patient_id: params.patientId,
      type: "before_after",
      prompt,
      result_url: url,
      model: "fal-ai/flux/dev/image-to-image",
    })

    return { ok: true, url }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
}
