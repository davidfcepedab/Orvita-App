import type { HabitWeekDayMark } from "@/lib/habits/habitMetrics"
import type { HabitWithMetrics } from "@/lib/operational/types"

const weekOk: HabitWeekDayMark[] = ["done", "done", "done", "missed", "upcoming", "off", "off"]

const spark14: Array<0 | 1 | null> = Array.from({ length: 14 }, (_, i) => (i % 3 === 0 ? 1 : 0))

function metricsBase(over: Partial<HabitWithMetrics["metrics"]> = {}): HabitWithMetrics["metrics"] {
  return {
    current_streak: 12,
    best_streak: 28,
    completion_rate_30d: 76,
    completed_today: false,
    at_risk: false,
    week_marks: weekOk,
    sparkline14: [...spark14],
    ...over,
  }
}

/**
 * Hábito flexible sí/no con **varios chequeos en el día** (intraday), sin súper.
 * Laboratorio variantes misión flexible · alineado al stack real.
 */
export const MOCK_FLEX_LAB_INTRADAY_DAILY: HabitWithMetrics = {
  id: "lab-flex-intraday-daily",
  name: "Practicar gratitud",
  completed: false,
  domain: "salud",
  created_at: "2026-01-10T12:00:00.000Z",
  metadata: {
    success_metric_type: "si_no",
    frequency: "diario",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    display_days: ["L", "M", "X", "J", "V", "S", "D"],
    intraday_si_no_progress: true,
    intraday_si_no_target_checks: 5,
    intention: "Tres check-ins conscientes repartidos entre mañana y noche, sin hora fija.",
    trigger_or_time: "Durante el día · varios toques",
    is_superhabit: false,
  },
  metrics: metricsBase({
    current_streak: 18,
    best_streak: 40,
    completion_rate_30d: 81,
    completed_today: false,
    at_risk: true,
  }),
}

/**
 * Misma semántica flexible + intraday, con **súper hábito** (sin hora parseable en trigger).
 */
export const MOCK_FLEX_LAB_INTRADAY_SUPER: HabitWithMetrics = {
  id: "lab-flex-intraday-super",
  name: "Impulsos bajo control",
  completed: false,
  domain: "salud",
  created_at: "2026-01-11T12:00:00.000Z",
  metadata: {
    success_metric_type: "si_no",
    frequency: "diario",
    weekdays: [0, 1, 2, 3, 4, 5, 6],
    display_days: ["L", "M", "X", "J", "V", "S", "D"],
    intraday_si_no_progress: true,
    intraday_si_no_target_checks: 5,
    is_superhabit: true,
    intention: "Registrar cada cierre del día; bonificación de racha prioritaria en Órvita.",
    trigger_or_time: "Al cerrar tu rutina del día (sin hora fija)",
  },
  metrics: metricsBase({
    current_streak: 31,
    best_streak: 62,
    completion_rate_30d: 88,
    completed_today: false,
    at_risk: false,
  }),
}
