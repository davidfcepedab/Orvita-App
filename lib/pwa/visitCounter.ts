/** Contador de visitas reales (para prompt de instalación). */
const KEY = "orvita:pwa:visit_count"

export function incrementPwaVisitCount(): number {
  if (typeof window === "undefined") return 0
  try {
    const prev = Number(window.localStorage.getItem(KEY) ?? "0")
    const next = Number.isFinite(prev) && prev > 0 ? prev + 1 : 1
    window.localStorage.setItem(KEY, String(next))
    return next
  } catch {
    return 1
  }
}

export function getPwaVisitCount(): number {
  if (typeof window === "undefined") return 0
  try {
    const n = Number(window.localStorage.getItem(KEY) ?? "0")
    return Number.isFinite(n) ? n : 0
  } catch {
    return 0
  }
}
