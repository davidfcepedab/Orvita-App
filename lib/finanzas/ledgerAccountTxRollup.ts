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

/** Últimos 4 dígitos reconocibles en el label del catálogo (coherente con parseTcLabel en cuentas). */
export function lastFourFromLedgerLabel(ledgerLabel: string): string | null {
  const t = ledgerLabel.trim()
  const parts = t.split("|").map((p) => p.trim()).filter(Boolean)
  const last = parts[parts.length - 1] ?? ""
  if (/^\d{4}$/.test(last)) return last
  const m = /\b(\d{4})\b/.exec(t)
  return m ? m[1]! : null
}

function descriptionSuggestsLast4(description: string, last4: string): boolean {
  if (!last4 || !/^\d{4}$/.test(last4)) return false
  const d = description.trim()
  if (!d) return false
  try {
    const re = new RegExp(`(^|\\D)${last4}(\\D|$)`)
    return re.test(d)
  } catch {
    return d.includes(last4)
  }
}

export type LedgerTransactionLinkKind = "fk" | "label" | "last4"

/**
 * Cómo enlaza el movimiento con la cuenta del catálogo (para diagnóstico y métricas).
 * `null` = no hay enlace con esta cuenta.
 */
export function classifyLedgerTransactionLink(
  t: FinanceTransaction,
  accountId: string,
  ledgerLabel: string,
): LedgerTransactionLinkKind | null {
  const tid = t.finance_account_id?.trim()
  if (tid && tid === accountId) return "fk"

  const normalizedLedger = normalizeFinanceAccountLabel(ledgerLabel)
  const tl = normalizeFinanceAccountLabel(t.account_label ?? "")
  if (tl.length > 0 && tl === normalizedLedger) return "label"

  if (tl.length === 0 && !tid) {
    const last4 = lastFourFromLedgerLabel(ledgerLabel)
    if (last4 && descriptionSuggestsLast4(t.description ?? "", last4)) return "last4"
  }

  return null
}

/**
 * Enlaza movimiento ↔ cuenta ledger por FK, por etiqueta normalizada, o (fallback) por últimos 4 del label
 * en la descripción cuando el movimiento no trae cuenta (importes previos a account_label / finance_account_id).
 */
export function transactionMatchesLedgerAccount(
  t: FinanceTransaction,
  accountId: string,
  ledgerLabel: string,
): boolean {
  return classifyLedgerTransactionLink(t, accountId, ledgerLabel) !== null
}

/** Ingresos y gastos del mes vinculados a la cuenta (FK o etiqueta). */
export function accountMonthExpenseIncome(
  monthRows: FinanceTransaction[],
  month: string,
  accountId: string,
  accountLabel: string,
): { expense: number; income: number } {
  const cur = filterMonth(monthRows, month)
  let expense = 0
  let income = 0
  for (const t of cur) {
    if (!transactionMatchesLedgerAccount(t, accountId, accountLabel)) continue
    expense += expenseAmount(t)
    income += incomeAmount(t)
  }
  return { expense, income }
}

/**
 * Acumulado hasta el último día del mes visto (inclusive). Sirve para “saldo actual” de TC/préstamo
 * cuando `balance_used` en BD es 0 y los cargos están en meses anteriores.
 */
export function accountCumulativeExpenseIncomeThrough(
  rows: FinanceTransaction[],
  endDateInclusive: string,
  accountId: string,
  accountLabel: string,
): { expense: number; income: number } {
  let expense = 0
  let income = 0
  for (const t of rows) {
    if (t.date > endDateInclusive) continue
    if (!transactionMatchesLedgerAccount(t, accountId, accountLabel)) continue
    expense += expenseAmount(t)
    income += incomeAmount(t)
  }
  return { expense, income }
}
