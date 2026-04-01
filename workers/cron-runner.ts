/**
 * Cron Runner — deploy en Railway
 * Ejecuta los 12 cron jobs del Agente Recepcionista llamando la API de Next.js
 *
 * Deploy: railway up --service cron-runner
 * Env vars: NEXT_APP_URL, CRON_SECRET
 */

import cron from "node-cron"

const APP_URL = process.env.NEXT_APP_URL ?? "http://localhost:3000"
const CRON_SECRET = process.env.CRON_SECRET ?? ""

async function triggerJob(job: string): Promise<void> {
  try {
    const url = `${APP_URL}/api/crons?job=${job}&secret=${CRON_SECRET}`
    const res = await fetch(url)
    const data = await res.json() as { ok?: boolean; result?: unknown; error?: string }
    if (!res.ok || data.error) {
      console.error(`[cron:${job}] Error: ${data.error}`)
    } else {
      console.log(`[cron:${job}] ✅`, JSON.stringify(data.result ?? {}).slice(0, 120))
    }
  } catch (err) {
    console.error(`[cron:${job}] Fetch error:`, err)
  }
}

// ─── 12 CRON JOBS ────────────────────────────────────────────────────────────
// Timezone: America/Costa_Rica (UTC-6)

// 1. Confirmación 24h antes — diario a las 10:00am
cron.schedule("0 10 * * *", () => triggerJob("confirmation_24h"), { timezone: "America/Costa_Rica" })

// 2. Recordatorio 2h antes — cada 30 min (ventana de 15 min)
cron.schedule("*/30 * * * *", () => triggerJob("reminder_2h"), { timezone: "America/Costa_Rica" })

// 3. Check-in 30 min antes — cada 15 min
cron.schedule("*/15 * * * *", () => triggerJob("checkin_30min"), { timezone: "America/Costa_Rica" })

// 4. Post no-show — diario a las 6:00pm
cron.schedule("0 18 * * *", () => triggerJob("post_noshow"), { timezone: "America/Costa_Rica" })

// 5. Post-cita 3 días después — diario a las 10:00am
cron.schedule("0 10 * * *", () => triggerJob("post_appointment_3d"), { timezone: "America/Costa_Rica" })

// 6. Solicitud de reseña 7 días después — diario a las 10:00am
cron.schedule("5 10 * * *", () => triggerJob("review_request_7d"), { timezone: "America/Costa_Rica" })

// 7. Follow-up leads no convertidos — miércoles a las 10:00am
cron.schedule("0 10 * * 3", () => triggerJob("followup_leads_3d"), { timezone: "America/Costa_Rica" })

// 8. Recordatorio tratamiento periódico — lunes a las 9:00am
cron.schedule("0 9 * * 1", () => triggerJob("periodic_treatment_reminder"), { timezone: "America/Costa_Rica" })

// 9. Alerta no-show tiempo real — cada 10 minutos
cron.schedule("*/10 * * * *", () => triggerJob("noshow_realtime_alert"), { timezone: "America/Costa_Rica" })

// 10. Resumen diario al dueño — diario a las 7:00am
cron.schedule("0 7 * * *", () => triggerJob("daily_summary_owner"), { timezone: "America/Costa_Rica" })

// 11 y 12 son event-driven (hot_lead_notification, waitlist_check)
// — se ejecutan automáticamente desde los tool handlers

// 13. Métricas nocturnas — diario a las 2:00am (datos del día anterior)
cron.schedule("0 2 * * *", () => triggerJob("metrics_nightly"), { timezone: "America/Costa_Rica" })

// ─── AGENTE 2: MARKETING (7 jobs) ─────────────────────────────────────────────

async function triggerMarketingJob(job: string): Promise<void> {
  try {
    const url = `${APP_URL}/api/crons/marketing?job=${job}&secret=${CRON_SECRET}`
    const res = await fetch(url)
    const data = await res.json() as { ok?: boolean; result?: unknown; error?: string }
    if (!res.ok || data.error) {
      console.error(`[marketing-cron:${job}] Error: ${data.error}`)
    } else {
      console.log(`[marketing-cron:${job}] ✅`, JSON.stringify(data.result ?? {}).slice(0, 120))
    }
  } catch (err) {
    console.error(`[marketing-cron:${job}] Fetch error:`, err)
  }
}

// M1. Reactivación — lunes a las 10:00am
cron.schedule("0 10 * * 1", () => triggerMarketingJob("reactivation"), { timezone: "America/Costa_Rica" })

// M2. Cumpleaños — diario a las 9:00am
cron.schedule("0 9 * * *", () => triggerMarketingJob("birthdays"), { timezone: "America/Costa_Rica" })

// M3. Follow-up post-tratamiento 3 días — diario a las 10:15am
cron.schedule("15 10 * * *", () => triggerMarketingJob("post_treatment_followup"), { timezone: "America/Costa_Rica" })

// M4. Solicitud de reseña 7 días — diario a las 10:30am
cron.schedule("30 10 * * *", () => triggerMarketingJob("review_request"), { timezone: "America/Costa_Rica" })

// M5. Recordatorio tratamiento periódico — lunes a las 9:15am
cron.schedule("15 9 * * 1", () => triggerMarketingJob("periodic_treatment_reminder"), { timezone: "America/Costa_Rica" })

// M6. Follow-up leads tibios — miércoles a las 10:00am
cron.schedule("0 10 * * 3", () => triggerMarketingJob("followup_warm_leads"), { timezone: "America/Costa_Rica" })

// M7. Reporte semanal al dueño — lunes a las 8:00am
cron.schedule("0 8 * * 1", () => triggerMarketingJob("weekly_report"), { timezone: "America/Costa_Rica" })

// B1. Trial ending reminder — diario a las 9:00am (verifica trials que vencen en 2 días)
cron.schedule("0 9 * * *", () => triggerJob("trial_reminder"), { timezone: "America/Costa_Rica" })

// B2. Facturación mensual — día 1 de cada mes a las 2:30am
cron.schedule("30 2 1 * *", () => triggerJob("billing_monthly"), { timezone: "America/Costa_Rica" })

// B3. Track confirmaciones de agente — diario a las 11:00pm
cron.schedule("0 23 * * *", () => triggerJob("track_confirmations"), { timezone: "America/Costa_Rica" })

// N1. Encuestas de satisfacción 3 días post-cita — diario a las 10:45am
cron.schedule("45 10 * * *", () => triggerJob("survey_request_3d"), { timezone: "America/Costa_Rica" })

// N2. SINPE — expirar pagos vencidos — cada 30 min
cron.schedule("*/30 * * * *", () => triggerJob("sinpe_expire"), { timezone: "America/Costa_Rica" })

// N3. Hacienda ATV — verificar estado facturas pendientes — cada 15 min
cron.schedule("*/15 * * * *", () => triggerJob("hacienda_check_pending"), { timezone: "America/Costa_Rica" })

console.log("⏰ Cron runner iniciado. 13 jobs Agente 1 + 7 jobs Marketing + 3 jobs Billing + 3 jobs Nuevos = 26 jobs programados.")
console.log(`📡 Apuntando a: ${APP_URL}`)

// Keep process alive
process.on("SIGINT", () => { console.log("Cron runner detenido."); process.exit(0) })
