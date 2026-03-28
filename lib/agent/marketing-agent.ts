/**
 * Agente 2: Marketing Agent — agentic loop
 * Triggered by cron jobs and manual calls from the marketing dashboard
 */

import Anthropic from "@anthropic-ai/sdk"
import { buildMarketingSystemPrompt } from "./marketing-prompt"
import { MARKETING_TOOLS } from "./marketing-tools"
import { dispatchMarketingTool } from "./marketing-handlers"
import { createServiceClient } from "@/lib/supabase/server"

const anthropic = new Anthropic()
const MODEL = "claude-haiku-4-5-20251001" // Marketing tasks are well-structured, Haiku is sufficient

export interface MarketingTaskInput {
  clinicId: string
  task: string          // e.g. "run reactivation campaign for 60+ day inactive patients"
  context?: Record<string, unknown>
  triggeredBy?: "cron" | "manual" | "event"
  cronJob?: string
}

export interface MarketingTaskResult {
  success: boolean
  summary: string
  tool_calls_made: string[]
  tokens_used: { input: number; output: number }
  error?: string
}

export async function runMarketingTask(input: MarketingTaskInput): Promise<MarketingTaskResult> {
  const { clinicId, task, context, triggeredBy = "cron", cronJob } = input
  const supabase = createServiceClient()

  const systemPrompt = await buildMarketingSystemPrompt(clinicId)
  const contextStr = context ? `\n\nContexto adicional:\n${JSON.stringify(context, null, 2)}` : ""

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: `${task}${contextStr}` },
  ]

  const toolCallsMade: string[] = []
  let totalInputTokens = 0
  let totalOutputTokens = 0
  let summary = ""
  let lastError: string | undefined

  // Agentic loop — max 8 iterations for marketing tasks
  for (let i = 0; i < 8; i++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      tools: MARKETING_TOOLS,
      messages,
    })

    totalInputTokens += response.usage.input_tokens
    totalOutputTokens += response.usage.output_tokens

    if (response.stop_reason === "end_turn") {
      // Extract summary from final text response
      const textBlock = response.content.find((b) => b.type === "text")
      summary = textBlock?.type === "text" ? textBlock.text : "Tarea completada."
      break
    }

    if (response.stop_reason !== "tool_use") break

    // Process tool calls
    const toolResults: Anthropic.MessageParam = {
      role: "user",
      content: [],
    }

    for (const block of response.content) {
      if (block.type !== "tool_use") continue

      toolCallsMade.push(block.name)

      let result: string
      try {
        result = await dispatchMarketingTool(clinicId, block.name, block.input as Record<string, unknown>)
      } catch (err) {
        result = JSON.stringify({ error: String(err) })
        lastError = String(err)
      }

      ;(toolResults.content as Anthropic.ToolResultBlockParam[]).push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      })
    }

    messages.push({ role: "assistant", content: response.content })
    messages.push(toolResults)
  }

  // Log marketing task execution
  if (cronJob) {
    console.log(`[marketing-agent:${cronJob}] clinic=${clinicId} tools=[${toolCallsMade.join(",")}] tokens=${totalInputTokens}+${totalOutputTokens}`)
  }

  // Save task log to DB for dashboard visibility
  // Fire-and-forget log (non-critical)
  void supabase.from("messages").insert({
    conversation_id: null,
    role: "agent",
    content: summary || task,
    metadata: {
      type: "marketing_task",
      clinic_id: clinicId,
      triggered_by: triggeredBy,
      cron_job: cronJob,
      tool_calls: toolCallsMade,
      tokens_in: totalInputTokens,
      tokens_out: totalOutputTokens,
      model: MODEL,
      executed_at: new Date().toISOString(),
    },
  })

  return {
    success: !lastError,
    summary,
    tool_calls_made: toolCallsMade,
    tokens_used: { input: totalInputTokens, output: totalOutputTokens },
    error: lastError,
  }
}
