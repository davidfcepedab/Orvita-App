type StabilityInput = {
  ingresos: number
  gastoOperativo: number
  gastoFinanciero: number
  flujo: number
  liquidez: number
  runway: number
}

export function financialStabilityEngine({
  ingresos,
  gastoOperativo,
  gastoFinanciero,
  flujo,
  liquidez,
  runway,
}: StabilityInput) {

  // =========================
  // 1️⃣ SCORE OPERATIVO
  // =========================
  const ratioAhorro =
    ingresos > 0 ? flujo / ingresos : -1

  let scoreOperativo = 0

  if (ratioAhorro > 0.3) scoreOperativo = 100
  else if (ratioAhorro > 0.1) scoreOperativo = 75
  else if (ratioAhorro > 0) scoreOperativo = 50
  else if (ratioAhorro > -0.2) scoreOperativo = 25
  else scoreOperativo = 0

  // =========================
  // 2️⃣ SCORE LIQUIDEZ (Runway)
  // =========================
  let scoreLiquidez = 0

  if (runway > 3.5) scoreLiquidez = 100
  else if (runway > 1.5) scoreLiquidez = 60
  else scoreLiquidez = 20

  // =========================
  // 3️⃣ SCORE RIESGO
  // =========================
  const gastoTotal = gastoOperativo + gastoFinanciero
  const ratioGasto = ingresos > 0 ? gastoTotal / ingresos : 10

  let scoreRiesgo = 0

  if (ratioGasto < 0.7) scoreRiesgo = 100
  else if (ratioGasto < 1) scoreRiesgo = 75
  else if (ratioGasto < 1.3) scoreRiesgo = 50
  else scoreRiesgo = 20

  // =========================
  // 4️⃣ FINANCIAL STABILITY INDEX
  // =========================
  const stabilityIndex = Math.round(
    scoreOperativo * 0.4 +
    scoreLiquidez * 0.4 +
    scoreRiesgo * 0.2
  )

  // =========================
  // 5️⃣ SEMÁFORO EJECUTIVO
  // =========================
  let status: "green" | "yellow" | "red" = "green"

  if (runway < 1.5) status = "red"
  else if (runway <= 3.5) status = "yellow"
  else status = "green"

  return {
    scoreOperativo,
    scoreLiquidez,
    scoreRiesgo,
    stabilityIndex,
    status,
  }
}
