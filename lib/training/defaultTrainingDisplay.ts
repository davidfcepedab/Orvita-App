import { TRAINING_MEAL_PLAN } from "@/app/data/training/visualSeeds"
import type { BodyMetricDisplayRow, MealDayDisplay } from "@/lib/training/trainingPrefsTypes"

/** Preferencias vacías en modo estándar (sin números de ejemplo). */
export function emptyBodyMetricRows(): BodyMetricDisplayRow[] {
  return []
}

export function emptyMealPlan(): MealDayDisplay[] {
  return []
}

/** Solo modo demostración (`NEXT_PUBLIC_APP_MODE=mock`). */
export function defaultBodyMetricRows(): BodyMetricDisplayRow[] {
  return [
    { label: "Peso Corporal", current: "78.5", previous: "79.3", target: "75", projection: "77.4", progressPct: 80, trend: "down" },
    { label: "% de Grasa", current: "16.5", previous: "17.2", target: "12", projection: "15.9", progressPct: 65, trend: "down" },
    { label: "Pecho", current: "102", previous: "101", target: "108", projection: "103", progressPct: 40, trend: "up" },
    { label: "Brazos", current: "36", previous: "35.5", target: "40", projection: "36.6", progressPct: 30, trend: "up" },
    { label: "Cintura", current: "86", previous: "87.2", target: "80", projection: "85.2", progressPct: 50, trend: "down" },
    { label: "Cadera", current: "100", previous: "100.4", target: "98", projection: "99.5", progressPct: 70, trend: "down" },
    { label: "Muslos", current: "58", previous: "57.5", target: "62", projection: "58.6", progressPct: 45, trend: "up" },
  ]
}

export function defaultMealPlan(): MealDayDisplay[] {
  return TRAINING_MEAL_PLAN.map((d) => ({
    day: d.day,
    kcal: d.cals,
    pro: d.protein,
    carb: d.carbs,
    fat: d.fats,
  }))
}
