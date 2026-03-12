import type { Transaction, Category, Subcategory } from "@/lib/types"

export function financialAdvancedEngine({
  transactions,
  month,
}: {
  transactions: Transaction[]
  month: string
}) {
  if (!transactions || !Array.isArray(transactions)) {
    return {
      structuralCategories: [] as Category[],
      financialCategories: [] as { name: string; total: number }[],
      totalFixed: 0,
      totalVariable: 0,
      totalStructural: 0,
      totalFinancialFlow: 0,
    }
  }

  const FIXED_CATEGORIES = [
    "Hogar & Base",
    "Obligaciones",
    "Suscripciones",
    "Desarrollo",
  ]

  const EXCLUDED = [
    "Finanzas",
    "Movimientos Financieros",
  ]

  const currentMap: Record<string, { total: number; subcategories: Record<string, number> }> = {}
  const previousMap: Record<string, { total: number; subcategories: Record<string, number> }> = {}
  const financialMap: Record<string, number> = {}

  const prevMonth = (() => {
    const [y, m] = month.split("-").map(Number)
    const date = new Date(y, m - 2)
    return date.toISOString().slice(0, 7)
  })()

  transactions.forEach((tx) => {
    const { mes, categoria, monto } = tx
    const sub = tx.subcategoria || "Sin subcategoria"

    if (!categoria) return

    if (EXCLUDED.includes(categoria)) {
      if (mes === month) {
        financialMap[categoria] = (financialMap[categoria] || 0) + monto
      }
      return
    }

    if (!currentMap[categoria]) {
      currentMap[categoria] = { total: 0, subs: {} }
    }

    if (!previousMap[categoria]) {
      previousMap[categoria] = { total: 0, subs: {} }
    }

    if (mes === month) {
      currentMap[categoria].total += monto
      currentMap[categoria].subs[sub] =
        (currentMap[categoria].subs[sub] || 0) + monto
    }

    if (mes === prevMonth) {
      previousMap[categoria].total += monto
      previousMap[categoria].subs[sub] =
        (previousMap[categoria].subs[sub] || 0) + monto
    }
  })

  const structuralCategories: Category[] = Object.entries(currentMap)
    .filter(([, data]) => Math.abs(data.total) > 0)
    .map(([name, data]) => {
      const previousTotal = previousMap[name]?.total || 0
      const delta = data.total - previousTotal
      const subs: Subcategory[] = Object.entries(data.subs).map(([subName, value]) => ({
        name: subName,
        total: value,
      }))

      return {
        name,
        total: data.total,
        previousTotal,
        delta,
        type: (FIXED_CATEGORIES.includes(name) ? "fixed" : "variable") as "fixed" | "variable",
        subs,
      }
    })

  const financialCategories = Object.entries(financialMap).map(
    ([name, total]) => (
      {
        name,
        total,
      })
  )

  const totalFixed = structuralCategories
    .filter((c) => c.type === "fixed")
    .reduce((acc, c) => acc + c.total, 0)

  const totalVariable = structuralCategories
    .filter((c) => c.type === "variable")
    .reduce((acc, c) => acc + c.total, 0)

  const totalStructural = totalFixed + totalVariable

  const totalFinancialFlow = financialCategories.reduce(
    (acc, c) => acc + c.total,
    0
  )

  return {
    structuralCategories,
    financialCategories,
    totalFixed,
    totalVariable,
    totalStructural,
    totalFinancialFlow,
  }
}