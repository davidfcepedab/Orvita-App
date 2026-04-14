/* eslint-disable no-restricted-globals */
/* Service Worker mínimo: Web Push + clic abre la app (Safari iOS requiere PWA en pantalla de inicio). */
self.addEventListener("push", (event) => {
  let payload = { title: "Órvita", body: "", url: "/", notificationId: null }
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

  event.waitUntil(
    self.registration.showNotification(payload.title || "Órvita", {
      body: payload.body || "",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: payload.notificationId ? `orvita-${payload.notificationId}` : "orvita-generic",
      data: { url, notificationId: payload.notificationId },
    }),
  )
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
