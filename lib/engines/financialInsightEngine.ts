export function financialInsightEngine({
  ingresos,
  flujo,
  liquidez,
  runway,
  categories = [], // ← fallback defensivo
}: {
  ingresos: number
  flujo: number
  liquidez?: number
  runway?: number
  categories?: any[]
}) {
  const insights: string[] = []

  // 🔹 Déficit
  if (flujo < 0) {
    insights.push("Estás en déficit este mes.")
  }

  // 🔹 Liquidez crítica
  if (runway !== undefined && runway < 2) {
    insights.push("Riesgo de liquidez en corto plazo.")
  }

  // 🔹 Categoría con fuerte variación
  if (Array.isArray(categories) && categories.length > 0) {
    const alertCategory = categories.find(
      (c) => c.delta && c.delta > 25
    )

    if (alertCategory) {
      insights.push(
        `Incremento fuerte en ${alertCategory.name}.`
      )
    }
  }

  if (insights.length === 0) {
    insights.push("Situación financiera estable.")
  }

  return {
    type: flujo < 0 ? "alert" : "info",
    message: insights[0],
    all: insights,
  }
}
