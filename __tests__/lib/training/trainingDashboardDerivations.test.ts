import type { BodyMetricDisplayRow } from "@/lib/training/trainingPrefsTypes"
import {
  bodyCompositionChartPoints,
  countWeeklySets,
  deltaQualityFromTrend,
  estimateLeanMassKg,
  parseMetricNumber,
  trainingStreakDays,
} from "@/lib/training/trainingDashboardDerivations"
import type { TrainingDay } from "@/src/modules/training/types"

function row(partial: Partial<BodyMetricDisplayRow>): BodyMetricDisplayRow {
  return {
    label: "x",
    current: "0",
    previous: "0",
    target: "0",
    projection: "0",
    progressPct: 0,
    trend: "down",
    ...partial,
  }
}

describe("trainingDashboardDerivations", () => {
  test("parseMetricNumber acepta coma decimal y unidades", () => {
    expect(parseMetricNumber("75,5 kg")).toBeCloseTo(75.5)
    expect(parseMetricNumber("18%")).toBe(18)
    expect(parseMetricNumber(undefined)).toBeNull()
  })

  test("estimateLeanMassKg formula y rangos", () => {
    expect(estimateLeanMassKg(80, 20)).toBeCloseTo(64, 5)
    expect(estimateLeanMassKg(30, 15)).toBeNull()
    expect(estimateLeanMassKg(75, 2)).toBeNull()
    expect(estimateLeanMassKg(75, 61)).toBeNull()
  })

  test("bodyCompositionChartPoints con ant / ahora / proyección", () => {
    const w = row({ label: "Peso", current: "80", previous: "82", projection: "78", trend: "down" })
    const f = row({ label: "% grasa", current: "18", previous: "19", projection: "16", trend: "down" })
    const pts = bodyCompositionChartPoints(w, f)
    expect(pts.map((p) => p.label)).toEqual(["Ant.", "Ahora", "Proyección"])
    expect(pts[1]).toEqual({ label: "Ahora", weight: 80, fatPct: 18 })
  })

  test("countWeeklySets suma sets de ejercicios", () => {
    const days: TrainingDay[] = [
      {
        date: "2026-04-26",
        source: "hevy",
        status: "trained",
        exercises: [{ name: "press", muscleGroup: null, sets: [{}, {}, {}] }],
      },
    ]
    expect(countWeeklySets(days)).toBe(3)
  })

  test("trainingStreakDays cuenta hacia atrás desde hoy", () => {
    const days: TrainingDay[] = [
      { date: "2026-04-27", source: "hevy", status: "trained" },
      { date: "2026-04-26", source: "hevy", status: "trained" },
      { date: "2026-04-25", source: "hevy", status: "rest" },
    ]
    expect(trainingStreakDays(days, "2026-04-27")).toBe(2)
  })

  test("deltaQualityFromTrend peso y grasa", () => {
    expect(deltaQualityFromTrend("down", "weight")).toBe("good")
    expect(deltaQualityFromTrend("up", "fat")).toBe("warn")
  })
})
