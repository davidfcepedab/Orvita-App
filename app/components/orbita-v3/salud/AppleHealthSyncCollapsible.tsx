"use client"

import { useMemo } from "react"
import Link from "next/link"
import { Zap } from "lucide-react"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import { buildOrvitaRunShortcutHref } from "@/lib/shortcuts/orvitaHealthShortcut"
import { buildAppleHealthSyncChip, formatAppleHealthSyncWhenShortFromMetric } from "@/lib/salud/appleHealthSyncToolbar"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"
import { saludHexToRgba, saludPanelStyle } from "@/lib/salud/saludThemeStyles"

type Props = {
  onRefresh: () => Promise<void>
  /** Misma lectura que el hero Apple; alinea chip de sync con AppleHealthLuxurySection. */
  latest?: AutoHealthMetric | null
}

export function AppleHealthSyncCollapsible({ onRefresh, latest = null }: Props) {
  const theme = useOrbitaSkin()
  const panel = useMemo(() => saludPanelStyle(theme, 0.92), [theme])
  const runShortcutHref = useMemo(() => buildOrvitaRunShortcutHref(), [])
  const syncChip = useMemo(() => buildAppleHealthSyncChip(latest), [latest])
  const summarySyncShort = useMemo(() => formatAppleHealthSyncWhenShortFromMetric(latest), [latest])

  return (
    <details
      className="rounded-xl border text-left"
      style={{ borderColor: theme.border, ...panel, boxShadow: "none" }}
    >
      <summary
        className="cursor-pointer list-none px-3 py-2.5 text-xs font-semibold marker:hidden [&::-webkit-details-marker]:hidden"
        style={{ color: theme.textMuted }}
      >
        <span className="sm:hidden">Apple Health · {summarySyncShort}</span>
        <span className="hidden sm:inline">Apple Health · sync y atajo</span>
      </summary>
      <div className="space-y-3 border-t px-3 py-3" style={{ borderColor: saludHexToRgba(theme.border, 0.65) }}>
        <div
          className="flex flex-wrap items-center gap-2"
          role="toolbar"
          aria-label="Acciones Apple Health (compacto)"
        >
          <span
            className="inline-flex max-w-full min-w-0 items-center gap-2 rounded-full px-2.5 py-1.5 text-[10px] font-semibold leading-snug sm:text-[11px] sm:max-w-[min(100%,20rem)]"
            style={{ backgroundColor: syncChip.bg, color: syncChip.fg }}
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-90" aria-hidden />
            {syncChip.label}
          </span>
          <Link
            href="/configuracion#apple-health-import-token"
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border px-2.5 text-[11px] font-medium no-underline transition active:scale-[0.99] sm:px-3 sm:text-xs"
            style={{
              borderColor: saludHexToRgba(theme.border, 0.85),
              backgroundColor: "transparent",
              color: theme.text,
            }}
          >
            Token en Configuración
          </Link>
          <a
            href={runShortcutHref}
            className="inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 text-[11px] font-semibold text-white no-underline transition active:scale-[0.99] sm:gap-2 sm:text-xs"
            style={{ backgroundColor: SALUD_SEM.energy }}
          >
            <Zap className="h-3.5 w-3.5 shrink-0 opacity-95 sm:h-4 sm:w-4" aria-hidden />
            Traer hoy
          </a>
          <button
            type="button"
            onClick={() => void onRefresh()}
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg px-2.5 text-[11px] font-medium transition active:scale-[0.99] sm:px-3 sm:text-xs"
            style={{
              border: `1px solid ${saludHexToRgba(theme.border, 0.75)}`,
              backgroundColor: "transparent",
              color: theme.textMuted,
            }}
          >
            Actualizar
          </button>
        </div>
        <p className="m-0 text-[10px] leading-snug" style={{ color: theme.textMuted }}>
          El token se gestiona en Configuración; aquí solo lanzas el atajo o refrescas la lectura.
        </p>
      </div>
    </details>
  )
}
