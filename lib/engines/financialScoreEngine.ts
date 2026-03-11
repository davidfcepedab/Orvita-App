export function financialScoreEngine(data: any) {
  const { ingresos, gastoOp, gastoFin, flujo } = data

  if (!ingresos) return 0

  const ahorroRatio = flujo / ingresos
  const gastoRatio = (gastoOp + gastoFin) / ingresos

  let score = 0

  // Ahorro pesa 50%
  score += Math.max(0, ahorroRatio * 100) * 0.5

  // Control de gasto pesa 30%
  score += (1 - gastoRatio) * 100 * 0.3

  // Flujo positivo pesa 20%
  score += flujo > 0 ? 20 : 0

  return Math.max(0, Math.min(100, Math.round(score)))
}
