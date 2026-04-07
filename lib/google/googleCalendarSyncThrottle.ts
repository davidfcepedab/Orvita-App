/**
 * Limita sync Calendar → BD en segundo plano para no duplicar el GET en vivo del hook
 * y evitar agotar la cuota "per minute per user" de Google Calendar.
 */
const STORAGE_KEY = "orvita:lastGoogleCalendarSyncMs"

/** Alineado con el cooldown del servidor (sync) para no spamear POST automáticos. */
export const GOOGLE_CALENDAR_SYNC_MIN_INTERVAL_MS = 15 * 60 * 1000

export function canRunGoogleCalendarSyncNow(): boolean {
  if (typeof window === "undefined") return true
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return true
    const t = Number(raw)
    if (!Number.isFinite(t)) return true
    return Date.now() - t >= GOOGLE_CALENDAR_SYNC_MIN_INTERVAL_MS
  } catch {
    return true
  }
}

/** Llamar tras un sync de calendario exitoso (automático o manual). */
export function markGoogleCalendarSyncRan(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}
