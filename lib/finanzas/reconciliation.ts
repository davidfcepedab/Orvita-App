import type { FinanceTransaction } from "@/lib/finanzas/types"
import { accountCumulativeExpenseIncomeThrough } from "@/lib/finanzas/ledgerAccountTxRollup"

export type LedgerAccountClass = "ahorro" | "tarjeta_credito" | "credito"
export type ReconciliationRealInputMode = "balance" | "available_credit"

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

export function reconciliationDelta(
  realBalance: number,
  calculatedBalance: number,
  accountClass?: LedgerAccountClass,
): number {
  if (accountClass === "tarjeta_credito") {
    // En TC ambos valores deben estar normalizados a deuda.
    return Math.round((realBalance - calculatedBalance) * 100) / 100
  }
  return Math.round((realBalance - calculatedBalance) * 100) / 100
}

export function reconciliationTxTypeForDelta(
  accountClass: LedgerAccountClass,
  delta: number,
): "income" | "expense" {
  if (accountClass === "tarjeta_credito") {
    return delta >= 0 ? "expense" : "income"
  }
  if (accountClass === "ahorro") {
    return delta >= 0 ? "income" : "expense"
  }
  return delta >= 0 ? "expense" : "income"
}

export function reconciliationTolerance(realBalance: number): number {
  const byPct = Math.abs(realBalance) * 0.001
  return Math.max(100, Math.round(byPct))
}

export function normalizeRealBalanceForReconciliation(account: {
  account_class: string
  credit_limit?: number | null
}): { mode: ReconciliationRealInputMode; normalize: (input: number) => number } {
  const accountClass = account.account_class as LedgerAccountClass
  if (accountClass !== "tarjeta_credito") {
    return { mode: "balance", normalize: (input) => input }
  }

  const limitRaw = Number(account.credit_limit ?? NaN)
  const hasLimit = Number.isFinite(limitRaw) && limitRaw >= 0
  if (!hasLimit) {
    throw new Error("Tarjeta sin cupo definido: no se puede conciliar por disponible")
  }
  const limit = Math.round(limitRaw)

  return {
    mode: "available_credit",
    normalize: (availableInput) => {
      if (!Number.isFinite(availableInput)) throw new Error("Disponible inválido")
      if (availableInput < 0) throw new Error("Disponible no puede ser negativo")
      if (availableInput > limit) throw new Error("Disponible no puede superar el cupo")
      return Math.round(limit - availableInput)
    },
  }
}
