import type { TrainingReadiness } from "@/lib/training/trainingOperationalDerivations"

/** Lenguaje guía para usuario final (no técnico). */
export function buildCoachInsightParagraph(args: {
  readiness: TrainingReadiness
  nutritionStatus: string
  hasHevy: boolean
}): string {
  const { readiness, nutritionStatus, hasHevy } = args
  const nut = nutritionStatus.toLowerCase()
  let body = ""
  if (readiness.score >= 72) {
    body =
      "Tu cuerpo muestra buena recuperación para afrontar la sesión con calidad. Mantén el calentamiento, hidrátate y sube carga solo si la técnica se mantiene impecable."
  } else if (readiness.score >= 55) {
    body =
      "Hoy puedes entrenar, pero conviene no forzar al máximo: prioriza sensaciones, un par de series menos o menos peso si notas fatiga acumulada."
  } else {
    body =
      "Hoy el foco puede ser movilidad, paseo ligero y dormir mejor; si entrenas, hazlo muy suave y corto. Mañana reevalúas con más energía."
  }
  if (nut.includes("déficit") || nut.includes("deficit")) {
    body += " En nutrición, un déficit moderado ayuda a preservar músculo si la proteína está cubierta."
  } else if (nut.includes("fuera") || nut.includes("exceso")) {
    body += " Ajusta un poco las comidas esta semana para que el plan sea sostenible sin castigarte."
  }
  if (!hasHevy) {
    body += " Conecta Hevy para que el seguimiento de sets y volumen sea automático."
  }
  return body.trim()
}

export function advisorQuoteFromPlan(plannedToday: string, readiness: TrainingReadiness): string {
  const p = plannedToday.toLowerCase()
  if (p.includes("descanso") || p.includes("rest")) {
    return "Un día bien colocado de descanso es parte del plan: permite que el músculo asimile el trabajo previo."
  }
  if (readiness.score >= 76) {
    return "Si te sientes bien en calentamiento, puedes sumar un ~2% de volumen total en básicos, siempre con técnica limpia."
  }
  return "Escucha el cuerpo: mejor una sesión bien hecha que forzar números. La constancia gana a la intensidad suelta."
}
