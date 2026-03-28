import type { BodyMetricDisplayRow } from "@/lib/training/trainingPrefsTypes"

export function buildAdjustmentHints(rows: BodyMetricDisplayRow[]): string[] {
  const hints: string[] = []
  const waist = rows.find((r) => /cintura/i.test(r.label))
  const arms = rows.find((r) => /brazo/i.test(r.label))
  const fat = rows.find((r) => /grasa/i.test(r.label))
  const weight = rows.find((r) => /peso/i.test(r.label))

  if (waist) {
    const cur = parseFloat(waist.current.replace(",", "."))
    const tgt = parseFloat(waist.target.replace(",", "."))
    if (!Number.isNaN(cur) && !Number.isNaN(tgt) && cur > tgt + 1.5) {
      hints.push(
        "Cintura por encima del objetivo: déficit suave en días sin entreno y 8–12k pasos diarios suelen destrabar el progreso.",
      )
    }
  }

  if (arms && arms.progressPct < 48) {
    hints.push(
      `Brazos con progreso moderado (${arms.progressPct}%): suma +2 series de bíceps/tríceps en una sesión superior por semana.`,
    )
  }

  if (fat?.trend === "down") {
    hints.push("% grasa a la baja: mantén proteína estable y ajusta el plan de kcal si la fuerza cae dos sesiones seguidas.")
  }

  if (weight) {
    hints.push("Si el peso se estanca 4–5 días, prueba −150 kcal en 2 días no exigentes de la semana y reevalúa.")
  }

  if (hints.length === 0) {
    hints.push("Mantén el plan actual una semana más y registra medidas el mismo día/hora para comparar con menos ruido.")
  }

  return hints.slice(0, 4)
}
