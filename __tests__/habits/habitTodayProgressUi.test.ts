import type { HabitCompletionMetrics } from "@/lib/habits/habitMetrics"
import { habitShowsTodayProgressBar, habitTodayProgressUi } from "@/lib/habits/habitTodayProgressUi"
import type { HabitWithMetrics } from "@/lib/operational/types"

function minimalMetrics(over: Partial<HabitCompletionMetrics> = {}): HabitCompletionMetrics {
  return {
    current_streak: 1,
    best_streak: 1,
    completion_rate_30d: 0.5,
    completed_today: false,
    at_risk: false,
    week_marks: [],
    sparkline14: Array.from({ length: 14 }, () => null),
    ...over,
  }
}

function baseHabit(over: Partial<HabitWithMetrics> = {}): HabitWithMetrics {
  return {
    id: "h1",
    name: "Test",
    domain: "salud",
    metadata: {},
    completed: false,
    created_at: new Date().toISOString(),
    metrics: minimalMetrics(),
    ...over,
  }
}

describe("habitTodayProgressUi", () => {
  it("usa intraday con leyenda N/M cuando hay meta de chequeos", () => {
    const h = baseHabit({
      name: "Limpieza",
      metadata: {
        intraday_si_no_progress: true,
        intraday_si_no_target_checks: 5,
      },
    })
    const ui = habitTodayProgressUi(h)
    expect(ui.kind).toBe("intraday")
    expect(ui.pct).toBe(0)
    expect(ui.caption).toBe("0 / 5 chequeos")
    expect(habitShowsTodayProgressBar(ui)).toBe(true)
  })

  it("marca 100% intraday cuando completed_today", () => {
    const h = baseHabit({
      metrics: minimalMetrics({
        completed_today: true,
        current_streak: 2,
        completion_rate_30d: 0.6,
      }),
      metadata: {
        intraday_si_no_progress: true,
        intraday_si_no_target_checks: 5,
      },
    })
    const ui = habitTodayProgressUi(h)
    expect(ui.pct).toBe(100)
    expect(ui.caption).toBe("5 / 5 chequeos")
  })

  it("no muestra barra para hábito binario sin intraday", () => {
    const h = baseHabit({ metadata: {} })
    const ui = habitTodayProgressUi(h)
    expect(ui.kind).toBe("none")
    expect(habitShowsTodayProgressBar(ui)).toBe(false)
  })
})
