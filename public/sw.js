/* eslint-disable no-restricted-globals */
/* Service Worker mínimo: Web Push + clic abre la app (Safari iOS requiere PWA en pantalla de inicio). */
/** Alineado con `lib/notifications/pushBranding.ts` (payload del servidor suele traer estos valores). */
const DEFAULT_PUSH_ICON = "/brand/orvita-logo-on-dark-bg.png"
const DEFAULT_PUSH_BADGE = "/brand/orvita-logo-on-dark-bg.png"

function pickAssetUrl(value, fallback) {
  if (typeof value !== "string") return fallback
  const v = value.trim()
  if (!v) return fallback
  if (v.startsWith("/")) return v
  if (v.startsWith("https://")) return v
  return fallback
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
  const icon = pickAssetUrl(payload.icon, DEFAULT_PUSH_ICON)
  const badge = pickAssetUrl(payload.badge, DEFAULT_PUSH_BADGE)
  const imageUrl = pickAssetUrl(payload.image, null)

  const options = {
    body: payload.body || "",
    icon,
    badge,
    tag: payload.notificationId ? `orvita-${payload.notificationId}` : "orvita-generic",
    data: { url, notificationId: payload.notificationId },
    lang: "es",
    dir: "ltr",
    timestamp: Date.now(),
  }

  if (imageUrl) options.image = imageUrl

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
