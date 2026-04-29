/**
 * Atajo iOS: el día de salud “canónico” vive en `metadata.normalized_import_v1.observed_at` (yyyy-MM-dd).
 * `health_metrics.observed_at` es ancla UTC para upsert y puede no coincidir con la etiqueta civil que el usuario envió.
 */

export type HealthMetricRowLike = {
  observed_at?: string | null
  source?: string | null
  metadata?: Record<string, unknown> | null
}

export function shortcutBundleObservedYmd(row: HealthMetricRowLike | null | undefined): string | null {
  if (!row || row.source !== "apple_health_shortcut") return null
  const meta = row.metadata
  if (!meta || typeof meta !== "object") return null
  const v1 = meta.normalized_import_v1
  if (!v1 || typeof v1 !== "object") return null
  const o = (v1 as Record<string, unknown>).observed_at
  if (typeof o !== "string") return null
  const s = o.trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null
}

/**
 * ISO sentinela del día del bundle (atajo): `YYYY-MM-DDT00:00:00.000Z` alinea con `localDateKeyFromIso`
 * y con `formatLocalDateLabelEsCo` (día almacenado, no “mediodía UTC” visto en otra zona civil).
 */
export function healthMetricObservedAtIsoForDisplay(row: HealthMetricRowLike | null | undefined): string {
  const raw = (row?.observed_at ?? "").trim()
  const ymd = shortcutBundleObservedYmd(row)
  if (ymd) return `${ymd}T00:00:00.000Z`
  return raw
}

/** Instante para “hace cuánto” / stale: preferir `merged_at` del último merge en servidor. */
export function healthMetricInstantForStaleness(row: HealthMetricRowLike | null | undefined): string {
  const raw = (row?.observed_at ?? "").trim()
  const meta = row?.metadata
  if (meta && typeof meta === "object") {
    const merged = (meta as Record<string, unknown>).merged_at
    if (typeof merged === "string" && merged.trim()) return merged.trim()
  }
  return raw
}
