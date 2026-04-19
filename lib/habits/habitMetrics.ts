/**
 * Métricas de hábitos a partir de fechas YYYY-MM-DD (día civil en la zona de agenda, p. ej. America/Bogota).
 * Importante: no usar solo UTC (`toISOString().slice(0,10)`), o por la noche en América el “hoy” salta al día siguiente.
 */

import { addCalendarDaysYmd } from "@/lib/agenda/calendarMath"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"

export type HabitFrequency = "diario" | "semanal"

export type HabitMetadataInput = {
  frequency?: HabitFrequency
  /** getUTCDay(): 0 = domingo … 6 = sábado */
  weekdays?: number[]
}

/** Semana UTC L→D (lun…dom), cada índice alinea con ["L","M","X","J","V","S","D"] */
export type HabitWeekDayMark = "done" | "missed" | "upcoming" | "off"

export type HabitCompletionMetrics = {
  current_streak: number
  best_streak: number
  completion_rate_30d: number
  completed_today: boolean
  at_risk: boolean
  week_marks: HabitWeekDayMark[]
  /**
   * 14 días civiles hasta hoy (más antiguo → más reciente).
   * `null` = día no programado para ese hábito; `1` = hecho; `0` = programado y pendiente.
   */
  sparkline14: Array<0 | 1 | null>
}

/** Día civil “hoy” según `NEXT_PUBLIC_AGENDA_DISPLAY_TZ` (default America/Bogota). */
export function utcTodayIso(): string {
  return agendaTodayYmd()
}

/** Límite de antigüedad para registrar un día pasado (viaje, olvido). */
export const HABIT_BACKFILL_MAX_DAYS_PAST = 730

/**
 * Valida `YYYY-MM-DD` para completado retroactivo: no futuro, no anterior al límite.
 */
export function parseBackfillCompletionDay(
  completedOnRaw: string,
  options?: { maxDaysPast?: number },
): { ok: true; day: string } | { ok: false; error: string } {
  const trimmed = completedOnRaw.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return { ok: false, error: "Fecha inválida (usa YYYY-MM-DD)" }
  }
  const probe = new Date(`${trimmed}T12:00:00.000Z`)
  if (Number.isNaN(probe.getTime()) || probe.toISOString().slice(0, 10) !== trimmed) {
    return { ok: false, error: "Fecha de calendario inválida" }
  }
  const t = utcTodayIso()
  if (trimmed > t) {
    return { ok: false, error: "No puedes registrar días futuros" }
  }
  const maxPast = options?.maxDaysPast ?? HABIT_BACKFILL_MAX_DAYS_PAST
  const minDay = addDaysIso(t, -maxPast)
  if (trimmed < minDay) {
    return { ok: false, error: `Solo se pueden registrar hasta ${maxPast} días atrás` }
  }
  return { ok: true, day: trimmed }
}

export function addDaysIso(iso: string, delta: number): string {
  return addCalendarDaysYmd(iso, delta)
}

export function utcWeekdayFromIso(iso: string): number {
  return new Date(`${iso}T12:00:00.000Z`).getUTCDay()
}

/** Lunes UTC de la semana que contiene `iso` (YYYY-MM-DD). */
export function mondayStartUtcForIsoDay(iso: string): string {
  const wd = utcWeekdayFromIso(iso)
  const daysSinceMonday = wd === 0 ? 6 : wd - 1
  return addDaysIso(iso, -daysSinceMonday)
}

/**
 * Una entrada por día L…D (lun…dom) en la semana UTC actual respecto a `todayIso`.
 */
export function computeWeekDayMarks(
  sortedUniqueAsc: string[],
  todayIso: string,
  meta: HabitMetadataInput | null | undefined
): HabitWeekDayMark[] {
  const set = new Set(sortedUniqueAsc)
  const monday = mondayStartUtcForIsoDay(todayIso)
  const out: HabitWeekDayMark[] = []
  for (let i = 0; i < 7; i++) {
    const d = addDaysIso(monday, i)
    if (d > todayIso) {
      out.push("upcoming")
    } else if (!isScheduledOnUtcDay(meta, d)) {
      out.push("off")
    } else if (set.has(d)) {
      out.push("done")
    } else {
      out.push("missed")
    }
  }
  return out
}

/** Letras UI L..D → getUTCDay (L=lun=1 … D=dom=0) */
export const HABIT_LETTER_TO_UTCDAY: Record<string, number> = {
  L: 1,
  M: 2,
  X: 3,
  J: 4,
  V: 5,
  S: 6,
  D: 0,
}

export const HABIT_UTCDAY_TO_LETTER: Record<number, string> = {
  0: "D",
  1: "L",
  2: "M",
  3: "X",
  4: "J",
  5: "V",
  6: "S",
}

export function lettersToWeekdays(letters: string[]): number[] {
  const out = new Set<number>()
  for (const ch of letters) {
    const key = ch.trim().toUpperCase()
    if (key in HABIT_LETTER_TO_UTCDAY) {
      out.add(HABIT_LETTER_TO_UTCDAY[key])
    }
  }
  return Array.from(out).sort((a, b) => a - b)
}

export function weekdaysToLetters(weekdays: number[]): string[] {
  const sorted = [...new Set(weekdays)].sort((a, b) => a - b)
  return sorted.map((d) => HABIT_UTCDAY_TO_LETTER[d] ?? "").filter(Boolean)
}

function normalizeMeta(meta: HabitMetadataInput | undefined | null): {
  frequency: HabitFrequency
  weekdays: number[]
} {
  const frequency = meta?.frequency === "semanal" ? "semanal" : "diario"
  const weekdays = Array.isArray(meta?.weekdays) ? meta.weekdays.filter((n) => n >= 0 && n <= 6) : []
  return { frequency, weekdays }
}

export function isScheduledOnUtcDay(
  meta: HabitMetadataInput | null | undefined,
  dayIso: string
): boolean {
  const { frequency, weekdays } = normalizeMeta(meta)
  if (frequency === "semanal" && weekdays.length === 0) return false
  const wd = utcWeekdayFromIso(dayIso)
  if (weekdays.length === 0) {
    return frequency === "diario"
  }
  return weekdays.includes(wd)
}

function uniqueSortedAsc(dates: string[]): string[] {
  return Array.from(new Set(dates.filter(Boolean))).sort()
}

/**
 * Días programados estrictamente entre `prevIso` y `curIso` (excluye extremos).
 * Si alguno debía cumplirse y no está en `done`, la cadena de racha se rompe.
 */
function noMissedScheduledBetween(
  prevIso: string,
  curIso: string,
  done: Set<string>,
  meta: HabitMetadataInput | null | undefined
): boolean {
  let d = addDaysIso(prevIso, 1)
  while (d < curIso) {
    if (isScheduledOnUtcDay(meta, d) && !done.has(d)) return false
    d = addDaysIso(d, 1)
  }
  return true
}

/**
 * Racha actual: ocurrencias programadas consecutivas hacia atrás desde hoy,
 * sin contar días en que el hábito no aplica. Se corta en el primer día
 * programado ≤ hoy que falte por completar.
 */
export function computeCurrentStreak(
  sortedUniqueAsc: string[],
  todayIso: string,
  meta: HabitMetadataInput | null | undefined
): number {
  const done = new Set(sortedUniqueAsc)
  let streak = 0
  let d = todayIso
  for (let i = 0; i < 800; i++) {
    if (isScheduledOnUtcDay(meta, d)) {
      if (!done.has(d)) break
      streak++
    }
    d = addDaysIso(d, -1)
  }
  return streak
}

/**
 * Mejor racha histórica solo sobre días programados: cadena de completados
 * donde entre dos fechas consecutivas en la lista no hubo ningún día
 * programado sin completar.
 */
export function computeBestStreak(
  sortedUniqueAsc: string[],
  meta: HabitMetadataInput | null | undefined
): number {
  const done = new Set(sortedUniqueAsc)
  const scheduledDone = sortedUniqueAsc.filter((day) => done.has(day) && isScheduledOnUtcDay(meta, day))
  if (scheduledDone.length === 0) return 0
  let best = 1
  let run = 1
  for (let i = 1; i < scheduledDone.length; i++) {
    const prev = scheduledDone[i - 1]
    const cur = scheduledDone[i]
    if (noMissedScheduledBetween(prev, cur, done, meta)) {
      run++
      best = Math.max(best, run)
    } else {
      run = 1
    }
  }
  return best
}

function countScheduledDaysInLast30(todayIso: string, meta: HabitMetadataInput | null | undefined): number {
  const { frequency, weekdays } = normalizeMeta(meta)
  if (frequency === "semanal" && weekdays.length === 0) return 0
  let n = 0
  for (let i = 0; i < 30; i++) {
    const d = addDaysIso(todayIso, -i)
    const wd = utcWeekdayFromIso(d)
    let scheduled = false
    if (weekdays.length === 0) {
      scheduled = frequency === "diario"
    } else {
      scheduled = weekdays.includes(wd)
    }
    if (scheduled) n++
  }
  return n
}

function countCompletionsInLast30(todayIso: string, sortedUniqueAsc: string[]): number {
  const start = addDaysIso(todayIso, -29)
  return sortedUniqueAsc.filter((d) => d >= start && d <= todayIso).length
}

export function computeCompletionRate30d(
  todayIso: string,
  sortedUniqueAsc: string[],
  meta: HabitMetadataInput | null | undefined
): number {
  const expected = countScheduledDaysInLast30(todayIso, meta)
  if (expected <= 0) return 0
  const done = countCompletionsInLast30(todayIso, sortedUniqueAsc)
  return Math.min(100, Math.round((done / expected) * 100))
}

/** Serie compacta para mini sparkline (14 días hasta `todayIso`). */
export function computeSparkline14(
  sortedUniqueAsc: string[],
  todayIso: string,
  meta: HabitMetadataInput | null | undefined,
): Array<0 | 1 | null> {
  const set = new Set(sortedUniqueAsc)
  const out: Array<0 | 1 | null> = []
  for (let i = 13; i >= 0; i--) {
    const d = addDaysIso(todayIso, -i)
    if (!isScheduledOnUtcDay(meta, d)) {
      out.push(null)
      continue
    }
    out.push(set.has(d) ? 1 : 0)
  }
  return out
}

export function computeHabitCompletionMetrics(
  completionDates: string[],
  todayIso: string,
  meta: HabitMetadataInput | null | undefined
): HabitCompletionMetrics {
  const sorted = uniqueSortedAsc(completionDates)
  const completed_today = sorted.includes(todayIso)
  const scheduled_today = isScheduledOnUtcDay(meta, todayIso)
  const at_risk = scheduled_today && !completed_today

  return {
    current_streak: computeCurrentStreak(sorted, todayIso, meta),
    best_streak: computeBestStreak(sorted, meta),
    completion_rate_30d: computeCompletionRate30d(todayIso, sorted, meta),
    completed_today,
    at_risk,
    week_marks: computeWeekDayMarks(sorted, todayIso, meta),
    sparkline14: computeSparkline14(sorted, todayIso, meta),
  }
}

export function aggregateHabitsSummary(metricsList: HabitCompletionMetrics[]): {
  consistency_30d: number
  best_streak: number
  at_risk: number
  current_streak_max: number
} {
  if (metricsList.length === 0) {
    return { consistency_30d: 0, best_streak: 0, at_risk: 0, current_streak_max: 0 }
  }
  const sumRate = metricsList.reduce((a, m) => a + m.completion_rate_30d, 0)
  return {
    consistency_30d: Math.round(sumRate / metricsList.length),
    best_streak: Math.max(...metricsList.map((m) => m.best_streak)),
    at_risk: metricsList.filter((m) => m.at_risk).length,
    current_streak_max: Math.max(...metricsList.map((m) => m.current_streak)),
  }
}

