import { calculateOverview } from "@/lib/finanzas/calculations/overview"
import { buildStructuralCategories, buildInsightsFromHistory } from "@/lib/finanzas/deriveFromTransactions"
import {
  excludeReconciliationFromOperativoAnalysis,
  isReconciliationAdjustmentTransaction,
} from "@/lib/finanzas/reconciliationTxFilter"
import type { FinanceTransaction } from "@/lib/finanzas/types"

function baseTx(over: Partial<FinanceTransaction> & Pick<FinanceTransaction, "date" | "amount" | "type">): FinanceTransaction {
  return {
    id: "x",
    description: "",
    category: "Ajustes",
    subcategory: "General",
    created_at: "",
    updated_at: "",
    ...over,
  }
}

describe("reconciliationTxFilter", () => {
  test("detects prefix and manual_sync subcategory", () => {
    expect(
      isReconciliationAdjustmentTransaction({
        description: "[reconciliation_adjustment|manual_sync|origin:user] x",
        subcategory: "x",
        category: "Ajustes",
      }),
    ).toBe(true)
    expect(
      isReconciliationAdjustmentTransaction({
        description: "Normal",
        subcategory: "manual_sync",
        category: "Ajustes",
      }),
    ).toBe(true)
    expect(
      isReconciliationAdjustmentTransaction({
        description: "Normal",
        subcategory: "manual_sync",
        category: "Comida",
      }),
    ).toBe(false)
    expect(
      isReconciliationAdjustmentTransaction({
        description: "Compra",
        subcategory: "General",
        category: "Vida",
      }),
    ).toBe(false)
  })

  test("reconciliation rows do not affect overview or structural totals", () => {
    const recon: FinanceTransaction = baseTx({
      date: "2026-03-10",
      amount: 500_000,
      type: "expense",
      description: "[reconciliation_adjustment|manual_sync|origin:manualFinancialOverride|accountId:x] TC · Δ",
      subcategory: "manual_sync",
      category: "Ajustes",
    })
    const normal: FinanceTransaction = baseTx({
      date: "2026-03-05",
      amount: 100_000,
      type: "expense",
      description: "Super",
      subcategory: "Comida",
      category: "Vida",
    })
    const current = [recon, normal]
    const previous: FinanceTransaction[] = []

    const op = excludeReconciliationFromOperativoAnalysis(current)
    expect(op).toHaveLength(1)

    const overview = calculateOverview(op, previous, {})
    expect(overview.expense).toBe(100_000)

    const structural = buildStructuralCategories(current, previous)
    expect(structural.structuralCategories.some((c) => c.name === "Ajustes")).toBe(false)
    expect(structural.totalStructural).toBe(100_000)
  })

  test("buildInsightsFromHistory ignores reconciliation slices", () => {
    const recon: FinanceTransaction = baseTx({
      date: "2026-03-01",
      amount: 2_000_000,
      type: "expense",
      description: "[reconciliation_adjustment|x] y",
      subcategory: "manual_sync",
    })
    const insight = buildInsightsFromHistory([{ month: "2026-03", rows: [recon] }])
    expect(insight.stability.scoreOperativo).toBeGreaterThanOrEqual(0)
    const withNormal = buildInsightsFromHistory([
      {
        month: "2026-03",
        rows: [
          recon,
          baseTx({
            date: "2026-03-02",
            amount: 50_000,
            type: "income",
            description: "Salario",
            subcategory: "Nómina",
            category: "Ingresos",
          }),
        ],
      },
    ])
    expect(withNormal.stability.scoreLiquidez).toBeGreaterThanOrEqual(0)
  })
})
