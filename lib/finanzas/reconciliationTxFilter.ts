import type { FinanceTransaction } from "@/lib/finanzas/types"

/**
 * Movimientos generados al conciliar cuentas ledger (`/ledger-accounts/reconcile`).
 * Deben seguir contando para **saldo/cupo por cuenta** (motor `computeAccountCalculatedBalanceFromSnapshot`),
 * pero **no** para KPI operativo, categorías, P&L por movimientos ni insights — evitan doble conteo con el modelo.
 */
export function isReconciliationAdjustmentTransaction(
  tx: Pick<FinanceTransaction, "description" | "subcategory">,
): boolean {
  const d = String(tx.description ?? "").trim()
  if (/^\[reconciliation_adjustment/i.test(d)) return true
  if (String(tx.subcategory ?? "") === "manual_sync") return true
  return false
}

/** Filas aptas para ingresos/gastos operativos, categorías y series del mes. */
export function excludeReconciliationFromOperativoAnalysis<T extends Pick<FinanceTransaction, "description" | "subcategory">>(
  rows: T[],
): T[] {
  return rows.filter((r) => !isReconciliationAdjustmentTransaction(r))
}
