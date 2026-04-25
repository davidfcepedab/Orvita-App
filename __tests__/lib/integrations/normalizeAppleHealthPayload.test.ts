import {
  coalesceNumericHealth,
  extractHealthBundleFromBody,
  normalizeAppleHealthPayload,
} from "@/lib/integrations/normalizeAppleHealthPayload"
import { rowsFromAppleBundlePayload } from "@/lib/integrations/mergeAppleHealthImportRows"

describe("normalizeAppleHealthPayload", () => {
  test("apple_bundle válido", () => {
    const r = normalizeAppleHealthPayload({
      source: "ios_shortcuts",
      schema_version: "1.0",
      apple_bundle: {
        observed_at: "2026-04-25",
        steps: 6413,
        hrv_ms: 22.5259920973064,
        resting_hr_bpm: 71,
        active_energy_kcal: 252.323,
        workouts_duration_seconds: 10080,
        sleep_duration_seconds: 34513.7013838,
      },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.observed_at_inferred).toBe(false)
    expect(r.observed_at).toBe("2026-04-25")
    expect(r.normalized.steps).toBe(6413)
    expect(r.normalized.hrv_ms).toBeCloseTo(22.5, 1)
    expect(r.normalized.sleep_duration_seconds).toBe(34514)
  })

  test("payload plano (sin anidar)", () => {
    const r = normalizeAppleHealthPayload({
      observed_at: "2026-04-25",
        steps: 100,
        hrv_ms: 40,
        resting_hr_bpm: 60,
        active_energy_kcal: 200,
        workouts_duration_seconds: 1800,
        sleep_duration_seconds: 28800,
    })
    expect(r.ok).toBe(true)
  })

  test("números como string", () => {
    const r = normalizeAppleHealthPayload({
      apple_bundle: {
        observed_at: "2026-01-10",
        steps: "8400",
        hrv_ms: "45,2" as unknown as number,
        resting_hr_bpm: "64" as unknown as number,
        active_energy_kcal: "100" as unknown as number,
        workouts_duration_seconds: "3600" as unknown as number,
        sleep_duration_seconds: "30000" as unknown as number,
      },
    })
    expect(r.ok).toBe(true)
  })

  test("rechaza payload sin métricas numéricas", () => {
    const r = normalizeAppleHealthPayload({
      apple_bundle: { observed_at: "2026-04-25" },
    })
    expect(r.ok).toBe(false)
  })

  test("observed_at solo en raíz cuando hay apple_bundle (Atajos)", () => {
    const r = normalizeAppleHealthPayload({
      source: "ios_shortcuts",
      schema_version: "1",
      observed_at: "2026-04-25",
      apple_bundle: {
        steps: 100,
        hrv_ms: 30,
        resting_hr_bpm: 60,
        active_energy_kcal: 200,
        workouts_duration_seconds: 0,
        sleep_duration_seconds: 28800,
      },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.observed_at).toBe("2026-04-25")
  })

  test("observed_at como timestamp ms (número)", () => {
    const r = normalizeAppleHealthPayload({
      apple_bundle: {
        observed_at: Date.UTC(2026, 3, 25, 12, 0, 0, 0),
        steps: 1,
        hrv_ms: 30,
        resting_hr_bpm: 60,
        active_energy_kcal: 0,
        workouts_duration_seconds: 0,
        sleep_duration_seconds: 0,
      },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.observed_at_inferred).toBe(false)
    expect(r.observed_at).toBe("2026-04-25")
  })

  test("Atajos: observed_at null pero hay métricas → día UTC hoy (inferido)", () => {
    const r = normalizeAppleHealthPayload({
      source: "x",
      schema_version: "1",
      hrv_ms: 30,
      steps: 100,
      resting_hr_bpm: 60,
      active_energy_kcal: 200,
      workouts_duration_seconds: 0,
      sleep_duration_seconds: 8000,
      observed_at: null,
    } as Record<string, unknown>)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.observed_at_inferred).toBe(true)
    expect(r.observed_at).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  test("mantiene otras claves y observado_at; ignora basura de texto", () => {
    const r = normalizeAppleHealthPayload({
      apple_bundle: {
        observed_at: "2026-04-20",
        steps: 5000,
        hrv_ms: "No encontrado",
        resting_hr_bpm: "",
      },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.accepted_metrics).toContain("steps")
    expect(r.normalized.hrv_ms).toBeUndefined()
  })

  test("duración sueño con decimales se redondea a segundos", () => {
    const r = normalizeAppleHealthPayload({
      apple_bundle: {
        observed_at: "2026-04-25",
        steps: 1,
        sleep_duration_seconds: 34513.2,
        hrv_ms: 30,
        resting_hr_bpm: 50,
        active_energy_kcal: 0,
        workouts_duration_seconds: 0,
      },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.normalized.sleep_duration_seconds).toBe(34513)
  })

  test("sleep_duration_seconds agregada > 24h (Atajos) se acepta y capa a 1 día", () => {
    const r = normalizeAppleHealthPayload({
      apple_bundle: {
        observed_at: "2026-04-25",
        steps: 1,
        hrv_ms: 30,
        resting_hr_bpm: 50,
        active_energy_kcal: 0,
        workouts_duration_seconds: 0,
        sleep_duration_seconds: 113_278,
      },
    })
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.normalized.sleep_duration_seconds).toBe(86_400)
  })
})

describe("coalesceNumericHealth", () => {
  test("omite vacío y no encontrado", () => {
    expect(coalesceNumericHealth("")).toBeNull()
    expect(coalesceNumericHealth("No encontrado")).toBeNull()
  })
})

describe("extractHealthBundleFromBody", () => {
  test("extrae plano y apple_bundle", () => {
    const flat = extractHealthBundleFromBody({ observed_at: "2026-04-25", steps: 1, source: "x" })
    expect(flat?.bundle.observed_at).toBe("2026-04-25")
    const ab = extractHealthBundleFromBody({ apple_bundle: { observed_at: "2026-04-25", steps: 2 } })
    expect(ab?.bundle.steps).toBe(2)
  })

  test("apple_bundle como string JSON (Atajos iOS)", () => {
    const inner = {
      observed_at: "2026-04-25",
      steps: 100,
      hrv_ms: 30,
      resting_hr_bpm: 60,
      active_energy_kcal: 200,
      workouts_duration_seconds: 0,
      sleep_duration_seconds: 28800,
    }
    const ext = extractHealthBundleFromBody({
      apple_bundle: JSON.stringify(inner),
    })
    expect(ext?.bundle.steps).toBe(100)
    const n = normalizeAppleHealthPayload({ apple_bundle: JSON.stringify(inner) })
    expect(n.ok).toBe(true)
  })
})

describe("rowsFromAppleBundlePayload upsert-friendly row", () => {
  test("produces a row for string metrics", () => {
    const rows = rowsFromAppleBundlePayload({
      observed_at: "2026-04-25",
      steps: "6400" as unknown as number,
      hrv_ms: "30" as unknown as number,
      sleep_duration_seconds: 35000,
      resting_hr_bpm: "60" as unknown as number,
      active_energy_kcal: "200" as unknown as number,
      workouts_duration_seconds: 3600,
    } as Record<string, unknown>)
    expect(rows.length).toBe(1)
    expect(rows[0]!.observed_at).toBeDefined()
  })
})
