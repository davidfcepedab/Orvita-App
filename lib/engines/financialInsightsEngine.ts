export function financialInsightsEngine({
  categories,
  flujo,
}: any) {
  if (!categories || categories.length === 0) {
    return []
  }

  const top = categories[0]

  const insights = []

  if (flujo < 0) {
    insights.push({
      type: "alert",
      message: "Estás operando en déficit.",
    })
  }

  if (top.total > 0) {
    insights.push({
      type: "focus",
      message: `Tu mayor gasto está en ${top.categoria}.`,
    })
  }

  return insights
}
