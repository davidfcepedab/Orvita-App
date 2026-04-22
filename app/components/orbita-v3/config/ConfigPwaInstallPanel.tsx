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
export function ConfigPwaInstallPanel({
  theme,
  moduleCard,
}: {
  theme: OrbitaConfigTheme
  /** Dentro de ConfigSettingsSection en modo tarjeta: sin segundo borde exterior. */
  moduleCard?: boolean
}) {
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
      className={moduleCard ? "px-4 py-3.5 sm:px-5 sm:py-4" : "rounded-2xl border p-4 sm:p-5"}
      style={moduleCard ? undefined : { borderColor: theme.border, backgroundColor: theme.surface }}
    >
      <div className="flex items-start gap-3 sm:gap-3.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10"
          style={{ backgroundColor: theme.surfaceAlt, color: theme.accent.agenda }}
        >
          <Smartphone className="h-[1.1rem] w-[1.1rem] sm:h-5 sm:w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-semibold leading-snug" style={{ color: theme.text }}>
            Instalar como app (PWA)
          </h3>
          <p className="text-[11px] leading-relaxed sm:text-xs" style={{ color: theme.textMuted }}>
            En Chrome/Edge/Android verás el aviso del sistema; aquí puedes repetir la instalación cuando quieras.
            En Safari iOS: Compartir → «Añadir a pantalla de inicio».
          </p>
        </div>
      </div>

      {standalone ? (
        <p className="mt-2.5 text-xs font-medium" style={{ color: theme.accent.health }}>
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
          className="mt-3 inline-flex w-full max-w-md items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50 sm:py-2.5"
          style={{ backgroundColor: theme.accent.health, borderColor: "transparent" }}
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
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
