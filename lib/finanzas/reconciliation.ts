import type { FinanceTransaction } from "@/lib/finanzas/types"
import { accountCumulativeExpenseIncomeThrough } from "@/lib/finanzas/ledgerAccountTxRollup"

export type LedgerAccountClass = "ahorro" | "tarjeta_credito" | "credito"

export function computeAccountCalculatedBalance(
  rows: FinanceTransaction[],
  throughDateInclusive: string,
  account: { id: string; label: string; account_class: string },
): number {
  const cls = account.account_class as LedgerAccountClass
  const { expense, income } = accountCumulativeExpenseIncomeThrough(
    rows,
    throughDateInclusive,
    account.id,
    account.label,
  )

  if (cls === "ahorro") {
    return Math.round(income - expense)
  }
  return Math.round(expense - income)
}

export function computeAccountCalculatedBalanceFromSnapshot(
  rows: FinanceTransaction[],
  throughDateInclusive: string,
  account: {
    id: string
    label: string
    account_class: string
    manual_balance?: number | null
    manual_balance_on?: string | null
  },
): number {
  const snapshotDate = account.manual_balance_on?.trim() || ""
  const snapshotBalance = Number(account.manual_balance ?? NaN)
  const hasSnapshot = /^\d{4}-\d{2}-\d{2}$/.test(snapshotDate) && Number.isFinite(snapshotBalance)
  if (!hasSnapshot) {
    return computeAccountCalculatedBalance(rows, throughDateInclusive, account)
  }

  const cls = account.account_class as LedgerAccountClass
  const { expense, income } = accountCumulativeExpenseIncomeThrough(
    rows,
    throughDateInclusive,
    account.id,
    account.label,
  )
  const { expense: baseExpense, income: baseIncome } = accountCumulativeExpenseIncomeThrough(
    rows,
    snapshotDate,
    account.id,
    account.label,
  )

  if (cls === "ahorro") {
    const deltaAfterSnapshot = (income - expense) - (baseIncome - baseExpense)
    return Math.round(snapshotBalance + deltaAfterSnapshot)
  }
  const debtDeltaAfterSnapshot = (expense - income) - (baseExpense - baseIncome)
  return Math.round(snapshotBalance + debtDeltaAfterSnapshot)
}

export function reconciliationDelta(realBalance: number, calculatedBalance: number): number {
  return Math.round((realBalance - calculatedBalance) * 100) / 100
}

export function reconciliationTxTypeForDelta(
  accountClass: LedgerAccountClass,
  delta: number,
): "income" | "expense" {
  if (accountClass === "ahorro") {
    return delta >= 0 ? "income" : "expense"
  }
  return delta >= 0 ? "expense" : "income"
}

export function reconciliationTolerance(realBalance: number): number {
  const byPct = Math.abs(realBalance) * 0.001
  return Math.max(100, Math.round(byPct))
}
