/**
 * Tasks usa cuota diaria **por proyecto** en Google; muchos syncs automáticos agotan el cupo.
 * El import manual usa ?force=1 en el servidor y no depende de este throttle.
 */
const STORAGE_KEY = "orvita:lastGoogleTasksSyncMs"

/** Auto-sync Tasks → BD: intervalo largo para no quemar la cuota diaria del proyecto. */
export const GOOGLE_TASKS_SYNC_MIN_INTERVAL_MS = 60 * 60 * 1000

export function canRunGoogleTasksSyncNow(): boolean {
  if (typeof window === "undefined") return true
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return true
    const t = Number(raw)
    if (!Number.isFinite(t)) return true
    return Date.now() - t >= GOOGLE_TASKS_SYNC_MIN_INTERVAL_MS
  } catch {
    return true
  }
}

export function markGoogleTasksSyncRan(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}
