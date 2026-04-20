import { localDateKeyFromIso } from "@/lib/agenda/localDateKey"
import type { HabitMetadata } from "@/lib/operational/types"

export const DEFAULT_WATER_GOAL_ML = 2400
export const DEFAULT_WATER_BOTTLE_ML = 750
export const DEFAULT_WATER_GLASS_ML = 250

/**
 * Disparador fijo (no editable): sin hora parseable; el hábito vive en «Misión hidratación».
 * Los avisos de ritmo usan reloj del día en la zona de agenda de Órvita.
 */
export const WATER_SYSTEM_TRIGGER_OR_TIME =
  "Sistema Órvita · ritmo hacia tu meta diaria de ml"

/** Metadata inicial del hábito por defecto (sync con migración SQL). */
export const DEFAULT_WATER_HABIT_METADATA: HabitMetadata = {
  habit_type: "water-tracking",
  frequency: "diario",
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  display_days: ["L", "M", "X", "J", "V", "S", "D"],
  trigger_or_time: WATER_SYSTEM_TRIGGER_OR_TIME,
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
function completionCivilDayKey(completedOn: string | null | undefined): string {
  if (!completedOn || typeof completedOn !== "string") return ""
  const key = localDateKeyFromIso(completedOn) ?? completedOn.trim().slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(key) ? key : ""
}

export function deriveHabitCompletionDates(
  meta: HabitMetadata | null | undefined,
  rows: CompletionRowLite[],
): string[] {
  if (isWaterTrackingHabit(meta)) {
    const goal = goalMlFromHabitMetadata(meta)
    const out: string[] = []
    for (const r of rows) {
      const day = completionCivilDayKey(r.completed_on)
      if (!day) continue
      const ml = r.water_ml ?? 0
      if (ml >= goal) out.push(day)
    }
    return Array.from(new Set(out)).sort()
  }
  const out = rows
    .map((r) => completionCivilDayKey(r.completed_on))
    .filter((d) => d.length === 10)
  return Array.from(new Set(out)).sort()
}

export function waterMlForDay(rows: CompletionRowLite[], dayIso: string): number {
  const key = dayIso.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return 0
  for (const r of rows) {
    const d = completionCivilDayKey(r.completed_on)
    if (d === key) return Math.max(0, r.water_ml ?? 0)
  }
  return 0
}

/**
 * Meta sugerida a partir del peso: **peso (kg) × 32 ml/día**.
 * Acotada a 1200–5000 ml (coherente con validación API 500–8000 al guardar manual).
 */
export function suggestedWaterGoalMlFromWeightKg(weightKg: number): number {
  if (!Number.isFinite(weightKg) || weightKg <= 0) return DEFAULT_WATER_GOAL_ML
  return Math.min(5000, Math.max(1200, Math.round(weightKg * 32)))
}

/** Equivalente en “botellitas” de capacidad `bottleMl` (decimal permitido). */
export function equivalentBottlesDecimal(todayMl: number, bottleMl: number): number {
  if (!Number.isFinite(todayMl) || todayMl < 0) return 0
  if (!Number.isFinite(bottleMl) || bottleMl <= 0) return 0
  return todayMl / bottleMl
}

/** Formato legible de ml en es (p. ej. 2400 → "2.400"). */
export function formatWaterMlEs(ml: number): string {
  if (!Number.isFinite(ml)) return "0"
  return Math.round(Math.max(0, ml)).toLocaleString("es-ES", { maximumFractionDigits: 0 })
}
