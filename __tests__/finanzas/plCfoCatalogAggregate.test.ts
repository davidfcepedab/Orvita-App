import { buildPlCfoCatalogAggregate } from "@/lib/finanzas/plCfoCatalogAggregate"
import type { FinanceSubcategoryCatalogEntry } from "@/lib/finanzas/subcategoryCatalog"
import type { FinanceTransaction } from "@/lib/finanzas/types"

function baseTx(over: Partial<FinanceTransaction>): FinanceTransaction {
  return {
    id: over.id ?? "t1",
    date: over.date ?? "2025-02-10",
    description: over.description ?? "d",
    amount: over.amount ?? 0,
    type: over.type,
    category: over.category ?? "General",
    subcategory: over.subcategory ?? null,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...over,
  }
}

const sampleCatalog: FinanceSubcategoryCatalogEntry[] = [
  {
    subcategory: "Arriendo",
    category: "Vivienda",
    expense_type: "fijo",
    financial_impact: "operativo",
    budgetable: true,
    active: true,
  },
  {
    subcategory: "Restaurantes",
    category: "Ocio",
    expense_type: "variable",
    financial_impact: "operativo",
    budgetable: true,
    active: true,
  },
  {
    subcategory: "Inversión ETF",
    category: "Inversión",
    expense_type: "modulo_finanzas",
    financial_impact: "inversion",
    budgetable: false,
    active: true,
  },
]

describe("buildPlCfoCatalogAggregate", () => {
  test("clasifica gasto por impacto y tipo", () => {
    const cur = [
      baseTx({ id: "1", amount: 100_000, type: "expense", subcategory: "Arriendo", category: "Viv" }),
      baseTx({ id: "2", amount: 50_000, type: "expense", subcategory: "Restaurantes", category: "Ocio" }),
      baseTx({ id: "3", amount: 20_000, type: "expense", subcategory: "Inversión ETF", category: "Inv" }),
    ]
    const agg = buildPlCfoCatalogAggregate(cur, [], sampleCatalog)
    expect(agg.hasCatalog).toBe(true)
    expect(agg.expenseByExpenseType.fijo).toBe(100_000)
    expect(agg.expenseByExpenseType.variable).toBe(50_000)
    expect(agg.expenseByExpenseType.modulo_finanzas).toBe(20_000)
    expect(agg.expenseByExpenseType.sin_catalogo).toBe(0)
    expect(agg.expenseByImpact["Operativo"]).toBe(150_000)
    expect(agg.expenseByImpact["Inversión"]).toBe(20_000)
    expect(agg.topExpenseCategories[0]?.label).toBe("Viv")
  })

  test("sin catálogo acumula en sin_catalogo", () => {
    const cur = [baseTx({ id: "1", amount: 30_000, type: "expense", subcategory: "Cosas", category: "X" })]
    const agg = buildPlCfoCatalogAggregate(cur, [], [])
    expect(agg.hasCatalog).toBe(false)
    expect(agg.expenseByExpenseType.sin_catalogo).toBe(30_000)
    expect(Object.keys(agg.expenseByImpact)).toHaveLength(0)
  })

  test("estima ingreso recurrente si hubo ingreso en misma subcategoría el mes previo", () => {
    const prev = [
      baseTx({
        id: "p1",
        date: "2025-01-05",
        amount: 2_000_000,
        type: "income",
        subcategory: "Salario",
        category: "Trabajo",
      }),
    ]
    const cur = [
      baseTx({
        id: "c1",
        date: "2025-02-05",
        amount: 2_000_000,
        type: "income",
        subcategory: "Salario",
        category: "Trabajo",
      }),
      baseTx({
        id: "c2",
        date: "2025-02-06",
        amount: 500_000,
        type: "income",
        subcategory: "Bonus único",
        category: "Trabajo",
      }),
    ]
    const agg = buildPlCfoCatalogAggregate(cur, prev, [])
    expect(agg.incomeRecurringEst).toBe(2_000_000)
    expect(agg.incomeUniqueEst).toBe(500_000)
  })
})
