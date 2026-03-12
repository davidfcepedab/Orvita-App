export function financialInsightEngine({
  structuralCategories,
  totalFixed,
  totalVariable,
  totalStructural,
}: {
  structuralCategories: any[]
  totalFixed: number
  totalVariable: number
  totalStructural: number
}) {
  if (!structuralCategories || totalStructural === 0) {
    return {
      fixedRatio: 0,
      structuralRigidity: "low",
      riskLevel: "stable",
      alerts: [],
    }
  }

  const fixedRatio = totalFixed / totalStructural

  let structuralRigidity: "low" | "medium" | "high" = "low"

  if (fixedRatio > 0.7) structuralRigidity = "high"
  else if (fixedRatio > 0.5) structuralRigidity = "medium"

  const overBudgetCategories = structuralCategories.filter(
    (c) => c.budget && c.budgetUsedPercent >= 100
  )

  let riskLevel: "stable" | "warning" | "critical" = "stable"

  if (overBudgetCategories.length > 2) riskLevel = "critical"
  else if (overBudgetCategories.length > 0) riskLevel = "warning"

  const topCategory = structuralCategories.sort(
    (a, b) => Math.abs(b.total) - Math.abs(a.total)
  )[0]

  const alerts: string[] = []

  if (structuralRigidity === "high") {
    alerts.push("Alta rigidez estructural.")
  }

  if (overBudgetCategories.length > 0) {
    alerts.push("Existen categorías sobre presupuesto.")
  }

  return {
    fixedRatio,
    structuralRigidity,
    topCategory: topCategory?.name || null,
    overBudgetCategories: overBudgetCategories.map((c) => c.name),
    riskLevel,
    alerts,
  }
}
