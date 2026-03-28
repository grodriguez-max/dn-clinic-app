/**
 * Main agent loop for Agente 1: Recepcionista Virtual
 * Handles incoming WhatsApp messages using Anthropic SDK + tool use
 */

import Anthropic from "@anthropic-ai/sdk"
import { createServiceClient } from "@/lib/supabase/server"
import { buildSystemPrompt } from "./system-prompt"
import { RECEPTIONIST_TOOLS } from "./tools-definition"
import { dispatchTool } from "./tool-handlers"

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const HAIKU  = "claude-haiku-4-5-20251001"
const SONNET = "claude-sonnet-4-6"

export interface IncomingMessage {
  phone: string        // patient WhatsApp phone
  text: string         // message content
  clinicId: string
  channel?: "whatsapp" | "web"
}

export interface AgentResponse {
  text: string
  conversationId: string
  escalated: boolean
  tokensUsed: { input: number; output: number; model: string }
}

// ─── MODEL ROUTING ────────────────────────────────────────────────────

function selectModel(turnCount: number, hasUrgency: boolean, hasNegativeSignals: boolean): string {
  if (hasUrgency || hasNegativeSignals || turnCount > 4) return SONNET
  return HAIKU
}

function detectNegativeSignals(text: string): boolean {
  const signals = ["molest", "enojad", "frustrad", "pésimo", "horrible", "queja", "complaint", "angry", "upset", "furious", "terrible", "inaceptable", "escándalo"]
  return signals.some((s) => text.toLowerCase().includes(s))
}

function detectUrgencySignals(text: string): boolean {
  const signals = ["urgente", "emergencia", "alergia", "reacción", "sangra", "dolor intenso", "no puedo respirar", "hinchazón", "desmay"]
  return signals.some((s) => text.toLowerCase().includes(s))
}

// ─── CONVERSATION MANAGEMENT ──────────────────────────────────────────

async function getOrCreateConversation(clinicId: string, phone: string): Promise<string> {
  const supabase = createServiceClient()

  // Look for an active conversation from this phone in the last 24h
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: existing } = await supabase
    .from("conversations")
    .select("id")
    .eq("clinic_id", clinicId)
    .eq("patient_phone", phone)
    .eq("status", "active")
    .gte("started_at", cutoff)
    .order("started_at", { ascending: false })
    .limit(1)
    .single()

  if (existing) return existing.id

  // Find patient by phone
  const { data: patient } = await supabase
    .from("patients")
    .select("id")
    .eq("clinic_id", clinicId)
    .ilike("phone", `%${phone.replace(/\D/g, "").slice(-8)}%`)
    .single()

  const { data: conv } = await supabase
    .from("conversations")
    .insert({
      clinic_id: clinicId,
      patient_id: patient?.id ?? null,
      patient_phone: phone,
      channel: "whatsapp",
      status: "active",
      handled_by: "agent",
    })
    .select("id")
    .single()

  return conv!.id
}

async function getConversationHistory(conversationId: string): Promise<Anthropic.MessageParam[]> {
  const supabase = createServiceClient()

  const { data: messages } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(30)

  if (!messages) return []

  const history: Anthropic.MessageParam[] = []
  for (const msg of messages) {
    if (msg.role === "patient") {
      history.push({ role: "user", content: msg.content })
    } else if (msg.role === "agent") {
      // Skip escalation/system messages
      if (!(msg.content as string).startsWith("[ESCALACIÓN")) {
        history.push({ role: "assistant", content: msg.content })
      }
    }
  }
  return history
}

async function saveMessage(
  conversationId: string,
  role: "patient" | "agent",
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  const supabase = createServiceClient()
  await supabase.from("messages").insert({ conversation_id: conversationId, role, content, metadata })
}

// ─── MAIN AGENT LOOP ──────────────────────────────────────────────────

export async function processMessage(incoming: IncomingMessage): Promise<AgentResponse> {
  const { phone, text, clinicId } = incoming

  const conversationId = await getOrCreateConversation(clinicId, phone)

  // Save incoming message
  await saveMessage(conversationId, "patient", text)

  // Get conversation history
  const history = await getConversationHistory(conversationId)

  // Determine model
  const turnCount = history.filter((m) => m.role === "user").length
  const hasUrgency = detectUrgencySignals(text)
  const hasNegative = detectNegativeSignals(text)
  const model = selectModel(turnCount, hasUrgency, hasNegative)

  // Build system prompt with fresh clinic data
  const systemPrompt = await buildSystemPrompt(clinicId)

  // Build messages for this turn
  const messages: Anthropic.MessageParam[] = [
    ...history,
    { role: "user", content: text },
  ]

  let totalInput = 0
  let totalOutput = 0
  let responseText = ""
  let escalated = false

  // Agentic loop — keep running until no more tool calls
  let loopMessages = [...messages]
  for (let iteration = 0; iteration < 10; iteration++) {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 1024,
      system: systemPrompt,
      tools: RECEPTIONIST_TOOLS,
      messages: loopMessages,
    })

    totalInput += response.usage.input_tokens
    totalOutput += response.usage.output_tokens

    if (response.stop_reason === "end_turn") {
      // Extract text from response
      responseText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("")
      break
    }

    if (response.stop_reason === "tool_use") {
      // Append assistant message with tool calls
      loopMessages.push({ role: "assistant", content: response.content })

      // Execute all tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of response.content) {
        if (block.type !== "tool_use") continue

        const result = await dispatchTool(
          block.name,
          block.input as Record<string, unknown>,
          clinicId,
          conversationId
        )

        if (block.name === "escalate_to_human") escalated = true

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: JSON.stringify(result),
        })
      }

      loopMessages.push({ role: "user", content: toolResults })
      continue
    }

    // Unexpected stop reason — extract any text and break
    responseText = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
    break
  }

  if (!responseText) responseText = "Disculpá, hubo un problema procesando tu mensaje. Por favor intentá de nuevo."

  // Save agent response
  await saveMessage(conversationId, "agent", responseText, {
    model,
    tokens_in: totalInput,
    tokens_out: totalOutput,
  })

  return {
    text: responseText,
    conversationId,
    escalated,
    tokensUsed: { input: totalInput, output: totalOutput, model },
  }
}
