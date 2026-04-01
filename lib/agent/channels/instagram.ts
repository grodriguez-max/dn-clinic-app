/**
 * Instagram Messaging Channel
 *
 * Uses Meta Graph API to send messages via Instagram Direct.
 * Requires:
 *   - META_APP_ID, META_APP_SECRET (from Meta for Developers)
 *   - META_PAGE_ACCESS_TOKEN (Page access token with instagram_manage_messages scope)
 *   - META_INSTAGRAM_ACCOUNT_ID (Instagram Business account ID)
 *   - Webhook configured at /api/webhooks/instagram
 *   - App must be in Production mode (or test users added)
 */

const BASE = "https://graph.facebook.com/v20.0"

export async function sendInstagramMessage(recipientId: string, text: string): Promise<boolean> {
  const token = process.env.META_PAGE_ACCESS_TOKEN
  const igAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID
  if (!token || !igAccountId) {
    console.warn("[instagram] META_PAGE_ACCESS_TOKEN or META_INSTAGRAM_ACCOUNT_ID not set")
    return false
  }

  try {
    const res = await fetch(`${BASE}/${igAccountId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: text.substring(0, 1000) }, // IG limit
      }),
    })
    return res.ok
  } catch { return false }
}

export async function sendInstagramImage(recipientId: string, imageUrl: string, caption?: string): Promise<boolean> {
  const token = process.env.META_PAGE_ACCESS_TOKEN
  const igAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID
  if (!token || !igAccountId) return false

  try {
    const res = await fetch(`${BASE}/${igAccountId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: {
          attachment: {
            type: "image",
            payload: { url: imageUrl, is_reusable: true },
          },
        },
      }),
    })
    if (res.ok && caption) {
      await sendInstagramMessage(recipientId, caption)
    }
    return res.ok
  } catch { return false }
}
