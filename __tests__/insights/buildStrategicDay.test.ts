import { buildStrategicDay } from "@/lib/insights/buildStrategicDay"
import type { OperationalContextData } from "@/lib/operational/types"

function baseCtx(over: Partial<OperationalContextData> = {}): OperationalContextData {
  return {
    score_global: 70,
    score_fisico: 70,
    score_salud: 70,
    score_profesional: 65,
    score_disciplina: 65,
    score_recuperacion: 70,
    delta_global: 0,
    delta_disciplina: 0,
    delta_recuperacion: 0,
    delta_tendencia: 0,
    tendencia_7d: [],
    prediction: null,
    insights: [],
    apple_health: null,
    today_tasks: [],
    habits: [],
    ...over,
  }
}

describe("buildStrategicDay", () => {
  test("prioriza sync Apple cuando la muestra es obsoleta", () => {
    const ctx = baseCtx({
      apple_health: {
        observed_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
        source: "apple_health_export",
        sleep_hours: 7,
        hrv_ms: 40,
        readiness_score: 60,
        steps: 5000,
        calories: 400,
        energy_index: 60,
        workouts_count: 0,
        workout_minutes: null,
        sync_stale: true,
      },
    })
    const d = buildStrategicDay({ ctx, finance: null, meetingMinutes: 0 })
    expect(d.primaryLever.id).toBe("sync-apple")
    expect(d.primaryLever.href).toBe("/salud")
  })

  test("propone check-in cuando no hay tensión especial", () => {
    const d = buildStrategicDay({
      ctx: baseCtx({ score_salud: 50 }),
      finance: { total_income_current: 10_000_000, total_expense_current: 4_000_000 },
      meetingMinutes: 120,
    })
    expect(d.primaryLever.id).toBe("checkin-refresh")
  })
})
