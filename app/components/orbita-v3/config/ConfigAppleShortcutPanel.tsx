"use client"

import { useCallback, useMemo, useState } from "react"
import { Apple, ClipboardCopy, Download, LayoutGrid, Play, Sparkles, Zap } from "lucide-react"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"

const SHORTCUT_NAME = "Órvita – Importar Salud Hoy"
const SHORTCUT_FILE = "/shortcuts/Orvita-Importar-Salud-Hoy.shortcut"
const INSTRUCCIONES = "/shortcuts/ATALJO-Salud-instrucciones.txt"

type Props = {
  theme: OrbitaConfigTheme
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
export function ConfigAppleShortcutPanel({ theme }: Props) {
  const [minting, setMinting] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [tokenUntil, setTokenUntil] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const isIOS = useMemo(() => {
    if (typeof navigator === "undefined") return false
    return /iPad|iPhone|iPod/i.test(navigator.userAgent) || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
  }, [])

  const { shortcutInstallHref, runShortcutHref, fileUrl, instructionsUrl } = useMemo(() => {
    if (typeof window === "undefined") {
      return {
        shortcutInstallHref: "#",
        runShortcutHref: "#",
        fileUrl: SHORTCUT_FILE,
        instructionsUrl: INSTRUCCIONES,
      }
    }
    const origin = window.location.origin
    const fileUrl = `${origin}${SHORTCUT_FILE}`
    return {
      fileUrl,
      instructionsUrl: `${origin}${INSTRUCCIONES}`,
      shortcutInstallHref: `shortcuts://import-shortcut/?url=${encodeURIComponent(fileUrl)}&name=${encodeURIComponent(SHORTCUT_NAME)}`,
      runShortcutHref: `shortcuts://run-shortcut?name=${encodeURIComponent(SHORTCUT_NAME)}`,
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

  return (
    <div className="space-y-4">
      <div
        className="rounded-2xl border p-4 sm:p-5"
        style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
            style={{ backgroundColor: theme.surface, color: theme.accent.health }}
          >
            <Apple className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-sm font-semibold" style={{ color: theme.text }}>
              Un solo toque al día: del teléfono a Órvita
            </p>
            <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              Instala el atajo en el iPhone (una vez). Cada mañana o cuando quieras, ejecútalo: lee lo que tú permitas en
              Salud y lo envía a tu cuenta. Órvita en el navegador no puede abrir la app Salud sola: por eso hace falta
              el atajo.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
          {isIOS ? (
            <button
              type="button"
              onClick={() => {
                window.location.href = shortcutInstallHref
              }}
              className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition hover:opacity-95"
              style={{
                borderColor: theme.accent.health,
                backgroundColor: theme.accent.health,
                color: "#fff",
              }}
            >
              <Download className="h-4 w-4 shrink-0" aria-hidden />
              Instalar atajo ahora
            </button>
          ) : (
            <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              Abre esta página en <strong className="font-medium text-inherit">Safari en el iPhone</strong> y pulsa
              «Descargar atajo»; iOS te pedirá añadirlo a Atajos. Desde un ordenador solo puedes bajar el archivo y
              enviártelo al móvil.
            </p>
          )}
          <a
            href={fileUrl}
            download
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold no-underline transition hover:opacity-90"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surface }}
          >
            <Download className="h-4 w-4" aria-hidden />
            Descargar archivo del atajo
          </a>
          <a
            href={instructionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium no-underline transition hover:opacity-90"
            style={{ borderColor: theme.border, color: theme.textMuted, backgroundColor: "transparent" }}
          >
            Ver guía de pasos
          </a>
        </div>
      </div>

      <div
        className="rounded-2xl border p-4 sm:p-5"
        style={{ borderColor: theme.border, backgroundColor: theme.surface }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
          Código de un solo uso
        </p>
        <p className="mt-1.5 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
          El atajo lo pide al enviar datos. Genera uno aquí, cópialo y pégalo cuando iOS te lo muestre. Caduca al cabo
          de unas horas.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void mintToken()}
            disabled={minting}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition disabled:opacity-50"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {minting ? "Generando…" : "Generar código"}
          </button>
          {isIOS ? (
            <button
              type="button"
              onClick={() => {
                window.location.href = runShortcutHref
              }}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold transition"
              style={{ borderColor: theme.accent.health, color: theme.accent.health, backgroundColor: "transparent" }}
            >
              <Zap className="h-4 w-4" aria-hidden />
              Abrir atajo
            </button>
          ) : null}
        </div>
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

      <details
        className="group rounded-2xl border p-4"
        style={{ borderColor: theme.border, backgroundColor: theme.surface }}
      >
        <summary
          className="flex cursor-pointer list-none items-center gap-2 text-sm font-medium marker:hidden [&::-webkit-details-marker]:hidden"
          style={{ color: theme.text }}
        >
          <LayoutGrid className="h-4 w-4 shrink-0" style={{ color: theme.accent.health }} aria-hidden />
          Widget en la pantalla de inicio (un toque, sin abrir Órvita)
        </summary>
        <p className="mt-2 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
          Apple no deja que una web ponga el widget por ti: lo eliges tú en el iPhone. Así añades el atajo a la
          cuadrícula y lo lanzas con un toque, igual que abrir el clima o el reloj.
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-4 text-xs leading-relaxed" style={{ color: theme.text }}>
          <li>
            En la pantalla de inicio, mantén un dedo en un espacio vacío (modo edición) o entra a editar el fondo,
            según tu versión de iOS.
          </li>
          <li>
            Toca <strong className="font-medium text-inherit">+</strong> o «Añadir widget».
          </li>
          <li>
            Busca <strong className="font-medium text-inherit">Atajos</strong>, elige un tamaño (pequeño, mediano o
            grande) y tócalo.
          </li>
          <li>
            Al configurar, selecciona <strong className="font-medium text-inherit">{SHORTCUT_NAME}</strong>. Luego, al
            tocar el widget, se abre el atajo: ahí pega el código si hace falta y confirma el envío a Órvita.
          </li>
        </ol>
        <p className="mt-2 flex items-center gap-2 text-[11px]" style={{ color: theme.textMuted }}>
          <Play className="h-3.5 w-3.5 shrink-0" aria-hidden />
          El atajo hace de puente: Órvita sigue en la nube; el widget no guarda la sesión, solo inicia el gesto.
        </p>
      </details>
    </div>
  )
}
