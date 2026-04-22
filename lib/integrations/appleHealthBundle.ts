type AppleBundle = {
  observed_at?: string
  steps?: number
  active_energy_kcal?: number
  sleep_hours?: number
  hrv_ms?: number
  resting_hr_bpm?: number
  workouts_count?: number
  workouts_minutes?: number
  metadata?: Record<string, unknown>
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(n)))
}

export function deriveMetricsFromAppleBundle(bundle: AppleBundle) {
  const sleep = typeof bundle.sleep_hours === "number" ? bundle.sleep_hours : null
  const steps = typeof bundle.steps === "number" ? clampInt(bundle.steps, 0, 120_000) : null
  const active = typeof bundle.active_energy_kcal === "number" ? clampInt(bundle.active_energy_kcal, 0, 12_000) : null
  const hrv = typeof bundle.hrv_ms === "number" ? clampInt(bundle.hrv_ms, 5, 250) : null
  const resting = typeof bundle.resting_hr_bpm === "number" ? clampInt(bundle.resting_hr_bpm, 35, 110) : null

  let readiness: number | null = null
  if (sleep !== null || steps !== null || hrv !== null || resting !== null) {
    const sleepScore = sleep === null ? 55 : clampInt(sleep * 12, 0, 100)
    const stepScore = steps === null ? 55 : clampInt((steps / 12_000) * 100, 0, 100)
    const hrvScore = hrv === null ? 55 : clampInt(hrv * 1.15, 0, 100)
    const hrScore = resting === null ? 60 : clampInt(120 - resting, 0, 100)
    readiness = clampInt(sleepScore * 0.35 + stepScore * 0.25 + hrvScore * 0.25 + hrScore * 0.15, 35, 98)
  }

  return {
    sleep_hours: sleep,
    steps,
    calories: active,
    hrv_ms: hrv,
    readiness_score: readiness,
    energy_index: readiness,
    metadata: {
      apple_bundle: true,
      workouts_count: bundle.workouts_count ?? null,
      workouts_minutes: bundle.workouts_minutes ?? null,
      resting_hr_bpm: resting,
      ...(bundle.metadata ?? {}),
    } satisfies Record<string, unknown>,
  }
}
