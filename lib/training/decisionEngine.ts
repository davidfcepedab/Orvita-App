import type { ZoneProgress } from "@/lib/training/effectiveSets"

export type NutritionStatus = "alineado" | "déficit" | "exceso" | "sin plan"

export type WeightTrendInput = {
  current: string
  previous: string
}

export function deriveNutritionStatus(weightTrend: WeightTrendInput | undefined): NutritionStatus {
  if (!weightTrend) return "sin plan"
  const current = parseMetricNumber(weightTrend.current)
  const previous = parseMetricNumber(weightTrend.previous)
  if (!current || !previous) return "sin plan"
  const deltaPct = ((current - previous) / previous) * 100
  if (deltaPct > 0.6) return "exceso"
  if (deltaPct >= 0.15 && deltaPct <= 0.6) return "alineado"
  return "déficit"
}

export function nutritionStatusTone(status: NutritionStatus): "ok" | "warn" | "risk" | "muted" {
  if (status === "alineado") return "ok"
  if (status === "sin plan") return "muted"
  if (status === "déficit") return "warn"
  return "risk"
}

export function buildAiRecommendations({
  bodyPartProgress,
  nutritionStatus,
  hasHevy,
}: {
  bodyPartProgress: ZoneProgress[]
  nutritionStatus: NutritionStatus
  hasHevy: boolean
}) {
  if (!hasHevy) {
    return ["Conecta Hevy para calcular sets efectivos por músculo y personalizar el ajuste semanal."]
  }

  const lines: string[] = []
  const weakest = [...bodyPartProgress].sort((a, b) => a.ratio - b.ratio)[0]
  const overtrained = bodyPartProgress.find((zone) => zone.status === "sobrecarga")

  if (weakest && weakest.status !== "bien" && weakest.status !== "sobrecarga") {
    const gapPct = Math.max(10, Math.round((1 - weakest.ratio) * 100))
    lines.push(`${weakest.label} en ${Math.round(weakest.ratio * 100)}% del objetivo -> subir volumen +${gapPct}% esta semana.`)
  }

  if (overtrained) {
    lines.push(`${overtrained.label} en sobrecarga -> mantener o bajar 15% el volumen para recuperar.`)
  }

  if (nutritionStatus !== "alineado") {
    lines.push("Nutrición fuera de rango -> ajustar proteína +20g y recalibrar calorías diarias.")
  }

  if (lines.length === 0) {
    return ["Distribución muscular y nutrición alineadas: mantener progresión y técnica esta semana."]
  }

  return lines.slice(0, 3)
}

function parseMetricNumber(input: string) {
  const normalized = input.replace(",", ".").replace(/[^\d.-]/g, "")
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}
