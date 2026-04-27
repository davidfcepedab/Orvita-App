import type { AppleHealthImportRow } from "@/lib/integrations/appleHealth"
import {
  APPLE_BUNDLE_MAPPED_KEYS,
  APPLE_HEALTH_BUNDLE_SCHEMA_VERSION,
  APPLE_SHORTCUT_BUNDLE_INPUT_KEYS,
  sanitizeBundleToHealthSignals,
} from "@/lib/integrations/appleHealthBundleContract"
import { deriveMetricsFromAppleBundle } from "@/lib/integrations/appleHealthBundle"
import {
  coalesceNumericHealth,
  normalizeAppleHealthPayload,
  type NormalizeAppleHealthPayloadResult,
} from "@/lib/integrations/normalizeAppleHealthPayload"

export type AppleHealthPayloadOk = Extract<NormalizeAppleHealthPayloadResult, { ok: true }>

function collectBundleExtrasCoerced(bundle: Record<string, unknown>): Record<string, number> | undefined {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(bundle)) {
    if (APPLE_BUNDLE_MAPPED_KEYS.has(k)) continue
    const n = coalesceNumericHealth(v)
    if (n === null) continue
    if (!Number.isFinite(n)) continue
    out[k] = n
  }
  return Object.keys(out).length ? out : undefined
}

function readString(obj: Record<string, unknown>, key: string) {
  const v = obj[key]
  return typeof v === "string" ? v : undefined
}

/**
 * Fila de import a partir de `normalizeAppleHealthPayload` + bundle original (extras y claves legadas).
 */
export function buildImportRowFromNormalized(
  n: AppleHealthPayloadOk,
  originalBundle: Record<string, unknown>,
): AppleHealthImportRow[] {
  const m = n.normalized
  const obsIso = n.observed_at_iso

  const sleep_duration_seconds = m.sleep_duration_seconds
  const sleep_hours =
    m.sleep_hours != null && Number.isFinite(m.sleep_hours)
      ? Math.min(36, m.sleep_hours)
      : sleep_duration_seconds != null && sleep_duration_seconds > 0
        ? Math.min(36, sleep_duration_seconds / 3600)
        : undefined

  const wds = m.workouts_duration_seconds
  const workout_minutes_from_sec =
    wds != null && wds > 0 ? Math.min(24 * 60, wds / 60) : undefined

  const wCount = coalesceNumericHealth(originalBundle.workouts_count)
  const wCountR = wCount != null && wCount >= 0 ? Math.round(wCount) : undefined

  const exercise_minutes = coalesceNumericHealth(originalBundle.exercise_minutes) ?? undefined
  const wMinFromBundle = coalesceNumericHealth(originalBundle.workouts_minutes) ?? undefined
  const wMinFinal =
    wMinFromBundle != null && wMinFromBundle > 0
      ? Math.min(24 * 60, wMinFromBundle)
      : workout_minutes_from_sec != null && workout_minutes_from_sec > 0
        ? Math.min(24 * 60, Math.round(workout_minutes_from_sec))
        : undefined

  const readinessFromShortcut = coalesceNumericHealth(originalBundle.readiness_score)

  const derived = deriveMetricsFromAppleBundle({
    observed_at: obsIso,
    steps: m.steps,
    exercise_minutes: exercise_minutes != null ? Math.round(exercise_minutes) : undefined,
    active_energy_kcal: m.active_energy_kcal,
    sleep_hours,
    hrv_ms: m.hrv_ms,
    resting_hr_bpm: m.resting_hr_bpm,
    workouts_count: wCountR,
    workouts_minutes: wMinFinal != null ? Math.round(wMinFinal) : undefined,
    metadata: { readiness_score_from_shortcut: readinessFromShortcut },
  })

  const bundleForSanitize: Record<string, unknown> = { ...originalBundle, ...n.synthetic_bundle, observed_at: n.observed_at }
  for (const [k, v] of Object.entries(m)) {
    if (v !== undefined) bundleForSanitize[k] = v
  }
  const hrvDb = m.hrv_ms != null ? Math.max(0, Math.round(m.hrv_ms)) : derived.hrv_ms
  if (m.hrv_ms != null) bundleForSanitize.hrv_ms = m.hrv_ms
  if (m.steps != null) bundleForSanitize.steps = m.steps
  if (m.resting_hr_bpm != null) bundleForSanitize.resting_hr_bpm = m.resting_hr_bpm
  if (m.active_energy_kcal != null) bundleForSanitize.active_energy_kcal = m.active_energy_kcal
  if (m.workouts_duration_seconds != null) bundleForSanitize.workouts_duration_seconds = m.workouts_duration_seconds
  if (m.sleep_duration_seconds != null) bundleForSanitize.sleep_duration_seconds = m.sleep_duration_seconds

  const training_load =
    m.training_load ??
    coalesceNumericHealth(originalBundle.training_load) ??
    (m.workouts_duration_seconds != null && m.active_energy_kcal != null
      ? m.workouts_duration_seconds * 0.5 + m.active_energy_kcal * 0.2
      : undefined)
  const recovery_score_proxy =
    m.recovery_score_proxy ??
    coalesceNumericHealth(originalBundle.recovery_score_proxy) ??
    (m.hrv_ms != null && m.resting_hr_bpm != null && m.resting_hr_bpm > 0
      ? (m.hrv_ms / m.resting_hr_bpm) * 10
      : undefined)
  if (training_load != null) bundleForSanitize.training_load = training_load
  if (recovery_score_proxy != null) bundleForSanitize.recovery_score_proxy = recovery_score_proxy

  const health_signals = sanitizeBundleToHealthSignals(bundleForSanitize)
  const bundleExtras = n.bundle_extras ?? collectBundleExtrasCoerced(originalBundle)

  const restRounded =
    m.resting_hr_bpm != null && Number.isFinite(m.resting_hr_bpm)
      ? Math.round(Math.min(220, Math.max(30, m.resting_hr_bpm)))
      : undefined
  const wCountInt = wCountR
  const wMinInt = wMinFinal != null && wMinFinal > 0 ? Math.min(24 * 60, Math.round(wMinFinal)) : undefined

  return [
    {
      observed_at: obsIso,
      sleep_hours: derived.sleep_hours ?? undefined,
      hrv_ms: hrvDb ?? undefined,
      readiness_score: readinessFromShortcut != null ? Math.round(readinessFromShortcut) : derived.readiness_score ?? undefined,
      steps: derived.steps ?? undefined,
      calories: derived.calories ?? undefined,
      energy_index: derived.energy_index ?? undefined,
      resting_hr_bpm: restRounded,
      apple_workouts_count: wCountInt,
      apple_workout_minutes: wMinInt,
      metadata: {
        ...derived.metadata,
        import_source_label: n.source_label,
        normalized_import_v1: {
          accepted_metrics: n.accepted_metrics,
          observed_at: n.observed_at,
        },
        shortcut_bundle_keys: Object.keys(originalBundle),
        shortcut_bundle_extras: bundleExtras ?? null,
        apple_sleep_duration_seconds: m.sleep_duration_seconds ?? null,
        apple_workouts_duration_seconds: m.workouts_duration_seconds ?? null,
        apple_workouts_count: wCountInt ?? null,
        resting_hr_bpm: restRounded ?? null,
        workouts_minutes: wMinInt ?? null,
        hrv_ms_precise: m.hrv_ms ?? null,
        ...(Object.keys(health_signals).length
          ? { health_signals, health_bundle_schema_version: APPLE_HEALTH_BUNDLE_SCHEMA_VERSION }
          : {}),
      },
    },
  ]
}

/**
 * Misma lógica histórica, pero `coerce` de strings a número (Atajos) y `observed_at` obligatorio.
 */
function rowsFromAppleBundlePayloadLegacyCoerced(bundle: Record<string, unknown>): AppleHealthImportRow[] {
  const observed_at = readString(bundle, "observed_at")
  if (!observed_at) return []
  const observedAt = new Date(observed_at)
  if (Number.isNaN(observedAt.getTime())) return []

  let steps = coalesceNumericHealth(bundle.steps) ?? undefined
  if (steps != null && steps < 0) steps = undefined
  const exercise_minutes = coalesceNumericHealth(bundle.exercise_minutes) ?? undefined
  const active_energy_kcal = coalesceNumericHealth(bundle.active_energy_kcal) ?? undefined
  const sleep_hours_raw = coalesceNumericHealth(bundle.sleep_hours) ?? undefined
  const sleep_duration_seconds = coalesceNumericHealth(bundle.sleep_duration_seconds) ?? undefined
  const sleep_hours_from_seconds =
    typeof sleep_duration_seconds === "number" && sleep_duration_seconds > 0
      ? Math.min(36, sleep_duration_seconds / 3600)
      : undefined
  const sleep_hours =
    sleep_hours_raw != null && sleep_hours_raw >= 0 ? sleep_hours_raw : sleep_hours_from_seconds

  let hrv_ms = coalesceNumericHealth(bundle.hrv_ms) ?? undefined
  if (hrv_ms != null && (hrv_ms < 5 || hrv_ms > 250)) hrv_ms = undefined
  let resting_hr_bpm = coalesceNumericHealth(bundle.resting_hr_bpm) ?? undefined
  if (resting_hr_bpm != null && (resting_hr_bpm <= 20 || resting_hr_bpm >= 220)) resting_hr_bpm = undefined
  const workouts_count = coalesceNumericHealth(bundle.workouts_count) ?? undefined
  const workouts_minutes_raw = coalesceNumericHealth(bundle.workouts_minutes) ?? undefined
  const workouts_duration_seconds = coalesceNumericHealth(bundle.workouts_duration_seconds) ?? undefined
  const workouts_minutes_from_seconds =
    typeof workouts_duration_seconds === "number" && workouts_duration_seconds > 0
      ? Math.min(24 * 60, workouts_duration_seconds / 60)
      : undefined
  const workouts_minutes =
    typeof workouts_minutes_raw === "number" && workouts_minutes_raw > 0
      ? workouts_minutes_raw
      : workouts_minutes_from_seconds

  const readiness_score = coalesceNumericHealth(bundle.readiness_score) ?? undefined
  const bundleExtras = collectBundleExtrasCoerced(bundle)
  const forSanitize: Record<string, unknown> = { ...bundle }
  for (const k of APPLE_SHORTCUT_BUNDLE_INPUT_KEYS) {
    const c = coalesceNumericHealth(bundle[k])
    if (c != null) forSanitize[k] = c
  }
  const health_signals = sanitizeBundleToHealthSignals(forSanitize)

  const derived = deriveMetricsFromAppleBundle({
    observed_at: observedAt.toISOString(),
    steps,
    exercise_minutes,
    active_energy_kcal,
    sleep_hours,
    hrv_ms,
    resting_hr_bpm,
    workouts_count: workouts_count != null ? Math.round(workouts_count) : undefined,
    workouts_minutes: workouts_minutes != null ? Math.round(workouts_minutes) : undefined,
    metadata: {
      readiness_score_from_shortcut: readiness_score ?? null,
    },
  })

  const hasSignal =
    steps != null ||
    exercise_minutes != null ||
    active_energy_kcal != null ||
    sleep_hours != null ||
    typeof sleep_duration_seconds === "number" ||
    hrv_ms != null ||
    resting_hr_bpm != null ||
    workouts_count != null ||
    workouts_minutes != null ||
    typeof workouts_duration_seconds === "number" ||
    readiness_score != null ||
    (bundleExtras && Object.keys(bundleExtras).length > 0) ||
    Object.keys(health_signals).length > 0

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
      readiness_score: readiness_score != null ? Math.round(readiness_score) : derived.readiness_score ?? undefined,
      steps: derived.steps ?? undefined,
      calories: derived.calories ?? undefined,
      energy_index: derived.energy_index ?? undefined,
      resting_hr_bpm: restRounded,
      apple_workouts_count: wCountInt,
      apple_workout_minutes: wMinInt,
      metadata: {
        ...derived.metadata,
        shortcut_bundle_keys: Object.keys(bundle),
        shortcut_bundle_extras: bundleExtras ?? null,
        apple_sleep_duration_seconds: sleep_duration_seconds ?? null,
        apple_workouts_duration_seconds: workouts_duration_seconds ?? null,
        apple_workouts_count: workouts_count ?? null,
        resting_hr_bpm: restRounded ?? null,
        workouts_minutes: wMinInt ?? null,
        ...(Object.keys(health_signals).length
          ? { health_signals, health_bundle_schema_version: APPLE_HEALTH_BUNDLE_SCHEMA_VERSION }
          : {}),
      },
    },
  ]
}

export function rowsFromAppleBundlePayload(bundle: Record<string, unknown>): AppleHealthImportRow[] {
  const n = normalizeAppleHealthPayload({ apple_bundle: bundle })
  if (n.ok) {
    return buildImportRowFromNormalized(n, bundle)
  }
  return rowsFromAppleBundlePayloadLegacyCoerced(bundle)
}
