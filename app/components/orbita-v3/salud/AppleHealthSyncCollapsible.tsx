"use client"

import { useCallback, useMemo, useState } from "react"
import { ClipboardCopy, Zap } from "lucide-react"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { buildOrvitaRunShortcutHref } from "@/lib/shortcuts/orvitaHealthShortcut"
import {
  buildAppleHealthSyncChip,
  formatAppleHealthSyncWhen,
  formatAppleHealthSyncWhenShort,
} from "@/lib/salud/appleHealthSyncToolbar"
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
  const [minting, setMinting] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [tokenUntil, setTokenUntil] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const runShortcutHref = useMemo(() => buildOrvitaRunShortcutHref(), [])
  const syncChip = useMemo(() => buildAppleHealthSyncChip(latest), [latest])
  const summarySyncShort = useMemo(() => formatAppleHealthSyncWhenShort(latest?.observed_at), [latest?.observed_at])

  const mintToken = useCallback(async () => {
    setMinting(true)
    setToast(null)
    try {
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/integrations/health/apple/import-token", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ ttlMinutes: 60 * 24 }),
      })
      const payload = (await res.json()) as {
        success?: boolean
        import_token?: string
        expires_at?: string
        error?: string
      }
      if (!res.ok || !payload.success || !payload.import_token) {
        throw new Error(payload.error ?? "No se pudo generar el token")
      }
      setToken(payload.import_token)
      setTokenUntil(payload.expires_at ?? null)
      setToast("Token listo: cópialo y pégalo en el Atajo cuando te lo pida.")
    } catch (e) {
      setToast(e instanceof Error ? e.message : "No se pudo generar el token")
    } finally {
      setMinting(false)
    }
  }, [])

  const copyToken = useCallback(async () => {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      setToast("Token copiado al portapapeles.")
    } catch {
      setToast("No se pudo copiar automáticamente; selecciona el token a mano.")
    }
  }, [token])

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
          <button
            type="button"
            onClick={mintToken}
            disabled={minting}
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border px-2.5 text-[11px] font-medium transition active:scale-[0.99] disabled:opacity-50 sm:px-3 sm:text-xs"
            style={{
              borderColor: saludHexToRgba(theme.border, 0.85),
              backgroundColor: "transparent",
              color: theme.text,
            }}
          >
            {minting ? "Token…" : "Token atajo"}
          </button>
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

        {toast ? (
          <p
            className="border-l-[3px] py-1.5 pl-2.5 text-[11px] leading-snug sm:text-xs"
            style={{ borderLeftColor: SALUD_SEM.warn, color: theme.text }}
          >
            {toast}
          </p>
        ) : null}

        {token ? (
          <div className="space-y-2 rounded-xl p-3" style={{ backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.75) }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: theme.textMuted }}>
                Token (no lo compartas)
              </span>
              <button
                type="button"
                onClick={copyToken}
                className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold"
                style={{ borderColor: theme.border, color: theme.text }}
              >
                <ClipboardCopy className="h-3 w-3" aria-hidden />
                Copiar
              </button>
            </div>
            <p className="m-0 break-all font-mono text-[11px] leading-relaxed" style={{ color: SALUD_SEM.ok }}>
              {token}
            </p>
            {tokenUntil ? (
              <p className="m-0 text-[10px]" style={{ color: theme.textMuted }}>
                Válido hasta {formatAppleHealthSyncWhen(tokenUntil)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </details>
  )
}
