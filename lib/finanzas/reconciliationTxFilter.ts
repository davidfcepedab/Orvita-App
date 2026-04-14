import type { FinanceTransaction } from "@/lib/finanzas/types"

/**
 * Movimientos generados al conciliar cuentas ledger (`/ledger-accounts/reconcile`) u hilo equivalente
 * (`[reconciliation_adjustment|…]` en descripción).
 * Siguen contando para **saldo/cupo por cuenta**, pero **no** para KPI operativo, categorías, P&L por movimientos ni insights.
 *
 * `subcategory === "manual_sync"` solo cuenta si `category === "Ajustes"` (evita excluir otro uso futuro de manual_sync).
 */
export function isReconciliationAdjustmentTransaction(
  tx: Pick<FinanceTransaction, "description" | "subcategory" | "category">,
): boolean {
  const d = String(tx.description ?? "").trim()
  if (/^\[reconciliation_adjustment/i.test(d)) return true
  if (String(tx.subcategory ?? "") === "manual_sync" && String(tx.category ?? "").trim() === "Ajustes") return true
  return false
}

/** Filas aptas para ingresos/gastos operativos, categorías y series del mes. */
export function excludeReconciliationFromOperativoAnalysis<
  T extends Pick<FinanceTransaction, "description" | "subcategory" | "category">,
>(rows: T[]): T[] {
  return rows.filter((r) => !isReconciliationAdjustmentTransaction(r))
}
