export function financialAdvancedEngine({
  rows,
  month,
}: {
  rows: any[]
  month: string
}) {
  if (!rows || !Array.isArray(rows)) {
    return {
      structuralCategories: [],
      financialCategories: [],
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

  const currentMap: Record<string, { total: number; subs: Record<string, number> }> = {}
  const previousMap: Record<string, { total: number; subs: Record<string, number> }> = {}
  const financialMap: Record<string, number> = {}

  const prevMonth = (() => {
    const [y, m] = month.split("-").map(Number)
    const date = new Date(y, m - 2)
    return date.toISOString().slice(0, 7)
  })()

  rows.forEach((row) => {
    const rowMonth = row[12]
    const category = row[6]
    const sub = row[7] || "Sin subcategoria"
    const amount = Number(row[10]) || 0

    if (!category) return

    if (EXCLUDED.includes(category)) {
      financialMap[category] = (financialMap[category] || 0) + amount
      return
    }

    if (!currentMap[category]) {
      currentMap[category] = { total: 0, subs: {} }
    }

    if (!previousMap[category]) {
      previousMap[category] = { total: 0, subs: {} }
    }

    if (rowMonth === month) {
      currentMap[category].total += amount
      currentMap[category].subs[sub] =
        (currentMap[category].subs[sub] || 0) + amount
    }

    if (rowMonth === prevMonth) {
      previousMap[category].total += amount
      previousMap[category].subs[sub] =
        (previousMap[category].subs[sub] || 0) + amount
    }
  })

  const structuralCategories = Object.entries(currentMap)
    .filter(([, data]) => Math.abs(data.total) > 0)
    .map(([name, data]) => {
      const previousTotal = previousMap[name]?.total || 0
      const delta = data.total - previousTotal

      return {
        name,
        total: data.total,
        previousTotal,
        delta,
        type: FIXED_CATEGORIES.includes(name) ? "fixed" : "variable",
        subs: Object.entries(data.subs).map(([sub, value]) => ({
          name: sub,
          total: value,
        })),
      }
    }
  )

  const financialCategories = Object.entries(financialMap).map(
    ([name, total]) => ({
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
