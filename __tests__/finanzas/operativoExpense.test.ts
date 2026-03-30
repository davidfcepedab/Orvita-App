import { operativoExpenseAmount, financialImpactBySubcategory } from "@/lib/finanzas/operativoExpense"
import type { FinanceTransaction } from "@/lib/finanzas/types"

function tx(partial: Partial<FinanceTransaction> & Pick<FinanceTransaction, "id" | "date" | "amount" | "type">): FinanceTransaction {
  return {
    description: "",
    category: "X",
    subcategory: null,
    created_at: "",
    updated_at: "",
    ...partial,
  }
}

describe("operativoExpense", () => {
  test("counts expense when subcategory missing from catalog", () => {
    const map = financialImpactBySubcategory([
      {
        subcategory: "Otro",
        category: "Cat",
        expense_type: "variable",
        financial_impact: "operativo",
        budgetable: true,
        active: true,
      },
    ])
    const row = tx({
      id: "1",
      date: "2026-03-01",
      amount: 100_000,
      type: "expense",
      subcategory: "Sin catálogo",
    })
    expect(operativoExpenseAmount(row, map)).toBe(100_000)
  })

  test("excludes inversion impact", () => {
    const map = financialImpactBySubcategory([
      {
        subcategory: "Educacion",
        category: "Desarrollo",
        expense_type: "variable",
        financial_impact: "inversion",
        budgetable: true,
        active: true,
      },
    ])
    const row = tx({
      id: "1",
      date: "2026-03-01",
      amount: 50_000,
      type: "expense",
      subcategory: "Educacion",
    })
    expect(operativoExpenseAmount(row, map)).toBe(0)
  })
})
