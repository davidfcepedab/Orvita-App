"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { incrementPwaVisitCount } from "@/lib/pwa/visitCounter"
import { captureInstallPromptEvent, isStandaloneDisplayMode } from "@/lib/pwa/installPrompt"
import { registerOrvitaServiceWorker } from "@/lib/notifications/pushClient"
import { registerOrvitaBackgroundSync } from "@/lib/pwa/registerBackgroundSync"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { saveOfflineCheckinSnapshot } from "@/lib/pwa/offlineSnapshot"

function inferOfflineSnapshotFromCheckinList(rows: unknown[]) {
  const latest = rows[0] as
    | {
        updated_at?: string
        created_at?: string
        score_global?: number | null
        score_fisico?: number | null
        score_profesional?: number | null
      }
    | undefined
  if (!latest) return null
  const global = typeof latest.score_global === "number" ? latest.score_global : null
  const fisico = typeof latest.score_fisico === "number" ? latest.score_fisico : null
  const prof = typeof latest.score_profesional === "number" ? latest.score_profesional : null
  const parts = [
    global != null ? `Score global ${global.toFixed(1)}/10` : null,
    fisico != null ? `Físico ${fisico.toFixed(1)}/10` : null,
    prof != null ? `Profesional ${prof.toFixed(1)}/10` : null,
  ].filter(Boolean)
  return {
    savedAt: latest.updated_at || latest.created_at || new Date().toISOString(),
    flowSummary: parts.length ? parts.join(" · ") : "Último check-in sincronizado",
    palanca1:
      global != null && global < 6
        ? "Palanca #1: cerrar brecha de score global con una acción concreta en /hoy."
        : "Palanca #1: mantener consistencia y revisar Capital/Hábitos al reconectar.",
  }
}

/**
 * Efectos globales PWA: SW, contador de visitas, `beforeinstallprompt`, Background Sync.
 * No renderiza UI (eso va en `InstallPwaCallout`).
 */
export function PwaClientEffects() {
  const pathname = usePathname()

  useEffect(() => {
    const refetchAfterReconnect = async () => {
      try {
        const headers = await browserBearerHeaders(false)
        const [habitsRes, checkinsRes] = await Promise.all([
          fetch("/api/habits", { cache: "no-store", headers }),
          fetch("/api/checkins", { cache: "no-store", headers }),
        ])
        if (habitsRes.ok) {
          window.dispatchEvent(new CustomEvent("orvita:bg-sync", { detail: { tag: "orvita-habits", source: "online" } }))
        }
        if (checkinsRes.ok) {
          const j = (await checkinsRes.json().catch(() => ({}))) as { data?: unknown[] }
          const snapshot = inferOfflineSnapshotFromCheckinList(Array.isArray(j.data) ? j.data : [])
          if (snapshot) saveOfflineCheckinSnapshot(snapshot)
        }
      } catch {
        /* ignore en reconexión */
      }
    }

    const onOnline = () => {
      void refetchAfterReconnect()
    }
    const onBgSync = () => {
      void refetchAfterReconnect()
    }
    window.addEventListener("online", onOnline)
    window.addEventListener("orvita:bg-sync", onBgSync as EventListener)
    return () => {
      window.removeEventListener("online", onOnline)
      window.removeEventListener("orvita:bg-sync", onBgSync as EventListener)
    }
  }, [])

  useEffect(() => {
    if (pathname.startsWith("/auth")) return
    void registerOrvitaServiceWorker().then((reg) => {
      void registerOrvitaBackgroundSync(reg)
    })
  }, [pathname])

  useEffect(() => {
    if (pathname.startsWith("/auth")) return
    incrementPwaVisitCount()
  }, [pathname])

  useEffect(() => {
    if (typeof window === "undefined") return
    if (isStandaloneDisplayMode()) return
    const onBip = (e: Event) => captureInstallPromptEvent(e)
    window.addEventListener("beforeinstallprompt", onBip)
    return () => window.removeEventListener("beforeinstallprompt", onBip)
  }, [])

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return
    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type === "ORVITA_BG_SYNC") {
        /** Las pantallas pueden escuchar y refrescar datos (p. ej. hábitos). */
        window.dispatchEvent(new CustomEvent("orvita:bg-sync", { detail: ev.data }))
      }
    }
    navigator.serviceWorker.addEventListener("message", onMsg)
    return () => navigator.serviceWorker.removeEventListener("message", onMsg)
  }, [])

  /** Prefetch de rutas críticas (App Router: inserta <link> en documento). */
  useEffect(() => {
    if (typeof document === "undefined") return
    const hrefs = ["/inicio", "/hoy"]
    const links: HTMLLinkElement[] = []
    for (const href of hrefs) {
      const el = document.createElement("link")
      el.rel = "prefetch"
      el.href = href
      document.head.appendChild(el)
      links.push(el)
    }
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (supabaseUrl) {
      try {
        const origin = new URL(supabaseUrl).origin
        const pre = document.createElement("link")
        pre.rel = "preconnect"
        pre.href = origin
        pre.crossOrigin = "anonymous"
        document.head.appendChild(pre)
        links.push(pre)
      } catch {
        /* ignore */
      }
    }
    return () => {
      for (const el of links) el.remove()
    }
  }, [])

  return null
}
