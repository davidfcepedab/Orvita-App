import type { FinanceTransaction, FinanceTxType } from "@/lib/finanzas/types"

function inferType(tx: FinanceTransaction): FinanceTxType {
  if (tx.type === "income" || tx.type === "expense") return tx.type
  const t = `${tx.category} ${tx.description}`.toLowerCase()
  if (/ingreso|ingresos|nomina|nómina|salario|freelance|factura|pago recibido|dividend/.test(t)) return "income"
  return "expense"
}

export function incomeAmount(tx: FinanceTransaction): number {
  const n = Number(tx.amount)
  if (!Number.isFinite(n) || n <= 0) return 0
  return inferType(tx) === "income" ? n : 0
}

export function expenseAmount(tx: FinanceTransaction): number {
  const n = Number(tx.amount)
  if (!Number.isFinite(n) || n <= 0) return 0
  return inferType(tx) === "expense" ? n : 0
}

/** Flujo neto: ingresos − gastos (importes siempre positivos en BD v2). */
export function netCashFlow(rows: FinanceTransaction[]): number {
  let inc = 0
  let exp = 0
  for (const r of rows) {
    inc += incomeAmount(r)
    exp += expenseAmount(r)
  }
  return inc - exp
}

/**
 * Flujo con regla de gasto explícita (p. ej. {@link createOperativoExpenseFn} del catálogo).
 * Ingresos siguen siendo {@link incomeAmount}; alinea Perspectivas con Resumen/P&L operativo.
 */
export function netCashFlowWithExpenseRule(
  rows: FinanceTransaction[],
  expenseFn: (tx: FinanceTransaction) => number,
): number {
  let inc = 0
  let exp = 0
  for (const r of rows) {
    inc += incomeAmount(r)
    exp += expenseFn(r)
  }
  return inc - exp
}

/** Para UI tipo extracto: egresos negativos. */
export function signedDisplayAmount(tx: FinanceTransaction): number {
  return expenseAmount(tx) > 0 ? -expenseAmount(tx) : incomeAmount(tx)
}
