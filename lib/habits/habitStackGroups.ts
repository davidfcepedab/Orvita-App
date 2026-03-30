import type { HabitWithMetrics } from "@/lib/operational/types"

export type HabitTimeBlockId = "manana" | "tarde" | "noche" | "sin_hora"

const BLOCK_SEQUENCE: HabitTimeBlockId[] = ["manana", "tarde", "noche", "sin_hora"]

/**
 * Intenta extraer la hora preferida (0–23) del texto de disparador / hora.
 */
export function parsePreferredHourFromTrigger(triggerOrTime?: string | null): number | null {
  const s = triggerOrTime?.trim()
  if (!s) return null
  const lower = s.toLowerCase()
  const hm = s.match(/\b([01]?\d|2[0-3])[:.]([0-5]\d)\b/)
  if (hm) return parseInt(hm[1], 10)
  const las = lower.match(/las\s+([01]?\d|2[0-3])\b/)
  if (las) return parseInt(las[1], 10)
  const hh = lower.match(/\b([01]?\d|2[0-3])\s*h\b/)
  if (hh) return parseInt(hh[1], 10)
  return null
}

/** Alineado con el saludo de la página: antes de 12 mañana, antes de 18 tarde, resto noche. */
export function timeBlockForHour(hour: number | null): HabitTimeBlockId {
  if (hour === null) return "sin_hora"
  if (hour < 12) return "manana"
  if (hour < 18) return "tarde"
  return "noche"
}

export function groupHabitsByDaypart(habits: HabitWithMetrics[]): Map<HabitTimeBlockId, HabitWithMetrics[]> {
  const groups = new Map<HabitTimeBlockId, HabitWithMetrics[]>()
  for (const id of BLOCK_SEQUENCE) {
    groups.set(id, [])
  }
  for (const habit of habits) {
    const hour = parsePreferredHourFromTrigger(habit.metadata?.trigger_or_time)
    const block = timeBlockForHour(hour)
    groups.get(block)!.push(habit)
  }
  for (const list of groups.values()) {
    list.sort((a, b) => {
      const ha = parsePreferredHourFromTrigger(a.metadata?.trigger_or_time)
      const hb = parsePreferredHourFromTrigger(b.metadata?.trigger_or_time)
      if (ha !== null && hb !== null && ha !== hb) return ha - hb
      if (ha !== null && hb === null) return -1
      if (ha === null && hb !== null) return 1
      return a.name.localeCompare(b.name, "es")
    })
  }
  return groups
}

export function orderedDaypartBlocks(): HabitTimeBlockId[] {
  return [...BLOCK_SEQUENCE]
}
