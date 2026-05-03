/** Reparto de horas y toques efectivos para recordatorios de hábitos (cron). */

export type HabitReminderSlotDef = { hour: number; order: number }

function clampHour(h: number): number {
  if (!Number.isFinite(h)) return 8
  return Math.min(23, Math.max(0, Math.round(h)))
}

/**
 * Reparte `slotCount` horas entre `digest_hour_local` y `reminder_hour_local`.
 * Si ambas coinciden, usa ventana civil 7–22 para no colapsar en un solo instante.
 */
export function buildHabitReminderSlotDefs(
  digestHour: number,
  reminderHour: number,
  slotCount: number,
): HabitReminderSlotDef[] {
  const d = clampHour(digestHour)
  const r = clampHour(reminderHour)
  const n = Math.min(4, Math.max(1, Math.round(slotCount)))
  if (n <= 1) return [{ hour: d, order: 0 }]

  let raw: number[]
  if (d === r) {
    const lo = 7
    const hi = 22
    raw = Array.from({ length: n }, (_, i) => Math.round(lo + (i / (n - 1)) * (hi - lo)))
  } else {
    const lo = Math.min(d, r)
    const hi = Math.max(d, r)
    raw = Array.from({ length: n }, (_, i) => Math.round(lo + (i / (n - 1)) * (hi - lo)))
    raw[0] = d
    raw[raw.length - 1] = r
  }

  const used = new Set<number>()
  const out: HabitReminderSlotDef[] = []
  for (let order = 0; order < n; order++) {
    let h = clampHour(raw[order]!)
    while (used.has(h) && h < 23) h++
    while (used.has(h) && h > 0) h--
    used.add(h)
    out.push({ hour: h, order })
  }
  return out
}

/** Toques pedidos menos descuento por racha (cada 7 días de mejor racha, hasta dejar 1). */
export function habitReminderEffectiveSlotCount(
  requested: number,
  maxCurrentStreakAmongHabits: number,
  autoEaseOnStreak: boolean,
): number {
  const req = Math.min(4, Math.max(1, Math.round(requested)))
  if (!autoEaseOnStreak) return req
  const tiers = Math.floor(Math.max(0, maxCurrentStreakAmongHabits) / 7)
  const discount = Math.min(req - 1, tiers)
  return Math.max(1, req - discount)
}

export function findHabitReminderSlotAtHour(
  slots: HabitReminderSlotDef[],
  localHour: number,
): HabitReminderSlotDef | null {
  return slots.find((s) => s.hour === localHour) ?? null
}
