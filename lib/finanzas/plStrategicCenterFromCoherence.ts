import type { MonthFinanceCoherence } from "@/lib/finanzas/monthFinanceCoherence"
import type { CanonicalPlLayer } from "@/lib/finanzas/canonicalMonthPl"
import {
  FinancialImpact,
  PlSemanticTone,
  type PlRuntimeBreakdownSlice,
  type PlRuntimeFlowMonthPoint,
  type PlRuntimePressureCardData,
  type PlStrategicCenterRuntimeData,
  type PlRuntimeActionResolved,
  type PlRuntimeInsightData,
} from "@/src/types/finanzas/pl-strategic-center"

function layerAmount(layers: CanonicalPlLayer[], id: string): number {
  return layers.find((L) => L.id === id)?.amount ?? 0
}

function netMonthOverMom(c: MonthFinanceCoherence): { delta: number; pct: number | null } {
  const current = c.netCashFlow
  const prior = c.previousMonthNetCashFlow
  const delta = current - prior
  if (!Number.isFinite(prior) || Math.abs(prior) < 1) return { delta, pct: null }
  return { delta, pct: (delta / Math.abs(prior)) * 100 }
}

/**
 * Construye datos runtime para el centro P&L estratégico desde coherencia del mes (misma fuente que el P&L clásico).
 * Desglose por `financial_impact` del catálogo requeriría agregación adicional; aquí se aproxima con capas canónicas.
 */
export function buildPlStrategicCenterRuntimeFromCoherence(
  monthYm: string,
  monthLabel: string,
  c: MonthFinanceCoherence,
): PlStrategicCenterRuntimeData {
  const layers = c.plLayers
  const mom = netMonthOverMom(c)

  const opex = Math.abs(layerAmount(layers, "opex_kpi"))
  const outside = Math.abs(layerAmount(layers, "outside_kpi"))
  const modulo = Math.abs(layerAmount(layers, "modulo_structural"))
  const unexplainedAbs = Math.abs(layerAmount(layers, "unexplained"))

  const pressures: PlRuntimePressureCardData[] = [
    {
      impact: FinancialImpact.Operativo,
      label: "Gasto operativo (KPI)",
      amountCop: opex,
      momPct: null,
      sparkline: [opex, opex * 0.98, opex * 1.02, opex],
      tone: PlSemanticTone.Attention,
    },
    {
      impact: FinancialImpact.Otros,
      label: "Fuera de KPI operativo",
      amountCop: outside,
      momPct: null,
      sparkline: [outside, outside, outside],
      tone: PlSemanticTone.Neutral,
    },
    {
      impact: FinancialImpact.FinancieroEstructural,
      label: "Módulo financiero (mapa)",
      amountCop: modulo,
      momPct: null,
      sparkline: [modulo, modulo * 0.99, modulo],
      tone: PlSemanticTone.Neutral,
    },
    {
      impact: FinancialImpact.Ajuste,
      label: "Brecha sin explicar",
      amountCop: unexplainedAbs,
      momPct: unexplainedAbs > 1 ? 5 : null,
      sparkline: [unexplainedAbs, unexplainedAbs * 1.1, unexplainedAbs],
      tone: unexplainedAbs > 50000 ? PlSemanticTone.Pressure : PlSemanticTone.Positive,
    },
  ]

  const income = layerAmount(layers, "income")
  const gastoOp = layerAmount(layers, "opex_kpi")
  const flujo = c.netCashFlow

  const labelShort = `${monthLabel.slice(0, 3)} '${monthYm.slice(2, 4)}`
  const singlePoint: PlRuntimeFlowMonthPoint = {
    monthYm,
    label: labelShort,
    ingresos: income,
    gasto_operativo: gastoOp,
    flujo,
  }
  /** Duplicado mínimo para que Recharts pinte líneas; sustituir por serie overview cuando exista. */
  const incomeExpenseSeries: PlRuntimeFlowMonthPoint[] = [singlePoint, { ...singlePoint, label: `${labelShort} ·` }]

  const breakdownByImpact: PlRuntimeBreakdownSlice[] = [
    { impact: FinancialImpact.Operativo, label: "Operativo", valueCop: opex },
    { impact: FinancialImpact.Otros, label: "Fuera KPI", valueCop: outside },
    { impact: FinancialImpact.FinancieroEstructural, label: "Módulo fin.", valueCop: modulo },
    { impact: FinancialImpact.Ajuste, label: "Brecha neta", valueCop: unexplainedAbs },
  ]

  const structuralUi = Math.abs(layerAmount(layers, "structural_ui"))
  const fixedVsVariable = {
    fijoCop: structuralUi * 0.55,
    variableCop: structuralUi * 0.45,
  }

  const insightBanner: PlRuntimeInsightData | undefined =
    Math.abs(c.unexplainedKpiStructural) >= 1 || Math.abs(c.gapKpiVsStructuralUi) >= 1
      ? {
          primaryCop: Math.abs(c.unexplainedKpiStructural),
          secondaryCop: Math.abs(c.gapKpiVsStructuralUi),
          visible: true,
        }
      : undefined

  const actions: PlRuntimeActionResolved[] = []
  if (Math.abs(c.unexplainedKpiStructural) >= 1) {
    actions.push({
      id: "close-gap",
      title: "Revisar conciliación KPI ↔ mapa",
      href: "/finanzas/pl#pl-puentes-card",
    })
  }
  actions.push(
    { id: "categories", title: "Abrir categorías y mapa", href: "/finanzas/categories" },
    { id: "movements", title: "Ver movimientos del mes", href: "/finanzas/transactions" },
    { id: "overview", title: "Resumen y tendencia", href: "/finanzas/overview" },
  )

  return {
    meta: { monthYm, monthLabel },
    hero: {
      netCop: c.netCashFlow,
      momDeltaCop: mom.delta,
      momDeltaPct: mom.pct,
    },
    pressures,
    insightBanner,
    incomeExpenseSeries,
    breakdownByImpact,
    fixedVsVariable,
    trendFlujo: [
      { label: monthLabel.slice(0, 3), flujo },
      { label: "→", flujo },
    ],
    projection: undefined,
    cashMonthNetCop: c.netCashFlow,
    actions: actions.slice(0, 4),
  }
}

/** Fila mensual alineada a `flowEvolution` del overview (ingresos / gasto op. / flujo). */
export type PlOverviewMonthlyRow = {
  month: string
  ingresos: number
  gasto_operativo: number
  flujo: number
}

/**
 * Sustituye series del runtime con la ventana del Resumen (p. ej. año móvil) cuando hay ≥2 meses.
 */
export function mergePlRuntimeWithOverviewFlow(
  base: PlStrategicCenterRuntimeData,
  rows: readonly PlOverviewMonthlyRow[] | null | undefined,
): PlStrategicCenterRuntimeData {
  if (!rows?.length || rows.length < 2) return base
  const incomeExpenseSeries: PlRuntimeFlowMonthPoint[] = rows.map((r, i) => ({
    monthYm: `overview-${i}`,
    label: r.month,
    ingresos: r.ingresos,
    gasto_operativo: r.gasto_operativo,
    flujo: r.flujo,
  }))
  const trendFlujo = rows.map((r) => ({
    label: r.month.length > 4 ? r.month.slice(0, 4) : r.month,
    flujo: r.flujo,
  }))
  return { ...base, incomeExpenseSeries, trendFlujo }
}
