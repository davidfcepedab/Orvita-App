import { coalesceNumericHealth } from "@/lib/integrations/normalizeAppleHealthPayload"

export type AppleHealthImportRow = {
  observed_at?: string
  sleep_hours?: number
  hrv_ms?: number
  readiness_score?: number
  steps?: number
  calories?: number
  energy_index?: number
  resting_hr_bpm?: number
  apple_workouts_count?: number
  apple_workout_minutes?: number
  metadata?: Record<string, unknown>
}

function numish(row: Record<string, unknown>, key: string): number | undefined {
  const n = coalesceNumericHealth(row[key])
  return n === null ? undefined : n
}

export function normalizeAppleHealthRows(input: unknown): AppleHealthImportRow[] {
  if (!Array.isArray(input)) return []
  const rows: AppleHealthImportRow[] = []
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue
    const row = raw as Record<string, unknown>
    const fromObs = typeof row.observed_at === "string" && row.observed_at.trim() ? row.observed_at : null
    const observedRaw = fromObs ?? new Date().toISOString()
    const observedAt = new Date(observedRaw)
    if (Number.isNaN(observedAt.getTime())) continue
    const meta = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : undefined
    const rRest0 = numish(row, "resting_hr_bpm")
    const aWc0 = numish(row, "apple_workouts_count")
    const aWm0 = numish(row, "apple_workout_minutes")
    const rRest =
      rRest0 != null && rRest0 > 20 && rRest0 < 220
        ? Math.round(Math.min(220, Math.max(30, rRest0)))
        : undefined
    const aWc = aWc0 != null && aWc0 >= 0 ? Math.round(aWc0) : undefined
    const aWm = aWm0 != null && aWm0 > 0 ? Math.min(24 * 60, Math.round(aWm0)) : undefined
    const sh0 = numish(row, "sleep_hours")
    const hrv0 = numish(row, "hrv_ms")
    const hrvC =
      hrv0 == null || hrv0 <= 0 || hrv0 >= 300
        ? undefined
        : Math.max(1, Math.round(hrv0))
    rows.push({
      observed_at: observedAt.toISOString(),
      sleep_hours: sh0,
      hrv_ms: hrvC,
      readiness_score: (() => {
        const r = numish(row, "readiness_score")
        return r != null ? Math.round(r) : undefined
      })(),
      steps: (() => {
        const s = numish(row, "steps")
        return s != null && s >= 0 ? Math.round(s) : undefined
      })(),
      calories: (() => {
        const c = numish(row, "calories")
        return c != null ? Math.round(c) : undefined
      })(),
      energy_index: (() => {
        const e = numish(row, "energy_index")
        return e != null ? Math.round(e) : undefined
      })(),
      resting_hr_bpm: rRest,
      apple_workouts_count: aWc,
      apple_workout_minutes: aWm,
      metadata: meta,
    })
  }
  return rows
}

export function normalizeAppleBundle(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null
  return input as Record<string, unknown>
}
