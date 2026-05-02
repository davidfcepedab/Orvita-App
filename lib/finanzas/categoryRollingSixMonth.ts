import { categoryBudgetKey, subcategoryBudgetKey } from "@/lib/finanzas/categoryBudgetStorage"
import { filterMonth } from "@/lib/finanzas/deriveFromTransactions"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import type { FinanceSubcategoryCatalogEntry } from "@/lib/finanzas/subcategoryCatalog"
import { lastNMonthsInclusive } from "@/lib/finanzas/monthRange"
import {
  computeStructuralOperativoFromRows,
  isModuloFinancieroStructuralCategory,
} from "@/lib/finanzas/structuralOperativoTotals"

export type RollingSixMonthStat = {
  /** Promedio mensual del gasto absoluto en la ventana (últimos N meses). */
  avgMonthlyAbs: number
}

/**
 * Para cada clave de presupuesto (categoría / sub), promedio del gasto absoluto en los últimos N meses.
 */
export function computeRollingSixMonthByBudgetKey(options: {
  anchorMonth: string
  transactions: FinanceTransaction[]
  catalog: FinanceSubcategoryCatalogEntry[]
  monthCount?: number
}): Record<string, RollingSixMonthStat> {
  const { anchorMonth, transactions, catalog, monthCount = 6 } = options
  const months = lastNMonthsInclusive(anchorMonth, monthCount)
  const monthlyMaps: Map<string, number>[] = []

  for (const ym of months) {
    const rows = filterMonth(transactions, ym)
    const { splitCategories } = computeStructuralOperativoFromRows(rows, [], catalog)
    const m = new Map<string, number>()
    for (const cat of splitCategories) {
      if (isModuloFinancieroStructuralCategory(cat)) continue
      m.set(categoryBudgetKey(cat.type, cat.name), Math.abs(cat.total))
      for (const sub of cat.subcategories ?? []) {
        m.set(subcategoryBudgetKey(cat.type, cat.name, sub.name), Math.abs(sub.total))
      }
    }
    monthlyMaps.push(m)
  }

  const allKeys = new Set<string>()
  for (const mp of monthlyMaps) {
    for (const k of mp.keys()) allKeys.add(k)
  }

  const out: Record<string, RollingSixMonthStat> = {}
  for (const key of allKeys) {
    const series = months.map((_, i) => monthlyMaps[i].get(key) ?? 0)
    const sum = series.reduce((a, b) => a + b, 0)
    const avgMonthlyAbs = sum / months.length
    out[key] = { avgMonthlyAbs }
  }
  return out
}
