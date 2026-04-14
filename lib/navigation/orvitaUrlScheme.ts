/**
 * Esquema de URL personalizado de Órvita (alineado con el shell iOS `orvita://`).
 * En web se resuelve vía `/open?p=…` o enlaces `https://` equivalentes.
 *
 * Ejemplos:
 * - `orvita://home` → `/`
 * - `orvita://checkin/dia` → `/checkin#checkin-dia`
 */

export const ORVITA_URL_SCHEME = "orvita" as const
export const ORVITA_URL_SCHEME_PREFIX = `${ORVITA_URL_SCHEME}://` as const

/** PWA / Chromium: protocol handler registrado en manifest (`web+orvita`). */
export const ORVITA_WEB_PLUS_SCHEME_PREFIX = "web+orvita://" as const

export type OrvitaSchemePath =
  | "home"
  | "checkin/manana"
  | "checkin/dia"
  | "checkin/noche"

/** Rutas documentadas (misma semántica que el README del shell nativo). */
export const ORVITA_SCHEME_EXAMPLES: { label: string; schemeUrl: string; webPath: string }[] = [
  { label: "Inicio", schemeUrl: `${ORVITA_URL_SCHEME_PREFIX}home`, webPath: "/" },
  {
    label: "Check-in mañana",
    schemeUrl: `${ORVITA_URL_SCHEME_PREFIX}checkin/manana`,
    webPath: "/checkin#checkin-manana",
  },
  {
    label: "Check-in día",
    schemeUrl: `${ORVITA_URL_SCHEME_PREFIX}checkin/dia`,
    webPath: "/checkin#checkin-dia",
  },
  {
    label: "Check-in noche",
    schemeUrl: `${ORVITA_URL_SCHEME_PREFIX}checkin/noche`,
    webPath: "/checkin#checkin-noche",
  },
]

export function normalizeOrvitaInput(raw: string): string {
  let s = raw.trim()
  if (s.startsWith(ORVITA_WEB_PLUS_SCHEME_PREFIX)) {
    s = s.slice(ORVITA_WEB_PLUS_SCHEME_PREFIX.length)
  }
  if (s.startsWith(ORVITA_URL_SCHEME_PREFIX)) {
    s = s.slice(ORVITA_URL_SCHEME_PREFIX.length)
  }
  return s.replace(/^\/+/, "")
}

/**
 * Devuelve ruta relativa para la app web (incluye hash si aplica), o null si no está soportada.
 */
export function orvitaPathToWebLocation(pathWithoutScheme: string): string | null {
  const key = normalizeOrvitaInput(pathWithoutScheme).toLowerCase()
  if (key === "" || key === "home") {
    return "/"
  }
  const check = key.match(/^checkin\/(manana|dia|noche)$/)
  if (check) {
    const phase = check[1] as "manana" | "dia" | "noche"
    const hash =
      phase === "manana" ? "checkin-manana" : phase === "dia" ? "checkin-dia" : "checkin-noche"
    return `/checkin#${hash}`
  }
  return null
}

/** Acepta `orvita://…`, `web+orvita://…` o solo `checkin/dia`. */
export function resolveOrvitaDeepLink(input: string): string | null {
  return orvitaPathToWebLocation(normalizeOrvitaInput(input))
}
