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

export function normalizeAppleHealthRows(input: unknown): AppleHealthImportRow[] {
  if (!Array.isArray(input)) return []
  const rows: AppleHealthImportRow[] = []
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue
    const row = raw as Record<string, unknown>
    const observedRaw = typeof row.observed_at === "string" ? row.observed_at : new Date().toISOString()
    const observedAt = new Date(observedRaw)
    if (Number.isNaN(observedAt.getTime())) continue
    const meta = row.metadata && typeof row.metadata === "object" ? (row.metadata as Record<string, unknown>) : undefined
    const rRest = typeof row.resting_hr_bpm === "number" && Number.isFinite(row.resting_hr_bpm) ? row.resting_hr_bpm : undefined
    const aWc = typeof row.apple_workouts_count === "number" && Number.isFinite(row.apple_workouts_count) ? row.apple_workouts_count : undefined
    const aWm = typeof row.apple_workout_minutes === "number" && Number.isFinite(row.apple_workout_minutes) ? row.apple_workout_minutes : undefined
    rows.push({
      observed_at: observedAt.toISOString(),
      sleep_hours: typeof row.sleep_hours === "number" ? row.sleep_hours : undefined,
      hrv_ms: typeof row.hrv_ms === "number" ? Math.round(row.hrv_ms) : undefined,
      readiness_score: typeof row.readiness_score === "number" ? Math.round(row.readiness_score) : undefined,
      steps: typeof row.steps === "number" ? Math.round(row.steps) : undefined,
      calories: typeof row.calories === "number" ? Math.round(row.calories) : undefined,
      energy_index: typeof row.energy_index === "number" ? Math.round(row.energy_index) : undefined,
      resting_hr_bpm:
        rRest != null ? Math.round(Math.min(220, Math.max(30, rRest))) : undefined,
      apple_workouts_count: aWc != null && aWc >= 0 ? Math.round(aWc) : undefined,
      apple_workout_minutes: aWm != null && aWm > 0 ? Math.min(24 * 60, Math.round(aWm)) : undefined,
      metadata: meta,
    })
  }
  return rows
}

export function normalizeAppleBundle(input: unknown): Record<string, unknown> | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null
  return input as Record<string, unknown>
}
