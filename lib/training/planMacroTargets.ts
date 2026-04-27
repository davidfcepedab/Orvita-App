import type { MealDayDisplay, VisualGoalMode } from "@/lib/training/trainingPrefsTypes"

/**
 * Objetivos de macros derivados del kcal medio del plan y del tipo de objetivo visual.
 * Sirve como **meta** en barras "registrado vs plan", distinta del simple promedio de lo registrado.
 */
export function macroTargetsFromPlanKcalAndMode(kcal: number, mode: VisualGoalMode | undefined): {
  protein: number
  carbs: number
  fats: number
} {
  if (!Number.isFinite(kcal) || kcal <= 0) return { protein: 0, carbs: 0, fats: 0 }

  let proteinPct: number
  let fatPct: number
  switch (mode) {
    case "definicion":
    case "bajar_medidas":
      proteinPct = 0.32
      fatPct = 0.28
      break
    case "mantenimiento":
      proteinPct = 0.24
      fatPct = 0.3
      break
    case "recomposicion":
      proteinPct = 0.3
      fatPct = 0.27
      break
    default:
      proteinPct = 0.28
      fatPct = 0.27
  }

  const protein = Math.round((kcal * proteinPct) / 4)
  const fats = Math.round((kcal * fatPct) / 9)
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fats * 9) / 4))
  return { protein, carbs, fats }
}

/** Promedio P/C/G de los días guardados en preferencias (lo “registrado” en el plan). */
export function averageLoggedMacros(mealDays: MealDayDisplay[]): { protein: number; carbs: number; fats: number } {
  if (!mealDays.length) return { protein: 0, carbs: 0, fats: 0 }
  const n = mealDays.length
  return {
    protein: Math.round(mealDays.reduce((s, d) => s + d.pro, 0) / n),
    carbs: Math.round(mealDays.reduce((s, d) => s + d.carb, 0) / n),
    fats: Math.round(mealDays.reduce((s, d) => s + d.fat, 0) / n),
  }
}
