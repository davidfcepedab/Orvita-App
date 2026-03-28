import type { RecoveryInput } from "@/src/modules/health/recoveryEngine"

/**
 * Señales proxy desde score de recuperación (check-in salud) + entreno hoy (Hevy/manual).
 */
export function buildRecoveryInputs(scoreRecuperacion: number, trainedToday: boolean): RecoveryInput {
  const sr = Number.isFinite(scoreRecuperacion) ? Math.min(100, Math.max(0, scoreRecuperacion)) : 50
  const sleepQuality = Math.max(1, Math.min(5, Math.round(sr / 20) || 1))
  const sleepHours = 5.5 + (sr / 100) * 3.2
  const anxietyLevel = Math.max(1, Math.min(5, 6 - Math.round(sr / 22)))
  return {
    sleepHours,
    sleepQuality,
    anxietyLevel,
    trainedToday,
  }
}
