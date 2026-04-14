import type { MonthFinanceCoherence } from "@/lib/finanzas/monthFinanceCoherence"
import type { PlCfoCatalogAggregate } from "@/lib/finanzas/plCfoCatalogAggregate"
import type { PlOverviewMonthlyRow } from "@/lib/finanzas/plStrategicCenterFromCoherence"

export type PlCfoStrategicInsight = {
  id: string
  title: string
  body: string
  variant: "neutral" | "attention" | "positive"
}

export type PlCfoKeyMetrics = {
  income: number
  expenseTotal: number
  expenseOperativoKpi: number
  net: number
  netMarginPct: number
  /** (Ingresos − gasto operativo KPI) / ingresos — proxy de margen operativo del hogar. */
  operatingMarginPct: number
  incomeMomPct: number | null
  expenseMomPct: number | null
  netMomPct: number | null
  savingsRatePct: number
  runwayMonths: number
}

export type PlCfoBreakdownRow = {
  label: string
  amount: number
  pctOfTotal: number
}

export type PlCfoAction = {
  id: string
  title: string
  href: string
  priority: "alta" | "media"
  impactLabel: string
}

export type PlCfoModel = {
  strategicInsights: PlCfoStrategicInsight[]
  metrics: PlCfoKeyMetrics
  /** Salud 0–100: mezcla de tasa de ahorro y cobertura (runway). */
  healthScore: number
  healthLabel: string
  incomeBreakdown: PlCfoBreakdownRow[]
  expenseBreakdown: PlCfoBreakdownRow[]
  /** Categorías de movimiento con más gasto (desde TX); solo si hay agregación con datos. */
  topExpenseCategories?: PlCfoBreakdownRow[]
  actions: PlCfoAction[]
  trendSix: PlOverviewMonthlyRow[]
}

function pctDelta(cur: number, prev: number): number | null {
  if (!Number.isFinite(prev) || Math.abs(prev) < 1) return null
  return ((cur - prev) / Math.abs(prev)) * 100
}

function layerAmt(layers: MonthFinanceCoherence["plLayers"], id: string): number {
  return layers.find((L) => L.id === id)?.amount ?? 0
}

function catalogOperativoExpenseTotal(cat: PlCfoCatalogAggregate): number {
  const b = cat.expenseByExpenseType
  return b.fijo + b.variable + b.modulo_finanzas + b.sin_catalogo
}

/**
 * Agrega lectura CFO desde coherencia del mes + serie overview (año móvil).
 * Con `catalog` (subcategorías en `orbita_finance_subcategory_catalog`), el desglose de gasto
 * usa `financial_impact` y el de ingresos un proxy recurrente/único (ingreso en misma subcategoría el mes previo).
 */
export function buildPlCfoModel(
  c: MonthFinanceCoherence,
  rollingYear: readonly PlOverviewMonthlyRow[] | null | undefined,
  overviewHeadline?: { savingsRate: number; runway: number } | null,
  catalog?: PlCfoCatalogAggregate | null,
): PlCfoModel {
  const layers = c.plLayers
  const income = layerAmt(layers, "income")
  const expenseTotal = Math.abs(layerAmt(layers, "expense_all"))
  const opex = layerAmt(layers, "opex_kpi")
  const outside = layerAmt(layers, "outside_kpi")
  const structural = layerAmt(layers, "structural_ui")
  const modulo = layerAmt(layers, "modulo_structural")
  const net = c.netCashFlow

  const netMarginPct = income > 0.5 ? (net / income) * 100 : 0
  const operatingMarginPct = income > 0.5 ? ((income - opex) / income) * 100 : 0

  const ry = Array.isArray(rollingYear) && rollingYear.length >= 2 ? rollingYear : null
  const last = ry ? ry[ry.length - 1] : null
  const prev = ry && ry.length >= 2 ? ry[ry.length - 2] : null

  const incomeMomPct = last && prev ? pctDelta(last.ingresos, prev.ingresos) : null
  const expenseMomPct = last && prev ? pctDelta(last.gasto_operativo, prev.gasto_operativo) : null
  const netMomPct = last && prev ? pctDelta(last.flujo, prev.flujo) : null

  const savingsRatePct = overviewHeadline?.savingsRate ?? netMarginPct
  const runwayMonths = overviewHeadline?.runway ?? (c.expenseOperativoKpi > 0 && net > 0 ? net / c.expenseOperativoKpi : 0)

  const srPart = Math.max(0, Math.min(55, savingsRatePct * 0.55))
  const rwPart = Math.min(45, (Math.min(Math.max(runwayMonths, 0), 6) / 6) * 45)
  let healthScore = Math.round(Math.max(0, Math.min(100, srPart + rwPart)))
  if (!Number.isFinite(healthScore)) healthScore = 50
  const healthLabel =
    healthScore >= 72 ? "Sólida" : healthScore >= 48 ? "En observación" : "Requiere plan"

  const catTotal = catalog ? catalogOperativoExpenseTotal(catalog) : 0
  const useCatalogExpense = Boolean(catalog && catTotal > 0.5)
  const incomeSplitTotal =
    catalog != null ? catalog.incomeRecurringEst + catalog.incomeUniqueEst : 0
  const useCatalogIncomeSplit = Boolean(catalog && incomeSplitTotal > 0.5)

  const strategicInsights: PlCfoStrategicInsight[] = []

  if (last && prev) {
    const expGrowingFaster =
      expenseMomPct != null && incomeMomPct != null && expenseMomPct > incomeMomPct + 2
    const incomeSplitNote =
      useCatalogIncomeSplit && income > 0.5
        ? ` Ingresos del mes: ~${((catalog!.incomeRecurringEst / income) * 100).toFixed(0)}% en subcategorías que también ingresaron el mes anterior (proxy de recurrencia).`
        : " Clasificación ingresos recurrentes vs únicos fina requiere etiquetado explícito en movimientos."
    strategicInsights.push({
      id: "drivers",
      title: "Drivers del mes",
      body: expGrowingFaster && expenseMomPct != null && incomeMomPct != null
        ? `El gasto operativo aceleró más que los ingresos (gasto ${expenseMomPct.toFixed(1)}% vs ingresos ${incomeMomPct.toFixed(1)}% vs mes anterior en la ventana móvil). Prioriza recortar variables o revisar categorías con mayor peso.`
        : `Ingresos ${incomeMomPct != null ? `${incomeMomPct >= 0 ? "+" : ""}${incomeMomPct.toFixed(1)}%` : "—"} y gasto operativo ${expenseMomPct != null ? `${expenseMomPct >= 0 ? "+" : ""}${expenseMomPct.toFixed(1)}%` : "—"} vs el mes previo de la serie.${incomeSplitNote}`,
      variant: expGrowingFaster ? "attention" : "neutral",
    })
  } else {
    strategicInsights.push({
      id: "drivers",
      title: "Drivers del mes",
      body: "Activa la conexión y asegura movimientos en el mes para comparar variaciones con la ventana de 12 meses del Resumen.",
      variant: "neutral",
    })
  }

  const priorNetMargin =
    last && prev && prev.ingresos > 0.5 ? (prev.flujo / prev.ingresos) * 100 : null
  const netMarginDelta = priorNetMargin != null ? netMarginPct - priorNetMargin : null
  strategicInsights.push({
    id: "margins",
    title: "Márgenes",
    body:
      netMarginDelta != null
        ? `Margen neto (flujo/ingresos) ${netMarginPct.toFixed(1)}%, ${netMarginDelta >= 0 ? "mejora" : "deterioro"} de ${Math.abs(netMarginDelta).toFixed(1)} pp vs el punto anterior de la serie. Margen operativo aprox. ${operatingMarginPct.toFixed(1)}% (ingresos − gasto KPI / ingresos).`
        : `Margen neto ${netMarginPct.toFixed(1)}%. Margen operativo aprox. ${operatingMarginPct.toFixed(1)}%.`,
    variant: netMarginDelta != null && netMarginDelta < -2 ? "attention" : netMarginDelta != null && netMarginDelta > 1 ? "positive" : "neutral",
  })

  const fixedShare = structural > 0.5 ? Math.min(1, Math.max(0, 0.55)) : 0.5
  const variableShare = 1 - fixedShare
  const pressureBody = (() => {
    if (useCatalogExpense && catalog) {
      const b = catalog.expenseByExpenseType
      const t = catTotal
      const pct = (x: number) => (t > 0.5 ? (x / t) * 100 : 0)
      const unmatchedPct = pct(b.sin_catalogo)
      const unmatchedNote =
        unmatchedPct >= 20
          ? ` Atención: ${unmatchedPct.toFixed(0)}% del gasto quedó sin match de catálogo; conviene normalizar subcategorías o completar catálogo para lectura más confiable.`
          : ""
      return `Catálogo (gasto operativo analizado): fijo ${(b.fijo / 1000).toFixed(0)}k (${pct(b.fijo).toFixed(0)}%), variable ${(b.variable / 1000).toFixed(0)}k (${pct(b.variable).toFixed(0)}%), módulo finanzas ${(b.modulo_finanzas / 1000).toFixed(0)}k, sin fila de catálogo ${(b.sin_catalogo / 1000).toFixed(0)}k. Gasto operativo KPI ${(opex / 1000).toFixed(0)}k; brecha sin explicar entre KPI y mapa: ${(Math.abs(c.unexplainedKpiStructural) / 1000).toFixed(1)}k.`
        + unmatchedNote
    }
    return `Gasto operativo KPI ${(opex / 1000).toFixed(0)}k COP; mapa operativo ${(structural / 1000).toFixed(0)}k. Reparto aprox. mapa: ~${Math.round(fixedShare * 100)}% comprometido / ~${Math.round(variableShare * 100)}% variable (estimación sobre total mapa). Brecha sin explicar: ${(Math.abs(c.unexplainedKpiStructural) / 1000).toFixed(1)}k.`
  })()
  strategicInsights.push({
    id: "pressure",
    title: "Presión estructural",
    body: pressureBody,
    variant: Math.abs(c.unexplainedKpiStructural) > 50_000 ? "attention" : "neutral",
  })

  const expenseDenom = expenseTotal > 0.5 ? expenseTotal : 1
  let expenseBreakdown: PlCfoBreakdownRow[]
  if (useCatalogExpense && catalog) {
    const d = catTotal > 0.5 ? catTotal : 1
    const impactRows = Object.entries(catalog.expenseByImpact)
      .map(([label, amount]) => ({
        label,
        amount,
        pctOfTotal: (amount / d) * 100,
      }))
      .filter((r) => r.amount > 0.5)
      .sort((a, b) => b.amount - a.amount)
    const tail: PlCfoBreakdownRow[] = []
    if (catalog.expenseByExpenseType.sin_catalogo > 0.5) {
      tail.push({
        label: "Sin fila en catálogo / sin subcategoría",
        amount: catalog.expenseByExpenseType.sin_catalogo,
        pctOfTotal: (catalog.expenseByExpenseType.sin_catalogo / d) * 100,
      })
    }
    expenseBreakdown = [...impactRows, ...tail]
  } else {
    expenseBreakdown = [
      { label: "Operativo (KPI)", amount: opex, pctOfTotal: (opex / expenseDenom) * 100 },
      { label: "Fuera de KPI", amount: outside, pctOfTotal: (outside / expenseDenom) * 100 },
      { label: "Módulo financiero (mapa)", amount: modulo, pctOfTotal: (modulo / expenseDenom) * 100 },
    ].filter((r) => r.amount > 0.5 || r.pctOfTotal > 0.5)
  }

  let incomeBreakdown: PlCfoBreakdownRow[]
  if (useCatalogIncomeSplit && catalog && income > 0.5) {
    const d = income
    incomeBreakdown = [
      {
        label: "Recurrente (est., mismo subcat. con ingreso mes previo)",
        amount: catalog.incomeRecurringEst,
        pctOfTotal: (catalog.incomeRecurringEst / d) * 100,
      },
      {
        label: "Único u ocasional (est.)",
        amount: catalog.incomeUniqueEst,
        pctOfTotal: (catalog.incomeUniqueEst / d) * 100,
      },
    ].filter((r) => r.amount > 0.5)
  } else {
    incomeBreakdown = [
      {
        label: "Ingresos del periodo",
        amount: income,
        pctOfTotal: 100,
      },
    ]
  }

  const topExpenseCategories: PlCfoBreakdownRow[] | undefined =
    useCatalogExpense && catalog?.topExpenseCategories?.length
      ? catalog.topExpenseCategories.map((r) => ({
          label: r.label,
          amount: r.amount,
          pctOfTotal: r.pct,
        }))
      : undefined

  const actions: PlCfoAction[] = []
  if (Math.abs(c.unexplainedKpiStructural) >= 1) {
    const k = Math.abs(c.unexplainedKpiStructural) / 1000
    actions.push({
      id: "gap",
      title: "Cerrar brecha KPI ↔ mapa",
      href: "/finanzas/pl#pl-puentes-card",
      priority: "alta",
      impactLabel: `~$${k.toFixed(0)}k en conciliación`,
    })
  }
  if (expenseMomPct != null && expenseMomPct > 5 && incomeMomPct != null && expenseMomPct > incomeMomPct) {
    actions.push({
      id: "variable",
      title: "Recortar gasto variable de alto peso",
      href: "/finanzas/categories",
      priority: "alta",
      impactLabel: `Gasto op. +${expenseMomPct.toFixed(0)}% vs mes previo`,
    })
  }
  if (Math.abs(c.gapKpiVsStructuralUi) >= 50_000) {
    actions.push({
      id: "categories",
      title: "Revisar categorías vs KPI",
      href: "/finanzas/categories",
      priority: "media",
      impactLabel: "Alinear mapa operativo",
    })
  }
  if (useCatalogExpense && catalog) {
    const unmatchedPct = catTotal > 0.5 ? (catalog.unmatchedExpenseCop / catTotal) * 100 : 0
    if (unmatchedPct >= 20) {
      actions.push({
        id: "catalog",
        title: "Completar mapeo de subcategorías",
        href: "/finanzas/categories",
        priority: "alta",
        impactLabel: `${unmatchedPct.toFixed(0)}% sin catálogo`,
      })
    }
  }
  if (actions.length < 3) {
    actions.push({
      id: "overview",
      title: "Ver tendencia 12 meses",
      href: "/finanzas/overview",
      priority: "media",
      impactLabel: "Contexto de rentabilidad",
    })
  }

  const trendSix = ry ? ry.slice(-6) : []

  return {
    strategicInsights: strategicInsights.slice(0, 3),
    metrics: {
      income,
      expenseTotal,
      expenseOperativoKpi: opex,
      net,
      netMarginPct,
      operatingMarginPct,
      incomeMomPct,
      expenseMomPct,
      netMomPct,
      savingsRatePct,
      runwayMonths,
    },
    healthScore,
    healthLabel,
    incomeBreakdown,
    expenseBreakdown,
    topExpenseCategories,
    actions: actions.slice(0, 4),
    trendSix,
  }
}
