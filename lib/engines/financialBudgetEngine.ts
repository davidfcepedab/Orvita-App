export function financialBudgetEngine({
  structuralCategories,
  budgetRows,
}: {
  structuralCategories: any[]
  budgetRows: any[]
}) {
  if (!budgetRows || !Array.isArray(budgetRows)) {
    return structuralCategories
  }

  const budgetMap: Record<string, number> = {}

  budgetRows.forEach((row) => {
    const category = row[0]
    const amount = Number(row[2]) || 0
    if (!category) return
    budgetMap[category] = amount
  })

  return structuralCategories.map((cat) => {
    const budget = budgetMap[cat.name] || 0
    const used = Math.abs(cat.total)

    const budgetUsedPercent =
      budget > 0 ? (used / budget) * 100 : 0

    let budgetStatus = "green"

    if (budgetUsedPercent >= 100) {
      budgetStatus = "red"
    } else if (budgetUsedPercent >= 85) {
      budgetStatus = "yellow"
    }

    return {
      ...cat,
      budget,
      budgetUsedPercent,
      budgetStatus,
    }
  })
}
