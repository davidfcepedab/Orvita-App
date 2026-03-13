/**
 * financialPredictionEngine
 * 
 * Reutiliza la lógica del árbol estructural desde categoriesEngine
 */
export function financialPredictionEngine({
  monthlyHistory,
  liquidez,
}: {
  monthlyHistory: number[]
  liquidez: number
}) {
  if (!monthlyHistory || monthlyHistory.length === 0) {
    return {
      averageMonthlyFlow: 0,
      projectedNextMonth: 0,
      runwayMonths: 0,
      trend: "neutral" as const,
      warning: false,
    }
  }

  const averageMonthlyFlow =
    monthlyHistory.reduce((a, b) => a + b, 0) / monthlyHistory.length

  const projectedNextMonth = Math.round(averageMonthlyFlow)

  const runwayMonths =
    averageMonthlyFlow > 0 ? liquidez / averageMonthlyFlow : Infinity

  let trend: "positive" | "negative" | "neutral" = "neutral"
  if (monthlyHistory.length >= 2) {
    const recent = monthlyHistory.slice(-3)
    const older =
      monthlyHistory.slice(0, -3).length > 0
        ? monthlyHistory.slice(0, -3)
        : recent

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

    if (recentAvg > olderAvg * 1.1) trend = "positive"
    else if (recentAvg < olderAvg * 0.9) trend = "negative"
  }

  const warning = runwayMonths < 3 && averageMonthlyFlow < 0

  return {
    averageMonthlyFlow: Math.round(averageMonthlyFlow),
    projectedNextMonth,
    runwayMonths: Number(runwayMonths.toFixed(1)),
    trend,
    warning,
  }
}
