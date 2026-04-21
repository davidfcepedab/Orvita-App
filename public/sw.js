/* eslint-disable no-restricted-globals */
/**
 * Service Worker Órvita — Web Push, caché selectiva y offline.
 *
 * Privacidad: no cacheamos respuestas `/api/*` ni rutas con datos de sesión en RSC;
 * solo shell offline, manifest, marca e hojas estáticas de Next (`/_next/static`).
 *
 * Estrategias:
 * - Navegación HTML: red primero; si falla → `/offline.html`.
 * - `/_next/static/*`: cache-first (versionado por hash de build).
 * - `/brand/*`, `/pwa/*`, `/manifest.json`, `/offline.html`: stale-while-revalidate.
 * - Background Sync: etiqueta `orvita-habits` — avisa a clientes para reintentar cuando vuelva la red.
 */
/** @type {string} Bump al cambiar lógica de caché */
const CACHE_VERSION = "orvita-v3-2026-04-20"
const CACHE_ASSETS = `${CACHE_VERSION}-assets`
const CACHE_SHELL = `${CACHE_VERSION}-shell`

/** Alineado con `lib/notifications/pushBranding.ts` */
const DEFAULT_PUSH_ICON = "/brand/orvita-push-icon-192.png"

const PRECACHE_URLS = ["/offline.html", "/manifest.json", "/pwa/icon-192.png", "/pwa/icon-512.png"]

function pickAssetUrl(value, fallback) {
  if (typeof value !== "string") return fallback
  const v = value.trim()
  if (!v) return fallback
  if (v.startsWith("/")) return v
  if (v.startsWith("https://")) return v
  return fallback
}

function toAbsoluteNotificationAsset(urlPath) {
  if (typeof urlPath !== "string" || !urlPath.trim()) return undefined
  const v = urlPath.trim()
  if (v.startsWith("https://") || v.startsWith("http://")) return v
  if (v.startsWith("/")) return `${self.location.origin}${v}`
  return `${self.location.origin}/${v.replace(/^\//, "")}`
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_SHELL)
      await cache.addAll(PRECACHE_URLS).catch(() => {
        /* precache best-effort: no bloquea activación */
      })
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      const keep = new Set([CACHE_ASSETS, CACHE_SHELL])
      await Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener("fetch", (ev) => {
  const request = ev.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  /**
   * Navegación top-level: red primero (no guardamos HTML personalizado por privacidad / RSC).
   * Si falla la red → página offline estática.
   */
  if (request.mode === "navigate") {
    ev.respondWith(
      (async () => {
        try {
          return await fetch(request)
        } catch {
          const offline = await caches.match("/offline.html")
          if (offline) return offline
          return new Response("Sin conexión", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } })
        }
      })(),
    )
    return
  }

  /** JS/CSS chunks versionados de Next */
  if (url.pathname.startsWith("/_next/static/")) {
    ev.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_ASSETS)
        const hit = await cache.match(request)
        if (hit) return hit
        try {
          const res = await fetch(request)
          if (res.ok) cache.put(request, res.clone())
          return res
        } catch {
          return Response.error()
        }
      })(),
    )
    return
  }

  /** Imágenes de marca + iconos PWA + manifest + shell offline */
  if (
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/pwa/") ||
    url.pathname === "/manifest.json" ||
    url.pathname === "/offline.html"
  ) {
    ev.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_SHELL)
        const cached = await cache.match(request)
        const netP = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone())
            return response
          })
          .catch(() => null)
        if (cached) {
          ev.waitUntil(netP)
          return cached
        }
        const n = await netP
        if (n) return n
        return cached || Response.error()
      })(),
    )
  }
})

self.addEventListener("sync", (event) => {
  if (event.tag === "orvita-habits" || event.tag === "orvita-notifications") {
    event.waitUntil(
      self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
        for (const c of clients) {
          try {
            c.postMessage({ type: "ORVITA_BG_SYNC", tag: event.tag })
          } catch {
            /* ignore */
          }
        }
      }),
    )
  }
})

self.addEventListener("push", (ev) => {
  let payload = {
    title: "Órvita",
    body: "",
    url: "/",
    notificationId: null,
    icon: null,
    badge: null,
    image: null,
    category: "system",
    actions: null,
  }
  try {
    if (ev.data) {
      payload = { ...payload, ...ev.data.json() }
    }
  } catch {
    try {
      payload.body = ev.data ? ev.data.text() : ""
    } catch {
      /* ignore */
    }
  }

  const url = typeof payload.url === "string" && payload.url.startsWith("/") ? payload.url : "/"
  const iconRel = pickAssetUrl(payload.icon, DEFAULT_PUSH_ICON)
  const iconAbs = toAbsoluteNotificationAsset(iconRel)

  /** @type {NotificationOptions} */
  const options = {
    body: payload.body || "",
    tag: payload.notificationId ? `orvita-${payload.notificationId}` : `orvita-cat-${payload.category || "generic"}`,
    data: { url, notificationId: payload.notificationId, category: payload.category || "system" },
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

  if (Array.isArray(payload.actions) && payload.actions.length) {
    options.actions = payload.actions
      .filter((a) => a && typeof a.action === "string" && typeof a.title === "string")
      .slice(0, 2)
      .map((a) => ({ action: a.action, title: a.title }))
  }

  ev.waitUntil(self.registration.showNotification(payload.title || "Órvita", options))
})

function resolveUrlFromAction(action, fallbackUrl) {
  if (action === "capital" || action === "finanzas") return "/finanzas"
  if (action === "habitos") return "/habitos"
  if (action === "agenda") return "/agenda"
  if (action === "hoy") return "/hoy"
  if (action === "ai" || action === "resolver_ia") return "/hoy"
  return fallbackUrl
}

self.addEventListener("notificationclick", (ev) => {
  ev.notification.close()
  const raw = ev.notification.data && ev.notification.data.url ? ev.notification.data.url : "/"
  const origin = self.location.origin
  const action = ev.action

  let path = raw.startsWith("http") ? raw : `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`
  if (action) {
    const mapped = resolveUrlFromAction(action, raw.startsWith("/") ? raw : "/")
    path = mapped.startsWith("http") ? mapped : `${origin}${mapped.startsWith("/") ? mapped : `/${mapped}`}`
  }

  ev.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const c of clientList) {
        if (c.url.startsWith(origin) && "focus" in c) return c.focus()
      }
      if (self.clients.openWindow) return self.clients.openWindow(path)
    }),
  )
})
