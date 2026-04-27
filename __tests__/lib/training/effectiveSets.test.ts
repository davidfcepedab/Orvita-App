import { aggregateZoneProgress, statusFromRatio } from "@/lib/training/effectiveSets"
import type { TrainingDay } from "@/src/modules/training/types"

function makeDay(exerciseName: string): TrainingDay {
  return {
    date: "2026-04-27",
    source: "hevy",
    status: "trained",
    exercises: [
      {
        name: exerciseName,
        muscleGroup: null,
        sets: [{ reps: 10, weightKg: 30, rpe: 8 }],
      },
    ],
  }
}

describe("effective sets aggregation", () => {
  test("bench press suma pecho principal y brazos secundario", () => {
    const zones = aggregateZoneProgress([makeDay("bench press")])
    const chest = zones.find((z) => z.key === "chest")
    const arms = zones.find((z) => z.key === "arms")
    expect(chest?.actualSets).toBeCloseTo(1, 3)
    expect(arms?.actualSets).toBeCloseTo(0.5, 3)
  })

  test("pull up suma espalda principal y brazos secundario", () => {
    const zones = aggregateZoneProgress([makeDay("pull up")])
    const back = zones.find((z) => z.key === "back")
    const arms = zones.find((z) => z.key === "arms")
    expect(back?.actualSets).toBeCloseTo(1, 3)
    expect(arms?.actualSets).toBeCloseTo(0.5, 3)
  })

  test("squat suma piernas", () => {
    const zones = aggregateZoneProgress([makeDay("squat")])
    const legs = zones.find((z) => z.key === "legs")
    expect((legs?.actualSets ?? 0) > 0).toBe(true)
  })

  test("abdomen detecta plank y crunch", () => {
    const zonesPlank = aggregateZoneProgress([makeDay("plank")])
    const zonesCrunch = aggregateZoneProgress([makeDay("crunch")])
    expect((zonesPlank.find((z) => z.key === "abs")?.actualSets ?? 0) > 0).toBe(true)
    expect((zonesCrunch.find((z) => z.key === "abs")?.actualSets ?? 0) > 0).toBe(true)
  })
})

describe("zone status by ratio", () => {
  test("status rezagado", () => {
    expect(statusFromRatio(0.4)).toBe("rezagado")
  })
  test("status en desarrollo", () => {
    expect(statusFromRatio(0.7)).toBe("en desarrollo")
  })
  test("status bien", () => {
    expect(statusFromRatio(0.95)).toBe("bien")
  })
  test("status sobrecarga", () => {
    expect(statusFromRatio(1.2)).toBe("sobrecarga")
  })
})
