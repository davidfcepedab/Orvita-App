import type { SupabaseClient } from "@supabase/supabase-js"
import type webpush from "web-push"
import { getVapidPrivateKey, getVapidPublicKey, getVapidSubject, isVapidConfigured } from "@/lib/notifications/vapid"

export type WebPushPayload = {
  title: string
  body: string
  /** Ruta interna, ej. /finanzas/overview */
  url?: string | null
  notificationId?: string
}

let webPushModule: typeof webpush | null = null

async function getWebPush(): Promise<typeof webpush | null> {
  if (!isVapidConfigured()) return null
  if (!webPushModule) {
    webPushModule = (await import("web-push")).default
    const pub = getVapidPublicKey()!
    const priv = getVapidPrivateKey()!
    webPushModule.setVapidDetails(getVapidSubject(), pub, priv)
  }
  return webPushModule
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string }

/**
 * Envía Web Push a las suscripciones del usuario.
 * `supabase` debe poder leer (y borrar si 410) `orbita_push_subscriptions` para ese usuario (JWT o service_role).
 */
export async function sendWebPushToUser(
  supabase: SupabaseClient,
  userId: string,
  payload: WebPushPayload,
): Promise<{ sent: number; errors: number }> {
  const wp = await getWebPush()
  if (!wp) return { sent: 0, errors: 0 }

  const { data: rows, error } = await supabase
    .from("orbita_push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)

  if (error || !rows?.length) return { sent: 0, errors: 0 }

  const list = rows as SubRow[]
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url ?? "/",
    notificationId: payload.notificationId,
  })

  let sent = 0
  let errors = 0

  for (const row of list) {
    const subscription = {
      endpoint: row.endpoint,
      keys: { p256dh: row.p256dh, auth: row.auth },
    }
    try {
      await wp.sendNotification(subscription, body)
      sent++
    } catch (e: unknown) {
      errors++
      const status = typeof e === "object" && e !== null && "statusCode" in e ? (e as { statusCode?: number }).statusCode : undefined
      if (status === 404 || status === 410) {
        await supabase.from("orbita_push_subscriptions").delete().eq("id", row.id)
      }
    }
  }

  return { sent, errors }
}
