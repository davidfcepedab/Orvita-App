import { siteOrigin } from "@/lib/site/origin"

/**
 * Nombre canónico del atajo. Debe coincidir con `WFWorkflowName` al importar
 * y con cualquier enlace `shortcuts://run-shortcut?name=...` o acción
 * "Ejecutar atajo" / "Abrir atajo" que iOS resuelve por **nombre exacto** (tildes, guiones, espacios).
 * Si en Atajos lo renombraste, el botón "Abrir atajo" de la web o un widget con el nombre antiguo fallará con
 * "el archivo no existe" hasta que reinstales el .shortcut o restaures el nombre.
 */
export const ORVITA_HEALTH_SHORTCUT_NAME = "Órvita – Importar Salud Hoy"

export const ORVITA_HEALTH_SHORTCUT_FILE_PATH = "/shortcuts/Orvita-Importar-Salud-Hoy.shortcut"

const ICLOUD_URL_ENV = "NEXT_PUBLIC_ORVITA_HEALTH_SHORTCUT_ICLOUD_URL"

/**
 * Enlace de Apple «Compartir atajo» (p. ej. `https://www.icloud.com/shortcuts/…`).
 * No pasa por `import-shortcut?url=`: se abre en Safari y Atajos lo importa firmado.
 * Definir en `.env` / Vercel para priorizarlo en la UI cuando `shortcuts sign` falle en el Mac.
 */
export function getOrvitaHealthShortcutIcloudUrl(): string | null {
  const raw = process.env[ICLOUD_URL_ENV]?.trim()
  if (!raw) return null
  if (!/^https:\/\//i.test(raw)) return null
  return raw
}

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

/** Algunas versiones o contextos (p. ej. visor in-app) responden mejor a x-callback-url. Misma `url` codificada. */
export function buildOrvitaShortcutImportHrefXCallback(): string {
  return `shortcuts://x-callback-url/import-shortcut?url=${encodeURIComponent(getOrvitaHealthShortcutFileUrl())}`
}

/** @param shortcutName Nombre del atajo tal como aparece en la biblioteca de Atajos; por defecto el canónico. */
export function buildOrvitaRunShortcutHref(shortcutName?: string): string {
  const name = shortcutName?.trim() || ORVITA_HEALTH_SHORTCUT_NAME
  return `shortcuts://run-shortcut?name=${encodeURIComponent(name)}`
}

/** true si el import vía enlace es frágil (p. ej. solo HTTP, sin site URL). */
export function isOrvitaShortcutImportFromHttpDev(): boolean {
  if (typeof window === "undefined") return false
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) return false
  return window.location.protocol === "http:"
}
