import {
  attachCatalogToStructuralCategories,
  buildStructuralCategories,
  recomputeStructuralTotals,
  splitStructuralCategoriesByCatalogExpenseType,
  type StructuralCategory,
} from "@/lib/finanzas/deriveFromTransactions"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import type { FinanceSubcategoryCatalogEntry } from "@/lib/finanzas/subcategoryCatalog"

/** Misma regla que la tarjeta «Total operativo» en Categorías (excluye bloque módulo financiero del variable). */
export function isModuloFinancieroStructuralCategory(cat: Pick<StructuralCategory, "name">): boolean {
  return cat.name.includes("Módulo financiero")
}

export function structuralOperativoUiTotals(structuralCategories: StructuralCategory[]): {
  totalFixed: number
  totalVariableRaw: number
  totalVariableUi: number
  totalStructuralUi: number
  moduloFinancieroAbs: number
  totalStructuralRaw: number
} {
  const { totalFixed, totalVariable, totalStructural } = recomputeStructuralTotals(structuralCategories)
  const moduloCategory = structuralCategories.find((c) => isModuloFinancieroStructuralCategory(c))
  const moduloFinancieroAbs = moduloCategory ? Math.abs(moduloCategory.total) : 0
  const totalVariableUi = Math.max(0, totalVariable - moduloFinancieroAbs)
  const totalStructuralUi = totalFixed + totalVariableUi
  return {
    totalFixed,
    totalVariableRaw: totalVariable,
    totalVariableUi,
    totalStructuralUi,
    moduloFinancieroAbs,
    totalStructuralRaw: totalStructural,
  }
}

/** Misma tubería que GET /finanzas/categories para totales «Total operativo». */
export function computeStructuralOperativoFromRows(
  current: FinanceTransaction[],
  previous: FinanceTransaction[],
  catalog: FinanceSubcategoryCatalogEntry[],
): {
  splitCategories: StructuralCategory[]
  totals: ReturnType<typeof structuralOperativoUiTotals>
} {
  const base = buildStructuralCategories(current, previous)
  const { structuralCategories: withCat } = attachCatalogToStructuralCategories(base.structuralCategories, catalog)
  const splitCategories = splitStructuralCategoriesByCatalogExpenseType(withCat)
  const totals = structuralOperativoUiTotals(splitCategories)
  return { splitCategories, totals }
}
