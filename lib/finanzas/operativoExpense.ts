import { expenseAmount } from "@/lib/finanzas/calculations/txMath"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import {
  normalizeFinanceCatalogKey,
  type FinanceSubcategoryCatalogEntry,
} from "@/lib/finanzas/subcategoryCatalog"

/** Mapa subcategoría normalizada → impacto financiero en minúsculas. */
export function financialImpactBySubcategory(catalog: FinanceSubcategoryCatalogEntry[]): Map<string, string> {
  const m = new Map<string, string>()
  for (const row of catalog) {
    if (row.active === false) continue
    m.set(normalizeFinanceCatalogKey(row.subcategory), String(row.financial_impact ?? "").trim().toLowerCase())
  }
  return m
}

/**
 * Suma de gasto del movimiento solo si el catálogo lo marca como operativo.
 * Sin fila de catálogo para la subcategoría: se cuenta todo el gasto (compatibilidad con datos históricos).
 */
export function operativoExpenseAmount(tx: FinanceTransaction, impactBySub: Map<string, string>): number {
  const exp = expenseAmount(tx)
  if (exp <= 0) return 0
  const raw = tx.subcategory?.trim()
  if (!raw) return exp
  const impact = impactBySub.get(normalizeFinanceCatalogKey(raw))
  if (impact == null || impact === "") return exp
  return impact === "operativo" ? exp : 0
}

export function createOperativoExpenseFn(
  catalog: FinanceSubcategoryCatalogEntry[],
): (tx: FinanceTransaction) => number {
  const map = financialImpactBySubcategory(catalog)
  return (tx) => operativoExpenseAmount(tx, map)
}
