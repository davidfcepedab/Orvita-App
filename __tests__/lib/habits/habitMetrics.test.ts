import {
  computeBestStreak,
  computeCurrentStreak,
  computeHabitCompletionMetrics,
} from "@/lib/habits/habitMetrics"

describe("computeCurrentStreak (solo días programados)", () => {
  const metaSemanalLJ = { frequency: "semanal" as const, weekdays: [1, 4] } // lun + jue

  it("no cuenta fines de semana entre lun y jue para la racha", () => {
    const today = "2026-04-16" // jueves UTC
    const dates = ["2026-04-13", "2026-04-16"] // lun + jue de esa semana
    expect(computeCurrentStreak(dates, today, metaSemanalLJ)).toBe(2)
  })

  it("corta la racha si falta un día programado intermedio", () => {
    const today = "2026-04-16" // jue; falta el lun 13
    const dates = ["2026-04-16"]
    expect(computeCurrentStreak(dates, today, metaSemanalLJ)).toBe(1)
  })

  it("hábito diario: un día sin completar rompe la racha", () => {
    const metaDiario = { frequency: "diario" as const }
    const today = "2026-04-15"
    const dates = ["2026-04-15", "2026-04-14", "2026-04-12"]
    expect(computeCurrentStreak(dates, today, metaDiario)).toBe(2)
  })
})

describe("computeBestStreak (solo días programados)", () => {
  const metaSemanalLJ = { frequency: "semanal" as const, weekdays: [1, 4] }

  it("une lun–jue de la misma semana sin exigir martes o miércoles", () => {
    const dates = ["2026-04-13", "2026-04-16"]
    expect(computeBestStreak(dates, metaSemanalLJ)).toBe(2)
  })

  it("no alarga la racha si hubo un programado omitido entre dos completados", () => {
    const dates = ["2026-04-06", "2026-04-20"] // dos lunes; faltan lun/jue intermedios
    expect(computeBestStreak(dates, metaSemanalLJ)).toBe(1)
  })
})

describe("computeHabitCompletionMetrics integración", () => {
  it("consistencia 30d ya usaba programación; racha alinea con meta", () => {
    const today = "2026-04-16"
    const meta = { frequency: "semanal" as const, weekdays: [1, 4] }
    const dates = ["2026-04-13", "2026-04-16"]
    const m = computeHabitCompletionMetrics(dates, today, meta)
    expect(m.current_streak).toBe(2)
    expect(m.best_streak).toBe(2)
    expect(m.completion_rate_30d).toBeGreaterThan(0)
  })
})
