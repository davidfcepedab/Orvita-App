import type { NextRequest } from "next/server"

export const ORVITA_AUTH_COOKIE = "orvita_access_token"

/**
 * Gate en proxy/middleware **sin red**: solo cookie + exp del JWT (sin verificar firma).
 * La verificación real sigue en `requireUser` / APIs. Así el Edge no puede quedar colgado
 * en `fetch` a Supabase si la red falla o el runtime no aborta bien.
 */
export function hasUsableOrvitaSessionCookie(req: NextRequest): boolean {
  const token = req.cookies.get(ORVITA_AUTH_COOKIE)?.value?.trim()
  if (!token || token.length < 20) return false

  const expSec = tryReadJwtExpSec(token)
  if (expSec == null) return true
  const nowSec = Math.floor(Date.now() / 1000)
  return expSec > nowSec - 120
}

function tryReadJwtExpSec(jwt: string): number | null {
  try {
    const parts = jwt.split(".")
    if (parts.length < 2 || !parts[1]) return null
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4))
    const json = JSON.parse(atob(b64 + pad)) as { exp?: unknown }
    return typeof json.exp === "number" ? json.exp : null
  } catch {
    return null
  }
}
