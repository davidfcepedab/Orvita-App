import type { HabitMetadata } from "@/lib/operational/types"

export const DEFAULT_WATER_GOAL_ML = 2400
export const DEFAULT_WATER_BOTTLE_ML = 750
export const DEFAULT_WATER_GLASS_ML = 250

/** Metadata inicial del hábito por defecto (sync con migración SQL). */
export const DEFAULT_WATER_HABIT_METADATA: HabitMetadata = {
  habit_type: "water-tracking",
  frequency: "diario",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  display_days: ["L", "M", "X", "J", "V", "S", "D"],
  trigger_or_time: "08:00 · Hidratación",
  intention: "Convertir hidratación en un ritual medible sin fricción.",
  water_bottle_ml: DEFAULT_WATER_BOTTLE_ML,
  water_goal_ml: DEFAULT_WATER_GOAL_ML,
  water_glass_ml: DEFAULT_WATER_GLASS_ML,
}

export function isWaterTrackingHabit(meta: HabitMetadata | null | undefined): boolean {
  return meta?.habit_type === "water-tracking"
}

export function goalMlFromHabitMetadata(meta: HabitMetadata | null | undefined): number {
  const g = meta?.water_goal_ml
  if (typeof g === "number" && Number.isFinite(g) && g > 0) return Math.round(g)
  return DEFAULT_WATER_GOAL_ML
}

export function bottleMlFromHabitMetadata(meta: HabitMetadata | null | undefined): number {
  const b = meta?.water_bottle_ml
  if (typeof b === "number" && Number.isFinite(b) && b > 0) return Math.round(b)
  return DEFAULT_WATER_BOTTLE_ML
}

export function glassMlFromHabitMetadata(meta: HabitMetadata | null | undefined): number {
  const g = meta?.water_glass_ml
  if (typeof g === "number" && Number.isFinite(g) && g > 0) return Math.round(g)
  return DEFAULT_WATER_GLASS_ML
}

export type CompletionRowLite = { completed_on: string; water_ml: number | null }

/**
 * Fechas YYYY-MM-DD que cuentan como “día cumplido” para métricas:
 * - estándar: cualquier fila en habit_completions ese día
 * - water-tracking: solo si water_ml >= meta
 */
export function deriveHabitCompletionDates(
  meta: HabitMetadata | null | undefined,
  rows: CompletionRowLite[],
): string[] {
  if (isWaterTrackingHabit(meta)) {
    const goal = goalMlFromHabitMetadata(meta)
    const out: string[] = []
    for (const r of rows) {
      const day = typeof r.completed_on === "string" ? r.completed_on.slice(0, 10) : ""
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue
      const ml = r.water_ml ?? 0
      if (ml >= goal) out.push(day)
    }
    return Array.from(new Set(out)).sort()
  }
  const out = rows
    .map((r) => (typeof r.completed_on === "string" ? r.completed_on.slice(0, 10) : ""))
    .filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d))
  return Array.from(new Set(out)).sort()
}

export function waterMlForDay(rows: CompletionRowLite[], dayIso: string): number {
  const key = dayIso.slice(0, 10)
  for (const r of rows) {
    const d = typeof r.completed_on === "string" ? r.completed_on.slice(0, 10) : ""
    if (d === key) return Math.max(0, r.water_ml ?? 0)
  }
  return 0
}

/** Meta sugerida: peso (kg) × 32 ml (mínimo 1200, máximo 5000). */
export function suggestedWaterGoalMlFromWeightKg(weightKg: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return DEFAULT_WATER_GOAL_ML
  return Math.min(5000, Math.max(1200, Math.round(weightKg * 32)))
}
