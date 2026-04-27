import type { TrainingDay } from "@/src/modules/training/types"

/** Orden del meal plan (Lun … Dom) alineado a `TRAINING_MEAL_PLAN` y semana ISO que empieza en lunes. */
export const MEAL_WEEK_ORDER = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"] as const

export type MealWeekKey = (typeof MEAL_WEEK_ORDER)[number]

function shiftDaysYmd(ymd: string, delta: number): string {
  const d = new Date(`${ymd}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + delta)
  return d.toISOString().slice(0, 10)
}

/** Lunes (UTC civil) de la semana que contiene `anchorYmd`. */
export function mondayYmdOfWeekContaining(anchorYmd: string): string {
  const d = new Date(`${anchorYmd}T12:00:00Z`)
  const dow = d.getUTCDay()
  const fromMon = dow === 0 ? -6 : 1 - dow
  return shiftDaysYmd(anchorYmd, fromMon)
}

export function mealDayLabelToWeekKey(dayLabel: string): MealWeekKey | null {
  const s = dayLabel.trim().slice(0, 3).toLowerCase()
  const hit = MEAL_WEEK_ORDER.find((x) => x.toLowerCase() === s)
  return hit ?? null
}

/** YYYY-MM-DD del día de la semana del meal plan en la semana de `anchorYmd`. */
export function weekYmdForMealDayLabel(anchorYmd: string, dayLabel: string): string | null {
  const key = mealDayLabelToWeekKey(dayLabel)
  if (!key) return null
  const idx = MEAL_WEEK_ORDER.indexOf(key)
  const mon = mondayYmdOfWeekContaining(anchorYmd)
  return shiftDaysYmd(mon, idx)
}

export function isTrainingDayYmd(days: TrainingDay[], ymd: string): boolean {
  const td = days.find((d) => d.date === ymd)
  if (!td) return false
  return td.status === "trained" || td.status === "swim"
}

/**
 * Objetivo kcal por día: más en días con sesión registrada (trained/swim), menos en descanso.
 * Normalizado para que la media semanal ≈ `baseKcalAvg` (media de tus registros / plan guardado).
 */
export function dailyKcalTargetsFromTrainingSchedule(args: {
  mealDayLabels: string[]
  baseKcalAvg: number
  trainingDays: TrainingDay[]
  anchorYmd: string
}): number[] {
  const { mealDayLabels, baseKcalAvg, trainingDays, anchorYmd } = args
  if (!mealDayLabels.length || baseKcalAvg <= 0) return mealDayLabels.map(() => 0)

  const trainMult = 1.12
  const restMult = 0.9

  const raw = mealDayLabels.map((label) => {
    const ymd = weekYmdForMealDayLabel(anchorYmd, label)
    const train = ymd ? isTrainingDayYmd(trainingDays, ymd) : false
    return baseKcalAvg * (train ? trainMult : restMult)
  })

  const sum = raw.reduce((a, b) => a + b, 0)
  if (sum <= 0) return mealDayLabels.map(() => Math.round(baseKcalAvg))
  const scale = (baseKcalAvg * mealDayLabels.length) / sum
  return raw.map((x) => Math.max(1200, Math.round(x * scale)))
}
