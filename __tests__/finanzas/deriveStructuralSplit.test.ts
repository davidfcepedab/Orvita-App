import {
  attachCatalogToStructuralCategories,
  buildStructuralCategories,
  recomputeStructuralTotals,
  splitStructuralCategoriesByCatalogExpenseType,
} from "@/lib/finanzas/deriveFromTransactions"
import type { FinanceSubcategoryCatalogEntry } from "@/lib/finanzas/subcategoryCatalog"
import type { FinanceTransaction } from "@/lib/finanzas/types"

function tx(
  date: string,
  category: string,
  subcategory: string,
  amount: number,
  type: "expense" | "income" = "expense",
): FinanceTransaction {
  return {
    id: `${date}-${subcategory}`,
    date,
    description: "",
    amount,
    type,
    category,
    subcategory,
    created_at: "",
    updated_at: "",
  }
}

describe("splitStructuralCategoriesByCatalogExpenseType", () => {
  test("splits same category across fijo and variable from catalog", () => {
    const current = [
      tx("2026-03-05", "Hogar & Base", "Arriendo", 2_000_000),
      tx("2026-03-06", "Hogar & Base", "Hogar", 500_000),
    ]
    const previous = [
      tx("2026-02-05", "Hogar & Base", "Arriendo", 1_800_000),
      tx("2026-02-06", "Hogar & Base", "Hogar", 400_000),
    ]
    const base = buildStructuralCategories(current, previous)
    const catalog: FinanceSubcategoryCatalogEntry[] = [
      {
        subcategory: "Arriendo",
        category: "Hogar & Base",
        expense_type: "fijo",
        financial_impact: "operativo",
        budgetable: true,
        active: true,
      },
      {
        subcategory: "Hogar",
        category: "Hogar & Base",
        expense_type: "variable",
        financial_impact: "operativo",
        budgetable: true,
        active: true,
      },
    ]
    const { structuralCategories: withCat } = attachCatalogToStructuralCategories(base.structuralCategories, catalog)
    const split = splitStructuralCategoriesByCatalogExpenseType(withCat)
    expect(split).toHaveLength(2)
    const fixed = split.find((c) => c.name === "Hogar & Base" && c.type === "fixed")
    const variable = split.find((c) => c.name === "Hogar & Base" && c.type === "variable")
    expect(fixed?.subcategories?.map((s) => s.name)).toEqual(["Arriendo"])
    expect(variable?.subcategories?.map((s) => s.name)).toEqual(["Hogar"])
    const totals = recomputeStructuralTotals(split)
    expect(totals.totalFixed).toBe(2_000_000)
    expect(totals.totalVariable).toBe(500_000)
  })
})
