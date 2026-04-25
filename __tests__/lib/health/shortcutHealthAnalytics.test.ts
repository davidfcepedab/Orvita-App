import {
  buildShortcutAnalyticsPayload,
  buildWeeklyStraddle,
  formatHoursMinutesFromSeconds,
  sleepHoursFromSeconds,
} from "@/lib/health/shortcutHealthAnalytics"
import type { HealthMetricRowLike } from "@/lib/health/shortcutHealthAnalytics"

const row = (d: string, p: Partial<HealthMetricRowLike> = {}): HealthMetricRowLike => ({
  observed_at: `${d}T12:00:00.000Z`,
  sleep_hours: null,
  hrv_ms: null,
  resting_hr_bpm: null,
  steps: null,
  calories: null,
  apple_workout_minutes: null,
  metadata: {},
  ...p,
})

describe("shortcutHealthAnalytics", () => {
  test("sleep_hours y workout minutes desde metadata", () => {
    const sec = 34514
    expect(sleepHoursFromSeconds(sec)).toBeCloseTo(34514 / 3600, 4)
    const f = formatHoursMinutesFromSeconds(sec)
    expect(f?.h).toBe(9)
    expect(f?.m).toBe(35)
  })

  test("tendencia semanal con pocos datos no crashea", () => {
    const t = buildWeeklyStraddle([row("2026-04-25", { hrv_ms: 30 })])
    expect(t.current_window_n).toBe(1)
    expect(t.previous_window_n).toBe(0)
    const a = buildShortcutAnalyticsPayload(
      [row("2026-04-25", { hrv_ms: 30, steps: 1000, calories: 200, metadata: { apple_workouts_duration_seconds: 3000 } })],
      row("2026-04-25", { hrv_ms: 30, steps: 1000, calories: 200, metadata: { apple_workouts_duration_seconds: 3000 } }),
    )
    expect(a.recovery.readiness_label).toBeDefined()
  })

  test("cálculo proxy carga y señal HRV", () => {
    const latest = row("2026-04-25", {
      hrv_ms: 25,
      calories: 300,
      metadata: { apple_workouts_duration_seconds: 100 * 60 },
    })
    const a = buildShortcutAnalyticsPayload([latest], latest)
    expect(a.recovery.training_load?.proxy).toBeDefined()
    expect(a.signals.hrv_vs_load.text.length).toBeGreaterThan(3)
  })
})
