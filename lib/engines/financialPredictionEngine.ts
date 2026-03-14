export interface PredictionProjectionItem {
  month: string
  projectedBalance: number
}

export interface PredictionResult {
  projection: PredictionProjectionItem[]
  averageMonthlyFlow: number
  runwayMonths: number
  trend: "positive" | "negative" | "neutral"
  warning: boolean
}

export function financialPredictionEngine({
  monthlyHistory,
  liquidez,
}: {
  monthlyHistory: number[]
  liquidez: number
}): PredictionResult {
  if (!monthlyHistory || monthlyHistory.length < 3) {
    return {
      projection: [],
      averageMonthlyFlow: 0,
      runwayMonths: 0,
      trend: "neutral",
      warning: false,
    }
  }

  const averageMonthlyFlow =
    monthlyHistory.reduce((a, b) => a + b, 0) / monthlyHistory.length

  // Use abs so that both positive and negative flows produce a decreasing runway.
  // Positive flow: steady burn rate from reserves.
  // Negative flow: expenses exceed income, balance still decreases correctly.
  const monthlyBurn = Math.abs(averageMonthlyFlow)

  const projection: PredictionProjectionItem[] = ["+1", "+2", "+3"].map(
    (label, i) => ({
      month: label,
      projectedBalance: Math.round(liquidez - monthlyBurn * (i + 1)),
    })
  )

  const runwayMonths =
    averageMonthlyFlow > 0 ? liquidez / averageMonthlyFlow : Infinity

  let trend: "positive" | "negative" | "neutral" = "neutral"
  const recent = monthlyHistory.slice(-3)
  const older =
    monthlyHistory.slice(0, -3).length > 0
      ? monthlyHistory.slice(0, -3)
      : recent

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

  if (recentAvg > olderAvg * 1.1) trend = "positive"
  else if (recentAvg < olderAvg * 0.9) trend = "negative"

  const warning = runwayMonths < 3 && averageMonthlyFlow < 0

  return {
    projection,
    averageMonthlyFlow: Math.round(averageMonthlyFlow),
    runwayMonths: Number(runwayMonths.toFixed(1)),
    trend,
    warning,
  }
}
