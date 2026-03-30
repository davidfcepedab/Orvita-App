import { expenseAmount, incomeAmount } from "@/lib/finanzas/calculations/txMath"
import { filterMonth } from "@/lib/finanzas/deriveFromTransactions"
import type { FinanceTransaction } from "@/lib/finanzas/types"

/** Etiqueta comparable entre hoja Movimientos y `orbita_finance_accounts.label`. */
export function normalizeFinanceAccountLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s*\|\s*/g, "|")
    .replace(/\|/g, " | ")
    .replace(/\s+/g, " ")
    .trim()
}

export function transactionMatchesLedgerAccount(
  t: FinanceTransaction,
  accountId: string,
  normalizedAccountLabel: string,
): boolean {
  const tid = t.finance_account_id?.trim()
  if (tid && tid === accountId) return true
  const tl = normalizeFinanceAccountLabel(t.account_label ?? "")
  return tl.length > 0 && tl === normalizedAccountLabel
}

/** Ingresos y gastos del mes vinculados a la cuenta (FK o etiqueta). */
export function accountMonthExpenseIncome(
  monthRows: FinanceTransaction[],
  month: string,
  accountId: string,
  accountLabel: string,
): { expense: number; income: number } {
  const cur = filterMonth(monthRows, month)
  const nl = normalizeFinanceAccountLabel(accountLabel)
  let expense = 0
  let income = 0
  for (const t of cur) {
    if (!transactionMatchesLedgerAccount(t, accountId, nl)) continue
    expense += expenseAmount(t)
    income += incomeAmount(t)
  }
  return { expense, income }
}
