import type { HabitWeekDayMark } from "@/lib/habits/habitMetrics"
import type { HabitWithMetrics } from "@/lib/operational/types"

/**
 * Mock opcional para demos / tests de UI con varios hábitos agrupados.
 * En producción, el aside de `/hoy` lista hábitos que aplican hoy según metadata (días activos,
 * frecuencia); este mock sigue sirviendo solo para demos o tests aislados.
 */
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

export const WELLNESS_ROUTINE_PREVIEW_HABITS_FOR_HOY: HabitWithMetrics[] = [
  {
    id: "hoy-preview-wellness-a",
    name: "Meditar 10 min",
    completed: true,
    domain: "salud",
    created_at: "2026-01-02T12:00:00.000Z",
    metadata: {
      success_metric_type: "si_no",
      frequency: "diario",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      display_days: ["L", "M", "X", "J", "V", "S", "D"],
      intention: "Anclar la mañana con claridad mental.",
    },
    metrics: metricsBase({ completed_today: true, current_streak: 12 }),
  },
  {
    id: "hoy-preview-wellness-b",
    name: "Leer 20 páginas",
    completed: true,
    domain: "fisico",
    created_at: "2026-01-03T12:00:00.000Z",
    metadata: {
      success_metric_type: "si_no",
      frequency: "diario",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      display_days: ["L", "M", "X", "J", "V", "S", "D"],
    },
    metrics: metricsBase({ completed_today: true, current_streak: 12 }),
  },
  {
    id: "hoy-preview-wellness-c",
    name: "Ejercicio ligero",
    completed: false,
    domain: "fisico",
    created_at: "2026-01-04T12:00:00.000Z",
    metadata: {
      success_metric_type: "si_no",
      frequency: "diario",
      weekdays: [0, 1, 2, 3, 4, 5, 6],
      display_days: ["L", "M", "X", "J", "V", "S", "D"],
      intention: "Aumentar energía y bienestar físico.",
    },
    metrics: metricsBase({ completed_today: false, current_streak: 12 }),
  },
]
