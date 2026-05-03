import type { HabitWithMetrics } from "@/lib/operational/types"
import { parsePreferredHourFromTrigger } from "@/lib/habits/habitStackGroups"

/**
 * Hábitos que no siguen el bloque mañana/tarde/noche/sin hora:
 * - Sí/no con varios chequeos en el día, o
 * - Superhábito sí/no sin hora reconocible en el trigger (prelación vs «sin hora»).
 */
export function isFlexibleStackHabit(habit: HabitWithMetrics): boolean {
  if (habit.metadata?.habit_type === "water-tracking") return false
  if (habit.metadata?.success_metric_type !== "si_no") return false
  if (habit.metadata?.intraday_si_no_progress) return true
  const hasHour = parsePreferredHourFromTrigger(habit.metadata?.trigger_or_time) != null
  if (habit.metadata?.is_superhabit && !hasHour) return true
  return false
}

export function sortFlexibleStackHabits(habits: HabitWithMetrics[]): HabitWithMetrics[] {
  return [...habits].sort((a, b) => {
    const sa = a.metadata?.is_superhabit ? 1 : 0
    const sb = b.metadata?.is_superhabit ? 1 : 0
    if (sa !== sb) return sb - sa
    const ia = a.metadata?.intraday_si_no_progress ? 1 : 0
    const ib = b.metadata?.intraday_si_no_progress ? 1 : 0
    if (ia !== ib) return ib - ia
    return a.name.localeCompare(b.name, "es")
  })
}
