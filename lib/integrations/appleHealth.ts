export type AppleHealthImportRow = {
  observed_at?: string
  sleep_hours?: number
  hrv_ms?: number
  readiness_score?: number
  steps?: number
  calories?: number
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
    rows.push({
      observed_at: observedAt.toISOString(),
      sleep_hours: typeof row.sleep_hours === "number" ? row.sleep_hours : undefined,
      hrv_ms: typeof row.hrv_ms === "number" ? Math.round(row.hrv_ms) : undefined,
      readiness_score: typeof row.readiness_score === "number" ? Math.round(row.readiness_score) : undefined,
      steps: typeof row.steps === "number" ? Math.round(row.steps) : undefined,
      calories: typeof row.calories === "number" ? Math.round(row.calories) : undefined,
    })
  }
  return rows
}
