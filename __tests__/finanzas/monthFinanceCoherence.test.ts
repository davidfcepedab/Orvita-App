import {
  buildCompleteMonthFinanceCoherence,
  computeMonthFinanceCoherence,
} from "@/lib/finanzas/monthFinanceCoherence"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import type { FinanceSubcategoryCatalogEntry } from "@/lib/finanzas/subcategoryCatalog"

function tx(
  partial: Partial<FinanceTransaction> & Pick<FinanceTransaction, "id" | "date" | "amount" | "type">,
): FinanceTransaction {
  return {
    description: "",
    category: "Cat",
    subcategory: null,
    created_at: "",
    updated_at: "",
    ...partial,
  }
}

const baseCatalogEntry: FinanceSubcategoryCatalogEntry = {
  subcategory: "Ajuste TC",
  category: "Finanzas",
  expense_type: "modulo_finanzas",
  financial_impact: "operativo",
  budgetable: true,
  active: true,
}

describe("computeMonthFinanceCoherence", () => {
  test("residual ~0 when operativo KPI parte el mismo gasto total", () => {
    const rows = [
      tx({ id: "1", date: "2026-04-01", amount: 2_000_000, type: "income" }),
      tx({ id: "2", date: "2026-04-05", amount: 800_000, type: "expense", subcategory: "Comida" }),
    ]
    const c = computeMonthFinanceCoherence(rows, [])
    expect(c.incomeTotal).toBe(2_000_000)
    expect(c.expenseTotalAll).toBe(800_000)
    expect(c.netCashFlow).toBe(1_200_000)
    expect(c.expenseOperativoKpi).toBe(800_000)
    expect(c.expenseOutsideOperativoKpi).toBe(0)
    expect(Math.abs(c.checkResidual)).toBeLessThan(1)
  })

  test("buildComplete alinea KPI y mapa cuando no hay brecha estructural artificial", () => {
    const rows = [
      tx({ id: "1", date: "2026-04-01", amount: 1_000_000, type: "income" }),
      tx({ id: "2", date: "2026-04-02", amount: 400_000, type: "expense", category: "Comida", subcategory: "Mercado" }),
    ]
    const full = buildCompleteMonthFinanceCoherence(rows, [], [], [], null)
    expect(full.expenseOperativoKpi).toBe(400_000)
    expect(full.expenseStructuralOperativoUi).toBe(400_000)
    expect(Math.abs(full.gapKpiVsStructuralUi)).toBeLessThan(1)
    expect(full.plLayers.length).toBeGreaterThan(5)
    expect(full.previousMonthNetCashFlow).toBe(0)
    expect(full.plLayers[0]?.id).toBe("continuity_prev")
  })

  test("P&L: primera fila refleja flujo neto del mes anterior (continuidad)", () => {
    const previous = [
      tx({ id: "p1", date: "2026-03-10", amount: 2_000_000, type: "income" }),
      tx({ id: "p2", date: "2026-03-20", amount: 500_000, type: "expense", category: "X", subcategory: "Y" }),
    ]
    const current = [tx({ id: "c1", date: "2026-04-05", amount: 100_000, type: "income" })]
    const full = buildCompleteMonthFinanceCoherence(current, previous, [], [], null)
    expect(full.previousMonthNetCashFlow).toBe(1_500_000)
    const continuity = full.plLayers.find((L) => L.id === "continuity_prev")
    expect(continuity?.amount).toBe(1_500_000)
  })

  test("gasto módulo finanzas: fuera de operativo KPI pero en gasto total; residual ~0", () => {
    const rows = [
      tx({ id: "1", date: "2026-04-01", amount: 5_000_000, type: "income" }),
      tx({
        id: "2",
        date: "2026-04-02",
        amount: 500_000,
        type: "expense",
        subcategory: "Ajuste TC",
        category: "Finanzas",
      }),
    ]
    const c = computeMonthFinanceCoherence(rows, [baseCatalogEntry])
    expect(c.expenseTotalAll).toBe(500_000)
    expect(c.expenseOperativoKpi).toBe(0)
    expect(c.expenseOutsideOperativoKpi).toBe(500_000)
    expect(c.netCashFlow).toBe(4_500_000)
    expect(Math.abs(c.checkResidual)).toBeLessThan(1)
  })
})
