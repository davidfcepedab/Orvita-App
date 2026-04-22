import { siteOrigin } from "@/lib/site/origin"

/** Debe coincidir con `WFWorkflowName` en el plist / script del .shortcut. */
export const ORVITA_HEALTH_SHORTCUT_NAME = "Órvita – Importar Salud Hoy"

export const ORVITA_HEALTH_SHORTCUT_FILE_PATH = "/shortcuts/Orvita-Importar-Salud-Hoy.shortcut"

/**
 * URL absoluta y GET sin auth al .shortcut. iOS la descarga al importar;
 * exige origen fiable (HTTPS o misma red en pruebas).
 */
export function getOrvitaHealthShortcutFileUrl(): string {
  if (typeof window === "undefined") {
    return `${siteOrigin()}${ORVITA_HEALTH_SHORTCUT_FILE_PATH}`
  }

  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "")
  if (fromEnv) {
    return `${fromEnv}${ORVITA_HEALTH_SHORTCUT_FILE_PATH}`
  }

  if (window.location.protocol === "https:") {
    return `${window.location.origin}${ORVITA_HEALTH_SHORTCUT_FILE_PATH}`
  }

  if (
    window.location.origin &&
    (window.location.hostname === "localhost" ||
      /^[0-9.]+$/u.test(window.location.hostname))
  ) {
    return `${window.location.origin}${ORVITA_HEALTH_SHORTCUT_FILE_PATH}`
  }

  return `https://orvita.app${ORVITA_HEALTH_SHORTCUT_FILE_PATH}`
}

/** Misma ruta, mismo build que la página abierta: para enlace de descarga directa. */
export function getOrvitaHealthShortcutDownloadFileUrl(): string {
  if (typeof window === "undefined") {
    return `${siteOrigin()}${ORVITA_HEALTH_SHORTCUT_FILE_PATH}`
  }
  return `${window.location.origin}${ORVITA_HEALTH_SHORTCUT_FILE_PATH}`
}

/**
 * Formato aceptado por iOS: sin `name` (no es esquema documentado y en varias
 * versiones provoca "La URL del atajo no es válida") y **sin** barra final en
 * `import-shortcut` (evita tratar el host como ruta errónea).
 */
export function buildOrvitaShortcutImportHref(): string {
  return `shortcuts://import-shortcut?url=${encodeURIComponent(getOrvitaHealthShortcutFileUrl())}`
}

export function buildOrvitaRunShortcutHref(): string {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(ORVITA_HEALTH_SHORTCUT_NAME)}`
}

/** true si el import vía enlace es frágil (p. ej. solo HTTP, sin site URL). */
export function isOrvitaShortcutImportFromHttpDev(): boolean {
  if (typeof window === "undefined") return false
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) return false
  return window.location.protocol === "http:"
}
