"use client"

import { useEffect, useState } from "react"
import { Download, Smartphone } from "lucide-react"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"
import {
  getDeferredInstallPrompt,
  isStandaloneDisplayMode,
  runDeferredInstallPrompt,
  subscribeInstallPrompt,
} from "@/lib/pwa/installPrompt"

/** Configuración → Instalar como app (usa el evento `beforeinstallprompt` capturado globalmente). */
export function ConfigPwaInstallPanel({ theme }: { theme: OrbitaConfigTheme }) {
  const [hasPrompt, setHasPrompt] = useState(false)
  const [standalone, setStandalone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  useEffect(() => {
    setStandalone(isStandaloneDisplayMode())
    const sync = () => setHasPrompt(!!getDeferredInstallPrompt())
    sync()
    return subscribeInstallPrompt(sync)
  }, [])

  return (
    <section
      className="rounded-2xl border p-4 sm:p-5"
      style={{ borderColor: theme.border, backgroundColor: theme.surface }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: theme.surfaceAlt, color: theme.accent.agenda }}
        >
          <Smartphone className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Instalar como app (PWA)
          </h3>
          <p className="text-[11px] leading-relaxed sm:text-xs" style={{ color: theme.textMuted }}>
            En Chrome/Edge/Android verás el aviso del sistema; aquí puedes repetir la instalación cuando quieras.
            En Safari iOS: Compartir → «Añadir a pantalla de inicio».
          </p>
        </div>
      </div>

      {standalone ? (
        <p className="mt-3 text-xs font-medium" style={{ color: theme.accent.health }}>
          Ya estás en modo app instalada.
        </p>
      ) : (
        <button
          type="button"
          disabled={busy || !hasPrompt}
          onClick={() => {
            setMsg(null)
            setBusy(true)
            void runDeferredInstallPrompt().then((r) => {
              setBusy(false)
              if (r.outcome === "accepted") setMsg("Instalación aceptada.")
              else if (r.outcome === "dismissed") setMsg("Instalación cancelada.")
              else setMsg("Tu navegador no ofreció instalación PWA todavía (prueba desde Chrome o vuelve tras visitar la app).")
            })
          }}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: theme.accent.health }}
        >
          <Download className="h-4 w-4" aria-hidden />
          {hasPrompt ? "Instalar Órvita" : "Instalación no disponible aún"}
        </button>
      )}

      {msg ? (
        <p className="mt-2 text-xs" style={{ color: theme.textMuted }}>
          {msg}
        </p>
      ) : null}
    </section>
  )
}
