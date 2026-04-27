/**
 * Contrato único: claves del JSON `apple_bundle` (Atajo), instantánea `metadata.health_signals`
 * y etiquetas de UI. Generador Python, merge de importación y documentación deben alinearse aquí.
 */
export const APPLE_HEALTH_BUNDLE_SCHEMA_VERSION = 1 as const

/** Claves que el atajo / clientes pueden enviar en el objeto `apple_bundle` (snake_case). */
export const APPLE_SHORTCUT_BUNDLE_INPUT_KEYS = [
  "observed_at",
  "steps",
  "exercise_minutes",
  "active_energy_kcal",
  "sleep_hours",
  "sleep_duration_seconds",
  "hrv_ms",
  "resting_hr_bpm",
  "workouts_count",
  "workouts_minutes",
  "workouts_duration_seconds",
  "readiness_score",
  "walking_running_m",
  "distance_meters",
  "floors_climbed",
  "vo2_max",
  "vo2max",
  "oxygen_saturation_avg",
  "respiratory_rate",
  "walking_hr_avg",
  "walking_heart_rate_avg",
  "walking_speed_m_s",
  "six_minute_walk_m",
  "body_mass_kg",
  "stand_minutes",
  "sleep_sessions_count",
  "training_load",
  "recovery_score_proxy",
] as const

export type AppleShortcutBundleInputKey = (typeof APPLE_SHORTCUT_BUNDLE_INPUT_KEYS)[number]

/** Claves documentadas: no van a `shortcut_bundle_extras` (solo números desconocidos allí). */
export const APPLE_BUNDLE_MAPPED_KEYS = new Set<string>([
  ...APPLE_SHORTCUT_BUNDLE_INPUT_KEYS,
  "spo2_pct",
])

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

function readFiniteNumber(bundle: Record<string, unknown>, key: string): number | undefined {
  const v = bundle[key]
  return typeof v === "number" && Number.isFinite(v) ? v : undefined
}

/** Primera clave presente con número finito (atajo puede mandar alias `vo2max`, `distance_meters`, etc.). */
function readFiniteNumberFirst(bundle: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const n = readFiniteNumber(bundle, key)
    if (n !== undefined) return n
  }
  return undefined
}

/** SpO₂: HealthKit suele mandar 0–1; si ya viene como %, respétalo. */
export function normalizeOxygenToSpo2Pct(raw: number): number {
  if (raw > 0 && raw <= 1.5) return Math.round(raw * 1000) / 10
  return clamp(raw, 70, 100)
}

/**
 * Instantánea numérica estable para `metadata.health_signals` (orden fijo de inserción).
 * Incluye lo que haya en el bundle, con clamps suaves; `spo2_pct` se deriva de `oxygen_saturation_avg`.
 */
export function sanitizeBundleToHealthSignals(bundle: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {}

  const put = (key: string, value: number | undefined, fn?: (n: number) => number) => {
    if (value === undefined) return
    const v = fn ? fn(value) : value
    if (!Number.isFinite(v)) return
    out[key] = v
  }

  put("steps", readFiniteNumber(bundle, "steps"), (n) => clamp(Math.round(n), 0, 120_000))
  put("exercise_minutes", readFiniteNumber(bundle, "exercise_minutes"), (n) => clamp(Math.round(n), 0, 24 * 60))
  put("active_energy_kcal", readFiniteNumber(bundle, "active_energy_kcal"), (n) => clamp(Math.round(n), 0, 12_000))
  put("sleep_hours", readFiniteNumber(bundle, "sleep_hours"), (n) => clamp(n, 0, 24))
  put("sleep_duration_seconds", readFiniteNumber(bundle, "sleep_duration_seconds"), (n) =>
    clamp(Math.round(n), 0, 36 * 3600),
  )
  put("hrv_ms", readFiniteNumber(bundle, "hrv_ms"), (n) => clamp(Math.round(n), 5, 250))
  put("resting_hr_bpm", readFiniteNumber(bundle, "resting_hr_bpm"), (n) => clamp(Math.round(n), 30, 220))
  put("workouts_count", readFiniteNumber(bundle, "workouts_count"), (n) => clamp(Math.round(n), 0, 50))
  put("workouts_minutes", readFiniteNumber(bundle, "workouts_minutes"), (n) => clamp(Math.round(n), 0, 24 * 60))
  put("workouts_duration_seconds", readFiniteNumber(bundle, "workouts_duration_seconds"), (n) =>
    clamp(Math.round(n), 0, 36 * 3600),
  )
  put("readiness_score", readFiniteNumber(bundle, "readiness_score"), (n) => clamp(Math.round(n), 0, 100))

  put(
    "walking_running_m",
    readFiniteNumberFirst(bundle, ["walking_running_m", "distance_meters"]),
    (n) => clamp(Math.round(n), 0, 100_000),
  )
  put("floors_climbed", readFiniteNumber(bundle, "floors_climbed"), (n) => clamp(Math.round(n), 0, 500))
  put("vo2_max", readFiniteNumberFirst(bundle, ["vo2_max", "vo2max"]), (n) => clamp(Math.round(n * 10) / 10, 10, 90))
  put("respiratory_rate", readFiniteNumber(bundle, "respiratory_rate"), (n) => clamp(Math.round(n * 10) / 10, 4, 40))
  put(
    "walking_hr_avg",
    readFiniteNumberFirst(bundle, ["walking_hr_avg", "walking_heart_rate_avg"]),
    (n) => clamp(Math.round(n), 40, 200),
  )
  put("stand_minutes", readFiniteNumber(bundle, "stand_minutes"), (n) => clamp(Math.round(n), 0, 24 * 60))
  put("sleep_sessions_count", readFiniteNumber(bundle, "sleep_sessions_count"), (n) => clamp(Math.round(n), 0, 80))
  put("training_load", readFiniteNumber(bundle, "training_load"), (n) => clamp(Math.round(n * 10) / 10, 0, 1_000_000))
  put("recovery_score_proxy", readFiniteNumber(bundle, "recovery_score_proxy"), (n) =>
    clamp(Math.round(n * 10) / 10, 0, 500),
  )
  put("walking_speed_m_s", readFiniteNumber(bundle, "walking_speed_m_s"), (n) => clamp(Math.round(n * 100) / 100, 0, 4))
  put("six_minute_walk_m", readFiniteNumber(bundle, "six_minute_walk_m"), (n) => clamp(Math.round(n), 0, 2000))
  put("body_mass_kg", readFiniteNumber(bundle, "body_mass_kg"), (n) => clamp(Math.round(n * 10) / 10, 25, 300))

  const oxy = readFiniteNumber(bundle, "oxygen_saturation_avg")
  if (oxy !== undefined) {
    out.spo2_pct = normalizeOxygenToSpo2Pct(oxy)
  }
  const spo2Direct = readFiniteNumber(bundle, "spo2_pct")
  if (spo2Direct !== undefined && oxy === undefined) {
    out.spo2_pct = normalizeOxygenToSpo2Pct(spo2Direct)
  }

  const ordered: Record<string, number> = {}
  for (const k of HEALTH_SIGNALS_STABLE_ORDER) {
    if (out[k] !== undefined) ordered[k] = out[k]!
  }
  for (const [k, v] of Object.entries(out)) {
    if (ordered[k] === undefined) ordered[k] = v
  }
  return ordered
}

/** Orden estable al serializar `health_signals` (lectura humana / diffs). */
export const HEALTH_SIGNALS_STABLE_ORDER = [
  "steps",
  "exercise_minutes",
  "active_energy_kcal",
  "sleep_hours",
  "sleep_duration_seconds",
  "sleep_sessions_count",
  "hrv_ms",
  "resting_hr_bpm",
  "readiness_score",
  "workouts_count",
  "workouts_minutes",
  "workouts_duration_seconds",
  "walking_running_m",
  "stand_minutes",
  "floors_climbed",
  "vo2_max",
  "spo2_pct",
  "respiratory_rate",
  "walking_hr_avg",
  "walking_speed_m_s",
  "six_minute_walk_m",
  "body_mass_kg",
  "training_load",
  "recovery_score_proxy",
] as const

/** Etiquetas en castellano para tarjetas (clave = clave en `health_signals` / bundle). */
export const HEALTH_SIGNAL_LABEL_ES: Record<string, string> = {
  steps: "Pasos",
  exercise_minutes: "Min. ejercicio (Apple)",
  active_energy_kcal: "Energía activa (kcal)",
  sleep_hours: "Sueño (h)",
  sleep_duration_seconds: "Sueño (s)",
  hrv_ms: "HRV",
  resting_hr_bpm: "FC en reposo",
  readiness_score: "Readiness (atajo)",
  workouts_count: "Entrenos",
  workouts_minutes: "Min. entreno",
  workouts_duration_seconds: "Duración entrenos (s)",
  walking_running_m: "Distancia caminar/correr (m)",
  stand_minutes: "Min. de pie (Apple)",
  sleep_sessions_count: "Sesiones de sueño",
  floors_climbed: "Plantas (escaleras)",
  vo2_max: "VO₂ máx.",
  spo2_pct: "SpO₂ (%)",
  oxygen_saturation_avg: "SpO₂ (media HK)",
  respiratory_rate: "Frecuencia respiratoria",
  walking_hr_avg: "FC media al caminar",
  walking_speed_m_s: "Velocidad al caminar (m/s)",
  six_minute_walk_m: "Test 6 min (m)",
  body_mass_kg: "Peso (kg)",
  training_load: "Carga de entreno (proxy)",
  recovery_score_proxy: "Recuperación (proxy)",
}

export const HEALTH_SIGNAL_UNIT_ES: Record<string, string> = {
  steps: "",
  exercise_minutes: "min",
  active_energy_kcal: "kcal",
  sleep_hours: "h",
  sleep_duration_seconds: "s",
  hrv_ms: "ms",
  resting_hr_bpm: "lpm",
  readiness_score: "/100",
  workouts_count: "",
  workouts_minutes: "min",
  workouts_duration_seconds: "s",
  walking_running_m: "m",
  floors_climbed: "",
  vo2_max: "ml/kg/min",
  spo2_pct: "%",
  respiratory_rate: "rpm",
  walking_hr_avg: "lpm",
  walking_speed_m_s: "m/s",
  six_minute_walk_m: "m",
  body_mass_kg: "kg",
  stand_minutes: "min",
  sleep_sessions_count: "",
  training_load: "",
  recovery_score_proxy: "",
}

/** Claves que ya muestra la franja principal de Salud (evitar duplicar en “Señales extendidas”). */
export const HEALTH_SIGNALS_HIDDEN_WHEN_PRIMARY_SHOWN = new Set([
  "steps",
  "sleep_hours",
  "hrv_ms",
  "readiness_score",
  "active_energy_kcal",
  "workouts_count",
  "workouts_minutes",
  "workouts_duration_seconds",
])
