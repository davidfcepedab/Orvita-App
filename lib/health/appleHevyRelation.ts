import type { TrainingDay } from "@/src/modules/training/types"

/** Marca de integración de entrenos en código (Hevy; a veces se escribe “Heavy” en chat). */
export const HEVY_INTEGRATION_LABEL = "Hevy"

export type AppleDaySignals = {
  workoutsCount: number | null
  workoutMinutes: number | null
  activeEnergyKcal: number | null
  sleepHours: number | null
}

/** Lee señales guardadas en `health_metrics` (columnas + metadata del Atajo). */
export function appleDaySignalsFromHealthMetric(metric: {
  sleep_hours: number | null
  calories: number | null
  metadata?: Record<string, unknown> | null
} | null): AppleDaySignals {
  if (!metric) {
    return { workoutsCount: null, workoutMinutes: null, activeEnergyKcal: null, sleepHours: null }
  }
  const meta = metric.metadata ?? {}
  const wc = typeof meta.apple_workouts_count === "number" ? meta.apple_workouts_count : null
  const wds = typeof meta.apple_workouts_duration_seconds === "number" ? meta.apple_workouts_duration_seconds : null
  const wmin = wds != null && wds > 0 ? Math.round(wds / 60) : null
  return {
    workoutsCount: wc,
    workoutMinutes: wmin,
    activeEnergyKcal: metric.calories ?? null,
    sleepHours: metric.sleep_hours ?? null,
  }
}

/**
 * Copy listo para usuario final: cruza lo que Apple Health midió hoy con lo que Hevy registró.
 * No es diagnóstico; evita culpa y prioriza coherencia entre fuentes.
 */
export function describeAppleHealthVersusHevy(hevyToday: TrainingDay | null, apple: AppleDaySignals): string {
  const hevyTrained = hevyToday?.status === "trained" || hevyToday?.status === "swim"
  const hevyVolume = hevyToday?.volumeScore ?? 0
  const wCount = apple.workoutsCount ?? 0
  const wMin = apple.workoutMinutes ?? 0
  const kcal = apple.activeEnergyKcal
  const sleep = apple.sleepHours

  const hasAppleMove = wCount > 0 || wMin > 0 || (kcal != null && kcal > 50)

  if (!hevyToday && !hasAppleMove) {
    return `Cuando conectes ${HEVY_INTEGRATION_LABEL} y el Atajo de Apple Health, aquí veremos si tu día “cerró” entre entreno registrado y movimiento real.`
  }

  if (hevyTrained && hasAppleMove) {
    return `${HEVY_INTEGRATION_LABEL} marca sesión hoy (volumen ~${Math.round(hevyVolume)}) y Apple Health también ve actividad (${wCount ? `${wCount} entreno(s)` : "entrenos"}, ${wMin ? `~${Math.round(wMin)} min` : "minutos por confirmar"}${kcal != null ? `, ~${Math.round(kcal)} kcal activas` : ""}). Buena señal de alineación entre lo que planeas y lo que el cuerpo ejecutó.${sleep != null ? ` Sueño ~${sleep.toFixed(1)} h ayuda a contextualizar la recuperación.` : ""}`
  }

  if (hevyTrained && !hasAppleMove) {
    return `${HEVY_INTEGRATION_LABEL} muestra entreno hoy, pero Apple no reportó entrenos ni mucha energía activa todavía. Pasa cuando el reloj no capturó la sesión, fue fuerza sin cardio, o falta sincronizar el Atajo. No es drama: revisa permisos de Salud → Atajos o vuelve a importar más tarde.`
  }

  if (!hevyTrained && hasAppleMove) {
    return `Apple Health ve movimiento (${wCount ? `${wCount} entreno(s)` : "actividad"}${wMin ? `, ~${Math.round(wMin)} min` : ""}${kcal != null ? `, ~${Math.round(kcal)} kcal` : ""}) pero ${HEVY_INTEGRATION_LABEL} no tiene sesión registrada hoy. Si entrenaste, anótalo en ${HEVY_INTEGRATION_LABEL}; si fue caminar o tareas, puede ser perfectamente válido sin “sesión”.`
  }

  return `Hoy ${HEVY_INTEGRATION_LABEL} está en modo descanso/pausa y Apple no muestra carga fuerte. Buen día para caminar suave, movilidad o proteger el sueño${sleep != null ? ` (~${sleep.toFixed(1)} h)` : ""}.`
}
