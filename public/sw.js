/* eslint-disable no-restricted-globals */
/* Service Worker mínimo: Web Push + clic abre la app (Safari iOS requiere PWA en pantalla de inicio). */
/** Alineado con `lib/notifications/pushBranding.ts` */
const DEFAULT_PUSH_ICON = "/brand/orvita-push-icon-192.png"

function pickAssetUrl(value, fallback) {
  if (typeof value !== "string") return fallback
  const v = value.trim()
  if (!v) return fallback
  if (v.startsWith("/")) return v
  if (v.startsWith("https://")) return v
  return fallback
}

/** WebKit suele resolver mal rutas relativas en `showNotification`; forzar mismo origen. */
function toAbsoluteNotificationAsset(urlPath) {
  if (typeof urlPath !== "string" || !urlPath.trim()) return undefined
  const v = urlPath.trim()
  if (v.startsWith("https://") || v.startsWith("http://")) return v
  if (v.startsWith("/")) return `${self.location.origin}${v}`
  return `${self.location.origin}/${v.replace(/^\//, "")}`
}

self.addEventListener("push", (event) => {
  let payload = { title: "Órvita", body: "", url: "/", notificationId: null, icon: null, badge: null, image: null }
  try {
    if (event.data) {
      payload = { ...payload, ...event.data.json() }
    }
  } catch {
    try {
      payload.body = event.data ? event.data.text() : ""
    } catch {
      /* ignore */
    }
  }

  const url = typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/"
  const iconRel = pickAssetUrl(payload.icon, DEFAULT_PUSH_ICON)
  const iconAbs = toAbsoluteNotificationAsset(iconRel)

  const options = {
    body: payload.body || "",
    tag: payload.notificationId ? `orvita-${payload.notificationId}` : "orvita-generic",
    data: { url, notificationId: payload.notificationId },
    lang: "es",
    dir: "ltr",
    timestamp: Date.now(),
  }

  if (iconAbs) options.icon = iconAbs

  const badgeRel = typeof payload.badge === "string" && payload.badge.trim() ? pickAssetUrl(payload.badge, null) : null
  const badgeAbs = badgeRel ? toAbsoluteNotificationAsset(badgeRel) : null
  if (badgeAbs) options.badge = badgeAbs

  const imageRel =
    typeof payload.image === "string" && payload.image.trim() ? pickAssetUrl(payload.image, null) : null
  const imageAbs = imageRel ? toAbsoluteNotificationAsset(imageRel) : null
  if (imageAbs) options.image = imageAbs

  event.waitUntil(self.registration.showNotification(payload.title || "Órvita", options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/"
  const origin = self.location.origin
  const target = url.startsWith("http") ? url : `${origin}${url.startsWith("/") ? url : `/${url}`}`

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if (c.url.startsWith(origin) && "focus" in c) return c.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(target)
    }),
  )
})
