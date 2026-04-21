import type { SupabaseClient } from "@supabase/supabase-js"
import type webpush from "web-push"
import { ORVITA_PUSH_ICON } from "@/lib/notifications/pushBranding"
import { getVapidPrivateKey, getVapidPublicKey, getVapidSubject, isVapidConfigured } from "@/lib/notifications/vapid"
import { mergePrefs, type OrbitaNotificationPreferences } from "@/lib/notifications/notificationPrefs"

/** Categorías de push alineadas con copy de producto (ver `public/sw.js` tags). */
export type OrvitaPushCategory = "palanca" | "presion_critica" | "energia" | "habitos" | "system"

export type WebPushAction = { action: string; title: string }

export type WebPushPayload = {
  title: string
  body: string
  /** Ruta interna, ej. /finanzas/overview */
  url?: string | null
  notificationId?: string
  /** Ruta `/…` o URL `https://…` para el icono principal del sistema. */
  icon?: string | null
  /** Icono de badge (idealmente simple / monocromo); muchas plataformas lo ignoran. */
  badge?: string | null
  /** Imagen grande opcional (ruta o https), p. ej. hero de la alerta. */
  image?: string | null
  /** Canal lógico para agrupar en el SO (Android) y depuración. */
  category?: OrvitaPushCategory | null
  /** Botones nativos (máx. 2 recomendado; el SW recorta). */
  actions?: WebPushAction[] | null
}

function muteKeyByCategory(category: OrvitaPushCategory | null | undefined): keyof OrbitaNotificationPreferences | null {
  if (category === "palanca") return "mute_until_palanca"
  if (category === "presion_critica") return "mute_until_presion_critica"
  if (category === "energia") return "mute_until_energia"
  if (category === "habitos") return "mute_until_habitos"
  return null
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

  const muteKey = muteKeyByCategory(payload.category ?? "system")
  if (muteKey) {
    const { data: prefRow } = await supabase
      .from("orbita_notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle()
    const prefs = mergePrefs(userId, (prefRow ?? null) as Partial<OrbitaNotificationPreferences> | null)
    const muteRaw = prefs[muteKey]
    if (typeof muteRaw === "string" && muteRaw.trim()) {
      const untilMs = new Date(muteRaw).getTime()
      if (Number.isFinite(untilMs) && untilMs > Date.now()) {
        return { sent: 0, errors: 0 }
      }
    }
  }

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
    icon: payload.icon?.trim() || ORVITA_PUSH_ICON,
    category: payload.category ?? "system",
    ...(payload.actions?.length ? { actions: payload.actions } : {}),
    ...(payload.badge?.trim() ? { badge: payload.badge.trim() } : {}),
    ...(payload.image?.trim() ? { image: payload.image.trim() } : {}),
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
