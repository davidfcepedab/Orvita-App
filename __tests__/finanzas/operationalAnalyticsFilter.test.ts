import {
  filterTransactionsForOperationalAnalytics,
  isExcludedFromOperationalAnalytics,
} from "@/lib/finanzas/operativoExpense"
import type { FinanceSubcategoryCatalogEntry } from "@/lib/finanzas/subcategoryCatalog"
import type { FinanceTransaction } from "@/lib/finanzas/types"

const baseTx = (over: Partial<FinanceTransaction>): FinanceTransaction => ({
  id: "1",
  date: "2026-04-01",
  description: "x",
  amount: 100_000,
  type: "expense",
  category: "Estilo de vida",
  subcategory: "Test",
  created_at: "",
  updated_at: "",
  ...over,
})

const catalog: FinanceSubcategoryCatalogEntry[] = [
  {
    subcategory: "Pago tarjeta",
    category: "Finanzas",
    expense_type: "modulo_finanzas",
    financial_impact: "financiero",
    budgetable: false,
    active: true,
  },
  {
    subcategory: "Mercado",
    category: "Alimentacion",
    expense_type: "variable",
    financial_impact: "operativo",
    budgetable: true,
    active: true,
  },
]

describe("operational analytics filter", () => {
  test("excluye subcategoría catalogada como modulo_finanzas", () => {
    const tx = baseTx({ subcategory: "Pago tarjeta", category: "Finanzas" })
    const maps = filterTransactionsForOperationalAnalytics([tx], catalog)
    expect(maps).toHaveLength(0)
  })

  test("excluye por nombre de categoría módulo financiero", () => {
    const tx = baseTx({
      category: "Movimientos Financieros",
      subcategory: "Sin match catálogo",
    })
    expect(filterTransactionsForOperationalAnalytics([tx], [])).toHaveLength(0)
  })

  test("mantiene gasto operativo catalogado", () => {
    const tx = baseTx({ subcategory: "Mercado", category: "Alimentacion" })
    expect(filterTransactionsForOperationalAnalytics([tx], catalog)).toHaveLength(1)
  })

  test("isExcluded true para financial_impact financiero", () => {
    const row: FinanceSubcategoryCatalogEntry[] = [
      {
        subcategory: "Impuesto X",
        category: "Obligaciones",
        expense_type: "modulo_finanzas",
        financial_impact: "financiero",
        budgetable: false,
        active: true,
      },
    ]
    const tx = baseTx({ subcategory: "Impuesto X", category: "Obligaciones" })
    const impact = new Map([["impuesto x", "financiero"]])
    const et = new Map<string, "fijo" | "variable" | "modulo_finanzas">([["impuesto x", "modulo_finanzas"]])
    expect(isExcludedFromOperationalAnalytics(tx, impact, et)).toBe(true)
    expect(filterTransactionsForOperationalAnalytics([tx], row)).toHaveLength(0)
  })
})
