import { APPLE_BUNDLE_MAPPED_KEYS } from "@/lib/integrations/appleHealthBundleContract"

const RESERVED_BODY_KEYS = new Set(["source", "schema_version", "import_token", "entries", "apple_bundle"])

export const APPLE_IMPORT_METRIC_KEYS = [
  "steps",
  "hrv_ms",
  "resting_hr_bpm",
  "active_energy_kcal",
  "workouts_duration_seconds",
  "sleep_duration_seconds",
  "sleep_hours",
] as const

export type AppleImportMetricKey = (typeof APPLE_IMPORT_METRIC_KEYS)[number]

export type NormalizedAppleHealthMetrics = {
  steps?: number
  /** ms, 1 decimal */
  hrv_ms?: number
  resting_hr_bpm?: number
  active_energy_kcal?: number
  workouts_duration_seconds?: number
  sleep_duration_seconds?: number
}

type Ok = {
  ok: true
  observed_at: string
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
  const s0 = typeof raw === "string" ? raw.trim() : String(raw)
  if (s0.length === 0) return null
  const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s0)
  if (ymd) {
    const y = Number(ymd[1])
    const m = Number(ymd[2]) - 1
    const d = Number(ymd[3])
    const dt = new Date(Date.UTC(y, m, d, 12, 0, 0, 0))
    if (Number.isNaN(dt.getTime())) return null
    return { iso: dt.toISOString(), ymd: s0 }
  }
  const dt = new Date(s0)
  if (Number.isNaN(dt.getTime())) return null
  const y2 = dt.getUTCFullYear()
  const m2 = String(dt.getUTCMonth() + 1).padStart(2, "0")
  const d2 = String(dt.getUTCDate()).padStart(2, "0")
  return { iso: dt.toISOString(), ymd: `${y2}-${m2}-${d2}` }
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
export function extractHealthBundleFromBody(body: unknown): { bundle: Record<string, unknown>; received_keys: string[] } | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null
  const b = body as Record<string, unknown>
  const ab = b.apple_bundle
  if (ab && typeof ab === "object" && !Array.isArray(ab)) {
    return { bundle: ab as Record<string, unknown>, received_keys: Object.keys(b) }
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

  const o = parseObservedAtToIso(bundle.observed_at)
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

  const steps = takeMetric(
    bundle,
    "steps",
    (v) => (v >= 0 ? { v: Math.round(v) } : { err: "must be >= 0" }),
    field_errors,
  )
  if (steps !== undefined) {
    n.steps = steps
    accepted.push("steps")
  }

  const hrv = takeMetric(
    bundle,
    "hrv_ms",
    (v) =>
      v > 0 && v < 300 ? { v: Math.round(v * 10) / 10 } : { err: "must be > 0 and < 300 (ms)" },
    field_errors,
  )
  if (hrv !== undefined) {
    n.hrv_ms = hrv
    accepted.push("hrv_ms")
  }

  const rhr = takeMetric(
    bundle,
    "resting_hr_bpm",
    (v) => (v > 20 && v < 220 ? { v: Math.round(v) } : { err: "must be > 20 and < 220" }),
    field_errors,
  )
  if (rhr !== undefined) {
    n.resting_hr_bpm = rhr
    accepted.push("resting_hr_bpm")
  }

  const aek = takeMetric(
    bundle,
    "active_energy_kcal",
    (v) => (v >= 0 ? { v: Math.round(v * 10) / 10 } : { err: "must be >= 0" }),
    field_errors,
  )
  if (aek !== undefined) {
    n.active_energy_kcal = aek
    accepted.push("active_energy_kcal")
  }

  const wds = takeMetric(
    bundle,
    "workouts_duration_seconds",
    (v) => (v >= 0 ? { v: Math.round(v) } : { err: "must be >= 0" }),
    field_errors,
  )
  if (wds !== undefined) {
    n.workouts_duration_seconds = wds
    accepted.push("workouts_duration_seconds")
  }

  let sleepSec = takeMetric(
    bundle,
    "sleep_duration_seconds",
    (v) => (v >= 0 && v <= 86_400 ? { v: Math.round(v) } : { err: "must be 0–86400 (seconds per day)" }),
    field_errors,
  )
  if (sleepSec !== undefined) {
    n.sleep_duration_seconds = sleepSec
    accepted.push("sleep_duration_seconds")
  } else {
    const sh = takeMetric(
      bundle,
      "sleep_hours",
      (v) => (v >= 0 && v <= 24 ? { v: v } : { err: "must be 0–24 h" }),
      field_errors,
    )
    if (sh !== undefined) {
      const sec = Math.round(sh * 3600)
      if (sec > 86_400) {
        field_errors.sleep_hours = "implies more than 24h sleep"
      } else {
        n.sleep_duration_seconds = sec
        accepted.push("sleep_duration_seconds")
      }
    }
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
  if (n.sleep_duration_seconds != null) {
    synthetic_bundle.sleep_duration_seconds = n.sleep_duration_seconds
  }

  return {
    ok: true,
    observed_at,
    source_label,
    observed_at_iso,
    accepted_metrics: accepted,
    normalized: n,
    has_bundle_extras,
    bundle_extras: extras,
    synthetic_bundle,
  }
}
