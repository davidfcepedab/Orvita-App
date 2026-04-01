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

/** Mapa subcategoría normalizada → expense_type del catálogo. */
export function expenseTypeBySubcategory(catalog: FinanceSubcategoryCatalogEntry[]): Map<
  string,
  FinanceSubcategoryCatalogEntry["expense_type"]
> {
  const m = new Map<string, FinanceSubcategoryCatalogEntry["expense_type"]>()
  for (const row of catalog) {
    if (row.active === false) continue
    m.set(normalizeFinanceCatalogKey(row.subcategory), row.expense_type)
  }
  return m
}

/**
 * Suma de gasto del movimiento solo si el catálogo lo marca como operativo.
 * `expense_type = modulo_finanzas` excluye siempre del agregado operativo (bloque financiero).
 * Sin fila de catálogo para la subcategoría: se cuenta todo el gasto (compatibilidad con datos históricos).
 */
export function operativoExpenseAmount(
  tx: FinanceTransaction,
  impactBySub: Map<string, string>,
  expenseTypeBySub: Map<string, FinanceSubcategoryCatalogEntry["expense_type"]> = new Map(),
): number {
  const exp = expenseAmount(tx)
  if (exp <= 0) return 0
  const raw = tx.subcategory?.trim()
  if (!raw) return exp
  const key = normalizeFinanceCatalogKey(raw)
  if (expenseTypeBySub.get(key) === "modulo_finanzas") return 0
  const impact = impactBySub.get(key)
  if (impact == null || impact === "") return exp
  return impact === "operativo" ? exp : 0
}

export function createOperativoExpenseFn(
  catalog: FinanceSubcategoryCatalogEntry[],
): (tx: FinanceTransaction) => number {
  const impactMap = financialImpactBySubcategory(catalog)
  const expenseTypeMap = expenseTypeBySubcategory(catalog)
  return (tx) => operativoExpenseAmount(tx, impactMap, expenseTypeMap)
}
