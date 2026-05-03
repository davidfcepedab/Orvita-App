/** Persistencia local de “guardé este tramo del check-in hoy” para reflejar estado en /hoy sin round-trip extra. */

export type CheckinSegmentKey = "manana" | "dia" | "noche"

const PREFIX = "orbita.checkin.segments."

export function readCheckinSegmentsDone(dayYmd: string): Partial<Record<CheckinSegmentKey, boolean>> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(`${PREFIX}${dayYmd}`)
    if (!raw) return {}
    const o = JSON.parse(raw) as Record<string, unknown>
    const out: Partial<Record<CheckinSegmentKey, boolean>> = {}
    for (const k of ["manana", "dia", "noche"] as const) {
      if (o[k] === true) out[k] = true
    }
    return out
  } catch {
    return {}
  }
}

export function markCheckinSegmentSaved(dayYmd: string, viewport: CheckinSegmentKey | "full"): void {
  if (typeof window === "undefined") return
  try {
    const raw = localStorage.getItem(`${PREFIX}${dayYmd}`)
    const o: Record<string, boolean> = raw ? (JSON.parse(raw) as Record<string, boolean>) : {}
    if (viewport === "full") {
      o.manana = true
      o.dia = true
      o.noche = true
    } else {
      o[viewport] = true
    }
    localStorage.setItem(`${PREFIX}${dayYmd}`, JSON.stringify(o))
    window.dispatchEvent(new Event("orbita-checkin-segments"))
  } catch {
    /* ignore */
  }
}
