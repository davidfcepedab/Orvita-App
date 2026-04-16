import type { HabitWithMetrics } from "@/lib/operational/types"
import {
  groupHabitsByDaypart,
  type HabitTimeBlockId,
} from "@/lib/habits/habitStackGroups"
/** Alineado con el retorno de `aggregateHabitsSummary` en habitMetrics. */
export type HabitsAggregateSummary = {
  consistency_30d: number
  best_streak: number
  at_risk: number
  current_streak_max: number
}

/** Clave para estilos gamificados en UI (colores, badge de “rango”). */
export type HabitConsistencyTier =
  | "empty"
  | "very_low"
  | "low"
  | "mid"
  | "high"
  | "elite"

export type HabitConsistencyInsight = {
  tier: HabitConsistencyTier
  headline: string
  lines: string[]
}

const BLOCK_LABEL: Record<HabitTimeBlockId, string> = {
  manana: "la mañana",
  tarde: "la tarde",
  noche: "la noche",
  sin_hora: "hábitos sin hora clara",
}

function trimName(name: string, max = 42): string {
  const t = name.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}

function dominantAtRiskBlock(
  atRiskHabits: HabitWithMetrics[],
): HabitTimeBlockId | null {
  if (atRiskHabits.length === 0) return null
  const map = groupHabitsByDaypart(atRiskHabits)
  let best: HabitTimeBlockId | null = null
  let bestN = 0
  for (const id of ["manana", "tarde", "noche", "sin_hora"] as const) {
    const n = map.get(id)?.length ?? 0
    if (n > bestN) {
      bestN = n
      best = id
    }
  }
  if (best === null || bestN === 0) return null
  if (bestN < Math.ceil(atRiskHabits.length * 0.4) && atRiskHabits.length >= 3) {
    return null
  }
  return best
}

/**
 * Texto breve que interpreta el % medio de adherencia (30d), riesgo hoy y dispersión entre hábitos.
 * Pensado para la página de hábitos y, más adelante, digest por correo.
 */
export function buildHabitConsistencyInsight(
  habits: HabitWithMetrics[],
  summary: HabitsAggregateSummary,
): HabitConsistencyInsight {
  if (habits.length === 0) {
    return {
      tier: "empty",
      headline: "Aún sin lectura",
      lines: [
        "Cuando añadas hábitos al stack, aquí verás una lectura de tu consistencia: no solo el porcentaje, sino qué está tirando del promedio y dónde se concentra el riesgo de romper la cadena.",
      ],
    }
  }

  const c = summary.consistency_30d
  const atRisk = habits.filter((h) => h.metrics.at_risk)
  const atRiskCount = atRisk.length

  let band: "very_low" | "low" | "mid" | "high" | "elite"
  if (c <= 35) band = "very_low"
  else if (c <= 55) band = "low"
  else if (c <= 75) band = "mid"
  else if (c <= 90) band = "high"
  else band = "elite"

  const rates = habits.map((h) => ({
    name: trimName(h.name),
    rate: h.metrics.completion_rate_30d,
  }))
  const sortedByRate = [...rates].sort((a, b) => a.rate - b.rate)
  const weakest = sortedByRate[0]
  const strongest = sortedByRate[sortedByRate.length - 1]
  const spread =
    habits.length >= 2 ? strongest.rate - weakest.rate : 0
  const sameHabit = habits.length >= 2 && weakest.name === strongest.name

  const lines: string[] = []

  const baseSentence = (() => {
    switch (band) {
      case "very_low":
        return `En la ventana de 30 días tu adherencia media es del ${c}%: el stack aún no encuentra un ritmo predecible. Suele ayudar acotar a uno o dos hábitos ancla hasta que el gesto sea casi automático, antes de sumar más.`
      case "low":
        return `Tu adherencia media en 30 días ronda el ${c}%: estás en fase de construcción — hay días que sostienen la cadena y otros que la aflojan. Pequeños cierres diarios importan más que picos aislados.`
      case "mid":
        return `Con un ${c}% de adherencia media en 30 días, tu consistencia ya es reconocible: no es perfecta, pero empieza a parecer un sistema. El siguiente salto es reducir los “días huérfanos” sin castigo.`
      case "high":
        return `Un ${c}% de adherencia media en 30 días sitúa el stack en un ritmo sólido: la mayoría de los días programados se cumplen. Aquí el riesgo suele ser el exceso de confianza o el despiste puntual, no el abandono.`
      default:
        return `Con ~${c}% de adherencia media en 30 días, estás en una franja de muy alta ejecución. Vale la pena proteger el descanso y no inflar el stack solo porque “va bien”.`
    }
  })()

  lines.push(baseSentence)

  if (atRiskCount > 0) {
    const dom = dominantAtRiskBlock(atRisk)
    const riskBit =
      dom && atRiskCount >= 2
        ? ` Hoy la fricción se concentra sobre todo en ${BLOCK_LABEL[dom]}.`
        : ""
    lines.push(
      `Hoy ${atRiskCount === 1 ? "queda 1 hábito" : `quedan ${atRiskCount} hábitos`} pendientes en días donde tenías intención de ejecutarlo.${riskBit} Cerrar uno ya cambia la sensación del día.`,
    )
  } else {
    lines.push(
      `Nada pendiente en la franja de hoy según tu calendario de hábitos: buen momento para revisar si el stack sigue siendo realista para la semana que viene.`,
    )
  }

  if (habits.length >= 2 && spread >= 28 && !sameHabit) {
    lines.push(
      `En el stack hay dispersión: «${weakest.name}» está más baja (${weakest.rate}% en 30d) y «${strongest.name}» sostiene un ritmo más alto (${strongest.rate}%). Eso explica parte del promedio: no todos los hábitos exigen la misma atención ahora mismo.`,
    )
  }

  const headline = (() => {
    if (band === "very_low") return "Base aún frágil"
    if (band === "low") return "Construyendo ritmo"
    if (band === "mid") return "Consistencia reconocible"
    if (band === "high") return "Ritmo sólido"
    return "Adherencia muy alta"
  })()

  return { tier: band, headline, lines }
}
