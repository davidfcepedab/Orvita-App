"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Apple, ClipboardCopy, Download, LayoutGrid, Play, Sparkles, Zap } from "lucide-react"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"
import {
  buildOrvitaRunShortcutHref,
  buildOrvitaShortcutImportHref,
  buildOrvitaShortcutImportHrefXCallback,
  getOrvitaHealthShortcutDownloadFileUrl,
  getOrvitaHealthShortcutFileUrl,
  isOrvitaShortcutImportFromHttpDev,
  ORVITA_HEALTH_SHORTCUT_NAME,
} from "@/lib/shortcuts/orvitaHealthShortcut"

const INSTRUCCIONES = "/shortcuts/ATALJO-Salud-instrucciones.txt"

type Props = {
  theme: OrbitaConfigTheme
  moduleCard?: boolean
}

function formatWhen(iso: string | null | undefined) {
  if (!iso) return "—"
  try {
    return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso))
  } catch {
    return iso
  }
}

/**
 * Instalación del atajo vía esquema de iOS, token de importación y guía para widget de Atajos.
 * La web no puede instalar nada en el sistema; solo ofrece enlaces y pasos.
 */
const subtleCta = "min-h-10 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition hover:opacity-90 sm:inline-flex"
const strongCta = "min-h-10 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition hover:opacity-95 sm:inline-flex"

export function ConfigAppleShortcutPanel({ theme, moduleCard }: Props) {
  const [minting, setMinting] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [tokenUntil, setTokenUntil] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [guideOpen, setGuideOpen] = useState(false)

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

  const { shortcutInstallHref, shortcutInstallHrefAlt, runShortcutHref, fileUrl, instructionsUrl } = useMemo(() => {
    return {
      fileUrl: getOrvitaHealthShortcutDownloadFileUrl(),
      /** Ruta relativa: evita orígenes distintos en SSR y cliente. */
      instructionsUrl: INSTRUCCIONES,
      shortcutInstallHref: buildOrvitaShortcutImportHref(),
      shortcutInstallHrefAlt: buildOrvitaShortcutImportHrefXCallback(),
      runShortcutHref: buildOrvitaRunShortcutHref(),
    }
  }, [])

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
        throw new Error(payload.error ?? "No se pudo generar el código")
      }
      setToken(payload.import_token)
      setTokenUntil(payload.expires_at ?? null)
      setToast("Código listo. Cuando el atajo te lo pida, pégalo aquí. No lo compartas con nadie.")
    } catch (e) {
      setToast(e instanceof Error ? e.message : "No se pudo generar el código")
    } finally {
      setMinting(false)
    }
  }, [])

  const copyToken = useCallback(async () => {
    if (!token) return
    try {
      await navigator.clipboard.writeText(token)
      setToast("Código copiado.")
    } catch {
      setToast("Cópialo seleccionando el texto a mano.")
    }
  }, [token])

  const copyDirectShortcutUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(getOrvitaHealthShortcutFileUrl())
      setToast("Enlace HTTPS del .shortcut copiado. Ábrelo en Safari y descarga, o pégalo en la barra de direcciones.")
    } catch {
      setToast("No se pudo copiar. Usa «Descargar archivo del atajo» o copia la URL a mano desde la guía.")
    }
  }, [])

  return (
    <div
      className={moduleCard ? "space-y-0 divide-y" : "space-y-4"}
      style={moduleCard ? { borderColor: theme.border } : undefined}
    >
      <div
        className={moduleCard ? "pb-4 pt-0" : "rounded-2xl border p-4 sm:p-5"}
        style={moduleCard ? undefined : { borderColor: theme.border, backgroundColor: theme.surfaceAlt }}
      >
        <div className="flex items-start gap-2.5 sm:gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10"
            style={{ backgroundColor: theme.surface, color: theme.accent.health }}
          >
            <Apple className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm font-semibold" style={{ color: theme.text }}>
              Un toque: del iPhone a Órvita
            </p>
            <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              Instala el atajo una vez. Usa <strong className="font-medium text-inherit">Safari</strong> en el iPhone (no
              otras apps): así el enlace abre Atajos. Si no responde, baja de nuevo el archivo desde aquí o copia el
              enlace HTTPS.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {isIOS ? (
            <>
              <a
                href={shortcutInstallHref}
                className={`${strongCta} no-underline flex`}
                style={{
                  borderColor: theme.accent.health,
                  backgroundColor: theme.accent.health,
                  color: "#fff",
                  border: "1px solid transparent",
                }}
              >
                <Download className="h-3.5 w-3.5 shrink-0" aria-hidden />
                Instalar atajo
              </a>
              <a
                href={shortcutInstallHrefAlt}
                className={`${subtleCta} no-underline text-center sm:text-left flex`}
                style={{ borderColor: theme.border, color: theme.textMuted, backgroundColor: theme.surface }}
              >
                Apertura alternativa
              </a>
            </>
          ) : null}
          {isIOS ? null : (
            <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              En el iPhone, abre esta pantalla en Safari y toca <strong className="font-medium text-inherit">Descargar</strong>.
            </p>
          )}
          <a
            href={fileUrl}
            download
            className={`${subtleCta} no-underline flex`}
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Descargar .shortcut
          </a>
          <button
            type="button"
            onClick={() => void copyDirectShortcutUrl()}
            className={`${subtleCta} flex`}
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }}
          >
            <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
            Copiar enlace
          </button>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className={`${subtleCta} flex border-dashed`}
            style={{ borderColor: theme.border, color: theme.textMuted, backgroundColor: "transparent" }}
          >
            Guía (widget y permisos)
          </button>
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
        className={moduleCard ? "pt-4" : "rounded-2xl border p-4 sm:p-5"}
        style={moduleCard ? undefined : { borderColor: theme.border, backgroundColor: theme.surface }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
          Código de un solo uso
        </p>
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
          Código que pide iOS al enviar. Válido unas horas: genera, copia y pega cuando aparezca el diálogo.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void mintToken()}
            disabled={minting}
            className={`${subtleCta} flex disabled:opacity-50`}
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            {minting ? "Generando…" : "Obtener código"}
          </button>
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
        {token ? (
          <div className="mt-3 space-y-2 rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.textMuted }}>
                Código (privado)
              </span>
              <button
                type="button"
                onClick={() => void copyToken()}
                className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium"
                style={{ borderColor: theme.border, color: theme.text }}
              >
                <ClipboardCopy className="h-3.5 w-3.5" aria-hidden />
                Copiar
              </button>
            </div>
            <p className="break-all font-mono text-[12px] leading-relaxed" style={{ color: theme.text }}>
              {token}
            </p>
            {tokenUntil ? (
              <p className="text-[11px]" style={{ color: theme.textMuted }}>
                Válido hasta {formatWhen(tokenUntil)}
              </p>
            ) : null}
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
                  Guía rápida: atajo y widget
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
            <p className="m-0 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              La web no puede instalar nada en tu iPhone. Tú añades el atajo a la pantalla de inicio, como el clima o el
              reloj. Órvita queda en la nube: el atajo solo envía el día.
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-relaxed" style={{ color: theme.text }}>
              <li>Pantalla de inicio: modo edición, luego <strong className="font-medium text-inherit">+</strong> o Añadir widget.</li>
              <li>
                Busca <strong className="font-medium text-inherit">Atajos</strong>, elige tamaño, y al configurar, el
                atajo <strong className="font-medium text-inherit">{ORVITA_HEALTH_SHORTCUT_NAME}</strong>.
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
              El widget no inicia sesión: solo abre el atajo; tu cuenta sigue en Órvita.
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
