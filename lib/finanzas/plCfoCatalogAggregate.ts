import { expenseAmount, incomeAmount } from "@/lib/finanzas/calculations/txMath"
import {
  expenseTypeBySubcategory,
  financialImpactBySubcategory,
} from "@/lib/finanzas/operativoExpense"
import {
  normalizeFinanceCatalogKey,
  type FinanceSubcategoryCatalogEntry,
} from "@/lib/finanzas/subcategoryCatalog"
import type { FinanceTransaction } from "@/lib/finanzas/types"

export type PlCfoExpenseTypeBucket = {
  fijo: number
  variable: number
  modulo_finanzas: number
  sin_catalogo: number
}

export type PlCfoCatalogAggregate = {
  /** Gasto del mes por `financial_impact` del catálogo (clave tal cual en BD, minúsculas). */
  expenseByImpact: Record<string, number>
  expenseByExpenseType: PlCfoExpenseTypeBucket
  /** Ingresos en subcategorías que también tuvieron ingreso el mes anterior (proxy de recurrencia). */
  incomeRecurringEst: number
  /** Resto de ingresos del mes. */
  incomeUniqueEst: number
  /** Top categorías de movimiento (campo `category`) por gasto. */
  topExpenseCategories: { label: string; amount: number; pct: number }[]
  /** Gasto sin fila de catálogo para la subcategoría (o sin subcategoría). */
  unmatchedExpenseCop: number
  hasCatalog: boolean
}

function humanizeImpactKey(key: string): string {
  const k = key.trim().toLowerCase()
  if (!k || k === "sin clasificar") return "Sin clasificar en catálogo"
  const map: Record<string, string> = {
    operativo: "Operativo",
    operación: "Operativo",
    inversion: "Inversión",
    inversión: "Inversión",
    ajuste: "Ajuste",
    financiero: "Financiero / estructural",
    ingreso: "Ingreso",
  }
  return map[k] ?? key.charAt(0).toUpperCase() + key.slice(1)
}

/**
 * Agrega gastos por impacto y tipo (fijo/variable/módulo) e ingresos recurrentes vs únicos
 * usando `orbita_finance_subcategory_catalog` y subcategoría del movimiento.
 */
export function buildPlCfoCatalogAggregate(
  current: FinanceTransaction[],
  previous: FinanceTransaction[],
  catalog: FinanceSubcategoryCatalogEntry[],
): PlCfoCatalogAggregate {
  const impactMap = financialImpactBySubcategory(catalog)
  const typeMap = expenseTypeBySubcategory(catalog)
  const expenseByImpact: Record<string, number> = {}
  const expenseByExpenseType: PlCfoExpenseTypeBucket = {
    fijo: 0,
    variable: 0,
    modulo_finanzas: 0,
    sin_catalogo: 0,
  }
  let unmatchedExpense = 0
  let totalExpense = 0

  for (const tx of current) {
    const exp = expenseAmount(tx)
    if (exp <= 0) continue
    totalExpense += exp
    const sub = tx.subcategory?.trim()
    if (!sub) {
      unmatchedExpense += exp
      expenseByExpenseType.sin_catalogo += exp
      continue
    }
    const key = normalizeFinanceCatalogKey(sub)
    if (!typeMap.has(key)) {
      unmatchedExpense += exp
      expenseByExpenseType.sin_catalogo += exp
      continue
    }
    const et = typeMap.get(key)!
    expenseByExpenseType[et] += exp
    const rawImpact = (impactMap.get(key) ?? "").trim() || "sin clasificar"
    const displayKey = humanizeImpactKey(rawImpact)
    expenseByImpact[displayKey] = (expenseByImpact[displayKey] ?? 0) + exp
  }

  const prevSubIncome = new Map<string, number>()
  for (const tx of previous) {
    const inc = incomeAmount(tx)
    if (inc <= 0) continue
    const sub = tx.subcategory?.trim()
    if (!sub) continue
    const k = normalizeFinanceCatalogKey(sub)
    prevSubIncome.set(k, (prevSubIncome.get(k) ?? 0) + inc)
  }

  let incomeRecurringEst = 0
  let incomeUniqueEst = 0
  for (const tx of current) {
    const inc = incomeAmount(tx)
    if (inc <= 0) continue
    const sub = tx.subcategory?.trim()
    const k = sub ? normalizeFinanceCatalogKey(sub) : ""
    if (k && (prevSubIncome.get(k) ?? 0) > 0.5) incomeRecurringEst += inc
    else incomeUniqueEst += inc
  }

  const byCat = new Map<string, number>()
  for (const tx of current) {
    const exp = expenseAmount(tx)
    if (exp <= 0) continue
    const cat = tx.category?.trim() || "Sin categoría"
    byCat.set(cat, (byCat.get(cat) ?? 0) + exp)
  }
  const sorted = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  const topExpenseCategories = sorted.map(([label, amount]) => ({
    label,
    amount,
    pct: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
  }))

  return {
    expenseByImpact,
    expenseByExpenseType,
    incomeRecurringEst,
    incomeUniqueEst,
    topExpenseCategories,
    unmatchedExpenseCop: unmatchedExpense,
    hasCatalog: catalog.length > 0,
  }
}
