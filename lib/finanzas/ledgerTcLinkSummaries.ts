import { expenseAmount, incomeAmount } from "@/lib/finanzas/calculations/txMath"
import { classifyLedgerTransactionLink } from "@/lib/finanzas/ledgerAccountTxRollup"
import type { LedgerAccountSortable } from "@/lib/finanzas/sortLedgerAccounts"
import type { FinanceTransaction } from "@/lib/finanzas/types"

export type TcMovementLinkSummary = {
  financeAccountId: string
  label: string
  matchedCount: number
  byFk: number
  byLabel: number
  byLast4: number
  /** Gastos − ingresos acumulados en movimientos enlazados (hasta fin de mes). */
  netExpense: number
}

/** Una entrada por cada tarjeta de crédito del ledger: cuántos movimientos enlazan y por qué vía. */
export function summarizeTcMovementLinks(
  ledgerSorted: LedgerAccountSortable[],
  rollupRows: FinanceTransaction[],
  endDateInclusive: string,
): TcMovementLinkSummary[] {
  const tcRows = ledgerSorted.filter((r) => r.account_class === "tarjeta_credito")
  return tcRows.map((row) => {
    let byFk = 0
    let byLabel = 0
    let byLast4 = 0
    let matchedCount = 0
    let net = 0
    for (const t of rollupRows) {
      if (t.date > endDateInclusive) continue
      const kind = classifyLedgerTransactionLink(t, row.id, row.label)
      if (!kind) continue
      matchedCount++
      if (kind === "fk") byFk += 1
      else if (kind === "label") byLabel += 1
      else byLast4 += 1
      net += expenseAmount(t) - incomeAmount(t)
    }
    return {
      financeAccountId: row.id,
      label: row.label,
      matchedCount,
      byFk,
      byLabel,
      byLast4,
      netExpense: Math.round(net),
    }
  })
}
