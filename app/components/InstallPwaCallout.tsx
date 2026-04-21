"use client"

import { useEffect, useState } from "react"
import { Download } from "lucide-react"
import {
  getDeferredInstallPrompt,
  isCoarsePointerMobile,
  isStandaloneDisplayMode,
  runDeferredInstallPrompt,
  subscribeInstallPrompt,
} from "@/lib/pwa/installPrompt"
import { getPwaVisitCount } from "@/lib/pwa/visitCounter"
import { usePathname } from "next/navigation"

/**
 * CTA flotante “Instalar Órvita”: solo si hay prompt nativo, no está en standalone,
 * y (≥2 visitas o móvil táctil).
 */
export function InstallPwaCallout() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [busy, setBusy] = useState(false)

  const recompute = () => {
    if (pathname.startsWith("/auth")) {
      setVisible(false)
      return
    }
    if (isStandaloneDisplayMode()) {
      setVisible(false)
      return
    }
    const visits = getPwaVisitCount()
    const mobile = isCoarsePointerMobile()
    const hasPrompt = !!getDeferredInstallPrompt()
    setVisible(hasPrompt && (visits >= 2 || mobile))
  }

  useEffect(() => {
    recompute()
    return subscribeInstallPrompt(recompute)
  }, [pathname])

  if (!visible) return null

  return (
    <div
      className="fixed left-[max(0.75rem,env(safe-area-inset-left))] right-[max(0.75rem,env(safe-area-inset-right))] z-[90] max-w-lg mx-auto"
      style={{ bottom: "calc(5.25rem + env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,#000)] px-3 py-2.5 shadow-lg backdrop-blur-md">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-accent-primary)_18%,transparent)] text-[var(--color-accent-primary)]">
          <Download className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--color-text-primary)]">Instalar Órvita</p>
          <p className="text-xs leading-snug text-[var(--color-text-secondary)]">
            Acceso desde pantalla de inicio, pantalla completa y mejor rendimiento offline.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setBusy(true)
            void runDeferredInstallPrompt().finally(() => {
              setBusy(false)
              recompute()
            })
          }}
          className="shrink-0 rounded-xl bg-[var(--color-text-primary)] px-3 py-2 text-xs font-semibold text-[var(--color-background)] disabled:opacity-50"
        >
          {busy ? "…" : "Instalar"}
        </button>
      </div>
    </div>
  )
}
