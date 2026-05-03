import { habitShowsTodayProgressBar, habitTodayProgressUi } from "@/lib/habits/habitTodayProgressUi"
import type { HabitWithMetrics } from "@/lib/operational/types"

function baseHabit(over: Partial<HabitWithMetrics> = {}): HabitWithMetrics {
  return {
    id: "h1",
    name: "Test",
    domain: "salud",
    metadata: {},
    metrics: {
      completed_today: false,
      current_streak: 1,
      completion_rate_30d: 0.5,
    },
    ...over,
  } as HabitWithMetrics
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
      metrics: {
        completed_today: true,
        current_streak: 2,
        completion_rate_30d: 0.6,
      },
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
