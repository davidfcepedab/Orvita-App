import type { AppleHealthImportRow } from "@/lib/integrations/appleHealth"
import { deriveMetricsFromAppleBundle } from "@/lib/integrations/appleHealthBundle"

function readNumber(obj: Record<string, unknown>, key: string) {
  const v = obj[key]
  return typeof v === "number" && Number.isFinite(v) ? v : undefined
}

function readString(obj: Record<string, unknown>, key: string) {
  const v = obj[key]
  return typeof v === "string" ? v : undefined
}

export function rowsFromAppleBundlePayload(bundle: Record<string, unknown>): AppleHealthImportRow[] {
  const observed_at = readString(bundle, "observed_at") ?? new Date().toISOString()
  const observedAt = new Date(observed_at)
  if (Number.isNaN(observedAt.getTime())) return []

  const steps = readNumber(bundle, "steps")
  const active_energy_kcal = readNumber(bundle, "active_energy_kcal")
  const sleep_hours_raw = readNumber(bundle, "sleep_hours")
  const sleep_duration_seconds = readNumber(bundle, "sleep_duration_seconds")
  const sleep_hours_from_seconds =
    typeof sleep_duration_seconds === "number" && sleep_duration_seconds > 0
      ? Math.min(24, sleep_duration_seconds / 3600)
      : undefined
  const sleep_hours =
    typeof sleep_hours_raw === "number" && sleep_hours_raw > 0 ? sleep_hours_raw : sleep_hours_from_seconds

  const hrv_ms = readNumber(bundle, "hrv_ms")
  const resting_hr_bpm = readNumber(bundle, "resting_hr_bpm")
  const workouts_count = readNumber(bundle, "workouts_count")
  const workouts_minutes_raw = readNumber(bundle, "workouts_minutes")
  const workouts_duration_seconds = readNumber(bundle, "workouts_duration_seconds")
  const workouts_minutes_from_seconds =
    typeof workouts_duration_seconds === "number" && workouts_duration_seconds > 0
      ? Math.min(24 * 60, workouts_duration_seconds / 60)
      : undefined
  const workouts_minutes =
    typeof workouts_minutes_raw === "number" && workouts_minutes_raw > 0
      ? workouts_minutes_raw
      : workouts_minutes_from_seconds

  const readiness_score = readNumber(bundle, "readiness_score")

  const derived = deriveMetricsFromAppleBundle({
    observed_at: observedAt.toISOString(),
    steps,
    active_energy_kcal,
    sleep_hours,
    hrv_ms,
    resting_hr_bpm,
    workouts_count: workouts_count !== undefined ? Math.round(workouts_count) : undefined,
    workouts_minutes: workouts_minutes !== undefined ? Math.round(workouts_minutes) : undefined,
    metadata: {
      readiness_score_from_shortcut: readiness_score ?? null,
    },
  })

  const hasSignal =
    steps !== undefined ||
    active_energy_kcal !== undefined ||
    sleep_hours !== undefined ||
    typeof sleep_duration_seconds === "number" ||
    hrv_ms !== undefined ||
    resting_hr_bpm !== undefined ||
    workouts_count !== undefined ||
    workouts_minutes !== undefined ||
    typeof workouts_duration_seconds === "number" ||
    readiness_score !== undefined

  if (!hasSignal) return []

  const restRounded =
    typeof resting_hr_bpm === "number" && Number.isFinite(resting_hr_bpm)
      ? Math.round(Math.min(220, Math.max(30, resting_hr_bpm)))
      : undefined
  const wCountInt =
    typeof workouts_count === "number" && Number.isFinite(workouts_count) && workouts_count >= 0
      ? Math.round(workouts_count)
      : undefined
  const wMinInt =
    typeof workouts_minutes === "number" && Number.isFinite(workouts_minutes) && workouts_minutes > 0
      ? Math.min(24 * 60, Math.round(workouts_minutes))
      : undefined

  return [
    {
      observed_at: observedAt.toISOString(),
      sleep_hours: derived.sleep_hours ?? undefined,
      hrv_ms: derived.hrv_ms ?? undefined,
      readiness_score: readiness_score ?? derived.readiness_score ?? undefined,
      steps: derived.steps ?? undefined,
      calories: derived.calories ?? undefined,
      energy_index: derived.energy_index ?? undefined,
      resting_hr_bpm: restRounded,
      apple_workouts_count: wCountInt,
      apple_workout_minutes: wMinInt,
      metadata: {
        ...derived.metadata,
        shortcut_bundle_keys: Object.keys(bundle),
        apple_sleep_duration_seconds: sleep_duration_seconds ?? null,
        apple_workouts_duration_seconds: workouts_duration_seconds ?? null,
        apple_workouts_count: workouts_count ?? null,
        resting_hr_bpm: restRounded ?? null,
        workouts_minutes: wMinInt ?? null,
      },
    },
  ]
}
