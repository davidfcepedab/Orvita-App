"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Apple, ClipboardCopy, Download, LayoutGrid, Play, Sparkles, Zap } from "lucide-react"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"
import { isStandaloneDisplayMode } from "@/lib/pwa/installPrompt"
import {
  buildOrvitaRunShortcutHref,
  buildOrvitaShortcutImportHref,
  buildOrvitaShortcutImportHrefXCallback,
  getOrvitaHealthHistorial15ShortcutDownloadFileUrl,
  getOrvitaHealthShortcutDownloadFileUrl,
  getOrvitaHealthShortcutFileUrl,
  getOrvitaHealthShortcutIcloudUrl,
  isOrvitaShortcutImportFromHttpDev,
  ORVITA_HEALTH_SHORTCUT_NAME,
} from "@/lib/shortcuts/orvitaHealthShortcut"

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

const subtleCta =
  "min-h-9 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition hover:opacity-90 sm:inline-flex"
const strongCta =
  "min-h-9 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:opacity-95 sm:inline-flex"
const chipCta =
  "inline-flex min-h-8 w-full sm:w-auto items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition hover:opacity-90"
const chipStrongCta =
  "inline-flex min-h-8 w-full sm:w-auto items-center justify-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition hover:opacity-95"

export function ConfigAppleShortcutPanel({ theme, moduleCard }: Props) {
  const [minting, setMinting] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState(true)
  const [status, setStatus] = useState<TokenStatus>("none")
  const [createdAt, setCreatedAt] = useState<string | null>(null)
  const [usedAt, setUsedAt] = useState<string | null>(null)
  const [plainOnce, setPlainOnce] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)

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

  useEffect(() => {
    if (typeof document === "undefined") return
    if (guideOpen) {
      const prev = document.body.style.overflow
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = prev
      }
    }
  }, [guideOpen])

  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false
    return /iPad|iPhone|iPod/i.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  }, [])

  const [isPwaStandalone, setIsPwaStandalone] = useState(false)
  useEffect(() => {
    setIsPwaStandalone(isStandaloneDisplayMode())
  }, [])

  const { shortcutInstallHref, shortcutInstallHrefAlt, runShortcutHref, fileUrl, historialFileUrl, instructionsUrl, icloudUrl } =
    useMemo(() => {
      return {
        fileUrl: getOrvitaHealthShortcutDownloadFileUrl(),
        historialFileUrl: getOrvitaHealthHistorial15ShortcutDownloadFileUrl(),
        instructionsUrl: INSTRUCCIONES,
        icloudUrl: getOrvitaHealthShortcutIcloudUrl(),
        shortcutInstallHref: buildOrvitaShortcutImportHref(),
        shortcutInstallHrefAlt: buildOrvitaShortcutImportHrefXCallback(),
        runShortcutHref: buildOrvitaRunShortcutHref(),
      }
    }, [])

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
      setToast("Copia el token ahora; no volverá a mostrarse completo.")
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
      setToast("Token revocado.")
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
      setToast("Token copiado.")
    } catch {
      setToast("Cópialo seleccionando el texto a mano.")
    }
  }, [plainOnce])

  const copyDirectShortcutUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getOrvitaHealthShortcutFileUrl())
      setToast("Enlace HTTPS del .shortcut copiado. Ábrelo en Safari y descarga, o pégalo en la barra de direcciones.")
    } catch {
      setToast("No se pudo copiar. Usa «Descargar archivo del atajo» o copia la URL a mano desde la guía.")
    }
  }, [])

  const statusLabel =
    status === "active"
      ? "Token configurado"
      : status === "revoked"
        ? "Revocado"
        : "No configurado"

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
              Atajo en iPhone
            </p>
            <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              Instálalo una vez desde <strong className="font-medium text-inherit">Safari</strong>. Si falla, vuelve a descargarlo.
            </p>
          </div>
        </div>

        <div className="mt-2.5 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center">
          {isIOS && !isPwaStandalone ? (
            <>
              {icloudUrl ? (
                <a
                  href={icloudUrl}
                  className={`${moduleCard ? chipStrongCta : strongCta} no-underline flex`}
                  style={{
                    borderColor: theme.accent.health,
                    backgroundColor: theme.accent.health,
                    color: "#fff",
                    border: "1px solid transparent",
                  }}
                >
                  <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Instalar desde iCloud
                </a>
              ) : null}
              <a
                href={shortcutInstallHref}
                className={`${moduleCard ? (icloudUrl ? chipCta : chipStrongCta) : icloudUrl ? subtleCta : strongCta} no-underline flex`}
                style={
                  icloudUrl
                    ? { borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }
                    : {
                        borderColor: theme.accent.health,
                        backgroundColor: theme.accent.health,
                        color: "#fff",
                        border: "1px solid transparent",
                      }
                }
              >
                <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {icloudUrl ? "Instalar (archivo en Órvita)" : "Instalar atajo"}
              </a>
              {moduleCard ? null : (
                <a
                  href={shortcutInstallHrefAlt}
                  className={`${subtleCta} no-underline text-center sm:text-left flex`}
                  style={{ borderColor: theme.border, color: theme.textMuted, backgroundColor: theme.surface }}
                >
                  Apertura alternativa
                </a>
              )}
            </>
          ) : null}
          {isIOS ? null : (
            <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              En el iPhone, abre esta pantalla en Safari y toca <strong className="font-medium text-inherit">Descargar</strong>.
              {icloudUrl ? (
                <>
                  {" "}
                  O pega en Safari del iPhone el{" "}
                  <a
                    href={icloudUrl}
                    className="font-medium underline decoration-dotted"
                    style={{ color: theme.accent.health }}
                    target="_blank"
                    rel="noreferrer"
                  >
                    enlace de iCloud
                  </a>{" "}
                  (misma instalación, sin el archivo de la web).
                </>
              ) : null}
            </p>
          )}
          <a
            href={fileUrl}
            download
            className={`${moduleCard ? chipCta : subtleCta} no-underline flex`}
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Descargar .shortcut
          </a>
          <a
            href={historialFileUrl}
            download
            className={`${moduleCard ? chipCta : subtleCta} no-underline flex`}
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Descargar histórico (15 días, v1)
          </a>
          <p
            className="w-full basis-full text-[10px] leading-snug sm:text-[11px]"
            style={{ color: theme.textMuted }}
          >
            El archivo «histórico» comparte la misma lectura Salud que el diario (día de ejecución); sirve para un segundo
            atajo o widget. El backfill automático día a día sin incluir hoy está en roadmap (filtros por fecha en Atajos).
          </p>
          {moduleCard ? null : (
            <button
              type="button"
              onClick={() => void copyDirectShortcutUrl()}
              className={`${subtleCta} flex`}
              style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }}
            >
              <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
              Copiar enlace
            </button>
          )}
          {moduleCard ? null : (
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className={`${subtleCta} flex border-dashed`}
              style={{ borderColor: theme.border, color: theme.textMuted, backgroundColor: "transparent" }}
            >
              Guía (Atajos y permisos)
            </button>
          )}
        </div>
        {isIOS && isOrvitaShortcutImportFromHttpDev() ? (
          <p className="mt-3 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
            Estás en HTTP (desarrollo). iOS a menudo exige <strong className="font-medium text-inherit">HTTPS</strong> o
            usa <strong className="font-medium text-inherit">Descargar archivo del atajo</strong> y abre el .shortcut desde
            Archivos. En producción (orvita.app) el enlace «Instalar» debería abrir Atajos sin pasos extra.
          </p>
        ) : null}
      </div>

      <div
        id="apple-health-import-token"
        className={moduleCard ? "pt-3" : "rounded-2xl border p-4 sm:p-5"}
        style={moduleCard ? undefined : { borderColor: theme.border, backgroundColor: theme.surface }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
          Token de importación (Atajos)
        </p>
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
          Configura este token una sola vez en Atajos. Solo tendrás que cambiarlo si lo regeneras o revocas. El token completo solo se muestra una vez.
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

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => void mintOrRegenerate()}
            disabled={minting || loadingStatus}
            className={`${moduleCard ? chipCta : subtleCta} flex disabled:opacity-50`}
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {minting ? "Generando…" : status === "active" ? "Regenerar" : "Generar"}
          </button>
          {status === "active" ? (
            <button
              type="button"
              onClick={() => void revoke()}
              disabled={revoking || loadingStatus}
              className={`${moduleCard ? chipCta : subtleCta} flex disabled:opacity-50`}
              style={{ borderColor: theme.border, color: theme.textMuted, backgroundColor: theme.surface }}
            >
              {revoking ? "Revocando…" : "Revocar"}
            </button>
          ) : null}
          {plainOnce ? (
            <button
              type="button"
              onClick={() => void copyToken()}
              className={`${moduleCard ? chipCta : subtleCta} flex`}
              style={{ borderColor: theme.accent.health, color: theme.accent.health, backgroundColor: "transparent" }}
            >
              <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
              Copiar token
            </button>
          ) : null}
          {isIOS ? (
            <a
              href={runShortcutHref}
              className={`${subtleCta} no-underline flex`}
              style={{ borderColor: theme.accent.health, color: theme.accent.health, backgroundColor: "transparent" }}
            >
              <Zap className="h-3.5 w-3.5" aria-hidden />
              Abrir atajo
            </a>
          ) : null}
        </div>

        {isIOS ? (
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
            Si al tocar «Abrir atajo» aparece que el archivo no existe, el atajo en Atajos no se llama exactamente{" "}
            <span className="font-medium" style={{ color: theme.text }}>
              {ORVITA_HEALTH_SHORTCUT_NAME}
            </span>
            . Reinstala con «Instalar atajo» arriba o renómbralo a ese nombre; iOS exige una coincidencia exacta.
          </p>
        ) : null}
        {toast ? (
          <p className="mt-3 text-xs leading-relaxed" style={{ color: theme.text }}>
            {toast}
          </p>
        ) : null}
        {plainOnce ? (
          <div className="mt-3 space-y-2 rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}>
            <p className="break-all font-mono text-[12px] leading-relaxed" style={{ color: theme.text }}>
              {plainOnce}
            </p>
          </div>
        ) : null}
      </div>

      {guideOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.45)" }}
          role="presentation"
          onClick={() => setGuideOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setGuideOpen(false)
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="health-shortcut-guide-title"
            className="max-h-[min(92dvh,720px)] w-full max-w-lg overflow-y-auto rounded-t-2xl border p-4 shadow-xl sm:rounded-2xl sm:p-5"
            style={{ borderColor: theme.border, backgroundColor: theme.surface }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 shrink-0" style={{ color: theme.accent.health }} aria-hidden />
                <h2
                  id="health-shortcut-guide-title"
                  className="m-0 text-sm font-semibold sm:text-base"
                  style={{ color: theme.text }}
                >
                  Guía: atajo en el iPhone
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="rounded-md px-2 py-1 text-xs font-medium"
                style={{ color: theme.textMuted }}
              >
                Cerrar
              </button>
            </div>
            <p
              className="m-0 rounded-lg border px-2.5 py-2 text-[11px] leading-relaxed"
              style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt, color: theme.text }}
            >
              <strong className="font-medium" style={{ color: theme.text }}>
                No hay widget propio de Órvita
              </strong>{" "}
              en la App Store ni en esta web: lo que puedes usar hoy es el{" "}
              <strong className="font-medium" style={{ color: theme.text }}>
                widget de Atajos de Apple
              </strong>{" "}
              (sistema) para lanzar el atajo con un toque. Un widget nativo con datos de tu cuenta iría en la{" "}
              <strong className="font-medium" style={{ color: theme.text }}>
                app móvil Órvita
              </strong>{" "}
              (en desarrollo; documentación en el repositorio: carpeta native/ios, archivo WIDGET_EXTENSION).
            </p>
            <p className="m-0 mt-2 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              La web no puede instalar nada en tu iPhone. El atajo envía el día a Órvita en la nube cuando lo ejecutas
              (o desde el widget de Atajos si lo añades tú a la pantalla de inicio).
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-relaxed" style={{ color: theme.text }}>
              <li>Pantalla de inicio: modo edición, luego <strong className="font-medium text-inherit">+</strong> o Añadir widget.</li>
              <li>
                Busca el widget del sistema <strong className="font-medium text-inherit">Atajos</strong>, elige
                tamaño y, al configurar, selecciona el atajo{" "}
                <strong className="font-medium text-inherit">{ORVITA_HEALTH_SHORTCUT_NAME}</strong>. (Si no aparece,
                instala antes el .shortcut desde esta página.)
              </li>
              <li>
                Si en Salud ves <strong className="font-medium text-inherit">(null)</strong> o «Acción desconocida»:
                vuelve a descargar el .shortcut desde aquí, abre <strong className="font-medium text-inherit">Salud</strong> →{" "}
                <strong className="font-medium text-inherit">Atajos</strong> y activa permisos para los tipos (pasos, ejercicio,
                energía, HRV, FC). Reinstala el atajo con el nombre exacto.
              </li>
            </ol>
            <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
              <Play className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              El widget de Atajos no inicia sesión en Órvita: solo ejecuta el atajo; tu cuenta sigue en la web.
            </p>
            <a
              href={instructionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-xs font-medium underline-offset-2 hover:underline"
              style={{ color: theme.textMuted }}
            >
              Notas técnicas (archivo)
            </a>
          </div>
        </div>
      ) : null}
    </div>
  )
}
