export function directionEngine(data: any) {

  if (data.score_global < 50) {
    return {
      fase: "Recuperación",
      shortMessage: "Baja intensidad.",
      mensaje:
        "Baja intensidad, protege tu energía y evita compromisos nuevos esta semana."
    }
  }

  if (data.score_global < 65) {
    return {
      fase: "Recomposición",
      shortMessage: "Reordena prioridades.",
      mensaje:
        "Ajusta carga, enfócate en lo esencial y elimina fricción innecesaria."
    }
  }

  if (data.score_global < 80) {
    return {
      fase: "Consolidación",
      shortMessage: "Mantén estabilidad.",
      mensaje:
        "Sostén hábitos actuales y refuerza lo que ya funciona."
    }
  }

  return {
    fase: "Expansión",
    shortMessage: "Acelera crecimiento.",
    mensaje:
      "Es momento de asumir retos estratégicos y expandir tu capacidad."
  }
}
