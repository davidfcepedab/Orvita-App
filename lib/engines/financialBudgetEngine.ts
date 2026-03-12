import type { Category, BudgetRow } from "@/lib/types"

export function financialBudgetEngine({
  structuralCategories,
  budgetRows,
}: {
  structuralCategories: Category[]
  budgetRows: BudgetRow[]
}): Category[] {
  if (!budgetRows || !Array.isArray(budgetRows)) {
    return structuralCategories
  }

  const budgetMap: Record<string, number> = {}

  budgetRows.forEach((row) => {
    if (!row.categoria) return
    budgetMap[row.categoria] = row.monto
  })

  return structuralCategories.map((cat) => {
    const budget = budgetMap[cat.name] || 0
    const used = Math.abs(cat.total)

    const budgetUsedPercent =
      budget > 0 ? (used / budget) * 100 : 0

    let budgetStatus: "green" | "yellow" | "red" = "green"

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
      subcategories: cat.subcategories || [],
    }
  })
}
