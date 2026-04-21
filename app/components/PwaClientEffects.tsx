"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { incrementPwaVisitCount } from "@/lib/pwa/visitCounter"
import { captureInstallPromptEvent, isStandaloneDisplayMode } from "@/lib/pwa/installPrompt"
import { registerOrvitaServiceWorker } from "@/lib/notifications/pushClient"
import { registerOrvitaBackgroundSync } from "@/lib/pwa/registerBackgroundSync"

/**
 * Efectos globales PWA: SW, contador de visitas, `beforeinstallprompt`, Background Sync.
 * No renderiza UI (eso va en `InstallPwaCallout`).
 */
export function PwaClientEffects() {
  const pathname = usePathname()

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
