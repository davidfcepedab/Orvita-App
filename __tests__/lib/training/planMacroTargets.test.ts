import { averageLoggedMacros, macroTargetsFromPlanKcalAndMode } from "@/lib/training/planMacroTargets"
import { mealDetailBulletLines } from "@/lib/training/mealDetailFormat"

describe("planMacroTargets", () => {
  it("macroTargetsFromPlanKcalAndMode reparte kcal según modo", () => {
    const h = macroTargetsFromPlanKcalAndMode(2000, "hipertrofia_magra")
    expect(h.protein + h.carbs * 4 + h.fats * 9).toBeLessThanOrEqual(2005)
    expect(h.protein).toBeGreaterThan(120)
    const d = macroTargetsFromPlanKcalAndMode(2000, "bajar_medidas")
    expect(d.protein).toBeGreaterThanOrEqual(h.protein - 5)
  })

  it("averageLoggedMacros promedia días", () => {
    const a = averageLoggedMacros([
      { day: "Lun", kcal: 2000, pro: 100, carb: 200, fat: 60 },
      { day: "Mar", kcal: 2200, pro: 120, carb: 220, fat: 70 },
    ])
    expect(a.protein).toBe(110)
    expect(a.carbs).toBe(210)
    expect(a.fats).toBe(65)
  })
})

describe("mealDetailBulletLines", () => {
  it("parte por frases", () => {
    const lines = mealDetailBulletLines("A. B. C.")
    expect(lines.length).toBe(3)
  })
})
