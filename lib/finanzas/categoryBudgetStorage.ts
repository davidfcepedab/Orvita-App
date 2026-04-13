/**
 * Presupuestos mensuales por categoría/subcategoría (cliente, localStorage).
 * Sustituye la heurística del servidor (gasto × 1.08 → ~93%) cuando el usuario define montos en COP.
 */

export type MonthCategoryBudgetsV1 = {
  version: 1
  /** Clave: `${"fixed"|"variable"}|${nombreCategoría}` → COP mensual */
  category: Record<string, number>
  /** Clave: `${"fixed"|"variable"}|${categoría}|${subcategoría}` → COP mensual */
  subcategory: Record<string, number>
}

const STORAGE_KEY = "orbita.financeCategoryBudgets.v1"

function emptyMonth(): MonthCategoryBudgetsV1 {
  return { version: 1, category: {}, subcategory: {} }
}

export function loadAllBudgets(): Record<string, MonthCategoryBudgetsV1> {
  if (typeof window === "undefined") return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object") return {}
    return parsed as Record<string, MonthCategoryBudgetsV1>
  } catch {
    return {}
  }
}

export function loadMonthBudgets(month: string): MonthCategoryBudgetsV1 {
  const all = loadAllBudgets()
  const m = all[month]
  if (!m || m.version !== 1) return emptyMonth()
  return {
    version: 1,
    category: { ...m.category },
    subcategory: { ...m.subcategory },
  }
}

export function saveMonthBudgets(month: string, data: MonthCategoryBudgetsV1): void {
  if (typeof window === "undefined") return
  const all = loadAllBudgets()
  all[month] = {
    version: 1,
    category: { ...data.category },
    subcategory: { ...data.subcategory },
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all))
  } catch {
    // ignore quota
  }
}

export function categoryBudgetKey(type: "fixed" | "variable", categoryName: string) {
  return `${type === "fixed" ? "fixed" : "variable"}|${categoryName.trim()}`
}

export function subcategoryBudgetKey(type: "fixed" | "variable", categoryName: string, subName: string) {
  return `${type === "fixed" ? "fixed" : "variable"}|${categoryName.trim()}|${subName.trim()}`
}
