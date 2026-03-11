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

  const currentMap: any = {}
  const previousMap: any = {}
  const financialMap: any = {}

  const prevMonth = (() => {
    const [y, m] = month.split("-").map(Number)
    const date = new Date(y, m - 2)
    return date.toISOString().slice(0, 7)
  })()

  rows.forEach((row) => {
    const rowMonth = row[12]       // Mes Y-M
    const category = row[6]        // Categoria
    const sub = row[7]             // Subcategoria
    const amount = Number(row[10]) || 0

    if (!category) return

    if (EXCLUDED.includes(category)) {
      if (!financialMap[category]) financialMap[category] = 0
      financialMap[category] += amount
      return
    }

    if (!currentMap[category]) {
      currentMap[category] = {
        total: 0,
        subs: {},
      }
    }

    if (!previousMap[category]) {
      previousMap[category] = {
        total: 0,
        subs: {},
      }
    }

    if (rowMonth === month) {
      currentMap[category].total += amount
      if (!currentMap[category].subs[sub])
        currentMap[category].subs[sub] = 0
      currentMap[category].subs[sub] += amount
    }

    if (rowMonth === prevMonth) {
      previousMap[category].total += amount
      if (!previousMap[category].subs[sub])
        previousMap[category].subs[sub] = 0
      previousMap[category].subs[sub] += amount
    }
  })

  const structuralCategories = Object.entries(currentMap).map(
    ([name, data]: any) => {

      const previous = previousMap[name]?.total || 0

      const deltaCluster =
        previous !== 0
          ? ((data.total - previous) / Math.abs(previous)) * 100
          : 0

      const type = FIXED_CATEGORIES.includes(name)
        ? "fixed"
        : "variable"

      const subcategories = Object.entries(data.subs).map(
        ([subName, subTotal]: any) => {

          const prevSub =
            previousMap[name]?.subs[subName] || 0

          const subDelta =
            prevSub !== 0
              ? ((subTotal - prevSub) /
                  Math.abs(prevSub)) *
                100
              : 0

          return {
            name: subName,
            total: subTotal,
            delta: subDelta,
          }
        }
      )

      return {
        name,
        total: data.total,
        type,
        deltaCluster,
        subcategories,
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
