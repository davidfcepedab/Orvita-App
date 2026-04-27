import { buildCoachInsightParagraph } from "@/lib/training/coachCopy"
import type { TrainingReadiness } from "@/lib/training/trainingOperationalDerivations"

function readiness(score: number): TrainingReadiness {
  return {
    score,
    label: score >= 72 ? "Listo para entrenar" : score >= 55 ? "Entrenar suave" : "Priorizar recuperación",
    rationale: "Test.",
  }
}

describe("coachCopy", () => {
  test("score alto sin Hevy añade mención Hevy", () => {
    const t = buildCoachInsightParagraph({
      readiness: readiness(80),
      nutritionStatus: "En línea",
      hasHevy: false,
    })
    expect(t).toMatch(/buena recuperación/i)
    expect(t).toMatch(/Hevy/i)
  })

  test("déficit nutricional añade frase de proteína", () => {
    const t = buildCoachInsightParagraph({
      readiness: readiness(60),
      nutritionStatus: "Déficit moderado",
      hasHevy: true,
    })
    expect(t).toMatch(/déficit/i)
    expect(t).not.toMatch(/Hevy/i)
  })

  test("nutrición fuera de rango sugiere ajustar comidas", () => {
    const t = buildCoachInsightParagraph({
      readiness: readiness(50),
      nutritionStatus: "Fuera de objetivo",
      hasHevy: true,
    })
    expect(t).toMatch(/comidas/i)
  })

  test("score bajo prioriza recuperación", () => {
    const t = buildCoachInsightParagraph({
      readiness: readiness(40),
      nutritionStatus: "OK",
      hasHevy: true,
    })
    expect(t).toMatch(/movilidad|recuperación|ligero/i)
  })
})
