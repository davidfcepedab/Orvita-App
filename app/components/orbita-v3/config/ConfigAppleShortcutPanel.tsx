"use client"

import { useCallback, useEffect, useState } from "react"
import { Apple, ClipboardCopy, Download } from "lucide-react"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"

/** Enlaces iCloud compartidos (instalación en iPhone vía Safari / Atajos). */
const ORVITA_ICLOUD_SALUD_DIA_A_DIA =
  "https://www.icloud.com/shortcuts/c57c15636ad2460da779424b4092c914" as const
const ORVITA_ICLOUD_SALUD_HOY = ORVITA_ICLOUD_SALUD_DIA_A_DIA

const INSTRUCCIONES = "/shortcuts/ATALJO-Salud-instrucciones.txt"

type Props = {
  theme: OrbitaConfigTheme
  moduleCard?: boolean
}

type TokenStatus = "none" | "active" | "revoked"

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
  } catch {
    return iso
  }
}

export function ConfigAppleShortcutPanel({ theme, moduleCard }: Props) {
  const [minting, setMinting] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [status, setStatus] = useState<TokenStatus>("none")
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [usedAt, setUsedAt] = useState<string | null>(null)
  const [plainOnce, setPlainOnce] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const loadStatus = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoadingStatus(true)
    if (!opts?.silent) setToast(null)
    try {
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/integrations/health/apple/import-token", { headers })
      const payload = (await res.json()) as {
        success?: boolean
        status?: TokenStatus
        created_at?: string
        used_at?: string | null
        error?: string
      }
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "No se pudo cargar el estado")
      setStatus(payload.status ?? "none")
      setCreatedAt(payload.created_at ?? null)
      setUsedAt(payload.used_at ?? null)
    } catch (e) {
      if (!opts?.silent) setToast(e instanceof Error ? e.message : "Error al cargar el token")
    } finally {
      if (!opts?.silent) setLoadingStatus(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const mintOrRegenerate = useCallback(async () => {
    setMinting(true)
    setToast(null)
    try {
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/integrations/health/apple/import-token", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const payload = (await res.json()) as {
        success?: boolean
        import_token?: string
        created_at?: string
        error?: string
      }
      if (!res.ok || !payload.success || !payload.import_token) {
        throw new Error(payload.error ?? "No se pudo generar el token")
      }
      setPlainOnce(payload.import_token)
      setStatus("active")
      setCreatedAt(payload.created_at ?? null)
      setUsedAt(null)
      setToast("Copia y guarda esta clave ahora: solo la mostramos entera una vez.")
      await loadStatus({ silent: true })
    } catch (e) {
      setToast(e instanceof Error ? e.message : "No se pudo generar el token")
    } finally {
      setMinting(false)
    }
  }, [loadStatus])

  const revoke = useCallback(async () => {
    setRevoking(true)
    setToast(null)
    try {
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/integrations/health/apple/import-token", {
        method: "DELETE",
        headers,
      })
      const payload = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "No se pudo revocar")
      setPlainOnce(null)
      setToast("Clave desactivada. Genera otra cuando quieras volver a importar.")
      await loadStatus({ silent: true })
    } catch (e) {
      setToast(e instanceof Error ? e.message : "No se pudo revocar")
    } finally {
      setRevoking(false)
    }
  }, [loadStatus])

  const copyToken = useCallback(async () => {
    if (!plainOnce) return
    try {
      await navigator.clipboard.writeText(plainOnce)
      setToast("Copiado al portapapeles.")
    } catch {
      setToast("Cópialo seleccionando el texto a mano.")
    }
  }, [plainOnce])

  const statusLabel =
    status === "active"
      ? "Clave lista para el iPhone"
      : status === "revoked"
        ? "Clave desactivada"
        : "Aún sin clave"

  const downloadLinkClass = moduleCard
    ? "inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-medium no-underline transition hover:opacity-90 sm:w-auto"
    : "inline-flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium no-underline transition hover:opacity-90 sm:w-auto"

  return (
    <div
      className={moduleCard ? "space-y-0 divide-y" : "space-y-4"}
      style={moduleCard ? { borderColor: theme.border } : undefined}
    >
      <div
        className={moduleCard ? "pb-3 pt-0" : "rounded-2xl border p-4 sm:p-5"}
        style={moduleCard ? undefined : { borderColor: theme.border, backgroundColor: theme.surfaceAlt }}
      >
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10"
            style={{ backgroundColor: theme.surface, color: theme.accent.health }}
          >
            <Apple className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-semibold" style={{ color: theme.text }}>
              Atajo de Salud (iPhone)
            </p>
            <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              Abre cada enlace en <strong className="font-medium text-inherit">Safari</strong> en el iPhone, instala y pega la clave cuando el atajo la
              pida. Si falla, borra el atajo duplicado («2») en Atajos y vuelve a instalar.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <a
            href={ORVITA_ICLOUD_SALUD_DIA_A_DIA}
            target="_blank"
            rel="noopener noreferrer"
            className={downloadLinkClass}
            style={{
              borderColor: theme.border,
              color: theme.text,
              backgroundColor: theme.surface,
            }}
          >
            <Download className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            ÓRVITA Salud Día a Día
          </a>
          <a
            href={ORVITA_ICLOUD_SALUD_HOY}
            target="_blank"
            rel="noopener noreferrer"
            className={downloadLinkClass}
            style={{
              borderColor: theme.border,
              color: theme.text,
              backgroundColor: theme.surface,
            }}
          >
            <Download className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            ÓRVITA Salud Hoy
          </a>
        </div>

        <p className="mt-2.5 text-[10px] leading-snug sm:text-[11px]" style={{ color: theme.textMuted }}>
          <a
            href={INSTRUCCIONES}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline-offset-2 hover:underline"
            style={{ color: theme.accent.health }}
          >
            Instrucciones detalladas (txt)
          </a>
        </p>
      </div>

      <div
        id="apple-health-import-token"
        className={moduleCard ? "pt-3" : "rounded-2xl border p-4 sm:p-5"}
        style={moduleCard ? undefined : { borderColor: theme.border, backgroundColor: theme.surface }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
          Clave para tu iPhone
        </p>
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
          Créala aquí y pégala una vez en el atajo. Regenerar o revocar invalida la anterior.
        </p>
        <p className="mt-2 text-sm font-medium" style={{ color: theme.text }}>
          {loadingStatus ? "Cargando…" : statusLabel}
        </p>
        {!loadingStatus && status === "active" && createdAt ? (
          <p className="mt-1 text-[11px]" style={{ color: theme.textMuted }}>
            Creado {formatWhen(createdAt)}
            {usedAt ? ` · Último uso ${formatWhen(usedAt)}` : ""}
          </p>
        ) : null}

        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void mintOrRegenerate()}
            disabled={minting || loadingStatus}
            className="rounded-md border px-3 py-1.5 text-[11px] font-medium transition hover:opacity-90 disabled:opacity-50"
            style={{
              borderColor: theme.border,
              color: theme.textMuted,
              backgroundColor: theme.surfaceAlt,
            }}
          >
            {minting ? "Generando…" : status === "active" ? "Generar otra clave" : "Crear clave"}
          </button>
          {status === "active" ? (
            <button
              type="button"
              onClick={() => void revoke()}
              disabled={revoking || loadingStatus}
              className="rounded-md px-2 py-1 text-[10px] font-medium text-[var(--color-text-secondary)] underline-offset-2 transition hover:underline disabled:opacity-50"
            >
              {revoking ? "Desactivando…" : "Desactivar"}
            </button>
          ) : null}
          {plainOnce ? (
            <button
              type="button"
              onClick={() => void copyToken()}
              className="inline-flex items-center gap-1.5 rounded-md border-2 border-amber-500/70 bg-amber-400/20 px-3 py-1.5 text-[11px] font-semibold text-amber-950 shadow-sm transition hover:bg-amber-400/35 dark:border-amber-400/60 dark:bg-amber-500/15 dark:text-amber-50 dark:hover:bg-amber-500/25"
            >
              <ClipboardCopy className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Copiar clave
            </button>
          ) : null}
        </div>

        {toast ? (
          <p className="mt-3 text-xs leading-relaxed" style={{ color: theme.text }}>
            {toast}
          </p>
        ) : null}
        {plainOnce ? (
          <div className="mt-3 space-y-2 rounded-lg border p-3" style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}>
            <p className="break-all font-mono text-[12px] leading-relaxed" style={{ color: theme.text }}>
              {plainOnce}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  )
}
