/** Umbrales ascendentes para mensajes de superhábito (días de racha). */
export const SUPERHABIT_STREAK_MILESTONES_ASC = [7, 15, 30, 45, 60, 90, 120] as const

export type StreakCelebrationPayload = {
  habitId: string
  habitName: string
  milestoneDays: number
  message: string
}

/** Mensaje asociado al hito de racha (solo superhábitos; a partir de 7 días). */
export function superhabitStreakRewardMessage(days: number): string | null {
  if (days >= 120) return "Hito 120 días: consistencia de élite"
  if (days >= 90) return "Hito 90 días: sistema consolidado"
  if (days >= 60) return "Hito 60 días: constancia estratégica"
  if (days >= 45) return "Hito 45 días: momentum estable"
  if (days >= 30) return "Hito 30 días: disciplina consolidada"
  if (days >= 15) return "Hito 15 días: progreso consistente"
  if (days >= 7) return "Hito 7 días: primer bloque completado"
  return null
}

/** Mayor umbral `m` tal que la racha acaba de superarlo (prev < m ≤ next). */
export function highestNewlyReachedStreakMilestone(prev: number, next: number): number | null {
  let hit: number | null = null
  for (const m of SUPERHABIT_STREAK_MILESTONES_ASC) {
    if (prev < m && next >= m) hit = m
  }
  return hit
}

export function buildSuperhabitStreakCelebration(opts: {
  habitId: string
  habitName: string
  isSuperhabit: boolean
  wasCompletedToday: boolean
  nowCompletedToday: boolean
  prevStreak: number
  nextStreak: number
}): StreakCelebrationPayload | null {
  if (!opts.isSuperhabit) return null
  if (!opts.nowCompletedToday || opts.wasCompletedToday) return null
  const m = highestNewlyReachedStreakMilestone(opts.prevStreak, opts.nextStreak)
  if (m == null) return null
  const message = superhabitStreakRewardMessage(m)
  if (!message) return null
  return {
    habitId: opts.habitId,
    habitName: opts.habitName,
    milestoneDays: m,
    message,
  }
}
