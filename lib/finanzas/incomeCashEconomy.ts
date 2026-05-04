import type { FinanceTransaction } from "@/lib/finanzas/types"
import { incomeAmount } from "@/lib/finanzas/calculations/txMath"
import { transactionMatchesLedgerAccount } from "@/lib/finanzas/ledgerAccountTxRollup"

/** Referencia mínima a una TC del ledger (`orbita_finance_accounts`). */
export type LedgerTcRef = { id: string; label: string }

/**
 * Ingreso “económico” para KPI tipo P&L: excluye importes marcados como ingreso pero **enlazados a una
 * tarjeta de crédito** (abonos, contracargos contabilizados como ingreso en la TC, etc.).
 * No es efectivo nuevo; el disponible de TC sigue modelándose en Capital / saldos por cuenta.
 */
export function incomeAmountCashEconomy(tx: FinanceTransaction, tcRefs: readonly LedgerTcRef[]): number {
  const base = incomeAmount(tx)
  if (base <= 0) return 0
  for (const r of tcRefs) {
    if (transactionMatchesLedgerAccount(tx, r.id, r.label)) return 0
  }
  return base
}

export function createIncomeForMetricsFn(tcRefs: readonly LedgerTcRef[]): (tx: FinanceTransaction) => number {
  if (tcRefs.length === 0) return incomeAmount
  return (tx) => incomeAmountCashEconomy(tx, tcRefs)
}
