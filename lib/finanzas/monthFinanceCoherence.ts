import { buildCanonicalPlLayers, type CanonicalPlLayer } from "@/lib/finanzas/canonicalMonthPl"
import { createOperativoExpenseFn } from "@/lib/finanzas/operativoExpense"
import { computeStructuralOperativoFromRows } from "@/lib/finanzas/structuralOperativoTotals"
import { expenseAmount, incomeAmount, netCashFlow } from "@/lib/finanzas/calculations/txMath"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import type { FinanceSubcategoryCatalogEntry } from "@/lib/finanzas/subcategoryCatalog"

/**
 * Núcleo contable desde TX + catálogo (sin mapa estructural ni puentes).
 */
export type MonthFinanceCoherenceCore = {
  incomeTotal: number
  expenseTotalAll: number
  netCashFlow: number
  expenseOperativoKpi: number
  expenseOutsideOperativoKpi: number
  checkResidual: number
}

export type MonthBridgeEntryLite = {
  id: string
  bridge_kind: "kpi_structural" | "other"
  amount_cop: number
  label: string
}

/**
 * Coherencia ampliada: núcleo + mapa operativo (misma regla que Categorías) + puentes + capas P&L.
 */
export type MonthFinanceCoherence = MonthFinanceCoherenceCore & {
  /** Flujo neto (ingresos − gastos) del mes calendario anterior; lectura de continuidad (no es saldo bancario). */
  previousMonthNetCashFlow: number
  expenseStructuralOperativoUi: number
  moduloFinancieroStructural: number
  gapKpiVsStructuralUi: number
  bridgeSumKpiStructural: number
  unexplainedKpiStructural: number
  bridgeEntries: MonthBridgeEntryLite[]
  plLayers: CanonicalPlLayer[]
  hintEmaAbsGap: number | null
}

export function computeMonthFinanceCoherence(
  monthRows: FinanceTransaction[],
  catalog: FinanceSubcategoryCatalogEntry[],
): MonthFinanceCoherenceCore {
  const incomeTotal = monthRows.reduce((a, t) => a + incomeAmount(t), 0)
  const expenseTotalAll = monthRows.reduce((a, t) => a + expenseAmount(t), 0)
  const net = netCashFlow(monthRows)

  const opexFn = createOperativoExpenseFn(catalog)
  let expenseOperativoKpi = 0
  for (const t of monthRows) {
    expenseOperativoKpi += opexFn(t)
  }
  const expenseOutsideOperativoKpi = Math.max(0, expenseTotalAll - expenseOperativoKpi)

  const impliedNetFromKpiBreakdown = incomeTotal - expenseOperativoKpi - expenseOutsideOperativoKpi
  const checkResidual = Math.abs(net - impliedNetFromKpiBreakdown)

  return {
    incomeTotal,
    expenseTotalAll,
    netCashFlow: net,
    expenseOperativoKpi,
    expenseOutsideOperativoKpi,
    checkResidual,
  }
}

export function buildCompleteMonthFinanceCoherence(
  monthRows: FinanceTransaction[],
  previousRows: FinanceTransaction[],
  catalog: FinanceSubcategoryCatalogEntry[],
  bridgeEntries: MonthBridgeEntryLite[],
  hintEmaAbsGap: number | null,
): MonthFinanceCoherence {
  const core = computeMonthFinanceCoherence(monthRows, catalog)
  const previousMonthNetCashFlow = netCashFlow(previousRows)
  const { totals } = computeStructuralOperativoFromRows(monthRows, previousRows, catalog)

  const expenseStructuralOperativoUi = totals.totalStructuralUi
  const moduloFinancieroStructural = totals.moduloFinancieroAbs
  const gapKpiVsStructuralUi = core.expenseOperativoKpi - expenseStructuralOperativoUi

  const bridgeSumKpiStructural = bridgeEntries
    .filter((e) => e.bridge_kind === "kpi_structural")
    .reduce((a, e) => a + Number(e.amount_cop), 0)

  const unexplainedKpiStructural = gapKpiVsStructuralUi - bridgeSumKpiStructural

  const plLayers = buildCanonicalPlLayers(core, {
    previousMonthNetCashFlow,
    expenseStructuralOperativoUi,
    moduloFinancieroStructural,
    gapKpiVsStructuralUi,
    bridgeSumKpiStructural,
    unexplainedKpiStructural,
    hintEmaAbsGap,
  })

  return {
    ...core,
    previousMonthNetCashFlow,
    expenseStructuralOperativoUi,
    moduloFinancieroStructural,
    gapKpiVsStructuralUi,
    bridgeSumKpiStructural,
    unexplainedKpiStructural,
    bridgeEntries,
    plLayers,
    hintEmaAbsGap,
  }
}
