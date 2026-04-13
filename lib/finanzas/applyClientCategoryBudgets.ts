import {
  categoryBudgetKey,
  subcategoryBudgetKey,
  type MonthCategoryBudgetsV1,
} from "@/lib/finanzas/categoryBudgetStorage"

export type BudgetStatus = "green" | "yellow" | "red"

function statusForPercent(pct: number): BudgetStatus {
  if (pct >= 100) return "red"
  if (pct >= 88) return "yellow"
  return "green"
}

/** Misma lógica que deriveFromTransactions (heurística cuando no hay cap). */
function heuristicBudget(spentAbs: number): { budget: number; budgetUsedPercent: number; budgetStatus: BudgetStatus } {
  const budget = spentAbs * 1.08
  const budgetUsedPercent = budget > 0 ? Math.min(150, Math.round((spentAbs / budget) * 100)) : 0
  return {
    budget: Math.round(budget),
    budgetUsedPercent,
    budgetStatus: statusForPercent(budgetUsedPercent),
  }
}

function pctUsed(spentAbs: number, cap: number): { budget: number; budgetUsedPercent: number; budgetStatus: BudgetStatus } {
  const budget = Math.round(cap)
  const budgetUsedPercent = cap > 0 ? Math.min(150, Math.round((spentAbs / cap) * 100)) : 0
  return {
    budget,
    budgetUsedPercent,
    budgetStatus: statusForPercent(budgetUsedPercent),
  }
}

export type CategoryBudgetSource = "manual" | "subs" | "estimate"

export type CategoryLike = {
  name: string
  type: "fixed" | "variable"
  total: number
  budget?: number
  budgetUsedPercent?: number
  budgetStatus?: BudgetStatus
  /** Origen del tope mostrado en la tarjeta (para copy UX). */
  budgetSource?: CategoryBudgetSource
  subcategories?: SubcategoryLike[]
}

export type SubcategoryLike = {
  name: string
  total: number
  budgetCap?: number
  budgetUsedPercent?: number
  budgetStatus?: BudgetStatus
}

/** Suma topes en subcategorías definidos para esta categoría (mismo tipo fijo/variable). */
function sumSubcategoryCaps(
  budgets: MonthCategoryBudgetsV1,
  type: "fixed" | "variable",
  categoryName: string,
  subNames: string[],
): number {
  let sum = 0
  for (const subName of subNames) {
    const sk = subcategoryBudgetKey(type, categoryName, subName)
    const v = budgets.subcategory[sk]
    if (v != null && v > 0 && Number.isFinite(v)) sum += v
  }
  return sum
}

/**
 * Aplica presupuestos guardados en cliente; mantiene heurística del servidor si no hay cap.
 * Si no hay tope en la fila categoría pero sí en subcategorías, el tope de tarjeta = suma de esos topes.
 */
export function applyClientCategoryBudgets<T extends CategoryLike>(categories: T[], budgets: MonthCategoryBudgetsV1): T[] {
  return categories.map((cat) => {
    const spent = Math.abs(cat.total)
    const type = cat.type
    const ck = categoryBudgetKey(type, cat.name)
    const cap = budgets.category[ck]
    const subNames = (cat.subcategories ?? []).map((s) => s.name)
    const rolledUp = sumSubcategoryCaps(budgets, type, cat.name, subNames)

    let catBudget: ReturnType<typeof pctUsed>
    let budgetSource: CategoryBudgetSource = "estimate"

    if (cap != null && cap > 0 && Number.isFinite(cap)) {
      catBudget = pctUsed(spent, cap)
      budgetSource = "manual"
    } else if (rolledUp > 0) {
      catBudget = pctUsed(spent, rolledUp)
      budgetSource = "subs"
    } else {
      catBudget = heuristicBudget(spent)
      budgetSource = "estimate"
    }

    const subs = (cat.subcategories ?? []).map((sub) => {
      const s = sub as SubcategoryLike
      const sk = subcategoryBudgetKey(type, cat.name, s.name)
      const subCap = budgets.subcategory[sk]
      if (subCap != null && subCap > 0 && Number.isFinite(subCap)) {
        const spentSub = Math.abs(s.total)
        const b = pctUsed(spentSub, subCap)
        return {
          ...s,
          budgetCap: b.budget,
          budgetUsedPercent: b.budgetUsedPercent,
          budgetStatus: b.budgetStatus,
        }
      }
      return { ...s, budgetCap: undefined, budgetUsedPercent: undefined, budgetStatus: undefined }
    })

    return {
      ...cat,
      budget: catBudget.budget,
      budgetUsedPercent: catBudget.budgetUsedPercent,
      budgetStatus: catBudget.budgetStatus,
      budgetSource,
      subcategories: subs as T["subcategories"],
    }
  })
}
