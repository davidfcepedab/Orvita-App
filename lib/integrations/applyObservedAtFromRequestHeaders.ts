import type { NextRequest } from "next/server"

const HEADER_KEYS = ["x-orvita-observed-at", "x-observed-at"] as const

function isAbsentObservedAt(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === "string" && v.trim() === "") return true
  return false
}

/**
 * iOS Atajos a veces manda `observed_at: null` o vacío en el JSON del POST
 * aunque otra acción muestre el diccionario bien. Duplicar la fecha en la
 * cabecera `x-orvita-observed-at` (mismo `yyyy-MM-dd` que en el diccionario)
 * evita el 400.
 */
export function applyObservedAtFromRequestHeaders(req: NextRequest, body: Record<string, unknown>): void {
  if (!isAbsentObservedAt(body.observed_at)) return
  for (const key of HEADER_KEYS) {
    const raw = req.headers.get(key)?.trim()
    if (raw) {
      body.observed_at = raw
      return
    }
  }
}
