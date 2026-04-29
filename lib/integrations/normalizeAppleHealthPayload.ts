import { agendaTodayYmd } from "@/lib/agenda/localDateKey"
import {
  APPLE_BUNDLE_MAPPED_KEYS,
  APPLE_SHORTCUT_BUNDLE_INPUT_KEYS,
  normalizeOxygenToSpo2Pct,
  type AppleShortcutBundleInputKey,
} from "@/lib/integrations/appleHealthBundleContract"

/**
 * Claves solo de **respuesta** del POST import (o reintento): no son métricas.
 * Si el atajo vuelve a mandar el JSON de Órvita (p. ej. con `syncedAt` del día siguiente en UTC),
 * no deben acabar en el bundle plano ni pisar heurísticas.
 */
export const HEALTH_IMPORT_RESPONSE_ECHO_KEYS = [
  "success",
  "imported",
  "syncedAt",
  "synced_at",
  "health_metrics_source",
  "accepted_metrics",
  "normalized",
  "observed_at_inferred",
  "received_keys",
  "raw_payload_debug",
  "hint",
  "error",
  "field_errors",
  "orvita_fix",
] as const

const RESERVED_BODY_KEYS = new Set<string>([
  "source",
  "schema_version",
  "import_token",
  "entries",
  "apple_bundle",
  ...HEALTH_IMPORT_RESPONSE_ECHO_KEYS,
])

/** Quita del cuerpo o del `apple_bundle` las claves que solo vienen de la respuesta API (p. ej. `syncedAt`). */
export function stripAppleHealthImportEchoFromRecord(o: Record<string, unknown>): void {
  for (const k of HEALTH_IMPORT_RESPONSE_ECHO_KEYS) {
    delete o[k]
  }
}

/** Claves de métricas reconocidas en cuerpo plano (sin `observed_at`). */
export const APPLE_IMPORT_METRIC_KEYS = APPLE_SHORTCUT_BUNDLE_INPUT_KEYS.filter((k) => k !== "observed_at")

export type AppleImportMetricKey = Exclude<AppleShortcutBundleInputKey, "observed_at">

export type NormalizedAppleHealthMetrics = {
  steps?: number
  exercise_minutes?: number
  active_energy_kcal?: number
  sleep_hours?: number
  sleep_duration_seconds?: number
  sleep_sessions_count?: number
  /** ms, 1 decimal */
  hrv_ms?: number
  resting_hr_bpm?: number
  workouts_count?: number
  workouts_minutes?: number
  workouts_duration_seconds?: number
  walking_running_m?: number
  stand_minutes?: number
  readiness_score?: number
  vo2_max?: number
  spo2_pct?: number
  respiratory_rate?: number
  walking_hr_avg?: number
  walking_speed_m_s?: number
  six_minute_walk_m?: number
  body_mass_kg?: number
  training_load?: number
  recovery_score_proxy?: number
}

type Ok = {
  ok: true
  observed_at: string
  /** true si el día se infirió (Atajos envió fecha vacía/null aunque haya números) */
  observed_at_inferred: boolean
  source_label: string | null
  /** ISO para DB / respuestas (derivado de observed_at) */
  observed_at_iso: string
  accepted_metrics: (keyof NormalizedAppleHealthMetrics)[]
  normalized: NormalizedAppleHealthMetrics
  /** true si al menos un número útil vino de claves mapeadas o extras, para metadata */
  has_bundle_extras: boolean
  /** Claves no primarias (p. ej. vo2) con número finito, para `shortcut_bundle_extras` */
  bundle_extras: Record<string, number> | undefined
  /** Bundle “limpio” para `sanitizeBundleToHealthSignals` (números finitos) */
  synthetic_bundle: Record<string, unknown>
}

type Err = {
  ok: false
  error: string
  received_keys: string[]
  hint: string
  field_errors: Record<string, string>
}

export type NormalizeAppleHealthPayloadResult = Ok | Err

const NO_METRIC = "No numeric health metrics received"

const HINT = "Send apple_bundle or flat payload with at least one numeric metric."

const EMPTYish = new Set(["", "null", "undefined", "nan"])

export function isEmptyishHealthValue(v: unknown): boolean {
  if (v === null || v === undefined) return true
  if (typeof v === "string") {
    const t = v.trim()
    if (t.length === 0) return true
    if (EMPTYish.has(t.toLowerCase())) return true
    if (/^no\s+encontrado$/i.test(t)) return true
  }
  return false
}

/**
 * Acepta números, strings numéricas y decimales con coma. Devuelve null si no es usable.
 */
export function coalesceNumericHealth(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (isEmptyishHealthValue(v)) return null
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string") {
    const t = v.trim().replace(",", ".")
    if (t.length === 0) return null
    const n = Number(t)
    return Number.isFinite(n) ? n : null
  }
  return null
}

function parseObservedAtToIso(raw: unknown): { iso: string; ymd: string } | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === "boolean") return null
  if (Array.isArray(raw) && raw.length === 1) {
    return parseObservedAtToIso(raw[0])
  }
  if (typeof raw === "string" && isEmptyishHealthValue(raw)) return null
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const ms = raw > 0 && raw < 1_000_000_000_000 ? raw * 1000 : raw
    const dt = new Date(ms)
    if (Number.isNaN(dt.getTime())) return null
    const y2 = dt.getUTCFullYear()
    const m2 = String(dt.getUTCMonth() + 1).padStart(2, "0")
    const d2 = String(dt.getUTCDate()).padStart(2, "0")
    return { iso: dt.toISOString(), ymd: `${y2}-${m2}-${d2}` }
  }
  let s0 = typeof raw === "string" ? raw.trim() : String(raw)
  if (s0 === "[object Object]") return null
  if (s0.length === 0) return null
  if (s0.length >= 2 && s0.startsWith("\"") && s0.endsWith("\"")) {
    s0 = s0.slice(1, -1).trim()
  }
  if (s0.length === 0) return null
  if (/^\d{10,16}$/.test(s0)) {
    return parseObservedAtToIso(Number(s0))
  }
  const ymdStrict = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s0)
  if (ymdStrict) {
    const y = Number(ymdStrict[1])
    const m = Number(ymdStrict[2]) - 1
    const d = Number(ymdStrict[3])
    const dt = new Date(Date.UTC(y, m, d, 12, 0, 0, 0))
    if (Number.isNaN(dt.getTime())) return null
    return { iso: dt.toISOString(), ymd: s0 }
  }
  const ymdLax = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:$|[Tt\sZz+-])/.exec(s0)
  if (ymdLax) {
    const y = Number(ymdLax[1])
    const m = Number(ymdLax[2]) - 1
    const d = Number(ymdLax[3])
    if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
      const dt = new Date(Date.UTC(y, m, d, 12, 0, 0, 0))
      if (Number.isNaN(dt.getTime())) return null
      const y2 = String(dt.getUTCFullYear())
      const m2 = String(dt.getUTCMonth() + 1).padStart(2, "0")
      const d2 = String(dt.getUTCDate()).padStart(2, "0")
      const ymd = `${y2}-${m2}-${d2}`
      return { iso: dt.toISOString(), ymd }
    }
  }
  const dt = new Date(s0)
  if (Number.isNaN(dt.getTime())) return null
  const y2 = dt.getUTCFullYear()
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const d2 = String(dt.getUTCDate()).padStart(2, "0")
  return { iso: dt.toISOString(), ymd: `${y2}-${m2}-${d2}` }
}

/**
 * Cuerpo raíz y bundle: Atajos a veces pone `observed_at` en un sitio y no en el otro, o bajo "date"/"fecha".
 */
function firstParsedObservedFromBody(
  body: Record<string, unknown>,
  bundle: Record<string, unknown>,
): { iso: string; ymd: string } | null {
  const cands: unknown[] = [
    bundle.observed_at,
    body.observed_at,
    body.date,
    (body as Record<string, unknown>).fecha,
    (body as Record<string, unknown>).observedAt,
  ]
  for (const c of cands) {
    const o = parseObservedAtToIso(c)
    if (o) return o
  }
  return null
}

function strictObservedAtEnv(): boolean {
  const v = process.env.ORVITA_HEALTH_STRICT_OBSERVED_AT
  return v === "1" || v === "true"
}

/** Números reales (métricas) aunque no haya `observed_at` útil. */
function bundleHasPlausibleMetrics(bundle: Record<string, unknown>): boolean {
  for (const [k, v] of Object.entries(bundle)) {
    if (k === "source" || k === "schema_version" || k === "import_token" || k === "entries") continue
    if (k === "observed_at") continue
    if (coalesceNumericHealth(v) != null) return true
  }
  return false
}

/** Día civil de la app (`NEXT_PUBLIC_AGENDA_DISPLAY_TZ`), no medianoche UTC — evita “mañana” en América por la noche. */
function observedAtInferredToday(): { iso: string; ymd: string } {
  const ymd = agendaTodayYmd()
  return parseObservedAtToIso(ymd) as { iso: string; ymd: string }
}

function takeMetric(
  bundle: Record<string, unknown>,
  key: string,
  validate: (n: number) => { v: number } | { err: string },
  field_errors: Record<string, string>,
): number | undefined {
  const c = coalesceNumericHealth(bundle[key])
  if (c === null) return undefined
  const r = validate(c)
  if ("err" in r) {
    field_errors[key] = r.err
    return undefined
  }
  return r.v
}

function takeMetricFirst(
  bundle: Record<string, unknown>,
  keys: readonly string[],
  validate: (n: number) => { v: number } | { err: string },
  field_errors: Record<string, string>,
): number | undefined {
  for (const key of keys) {
    const c = coalesceNumericHealth(bundle[key])
    if (c === null) continue
    const r = validate(c)
    if ("err" in r) {
      field_errors[key] = r.err
      continue
    }
    return r.v
  }
  return undefined
}

const MAX_SLEEP_SECONDS = 36 * 3600

/** Orden estable de `accepted_metrics` en respuestas API. */
const ACCEPTED_METRICS_STABLE_ORDER: (keyof NormalizedAppleHealthMetrics)[] = [
  "steps",
  "exercise_minutes",
  "active_energy_kcal",
  "sleep_duration_seconds",
  "sleep_hours",
  "sleep_sessions_count",
  "hrv_ms",
  "resting_hr_bpm",
  "workouts_count",
  "workouts_minutes",
  "workouts_duration_seconds",
  "walking_running_m",
  "stand_minutes",
  "readiness_score",
  "vo2_max",
  "spo2_pct",
  "respiratory_rate",
  "walking_hr_avg",
  "walking_speed_m_s",
  "six_minute_walk_m",
  "body_mass_kg",
  "training_load",
  "recovery_score_proxy",
]

function sortAcceptedMetrics(accepted: (keyof NormalizedAppleHealthMetrics)[]): (keyof NormalizedAppleHealthMetrics)[] {
  const bag = new Set(accepted)
  const seen = new Set<string>()
  const out: (keyof NormalizedAppleHealthMetrics)[] = []
  for (const k of ACCEPTED_METRICS_STABLE_ORDER) {
    if (bag.has(k) && !seen.has(k)) {
      out.push(k)
      seen.add(k)
    }
  }
  for (const k of accepted) {
    if (!seen.has(k)) {
      out.push(k)
      seen.add(k)
    }
  }
  return out
}

function takeVo2Max(bundle: Record<string, unknown>, field_errors: Record<string, string>): number | undefined {
  for (const key of ["vo2_max", "vo2max"] as const) {
    const c = coalesceNumericHealth(bundle[key])
    if (c === null) continue
    if (c === 0) continue
    if (!Number.isFinite(c)) {
      field_errors[key] = "not a finite number"
      continue
    }
    const v = Math.min(90, Math.max(10, Math.round(c * 10) / 10))
    return v
  }
  return undefined
}

function collectNumericExtras(bundle: Record<string, unknown>, field_errors: Record<string, string>) {
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(bundle)) {
    if (APPLE_BUNDLE_MAPPED_KEYS.has(k)) continue
    const n = coalesceNumericHealth(v)
    if (n === null) continue
    if (!Number.isFinite(n)) {
      field_errors[k] = "not a finite number"
      continue
    }
    out[k] = n
  }
  return Object.keys(out).length ? out : undefined
}

/**
 * Acepta:
 * - `{ apple_bundle: { ... } }` con o sin `source` / `schema_version`
 * - Payload plano con las mismas claves (sin anidar)
 */
/**
 * iOS Atajos a veces pasa `apple_bundle` como *texto* con JSON adentro (no como diccionario anidado).
 * Sin esto, el cuerpo solo tiene la clave `apple_bundle` y el servidor no ve métricas.
 */
function coalesceAppleBundleValue(raw: unknown): Record<string, unknown> | null {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>
  }
  if (typeof raw === "string" && raw.trim().length > 0) {
    try {
      const parsed = JSON.parse(raw) as unknown
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      return null
    }
  }
  return null
}

export function extractHealthBundleFromBody(body: unknown): { bundle: Record<string, unknown>; received_keys: string[] } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null
  const b = body as Record<string, unknown>
  const ab = coalesceAppleBundleValue(b.apple_bundle)
  if (ab) {
    stripAppleHealthImportEchoFromRecord(ab)
    return { bundle: ab, received_keys: Object.keys(b) }
  }
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(b)) {
    if (RESERVED_BODY_KEYS.has(k)) continue
    out[k] = v
  }
  const keys = Object.keys(out)
  if (keys.length === 0) return null
  const hasSignal =
    "observed_at" in out ||
    APPLE_IMPORT_METRIC_KEYS.some((m) => m in out) ||
    keys.some((k) => !APPLE_BUNDLE_MAPPED_KEYS.has(k))
  if (!hasSignal) return null
  return { bundle: out, received_keys: Object.keys(b) }
}

/**
 * Validación y redondeo alineado con el contrato del atajo (RESET OS / Órvita).
 */
export function normalizeAppleHealthPayload(input: unknown): NormalizeAppleHealthPayloadResult {
  const field_errors: Record<string, string> = {}
  const topKeys = input && typeof input === "object" && !Array.isArray(input) ? Object.keys(input as object) : []

  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, error: NO_METRIC, received_keys: topKeys, hint: HINT, field_errors: {} }
  }
  const body = input as Record<string, unknown>
  const ext = extractHealthBundleFromBody(input)
  if (!ext) {
    return { ok: false, error: NO_METRIC, received_keys: topKeys, hint: HINT, field_errors: {} }
  }
  const { bundle, received_keys } = ext

  const source_label = typeof body.source === "string" ? body.source.trim() || null : null

  let o = firstParsedObservedFromBody(body, bundle)
  let observed_at_inferred = false
  if (!o && !strictObservedAtEnv() && bundleHasPlausibleMetrics(bundle)) {
    o = observedAtInferredToday()
    observed_at_inferred = true
  }
  if (!o) {
    field_errors.observed_at = "required (yyyy-MM-dd o ISO 8601)"
    return {
      ok: false,
      error: "observed_at is required and must be a valid date",
      received_keys: topKeys,
      hint: "Include observed_at as yyyy-MM-dd in apple_bundle or in the body.",
      field_errors,
    }
  }
  const { iso: observed_at_iso, ymd: observed_ymd } = o
  const observed_at = observed_ymd

  const n: NormalizedAppleHealthMetrics = {}
  const accepted: (keyof NormalizedAppleHealthMetrics)[] = []

  const pushAcc = (key: keyof NormalizedAppleHealthMetrics) => {
    accepted.push(key)
  }

  const steps = takeMetric(
    bundle,
    "steps",
    (v) => (v >= 0 ? { v: Math.round(v) } : { err: "must be >= 0" }),
    field_errors,
  )
  if (steps !== undefined) {
    n.steps = steps
    pushAcc("steps")
  }

  const exercise = takeMetric(
    bundle,
    "exercise_minutes",
    (v) => (v >= 0 && v <= 1440 ? { v: Math.round(v) } : { err: "must be 0–1440" }),
    field_errors,
  )
  if (exercise !== undefined) {
    n.exercise_minutes = exercise
    pushAcc("exercise_minutes")
  }

  const hrv = takeMetric(
    bundle,
    "hrv_ms",
    (v) =>
      v >= 5 && v <= 250 ? { v: Math.round(v * 10) / 10 } : { err: "must be 5–250 (ms)" },
    field_errors,
  )
  if (hrv !== undefined) {
    n.hrv_ms = hrv
    pushAcc("hrv_ms")
  }

  const rhr = takeMetric(
    bundle,
    "resting_hr_bpm",
    (v) => (v > 20 && v < 220 ? { v: Math.round(v) } : { err: "must be > 20 and < 220" }),
    field_errors,
  )
  if (rhr !== undefined) {
    n.resting_hr_bpm = rhr
    pushAcc("resting_hr_bpm")
  }

  const aek = takeMetric(
    bundle,
    "active_energy_kcal",
    (v) => (v >= 0 ? { v: Math.round(v * 10) / 10 } : { err: "must be >= 0" }),
    field_errors,
  )
  if (aek !== undefined) {
    n.active_energy_kcal = aek
    pushAcc("active_energy_kcal")
  }

  const wds = takeMetric(
    bundle,
    "workouts_duration_seconds",
    (v) => (v >= 0 ? { v: Math.round(v) } : { err: "must be >= 0" }),
    field_errors,
  )
  if (wds !== undefined) {
    n.workouts_duration_seconds = wds
    pushAcc("workouts_duration_seconds")
  }

  const wCount = takeMetric(
    bundle,
    "workouts_count",
    (v) => (v >= 0 && v <= 50 ? { v: Math.round(v) } : { err: "must be 0–50" }),
    field_errors,
  )
  if (wCount !== undefined) {
    n.workouts_count = wCount
    pushAcc("workouts_count")
  }

  const wMin = takeMetric(
    bundle,
    "workouts_minutes",
    (v) => (v >= 0 && v <= 1440 ? { v: Math.round(v) } : { err: "must be 0–1440" }),
    field_errors,
  )
  if (wMin !== undefined) {
    n.workouts_minutes = wMin
    pushAcc("workouts_minutes")
  }

  const stand = takeMetric(
    bundle,
    "stand_minutes",
    (v) => (v >= 0 && v <= 1440 ? { v: Math.round(v) } : { err: "must be 0–1440" }),
    field_errors,
  )
  if (stand !== undefined) {
    n.stand_minutes = stand
    pushAcc("stand_minutes")
  }

  const readiness = takeMetric(
    bundle,
    "readiness_score",
    (v) => (v >= 0 && v <= 100 ? { v: Math.round(v) } : { err: "must be 0–100" }),
    field_errors,
  )
  if (readiness !== undefined) {
    n.readiness_score = readiness
    pushAcc("readiness_score")
  }

  const sleepSessions = takeMetric(
    bundle,
    "sleep_sessions_count",
    (v) => (v >= 0 && v <= 80 ? { v: Math.round(v) } : { err: "must be 0–80" }),
    field_errors,
  )
  if (sleepSessions !== undefined) {
    n.sleep_sessions_count = sleepSessions
    pushAcc("sleep_sessions_count")
  }

  const walkRun = takeMetricFirst(
    bundle,
    ["walking_running_m", "distance_meters"],
    (v) => (v >= 0 && v <= 100_000 ? { v: Math.round(v) } : { err: "must be 0–100000 m" }),
    field_errors,
  )
  if (walkRun !== undefined) {
    n.walking_running_m = walkRun
    pushAcc("walking_running_m")
  }

  const walkHr = takeMetricFirst(
    bundle,
    ["walking_hr_avg", "walking_heart_rate_avg"],
    (v) => (v >= 40 && v <= 200 ? { v: Math.round(v) } : { err: "must be 40–200" }),
    field_errors,
  )
  if (walkHr !== undefined) {
    n.walking_hr_avg = walkHr
    pushAcc("walking_hr_avg")
  }

  const walkSpeed = takeMetric(
    bundle,
    "walking_speed_m_s",
    (v) => (v >= 0 && v <= 4 ? { v: Math.round(v * 100) / 100 } : { err: "must be 0–4" }),
    field_errors,
  )
  if (walkSpeed !== undefined) {
    n.walking_speed_m_s = walkSpeed
    pushAcc("walking_speed_m_s")
  }

  const sixWalk = takeMetric(
    bundle,
    "six_minute_walk_m",
    (v) => (v >= 0 && v <= 2000 ? { v: Math.round(v) } : { err: "must be 0–2000" }),
    field_errors,
  )
  if (sixWalk !== undefined) {
    n.six_minute_walk_m = sixWalk
    pushAcc("six_minute_walk_m")
  }

  const bodyMass = takeMetric(
    bundle,
    "body_mass_kg",
    (v) => (v >= 25 && v <= 300 ? { v: Math.round(v * 10) / 10 } : { err: "must be 25–300" }),
    field_errors,
  )
  if (bodyMass !== undefined) {
    n.body_mass_kg = bodyMass
    pushAcc("body_mass_kg")
  }

  const resp = takeMetric(
    bundle,
    "respiratory_rate",
    (v) => (v >= 4 && v <= 40 ? { v: Math.round(v * 10) / 10 } : { err: "must be 4–40" }),
    field_errors,
  )
  if (resp !== undefined) {
    n.respiratory_rate = resp
    pushAcc("respiratory_rate")
  }

  const tlIn = takeMetric(
    bundle,
    "training_load",
    (v) => (v >= 0 && v <= 1_000_000 ? { v: Math.round(v * 10) / 10 } : { err: "must be 0–1e6" }),
    field_errors,
  )
  if (tlIn !== undefined) {
    n.training_load = tlIn
    pushAcc("training_load")
  }

  const recIn = takeMetric(
    bundle,
    "recovery_score_proxy",
    (v) => (v >= 0 && v <= 500 ? { v: Math.round(v * 10) / 10 } : { err: "must be 0–500" }),
    field_errors,
  )
  if (recIn !== undefined) {
    n.recovery_score_proxy = recIn
    pushAcc("recovery_score_proxy")
  }

  const vo2 = takeVo2Max(bundle, field_errors)
  if (vo2 !== undefined) {
    n.vo2_max = vo2
    pushAcc("vo2_max")
  }

  const oxyIn = coalesceNumericHealth(bundle.oxygen_saturation_avg)
  const spo2In = coalesceNumericHealth(bundle.spo2_pct)
  if (oxyIn != null && Number.isFinite(oxyIn)) {
    n.spo2_pct = normalizeOxygenToSpo2Pct(oxyIn)
    pushAcc("spo2_pct")
  } else if (spo2In != null && Number.isFinite(spo2In)) {
    n.spo2_pct = normalizeOxygenToSpo2Pct(spo2In)
    pushAcc("spo2_pct")
  }

  const sleepSec = takeMetric(
    bundle,
    "sleep_duration_seconds",
    (v) => (v >= 0 ? { v: Math.min(Math.round(v), MAX_SLEEP_SECONDS) } : { err: "must be >= 0" }),
    field_errors,
  )
  if (sleepSec !== undefined) {
    n.sleep_duration_seconds = sleepSec
    pushAcc("sleep_duration_seconds")
    n.sleep_hours = Math.round((sleepSec / 3600) * 1000) / 1000
    pushAcc("sleep_hours")
  } else {
    const sh = takeMetric(
      bundle,
      "sleep_hours",
      (v) => (v >= 0 && v <= 36 ? { v: Math.round(v * 1000) / 1000 } : { err: "must be 0–36 h" }),
      field_errors,
    )
    if (sh !== undefined) {
      n.sleep_hours = sh
      pushAcc("sleep_hours")
      const sec = Math.min(Math.round(sh * 3600), MAX_SLEEP_SECONDS)
      n.sleep_duration_seconds = sec
      pushAcc("sleep_duration_seconds")
    }
  }

  if (n.training_load === undefined && n.workouts_duration_seconds != null && n.active_energy_kcal != null) {
    n.training_load = Math.round((n.workouts_duration_seconds * 0.5 + n.active_energy_kcal * 0.2) * 10) / 10
    pushAcc("training_load")
  }

  if (
    n.recovery_score_proxy === undefined &&
    n.hrv_ms != null &&
    n.resting_hr_bpm != null &&
    n.resting_hr_bpm > 0
  ) {
    n.recovery_score_proxy = Math.round(((n.hrv_ms / n.resting_hr_bpm) * 10) * 10) / 10
    pushAcc("recovery_score_proxy")
  }

  const extras = collectNumericExtras(bundle, field_errors)
  const has_bundle_extras = extras !== undefined

  if (accepted.length === 0 && !has_bundle_extras) {
    return {
      ok: false,
      error: NO_METRIC,
      received_keys: topKeys.length ? topKeys : received_keys,
      hint: HINT,
      field_errors,
    }
  }

  const synthetic_bundle: Record<string, unknown> = { ...bundle, observed_at, ...n }

  return {
    ok: true,
    observed_at,
    observed_at_inferred,
    source_label,
    observed_at_iso,
    accepted_metrics: sortAcceptedMetrics(accepted),
    normalized: n,
    has_bundle_extras,
    bundle_extras: extras,
    synthetic_bundle,
  }
}
