import { buildAiRecommendations, deriveNutritionStatus } from "@/lib/training/decisionEngine"
import type { ZoneProgress } from "@/lib/training/effectiveSets"

function zone(partial: Partial<ZoneProgress>): ZoneProgress {
  return {
    key: "chest",
    label: "Pecho",
    actualSets: 8,
    targetSets: 14,
    progress: 57,
    ratio: 0.57,
    status: "rezagado",
    ...partial,
  }
}

describe("deriveNutritionStatus", () => {
  test("sin plan cuando no hay datos", () => {
    expect(deriveNutritionStatus(undefined)).toBe("sin plan")
  })

  test("deficit cuando peso no sube", () => {
    expect(deriveNutritionStatus({ current: "78.0", previous: "78.0" })).toBe("déficit")
  })

  test("alineado cuando sube estable", () => {
    expect(deriveNutritionStatus({ current: "78.3", previous: "78.0" })).toBe("alineado")
  })

  test("exceso cuando sube muy rapido", () => {
    expect(deriveNutritionStatus({ current: "79.0", previous: "78.0" })).toBe("exceso")
  })
})

describe("buildAiRecommendations", () => {
  test("recomienda por musculo rezagado", () => {
    const recs = buildAiRecommendations({
      hasHevy: true,
      nutritionStatus: "alineado",
      bodyPartProgress: [zone({ label: "Piernas", key: "legs", ratio: 0.42, status: "rezagado", progress: 42 })],
    })
    expect(recs[0]).toContain("Piernas")
    expect(recs[0]).toContain("subir volumen")
  })

  test("recomienda por sobrecarga", () => {
    const recs = buildAiRecommendations({
      hasHevy: true,
      nutritionStatus: "alineado",
      bodyPartProgress: [
        zone({ label: "Espalda", key: "back", ratio: 1.2, status: "sobrecarga", progress: 120 }),
        zone({ label: "Piernas", key: "legs", ratio: 0.9, status: "bien", progress: 90 }),
      ],
    })
    expect(recs.join(" ")).toContain("sobrecarga")
  })

  test("recomienda por mismatch nutricional", () => {
    const recs = buildAiRecommendations({
      hasHevy: true,
      nutritionStatus: "déficit",
      bodyPartProgress: [zone({ label: "Espalda", key: "back", ratio: 0.9, status: "bien", progress: 90 })],
    })
    expect(recs.join(" ")).toContain("Nutrición fuera de rango")
  })
})
