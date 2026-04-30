/**
 * Brief operativo /salud — capa pura (sin UI).
 *
 * Blueprint visual (fallback si Figma/MCP no disponible):
 * 1) Hero: estado H1 + score grande + causa 1 línea + fila CTAs + `<details>` sync Apple compacto.
 * 2) Strip: 4 celdas en fila (HRV, sueño, pasos, recuperación).
 * 3) Insight: 1 línea ejecutiva + máx 2 bullets + acción + link /training.
 * 4) Puente Hevy: headline hoy + regla secuencia + CTA /training.
 * Debajo (fuera de los 4 bloques): `<details>` operativo con HealthOperationsV3 variante.
 */
import type { SaludContextSnapshot } from "@/app/salud/_hooks/useSaludContext"
import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import type { PlanVsExecution, TrainingReadiness } from "@/lib/training/trainingOperationalDerivations"
import type { TrainingTodayState } from "@/src/modules/training/types"

export type DecisionSemantic = "ok" | "warn" | "risk"

export type SaludDecisionBrief = {
  dayStateLabel: string
  energyScore: number
  semantic: DecisionSemantic
  causeLine: string
  executiveInsight: string
  evidenceBullets: [string, string]
  directAction: string
  trainingHeadline: string
  sequenceLine: string
}

function semanticFromReadiness(score: number): DecisionSemantic {
  if (score >= 70) return "ok"
  if (score >= 50) return "warn"
  return "risk"
}

function mapReadinessToDayState(label: TrainingReadiness["label"]): string {
  switch (label) {
    case "Listo para entrenar":
      return "Entrenar normal"
    case "Entrenar suave":
      return "Entrenar ligero"
    case "Ajustar volumen":
      return "Entrenar ligero"
    case "Priorizar recuperación":
      return "Descansar"
    default:
      return label
  }
}

function buildCauseLine(
  latest: AutoHealthMetric | null,
  salud: SaludContextSnapshot,
  readiness: TrainingReadiness,
  staleSync: boolean,
): string {
  const parts: string[] = []
  if (latest?.hrv_ms != null) {
    parts.push(readiness.score < 55 && latest.hrv_ms < 38 ? "VFC baja" : `VFC ${Math.round(latest.hrv_ms)} ms`)
  } else parts.push("VFC sin dato")
  if (latest?.sleep_hours != null) {
    parts.push(latest.sleep_hours < 6.5 ? "sueño incompleto" : `${latest.sleep_hours.toFixed(1)} h sueño`)
  } else parts.push("sueño sin dato")
  if (salud.strain > salud.scoreRecuperacion + 6) parts.push("carga percibida alta vs recuperación")
  if (staleSync) parts.push("datos de Apple desactualizados")
  return parts.slice(0, 3).join(" · ")
}

function buildExecutiveInsight(
  readiness: TrainingReadiness,
  salud: SaludContextSnapshot,
  latest: AutoHealthMetric | null,
): string {
  if (readiness.score < 48) {
    return "Tu cuerpo pide frenar: hoy no es día de empujar el plan al máximo."
  }
  if (readiness.score < 64) {
    return "Estás cerca del límite de recuperación: ajusta volumen o intensidad antes de forzar."
  }
  if (latest?.readiness_score != null && salud.scoreSalud > 0 && Math.abs(latest.readiness_score - salud.scoreSalud) >= 14) {
    return "Lo que marca el reloj y lo que sientes no coinciden: confía en tu cuerpo, no en forzar el plan."
  }
  return "Capacidad y señales alineadas: puedes ejecutar el plan con foco en técnica y cierre de sueño."
}

function buildBullets(
  latest: AutoHealthMetric | null,
  salud: SaludContextSnapshot,
  readiness: TrainingReadiness,
): [string, string] {
  const a: string[] = []
  if (latest?.hrv_ms != null && latest.hrv_ms < 38) a.push("VFC baja frente a lo que sueles tener para un día exigente.")
  if (latest?.sleep_hours != null && latest.sleep_hours < 6.5) a.push("Sueño corto: el sistema penaliza capacidad hoy.")
  if (salud.strain > salud.scoreRecuperacion + 8) a.push("Carga percibida por encima de recuperación.")
  if (a.length === 0) a.push(readiness.rationale)
  if (a.length === 1) a.push(`Energía ${readiness.score}/100 · ${readiness.label}.`)
  return [a[0]!, a[1]!]
}

function directAction(readiness: TrainingReadiness): string {
  if (readiness.score < 48) return "Descansa o movilidad suave; deja el intenso para otro día."
  if (readiness.score < 64) return "Sesión ligera o menos series; conserva el estímulo sin fundirte."
  return "Ejecuta el plan con normalidad y registra sensación al cerrar."
}

function trainingHeadline(plan: PlanVsExecution, readiness: TrainingReadiness): string {
  if (plan.plannedToday === "Descanso") return "Hoy: descanso programado"
  const suffix = readiness.score < 64 ? " (versión ligera)" : ""
  return `Hoy: ${plan.plannedToday}${suffix}`
}

function sequenceLine(plan: PlanVsExecution, todayState: TrainingTodayState): string {
  if (plan.plannedToday === "Descanso") return "Día de baja carga: camina y duerme bien para la siguiente sesión."
  if (todayState === "completed") return "Sesión hecha: mantén la secuencia y prioriza recuperación mañana."
  if (todayState === "moved" || todayState === "rest") return "Día ajustado: revisa el orden en entrenamiento sin duplicar bloques pesados."
  return "Si no completas hoy, muévelo a mañana y desplaza la secuencia sin duplicar."
}

export function buildSaludDecisionBrief(params: {
  salud: SaludContextSnapshot
  latest: AutoHealthMetric | null
  readiness: TrainingReadiness
  plan: PlanVsExecution
  todayState: TrainingTodayState
  staleSync: boolean
}): SaludDecisionBrief {
  const { salud, latest, readiness, plan, todayState, staleSync } = params
  return {
    dayStateLabel: mapReadinessToDayState(readiness.label),
    energyScore: readiness.score,
    semantic: semanticFromReadiness(readiness.score),
    causeLine: buildCauseLine(latest, salud, readiness, staleSync),
    executiveInsight: buildExecutiveInsight(readiness, salud, latest),
    evidenceBullets: buildBullets(latest, salud, readiness),
    directAction: directAction(readiness),
    trainingHeadline: trainingHeadline(plan, readiness),
    sequenceLine: sequenceLine(plan, todayState),
  }
}
