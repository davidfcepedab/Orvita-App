export type BodyMetricDisplayRow = {
  label: string
  current: string
  previous: string
  target: string
  projection: string
  progressPct: number
  trend: "up" | "down"
}

export type MealDayDisplay = {
  day: string
  kcal: number
  pro: number
  carb: number
  fat: number
}

export type VisualGoalPriority = "alta" | "media" | "baja"

/** Modo de objetivo corporal (persistido; alimenta copy de prioridad y nutrición). */
export type VisualGoalMode =
  | "recomposicion"
  | "bajar_medidas"
  | "hipertrofia_magra"
  | "definicion"
  | "mantenimiento"

export type TrainingPreferencesPayload = {
  goalImageUrl?: string
  /** Texto largo del objetivo corporal (overlay en tarjeta negra). */
  visualGoalDescription?: string
  /** Mes objetivo `YYYY-MM` para badge tipo OCT 2026. */
  visualGoalDeadlineYm?: string
  visualGoalPriority?: VisualGoalPriority
  /** Eje principal del plan (recomposición, déficit, hipertrofia, etc.). */
  visualGoalMode?: VisualGoalMode
  bodyMetrics?: BodyMetricDisplayRow[]
  mealPlan?: MealDayDisplay[]
  mealNotes?: string
}
