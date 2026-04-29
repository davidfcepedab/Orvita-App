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
      setToast("Copia y guarda esta clave ahora: por seguridad no la mostraremos entera otra vez.")
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
      setToast("Clave desactivada. El atajo dejará de poder enviar datos hasta que generes una nueva.")
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

  const copyDirectShortcutUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getOrvitaHealthShortcutFileUrl())
      setToast("Enlace copiado. Ábrelo en Safari en el iPhone y descarga el atajo, o pégalo en la barra de direcciones.")
    } catch {
      setToast("No se pudo copiar. Usa «Descargar archivo del atajo» o copia la URL a mano desde la guía.")
    }
  }, [])

  const statusLabel =
    status === "active"
      ? "Clave lista para el iPhone"
      : status === "revoked"
        ? "Clave desactivada"
        : "Aún sin clave"

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
              Tu atajo de Salud en el iPhone
            </p>
            <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              Instálalo <strong className="font-medium text-inherit">una sola vez</strong> desde{" "}
              <strong className="font-medium text-inherit">Safari</strong> (en el iPhone). Si algo falla, vuelve a descargarlo desde aquí.
              {" "}
              En Atajos, <strong className="font-medium text-inherit">no dupliques</strong> el atajo (los que acaban en «2» o «3»): esas copias
              a veces dejan de enviar bien los datos. Mejor bórralas y vuelve a instalar el original desde Órvita.
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
                  Instalar con enlace de Apple
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
                {icloudUrl ? "Instalar desde Órvita" : "Instalar atajo"}
              </a>
              {moduleCard ? null : (
                <a
                  href={shortcutInstallHrefAlt}
                  className={`${subtleCta} no-underline text-center sm:text-left flex`}
                  style={{ borderColor: theme.border, color: theme.textMuted, backgroundColor: theme.surface }}
                >
                  Otra forma de abrirlo
                </a>
              )}
            </>
          ) : null}
          {isIOS ? null : (
            <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              En el iPhone, abre esta página en <strong className="font-medium text-inherit">Safari</strong> y descarga el atajo.
              {icloudUrl ? (
                <>
                  {" "}
                  También puedes usar el{" "}
                  <a
                    href={icloudUrl}
                    className="font-medium underline decoration-dotted"
                    style={{ color: theme.accent.health }}
                    target="_blank"
                    rel="noreferrer"
                  >
                    enlace que te da Apple
                  </a>
                  : instala el mismo atajo sin pasar por el archivo de la web.
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
            Descargar el atajo (archivo)
          </a>
          <a
            href={historialFileUrl}
            download
            className={`${moduleCard ? chipCta : subtleCta} no-underline flex`}
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Descargar atajo de histórico (15 días)
          </a>
          <p
            className="w-full basis-full text-[10px] leading-snug sm:text-[11px]"
            style={{ color: theme.textMuted }}
          >
            El atajo de histórico sirve si quieres un segundo botón en el iPhone para enviar varios días; el del día a día es el principal de arriba.
          </p>
          {moduleCard ? null : (
            <button
              type="button"
              onClick={() => void copyDirectShortcutUrl()}
              className={`${subtleCta} flex`}
              style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }}
            >
              <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
              Copiar enlace de descarga
            </button>
          )}
          {moduleCard ? null : (
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className={`${subtleCta} flex border-dashed`}
              style={{ borderColor: theme.border, color: theme.textMuted, backgroundColor: "transparent" }}
            >
              Cómo usar el atajo y permisos
            </button>
          )}
        </div>
        {isIOS && isOrvitaShortcutImportFromHttpDev() ? (
          <p className="mt-3 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
            Estás en una dirección de prueba (sin cifrado). En el iPhone, descarga el archivo del atajo y ábrelo desde{" "}
            <strong className="font-medium text-inherit">Archivos</strong>. En la web normal de Órvita suele bastar con tocar instalar desde Safari.
          </p>
        ) : null}
        <p className="mt-3 rounded-lg border px-3 py-2 text-[11px] leading-relaxed sm:text-xs" style={{ borderColor: theme.border, color: theme.textMuted }}>
          <span className="font-semibold" style={{ color: theme.text }}>
            Que sea el atajo bueno:
          </span>{" "}
          en la app Atajos el nombre debe ser{" "}
          <strong className="font-medium text-inherit">{ORVITA_HEALTH_SHORTCUT_NAME}</strong>, sin números raros al final. Si al
          abrirlo ves recuadros de color en la lista de datos, va bien; si casi todo sale como texto gris vacío, no es la
          instalación correcta: borra esa copia y vuelve a descargar desde esta página.
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
          La creas aquí y la pegas una vez en el atajo del teléfono. Solo la cambias si pulsas regenerar o revocar. Cuando la
          generamos, te la mostramos entera una sola vez.
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
            {minting ? "Generando…" : status === "active" ? "Generar otra clave" : "Crear clave"}
          </button>
          {status === "active" ? (
            <button
              type="button"
              onClick={() => void revoke()}
              disabled={revoking || loadingStatus}
              className={`${moduleCard ? chipCta : subtleCta} flex disabled:opacity-50`}
              style={{ borderColor: theme.border, color: theme.textMuted, backgroundColor: theme.surface }}
            >
              {revoking ? "Desactivando…" : "Desactivar clave"}
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
              Copiar clave
            </button>
          ) : null}
          {isIOS ? (
            <a
              href={runShortcutHref}
              className={`${subtleCta} no-underline flex`}
              style={{ borderColor: theme.accent.health, color: theme.accent.health, backgroundColor: "transparent" }}
            >
              <Zap className="h-3.5 w-3.5" aria-hidden />
              Abrir en Atajos
            </a>
          ) : null}
        </div>

        {isIOS ? (
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
            Si al abrir en Atajos dice que no encuentra el atajo, revisa que en la biblioteca se llame exactamente{" "}
            <span className="font-medium" style={{ color: theme.text }}>
              {ORVITA_HEALTH_SHORTCUT_NAME}
            </span>
            . Vuelve a instalar desde arriba o corrige el nombre a mano.
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
                  Cómo encaja el atajo en tu día a día
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
              Órvita no tiene widget propio en la tienda de apps: lo habitual es añadir en la pantalla de inicio el{" "}
              <strong className="font-medium" style={{ color: theme.text }}>
                widget de Atajos
              </strong>{" "}
              del iPhone y elegir este atajo, para lanzarlo con un toque.
            </p>
            <p className="m-0 mt-2 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              Esta web no instala nada sola: tú descargas el atajo y, cuando lo ejecutas, tus datos del día viajan a tu cuenta
              en Órvita.
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
                Si algo sale raro en Salud o en Atajos: vuelve a descargar el atajo desde aquí, abre{" "}
                <strong className="font-medium text-inherit">Salud</strong> → <strong className="font-medium text-inherit">Atajos</strong>{" "}
                y deja activado lo que quieras compartir (pasos, sueño, energía, variación del pulso, etc.).
              </li>
            </ol>
            <p className="mt-3 flex items-start gap-2 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
              <Play className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              El widget solo abre el atajo; no entra en tu cuenta por ti.
            </p>
            <a
              href={instructionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex text-xs font-medium underline-offset-2 hover:underline"
              style={{ color: theme.textMuted }}
            >
              Ayuda larga (archivo de texto)
            </a>
          </div>
        </div>
      ) : null}
    </div>
  )
}
