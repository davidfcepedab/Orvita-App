import type { FinanceTransaction } from "@/lib/finanzas/types"
import { expenseAmount, incomeAmount } from "@/lib/finanzas/calculations/txMath"
import { filterMonth } from "@/lib/finanzas/deriveFromTransactions"
import { excludeReconciliationFromOperativoAnalysis } from "@/lib/finanzas/reconciliationTxFilter"

export type FlowEvolutionRow = {
  month: string
  ingresos: number
  gasto_operativo: number
  flujo: number
}

export function addMonthsYm(ym: string, delta: number): string {
  const [y0, m0] = ym.split("-").map(Number)
  if (!y0 || !m0 || m0 < 1 || m0 > 12) return ym
  const d = new Date(y0, m0 - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

export function eachMonthInclusive(startYm: string, endYm: string): string[] {
  const [sy, sm] = startYm.split("-").map(Number)
  const [ey, em] = endYm.split("-").map(Number)
  if (!sy || !sm || !ey || !em) return []
  const out: string[] = []
  let y = sy
  let m = sm
  while (y < ey || (y === ey && m <= em)) {
    out.push(`${y}-${String(m).padStart(2, "0")}`)
    m += 1
    if (m > 12) {
      m = 1
      y += 1
    }
  }
  return out
}

/** Primer mes del año móvil de `n` meses terminando en `endYm` (inclusive). */
export function rollingWindowStartYm(endYm: string, n: number): string {
  return addMonthsYm(endYm, -(n - 1))
}

/**
 * Meses del trimestre civil que contiene `endYm`, desde inicio de trimestre hasta `endYm` (parcial a inicio de trimestre).
 * @deprecated Para gráficos de «trimestre» suele preferirse {@link calendarQuarterFullMonths}.
 */
export function calendarQuarterMonthsThrough(endYm: string): string[] {
  const [y, mo] = endYm.split("-").map(Number)
  if (!y || !mo || mo < 1 || mo > 12) return []
  const qStartM = Math.floor((mo - 1) / 3) * 3 + 1
  const start = `${y}-${String(qStartM).padStart(2, "0")}`
  return eachMonthInclusive(start, endYm)
}

/** Los 3 meses del trimestre civil que contiene el mes activo (Ene–Mar, Abr–Jun, Jul–Sep, Oct–Dic). Para evolución alineada al mes elegido, usar {@link rollingQuarterMonths}. */
export function calendarQuarterFullMonths(anchorYm: string): string[] {
  const [y, mo] = anchorYm.split("-").map(Number)
  if (!y || !mo || mo < 1 || mo > 12) return []
  const qStartM = Math.floor((mo - 1) / 3) * 3 + 1
  const start = `${y}-${String(qStartM).padStart(2, "0")}`
  const end = addMonthsYm(start, 2)
  return eachMonthInclusive(start, end)
}

/** 3 meses terminando en `endYm` (inclusive), ventana móvil (misma lógica que semestre y año móvil). */
export function rollingQuarterMonths(endYm: string): string[] {
  const start = rollingWindowStartYm(endYm, 3)
  return eachMonthInclusive(start, endYm)
}

/** 6 meses terminando en `endYm` (inclusive), ventana móvil. */
export function rollingSemesterMonths(endYm: string): string[] {
  const start = rollingWindowStartYm(endYm, 6)
  return eachMonthInclusive(start, endYm)
}

/** 12 meses terminando en `endYm` (inclusive). */
export function rollingYearMonths(endYm: string): string[] {
  const start = rollingWindowStartYm(endYm, 12)
  return eachMonthInclusive(start, endYm)
}

/** Etiqueta compacta para series mensuales (gráfico / tabla): año 2 dígitos | mes 2 dígitos */
function labelMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) return ym
  return `${String(y).slice(-2)}|${String(m).padStart(2, "0")}`
}

export function buildMonthlyFlowBuckets(
  months: string[],
  rows: FinanceTransaction[],
  expenseFn: (tx: FinanceTransaction) => number = expenseAmount,
): FlowEvolutionRow[] {
  const rowsOp = excludeReconciliationFromOperativoAnalysis(rows)
  return months.map((mm) => {
    const inM = filterMonth(rowsOp, mm)
    const ing = inM.reduce((a, t) => a + incomeAmount(t), 0)
    const exp = inM.reduce((a, t) => a + expenseFn(t), 0)
    return {
      month: labelMonth(mm),
      ingresos: ing,
      gasto_operativo: exp,
      flujo: ing - exp,
    }
  })
}

/**
 * Si un mes no tiene movimientos en `rows` pero sí totales en snapshots, rellena la serie
 * (misma lógica que el fallback de KPI en overview).
 */
export function fillMonthlyFlowFromSnapshots(
  monthsYm: string[],
  buckets: FlowEvolutionRow[],
  snapByYm: ReadonlyMap<string, { income: number; expense: number }>,
  options?: { fillExpenseFromSnapshots?: boolean },
): FlowEvolutionRow[] {
  const fillExpense = options?.fillExpenseFromSnapshots !== false
  return buckets.map((row, i) => {
    const ym = monthsYm[i]
    if (!ym) return row
    const hasTx = row.ingresos > 1e-6 || row.gasto_operativo > 1e-6
    if (hasTx) return row
    const s = snapByYm.get(ym)
    if (!s) return row
    const ing = s.income
    const exp = fillExpense ? s.expense : 0
    if (ing < 1e-6 && exp < 1e-6) return row
    return {
      ...row,
      ingresos: ing,
      gasto_operativo: exp,
      flujo: ing - exp,
    }
  })
}
