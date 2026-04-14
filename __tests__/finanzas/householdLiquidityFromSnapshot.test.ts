import {
  householdLiquidezDisplayRounded,
  householdLiquidityRawFromSnapshot,
} from "@/lib/finanzas/householdLiquidityFromSnapshot"
import type { FinanceTransaction } from "@/lib/finanzas/types"

function tx(partial: Partial<FinanceTransaction> & Pick<FinanceTransaction, "amount" | "type">): FinanceTransaction {
  return {
    id: partial.id ?? "1",
    household_id: partial.household_id ?? "h",
    profile_id: partial.profile_id ?? "p",
    date: partial.date ?? "2026-04-15",
    description: partial.description ?? "",
    category: partial.category ?? "X",
    subcategory: partial.subcategory ?? null,
    account_label: partial.account_label ?? null,
    finance_account_id: partial.finance_account_id ?? null,
    amount: partial.amount,
    type: partial.type,
    currency: partial.currency ?? "USD",
    created_at: partial.created_at ?? "",
    updated_at: partial.updated_at ?? "",
    deleted_at: partial.deleted_at ?? null,
  }
}

describe("householdLiquidityRawFromSnapshot", () => {
  test("con movimientos del mes usa flujo neto, no el snapshot", () => {
    const rows = [
      tx({ id: "a", amount: 1_000_000, type: "income" }),
      tx({ id: "b", amount: 400_000, type: "expense" }),
    ]
    const raw = householdLiquidityRawFromSnapshot(99_999_999, rows)
    expect(raw).toBe(600_000)
  })

  test("sin movimientos usa snapshot si existe", () => {
    const raw = householdLiquidityRawFromSnapshot(3_000_000, [])
    expect(raw).toBe(3_000_000)
  })

  test("householdLiquidezDisplayRounded no negativo", () => {
    const rows = [tx({ id: "b", amount: 500_000, type: "expense" })]
    expect(householdLiquidezDisplayRounded(null, rows)).toBe(0)
  })
})
