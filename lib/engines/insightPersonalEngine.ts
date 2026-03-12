export function insightEngine(data: any) {

  const insights = []

  // 🔹 Fatiga acumulada
  if (
    data.delta_tendencia < -5 &&
    data.score_recuperacion < 65
  ) {
    insights.push({
      type: "alert",
      message: "Fatiga acumulada detectada. Reduce carga 15% esta semana.",
    })
  }

  // 🔹 Momentum positivo
  if (
    data.delta_tendencia > 5 &&
    data.score_recuperacion > 70
  ) {
    insights.push({
      type: "opportunity",
      message: "Momentum positivo. Puedes aumentar intensidad estratégica.",
    })
  }

  // 🔹 Riesgo disciplina
  if (data.delta_disciplina < -10) {
    insights.push({
      type: "alert",
      message: "Disciplina en caída. Revisa hábitos estructurales.",
    })
  }

  if (insights.length === 0) {
    insights.push({
      type: "neutral",
      message: "Estabilidad sostenida. Mantén sistema actual.",
    })
  }

  return insights
}
