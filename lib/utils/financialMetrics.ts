/**
 * Utilidades de cálculo para métricas financieras
 * CRÍTICO: Estos valores NUNCA se recalculan si vienen del engine.
 * Solo transformación y presentación.
 */

export interface MetricaEstructural {
  fixedPct: number
  variablePct: number
  fixedFormatted: string
  variableFormatted: string
  totalFormatted: string
  fixedCount: number
  variableCount: number
}

export interface AnomaliasOperacionales {
  overBudget: number
  highDelta: number
  lowUsage: number
  zeroGasto: number
}

export interface OperationalCategory {
  name: string
  type: "fixed" | "variable"
  total: number
  previousTotal?: number
  delta?: number
  budget?: number
  budgetUsedPercent?: number
}

/**
 * Calcula métricas estructurales (fijos vs variables)
 * 
 * IMPORTANTE: 
 * - totalStructural viene del engine y es la VERDAD
 * - No recalcular a partir de sumas
 * - Solo presentar
 */
export function calcularMetricasEstructurales(
  totalStructural: number,
  totalFixed: number,
  totalVariable: number,
  fixedCount: number,
  variableCount: number
): MetricaEstructural {
  const absStructural = Math.abs(totalStructural)
  const absFixed = Math.abs(totalFixed)
  const absVariable = Math.abs(totalVariable)

  const fixedPct = absStructural > 0 ? Math.round((absFixed / absStructural) * 100) : 0
  const variablePct = 100 - fixedPct

  return {
    fixedPct,
    variablePct,
    fixedFormatted: formatMillones(totalFixed),
    variableFormatted: formatMillones(totalVariable),
    totalFormatted: formatMoneda(absStructural),
    fixedCount,
    variableCount,
  }
}

/**
 * Calcula impacto de una categoría en el total estructural
 * 
 * IMPORTANTE:
 * - totalStructural debe ser el valor directo del API
 * - No recalcular de ninguna forma
 */
export function calcularImpacto(
  totalCategoria: number,
  totalStructural: number
): number {
  const absTotal = Math.abs(totalCategoria)
  const absStructural = Math.abs(totalStructural)

  if (absStructural === 0) return 0
  return Math.round((absTotal / absStructural) * 100)
}

/**
 * Calcula diferencia entre ejecución y presupuesto
 */
export function calcularEjecucion(
  total: number,
  budget: number
): { diff: number; tipo: "sobre" | "sub" | "neutral" } {
  const absTotal = Math.abs(total)
  const diff = absTotal - budget

  if (diff > 0) return { diff, tipo: "sobre" }
  if (diff < 0) return { diff: Math.abs(diff), tipo: "sub" }
  return { diff: 0, tipo: "neutral" }
}

/**
 * Analiza anomalías operacionales en categorías
 */
export function detectarAnomalias(categories: OperationalCategory[]): AnomaliasOperacionales {
  return {
    overBudget: categories.filter((c) => (c.budgetUsedPercent ?? 0) >= 100).length,
    highDelta: categories.filter(
      (c) => Math.abs(c.delta ?? 0) > 0.25 * Math.abs(c.previousTotal || 0)
    ).length,
    lowUsage: categories.filter(
      (c) => (c.budgetUsedPercent ?? 0) > 0 && (c.budgetUsedPercent ?? 0) < 10
    ).length,
    zeroGasto: categories.filter((c) => c.total === 0 && c.previousTotal !== 0).length,
  }
}

/**
 * CRÍTICO: Formatea número como millones preservando signo
 * 
 * ✅ CORRECCIÓN APLICADA:
 * -2,500,000 → -2.5M
 * 2,500,000  → +2.5M
 * -500,000   → -0.5M
 */
export function formatMillones(valor: number): string {
  const millones = valor / 1_000_000
  const sign = millones < 0 ? "-" : "+"
  return `${sign}${Math.abs(millones).toFixed(1)}M`
}

/**
 * Formatea moneda colombiana limpia (sin decimales)
 */
export function formatMoneda(valor: number): string {
  return Math.abs(valor).toLocaleString("es-CO", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/**
 * Determina clase CSS para estado visual
 */
export function getStatusColor(
  budgetUsedPercent: number
): "red" | "yellow" | "green" {
  if (budgetUsedPercent >= 100) return "red"
  if (budgetUsedPercent >= 85) return "yellow"
  return "green"
}
