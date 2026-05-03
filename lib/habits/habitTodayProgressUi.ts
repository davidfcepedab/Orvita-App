import type { HabitWithMetrics } from "@/lib/operational/types"
import {
  formatWaterMlEs,
  goalMlFromHabitMetadata,
  isWaterTrackingHabit,
} from "@/lib/habits/waterTrackingHelpers"

export type HabitTodayProgressKind = "water" | "intraday" | "none"

/**
 * Progreso de hoy: agua = ml/meta; intraday Sí/No = 0% o 100% con leyenda N/M chequeos
 * (un solo registro diario en BD; N es la meta documentada, el cierre del día llena la barra).
 */
export function habitTodayProgressUi(habit: HabitWithMetrics): {
  pct: number
  kind: HabitTodayProgressKind
  ariaLabel: string
  caption?: string
} {
  const meta = habit.metadata
  if (isWaterTrackingHabit(meta)) {
    const goalMl = goalMlFromHabitMetadata(meta)
    const todayMl = habit.water_today_ml ?? 0
    const pct = goalMl > 0 ? Math.min(100, Math.round((todayMl / goalMl) * 100)) : 0
    return {
      pct,
      kind: "water",
      ariaLabel: `Progreso de hidratación hoy: ${formatWaterMlEs(todayMl)} de ${formatWaterMlEs(goalMl)}, ${pct} por ciento`,
      caption: `${formatWaterMlEs(todayMl)} / ${formatWaterMlEs(goalMl)} ml`,
    }
  }

  const intraday = Boolean(meta?.intraday_si_no_progress)
  const checks = meta?.intraday_si_no_target_checks
  if (intraday && checks != null && Number.isFinite(checks)) {
    const n = Math.min(24, Math.max(1, Math.round(checks)))
    const done = habit.metrics.completed_today
    const filled = done ? n : 0
    return {
      pct: done ? 100 : 0,
      kind: "intraday",
      ariaLabel: done
        ? `${habit.name}: meta de ${n} chequeos registrada para hoy`
        : `${habit.name}: ${filled} de ${n} hacia la meta de chequeos del día`,
      caption: `${filled} / ${n} chequeos`,
    }
  }

  const pct = habit.metrics.completed_today ? 100 : 0
  return {
    pct,
    kind: "none",
    ariaLabel: habit.metrics.completed_today
      ? `${habit.name}: completado hoy`
      : `${habit.name}: pendiente hoy`,
  }
}

export function habitShowsTodayProgressBar(ui: ReturnType<typeof habitTodayProgressUi>): boolean {
  return ui.kind === "water" || ui.kind === "intraday"
}
