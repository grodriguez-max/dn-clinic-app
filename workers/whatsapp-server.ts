/**
 * WhatsApp Baileys Server — deploy en Railway
 * Mantiene la conexión con WhatsApp y reenvía mensajes al webhook de Next.js
 *
 * Deploy: railway up --service whatsapp-server
 * Env vars: WHATSAPP_WEBHOOK_URL, WHATSAPP_WEBHOOK_SECRET, CLINIC_SLUG, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys"
import { Boom } from "@hapi/boom"
import * as qrcode from "qrcode-terminal"

const WEBHOOK_URL = process.env.WHATSAPP_WEBHOOK_URL ?? "http://localhost:3000/api/agent/webhook"
const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET ?? ""
const CLINIC_SLUG = process.env.CLINIC_SLUG ?? ""

// Messages we ignore (non-text, status updates, broadcast, etc.)
const IGNORED_PREFIXES = ["[CRON:", "[ESCALACIÓN"]

async function sendToWebhook(phone: string, text: string): Promise<string | null> {
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone, text, clinicSlug: CLINIC_SLUG, secret: WEBHOOK_SECRET }),
    })
    if (!res.ok) { console.error(`[webhook] HTTP ${res.status}`); return null }
    const data = await res.json() as { text?: string }
    return data.text ?? null
  } catch (err) {
    console.error("[webhook] Error:", err)
    return null
  }
}

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("baileys_auth")
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, console as never),
    },
    printQRInTerminal: false,
    browser: ["DN Clínicas", "Chrome", "1.0.0"],
  })

  sock.ev.on("creds.update", saveCreds)

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update

    if (qr) {
      console.log("\n📱 Escanea este QR con WhatsApp:\n")
      qrcode.generate(qr, { small: true })
      console.log("\nTambién disponible en: /api/agent/qr\n")
    }

    if (connection === "close") {
      const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      console.log("[WA] Conexión cerrada:", lastDisconnect?.error, "— Reconectando:", shouldReconnect)
      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 3000)
      } else {
        console.log("[WA] Sesión cerrada por logout. Eliminá la carpeta baileys_auth y volvé a conectar.")
      }
    }

    if (connection === "open") {
      console.log(`[WA] ✅ WhatsApp conectado para clínica: ${CLINIC_SLUG}`)
    }
  })

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return

    for (const msg of messages) {
      // Skip non-personal chats (groups, broadcast, status)
      if (!msg.key.remoteJid?.endsWith("@s.whatsapp.net")) continue
      if (msg.key.fromMe) continue

      const phone = msg.key.remoteJid.replace("@s.whatsapp.net", "")
      const text = msg.message?.conversation
        ?? msg.message?.extendedTextMessage?.text
        ?? msg.message?.buttonsResponseMessage?.selectedDisplayText
        ?? ""

      if (!text.trim()) continue
      if (IGNORED_PREFIXES.some((p) => text.startsWith(p))) continue

      console.log(`[WA] ← ${phone}: ${text.slice(0, 80)}`)

      // Send to agent webhook
      const responseText = await sendToWebhook(phone, text)

      if (responseText) {
        await sock.sendMessage(`${phone}@s.whatsapp.net`, { text: responseText })
        console.log(`[WA] → ${phone}: ${responseText.slice(0, 80)}`)
      }
    }
  })

  return sock
}

// Start
console.log(`[WA] Iniciando servidor WhatsApp para clínica: ${CLINIC_SLUG}`)
connectToWhatsApp().catch(console.error)
