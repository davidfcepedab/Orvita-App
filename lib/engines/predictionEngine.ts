export function predictionEngine(values: number[]) {
  if (!values || values.length < 7) {
    return {
      projection: [],
      slope: 0,
      volatility: 0,
      risk: "neutral",
    }
  }

  const n = values.length

  // 🔹 Media
  const mean = values.reduce((a, b) => a + b, 0) / n

  // 🔹 Regresión lineal simple
  const x = Array.from({ length: n }, (_, i) => i + 1)

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = values.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((acc, val, i) => acc + val * values[i], 0)
  const sumX2 = x.reduce((acc, val) => acc + val * val, 0)

  const slope =
    (n * sumXY - sumX * sumY) /
    (n * sumX2 - sumX * sumX)

  // 🔹 Volatilidad
  const variance =
    values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / n

  const volatility = Math.sqrt(variance)

  // 🔹 Proyección 7 días
  const lastValue = values[n - 1]
  const projection = Array.from({ length: 7 }, (_, i) => ({
    day: i + 1,
    value: Math.round(lastValue + slope * (i + 1)),
  }))

  // 🔹 Riesgo
  let risk = "neutral"

  if (slope < -0.5 && volatility > 8) risk = "high"
  if (slope < -0.2) risk = "medium"
  if (slope > 0.5) risk = "positive"

  return {
    projection,
    slope: Number(slope.toFixed(2)),
    volatility: Number(volatility.toFixed(2)),
    risk,
  }
}
