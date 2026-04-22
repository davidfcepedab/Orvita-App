import type { AppleHealthContextSignals } from "@/lib/operational/types"
import type { TrainingDay } from "@/src/modules/training/types"
import { describeAppleHealthVersusHevy, HEVY_INTEGRATION_LABEL } from "@/lib/health/appleHevyRelation"

function fmtHours(h: number | null | undefined) {
  if (h == null || !Number.isFinite(h)) return "dato no enviado"
  return `unas ${h.toFixed(1)} h`
}

/**
 * Hechos en español claro para el modelo (sin acrónimos prohibidos en el resumen de salud).
 * No afirma certeza clínica; describe lo que la app conoce.
 */
export function buildAppleHevyCorrelationPromptFacts(
  apple: AppleHealthContextSignals | null,
  hevy: TrainingDay | null,
  opts?: {
    checkSalud?: number
    checkFisico?: number
  },
): string {
  const lines: string[] = []

  if (opts?.checkSalud != null && Number.isFinite(opts.checkSalud)) {
    lines.push(`En el último check-in, la dimensión “cómo te sientes de salud” ronda ${Math.round(opts.checkSalud)} sobre cien.`)
  }
  if (opts?.checkFisico != null && Number.isFinite(opts.checkFisico)) {
    lines.push(`En el último check-in, la dimensión “cuerpo y energía física” ronda ${Math.round(opts.checkFisico)} sobre cien.`)
  }

  if (!apple) {
    lines.push("Aún no hay una última importación desde el teléfono con Apple Salud, o no llegó a Órvita.")
  } else {
    lines.push(`La última sincronización recibida es del ${new Date(apple.observed_at).toLocaleString("es", { dateStyle: "short", timeStyle: "short" })}.`)
    if (apple.sync_stale) {
      lines.push("Esa lectura tiene más de un día y medio; conviene volver a enviarla para que el cuadro esté al día.")
    }
    lines.push(`Sueño registrado: ${fmtHours(apple.sleep_hours)}.`)
    if (apple.steps != null) lines.push(`Pasos aproximados del día: ${Math.round(apple.steps)}.`)
    if (apple.calories != null) lines.push(`Calorías de movimiento (aprox.): ${Math.round(apple.calories)}.`)
    if (apple.readiness_score != null) {
      lines.push(`Índice de disposición del día (según Apple): ${Math.round(apple.readiness_score)}.`)
    }
    if (apple.hrv_ms != null) {
      lines.push(
        `Variación minuto a minuto del ritmo cardíaco, medida en milisegundos, según el reloj: ${Math.round(apple.hrv_ms)} (un valor bajo a veces va con cansancio o estrés, sin ser diagnóstico).`,
      )
    }
    const wc = apple.workouts_count
    const wm = apple.workout_minutes
    if (wc != null && wc > 0) {
      lines.push(`Apple contó ${Math.round(wc)} sesión(es) de movimiento.`)
    }
    if (wm != null && wm > 0) {
      lines.push(`Suma aproximada de minutos de entreno según Apple: ${Math.round(wm)}.`)
    }
    if (apple.resting_hr_bpm != null) {
      lines.push(`Pulsaciones en reposo que mandó el reloj: ${Math.round(apple.resting_hr_bpm)} por minuto.`)
    }
  }

  if (!hevy) {
    lines.push(`En ${HEVY_INTEGRATION_LABEL} no figura aún un día vinculado a tu cuenta o no hay dato de hoy.`)
  } else {
    const st =
      hevy.status === "trained"
        ? "Hubo sesión de gimnasio o rutina de fuerza registrada"
        : hevy.status === "swim"
          ? "Hubo natación"
          : hevy.status === "skip"
            ? "La sesión quedó en pausa"
            : "El plan marca descanso o no hay registro duro hoy"
    lines.push(
      `${HEVY_INTEGRATION_LABEL}: ${st}. Origen: ${hevy.source === "hevy" ? "sincronizado con la app" : "anotado a mano en Órvita"}.`,
    )
    if (typeof hevy.volumeScore === "number" && hevy.volumeScore > 0) {
      lines.push(`Volumen aproximado de trabajo de la sesión (puntuación interna de la app): ${Math.round(hevy.volumeScore)}.`)
    }
  }

  return lines.join("\n")
}

export function buildFallbackAppleHevyCorrelationParagraph(
  apple: AppleHealthContextSignals | null,
  hevy: TrainingDay | null,
): string {
  return describeAppleHealthVersusHevy(hevy, apple)
}
