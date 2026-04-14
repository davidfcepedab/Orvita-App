import type { MonthFinanceCoherenceCore } from "@/lib/finanzas/monthFinanceCoherence"

/** Capas tipo P&L para lectura única en UI (orden fijo, indentación visual). */
export type CanonicalPlLayer = {
  id: string
  label: string
  amount: number
  indent: 0 | 1 | 2
  /** Texto corto opcional bajo la fila */
  hint?: string
}

export function buildCanonicalPlLayers(
  c: MonthFinanceCoherenceCore,
  opts: {
    expenseStructuralOperativoUi: number
    moduloFinancieroStructural: number
    gapKpiVsStructuralUi: number
    bridgeSumKpiStructural: number
    unexplainedKpiStructural: number
    hintEmaAbsGap: number | null
  },
): CanonicalPlLayer[] {
  const layers: CanonicalPlLayer[] = [
    {
      id: "income",
      label: "Ingresos del mes",
      amount: c.incomeTotal,
      indent: 0,
      hint: "Fuente: movimientos del periodo (misma base que Movimientos).",
    },
    {
      id: "expense_all",
      label: "− Gasto total contable",
      amount: -c.expenseTotalAll,
      indent: 0,
    },
    {
      id: "net",
      label: "= Flujo neto del mes",
      amount: c.netCashFlow,
      indent: 0,
      hint: "Ingresos − todos los egresos; alinea con «Total movimientos» / balance del periodo.",
    },
    {
      id: "opex_kpi",
      label: "Gasto operativo (KPI catálogo)",
      amount: c.expenseOperativoKpi,
      indent: 1,
      hint: "createOperativoExpenseFn: impacto operativo; excluye módulo finanzas / no operativo según catálogo.",
    },
    {
      id: "outside_kpi",
      label: "Gasto fuera de KPI operativo",
      amount: c.expenseOutsideOperativoKpi,
      indent: 1,
    },
    {
      id: "structural_ui",
      label: "Total operativo mapa (fijo + variable, sin módulo financiero)",
      amount: opts.expenseStructuralOperativoUi,
      indent: 1,
      hint: "Misma lógica que la vista Categorías › tarjetas superiores.",
    },
    {
      id: "modulo_structural",
      label: "Módulo financiero (mapa estructural)",
      amount: opts.moduloFinancieroStructural,
      indent: 2,
      hint: "Bloque aparte en el mapa; no entra en «Total operativo» de la UI de categorías.",
    },
    {
      id: "gap_kpi_struct",
      label: "Brecha KPI catálogo − mapa operativo",
      amount: opts.gapKpiVsStructuralUi,
      indent: 2,
      hint: "No tiene por qué ser 0: el KPI mira impacto por movimiento; el mapa agrupa por categoría fijo/variable.",
    },
    {
      id: "bridges",
      label: "Puentes registrados (explicación explícita)",
      amount: opts.bridgeSumKpiStructural,
      indent: 2,
    },
    {
      id: "unexplained",
      label: "Brecha sin explicar (objetivo → 0)",
      amount: opts.unexplainedKpiStructural,
      indent: 2,
      hint: "Usa puentes abajo; el aviso superior resume la referencia histórica (EMA).",
    },
  ]

  return layers
}
