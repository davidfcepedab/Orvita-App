import type { FinanceTransaction } from "@/lib/finanzas/types"
import { expenseAmount, incomeAmount, netCashFlow } from "@/lib/finanzas/calculations/txMath"
import { monthBounds } from "@/lib/finanzas/monthRange"

export function shiftMonthYm(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(m)) return ym
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

/** `count` meses terminando en `anchor` (inclusive), en orden cronológico. */
export function monthsEndingAt(anchor: string, count: number): string[] {
  const out: string[] = []
  for (let i = count - 1; i >= 0; i -= 1) {
    out.push(shiftMonthYm(anchor, -i))
  }
  return out
}

export function ymFromTxDate(date: string): string {
  return date.length >= 7 ? date.slice(0, 7) : ""
}

function linearRegression(xs: number[], ys: number[]): { a: number; b: number } {
  const n = xs.length
  if (n < 2 || ys.length !== n) return { a: ys[0] ?? 0, b: 0 }
  let sx = 0
  let sy = 0
  for (let i = 0; i < n; i += 1) {
    sx += xs[i]!
    sy += ys[i]!
  }
  const mx = sx / n
  const my = sy / n
  let num = 0
  let den = 0
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i]! - mx
    num += dx * (ys[i]! - my)
    den += dx * dx
  }
  const b = den > 1e-12 ? num / den : 0
  const a = my - b * mx
  return { a, b }
}

/** Tres puntos proyectados tras la última observación (índices n, n+1, n+2). */
export function forecastNext3Linear(historyOldestToNewest: number[]): [number, number, number] {
  const h = historyOldestToNewest.filter((v) => Number.isFinite(v))
  const n = h.length
  if (n === 0) return [0, 0, 0]
  if (n === 1) return [h[0]!, h[0]!, h[0]!]
  const xs = h.map((_, i) => i)
  const { a, b } = linearRegression(xs, h)
  const base = n
  return [a + b * base, a + b * (base + 1), a + b * (base + 2)]
}

export type CategoryGrowthRow = {
  category: string
  expenseCurrent: number
  expensePrev: number
  expenseYoy: number
  momPct: number | null
  yoyPct: number | null
  severity: "ok" | "watch" | "alert"
  forecastNext3: number[]
}

export type AntExpenseRow = {
  category: string
  subcategory: string
  key: string
  total: number
  sharePct: number
  txCount: number
  avgTicket: number
  momPct: number | null
  trendLabel: "up" | "flat" | "down"
}

export type DistributionSlice = {
  name: string
  value: number
  pct: number
}

export type NetForecastPoint = {
  month: string
  net: number
  isProjected?: boolean
}

export type StrategicInsight = {
  id: string
  impact: "alto" | "medio" | "bajo"
  title: string
  body: string
  savingsMonthly?: number
  savingsAnnual?: number
  ctaHref?: string
  ctaLabel?: string
  /** Enriquecido en cliente: vínculo con hábitos/agenda (opcional). */
  rootCauseOperational?: string
  agendaAction?: string
  energyOrTimeNote?: string
}

export type CategoryAnalyticsParams = {
  momAlertPct: number
  momWatchPct: number
  antShareMin: number
  antTicketMax: number
  antMinTx: number
  historyMonths: number
  forecastHorizon: number
  /** true: KPIs y categorías excluyen módulo financiero (solo vista operativa). */
  scopeOperational?: boolean
}

const DEFAULT_PARAMS: CategoryAnalyticsParams = {
  momAlertPct: 15,
  momWatchPct: 8,
  antShareMin: 0.035,
  antTicketMax: 120_000,
  antMinTx: 3,
  historyMonths: 18,
  forecastHorizon: 6,
}

function expenseTotal(monthTxs: FinanceTransaction[]): number {
  let s = 0
  for (const tx of monthTxs) s += expenseAmount(tx)
  return s
}

function incomeTotal(monthTxs: FinanceTransaction[]): number {
  let s = 0
  for (const tx of monthTxs) s += incomeAmount(tx)
  return s
}

function expenseByCategory(monthTxs: FinanceTransaction[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const tx of monthTxs) {
    const e = expenseAmount(tx)
    if (e <= 0) continue
    const c = tx.category?.trim() || "Sin categoría"
    m.set(c, (m.get(c) ?? 0) + e)
  }
  return m
}

function incomeByCategory(monthTxs: FinanceTransaction[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const tx of monthTxs) {
    const inc = incomeAmount(tx)
    if (inc <= 0) continue
    const c = tx.category?.trim() || "Ingresos"
    m.set(c, (m.get(c) ?? 0) + inc)
  }
  return m
}

function bucketByMonth(txs: FinanceTransaction[]): Map<string, FinanceTransaction[]> {
  const m = new Map<string, FinanceTransaction[]>()
  for (const tx of txs) {
    const ym = ymFromTxDate(tx.date)
    if (!ym || ym.length !== 7) continue
    if (!m.has(ym)) m.set(ym, [])
    m.get(ym)!.push(tx)
  }
  return m
}

function pctChange(cur: number, prev: number): number | null {
  if (prev > 1e-6) return ((cur - prev) / prev) * 100
  if (cur > 1e-6) return 100
  return null
}

function severityForMom(momPct: number | null, alert: number, watch: number): CategoryGrowthRow["severity"] {
  if (momPct == null || !Number.isFinite(momPct)) return "ok"
  if (momPct >= alert) return "alert"
  if (momPct >= watch) return "watch"
  return "ok"
}

export type BuildCategoryAnalyticsInput = {
  txs: FinanceTransaction[]
  anchorMonth: string
  params?: Partial<CategoryAnalyticsParams>
  /** Marca el payload como análisis solo operativo (sin módulo finanzas). */
  scopeOperational?: boolean
}

export function buildCategoryAnalyticsPayload(input: BuildCategoryAnalyticsInput) {
  const p = { ...DEFAULT_PARAMS, ...input.params }
  const anchor = input.anchorMonth
  if (!monthBounds(anchor)) {
    return null
  }

  const months = monthsEndingAt(anchor, p.historyMonths)
  const byMonth = bucketByMonth(input.txs)

  const anchorTxs = byMonth.get(anchor) ?? []
  const prevYm = shiftMonthYm(anchor, -1)
  const yoyYm = shiftMonthYm(anchor, -12)
  const prevTxs = byMonth.get(prevYm) ?? []
  const yoyTxs = byMonth.get(yoyYm) ?? []

  const totalExpenseAnchor = expenseTotal(anchorTxs)
  const totalIncomeAnchor = incomeTotal(anchorTxs)
  const netAnchor = netCashFlow(anchorTxs)

  const expPrevTotal = expenseTotal(prevTxs)
  const vsPrevExpensePct = pctChange(totalExpenseAnchor, expPrevTotal)

  const last6 = months.slice(-6)
  let sum6 = 0
  let n6 = 0
  for (const ym of last6) {
    const t = byMonth.get(ym)
    if (!t) continue
    sum6 += expenseTotal(t)
    n6 += 1
  }
  const avg6Expense = n6 > 0 ? sum6 / n6 : 0
  const vsAvg6ExpensePct = avg6Expense > 1e-6 ? ((totalExpenseAnchor - avg6Expense) / avg6Expense) * 100 : null

  const curCat = expenseByCategory(anchorTxs)
  const prevCat = expenseByCategory(prevTxs)
  const yoyCat = expenseByCategory(yoyTxs)

  const fastGrowing: CategoryGrowthRow[] = []
  for (const [category, expenseCurrent] of curCat) {
    if (expenseCurrent < 1) continue
    const expensePrev = prevCat.get(category) ?? 0
    const expenseYoy = yoyCat.get(category) ?? 0
    const momPct = pctChange(expenseCurrent, expensePrev)
    const yoyPct = pctChange(expenseCurrent, expenseYoy)

    const hist: number[] = []
    const tail = months.slice(-6)
    for (const ym of tail) {
      const em = expenseByCategory(byMonth.get(ym) ?? [])
      hist.push(em.get(category) ?? 0)
    }
    const forecastNext3 = forecastNext3Linear(hist)

    fastGrowing.push({
      category,
      expenseCurrent,
      expensePrev,
      expenseYoy,
      momPct,
      yoyPct,
      severity: severityForMom(momPct, p.momAlertPct, p.momWatchPct),
      forecastNext3,
    })
  }

  fastGrowing.sort((a, b) => {
    const ma = a.momPct ?? -9999
    const mb = b.momPct ?? -9999
    if (mb !== ma) return mb - ma
    return b.expenseCurrent - a.expenseCurrent
  })

  /** Gastos hormiga: ticket medio bajo, varias transacciones, peso relevante. */
  type SubAcc = { total: number; count: number; category: string; sub: string }
  const subMap = new Map<string, SubAcc>()
  for (const tx of anchorTxs) {
    const e = expenseAmount(tx)
    if (e <= 0) continue
    const category = tx.category?.trim() || "Sin categoría"
    const sub = (tx.subcategory?.trim() || "General") as string
    const key = `${category}|||${sub}`
    const cur = subMap.get(key) ?? { total: 0, count: 0, category, sub }
    cur.total += e
    cur.count += 1
    subMap.set(key, cur)
  }

  const prevSubMap = new Map<string, SubAcc>()
  for (const tx of prevTxs) {
    const e = expenseAmount(tx)
    if (e <= 0) continue
    const category = tx.category?.trim() || "Sin categoría"
    const sub = (tx.subcategory?.trim() || "General") as string
    const key = `${category}|||${sub}`
    const cur = prevSubMap.get(key) ?? { total: 0, count: 0, category, sub }
    cur.total += e
    cur.count += 1
    prevSubMap.set(key, cur)
  }

  const antExpenses: AntExpenseRow[] = []
  for (const [key, acc] of subMap) {
    if (acc.count < p.antMinTx) continue
    const avgTicket = acc.total / acc.count
    if (avgTicket > p.antTicketMax) continue
    const sharePct = totalExpenseAnchor > 1e-6 ? acc.total / totalExpenseAnchor : 0
    if (sharePct < p.antShareMin) continue
    const prev = prevSubMap.get(key)
    const momPct = prev && prev.total > 1e-6 ? pctChange(acc.total, prev.total) : null
    let trendLabel: AntExpenseRow["trendLabel"] = "flat"
    if (momPct != null) {
      if (momPct > 5) trendLabel = "up"
      else if (momPct < -5) trendLabel = "down"
    }
    antExpenses.push({
      category: acc.category,
      subcategory: acc.sub,
      key,
      total: acc.total,
      sharePct: sharePct * 100,
      txCount: acc.count,
      avgTicket,
      momPct,
      trendLabel,
    })
  }
  antExpenses.sort((a, b) => b.total - a.total)

  const toPie = (m: Map<string, number>, total: number): DistributionSlice[] => {
    const rows: DistributionSlice[] = []
    for (const [name, value] of m) {
      if (value <= 0) continue
      rows.push({
        name,
        value,
        pct: total > 1e-6 ? (value / total) * 100 : 0,
      })
    }
    rows.sort((a, b) => b.value - a.value)
    return rows
  }

  const expensePie = toPie(curCat, totalExpenseAnchor)
  const incMap = incomeByCategory(anchorTxs)
  const incomePie = toPie(incMap, totalIncomeAnchor)

  const prevMonthExpenseByCategory = Object.fromEntries(prevCat)
  const avg6ByCat = new Map<string, number>()
  for (const ym of last6) {
    const em = expenseByCategory(byMonth.get(ym) ?? [])
    for (const [k, v] of em) {
      avg6ByCat.set(k, (avg6ByCat.get(k) ?? 0) + v)
    }
  }
  for (const [k, v] of avg6ByCat) {
    avg6ByCat.set(k, v / last6.length)
  }

  const netSeries: { month: string; net: number }[] = months.map((ym) => ({
    month: ym,
    net: netCashFlow(byMonth.get(ym) ?? []),
  }))

  let tailNet = netSeries.slice(-6).map((x) => x.net)
  if (tailNet.length === 1) tailNet = [tailNet[0]!, tailNet[0]!]
  if (tailNet.length === 0) tailNet = [netAnchor, netAnchor]
  const xs = tailNet.map((_, i) => i)
  const { a, b } = linearRegression(xs, tailNet)
  const lastX = tailNet.length - 1
  const netForecast: NetForecastPoint[] = netSeries.map((n) => ({ ...n, isProjected: false }))
  for (let h = 1; h <= p.forecastHorizon; h += 1) {
    const labelYm = shiftMonthYm(anchor, h)
    const xProj = lastX + h
    netForecast.push({
      month: `${labelYm} (proj.)`,
      net: a + b * xProj,
      isProjected: true,
    })
  }

  /** Escenarios simples sobre mes ancla. */
  let reduceFast = 0
  for (const row of fastGrowing) {
    if (row.severity === "alert" && row.momPct != null && row.momPct > 0) {
      reduceFast += row.expenseCurrent * (Math.min(row.momPct, 40) / 100) * 0.25
    }
  }
  const antSum = antExpenses.reduce((s, r) => s + r.total, 0)
  const ifTrimAntByHalf = antSum * 0.5

  const insights: StrategicInsight[] = []

  if (fastGrowing[0] && (fastGrowing[0].momPct ?? 0) >= p.momWatchPct) {
    const r = fastGrowing[0]
    const sev = r.severity === "alert" ? "alto" : "medio"
    insights.push({
      id: "growth-top",
      impact: sev,
      title: `Presión: «${r.category}» +${(r.momPct ?? 0).toFixed(0)}% MoM`,
      body: `Esta categoría acelera frente al mes anterior. Conviene revisar sustitutos, tope en Presupuestos o negociar recurrentes.`,
      savingsMonthly: r.expenseCurrent * 0.08,
      savingsAnnual: r.expenseCurrent * 0.08 * 12,
      ctaHref: `/finanzas/transactions?month=${encodeURIComponent(anchor)}&category=${encodeURIComponent(r.category)}&tipo=gasto`,
      ctaLabel: "Ver movimientos",
    })
  }

  if (antExpenses.length > 0) {
    const top = antExpenses[0]!
    insights.push({
      id: "ant-cluster",
      impact: antSum / Math.max(totalExpenseAnchor, 1) > 0.08 ? "alto" : "medio",
      title: "Gastos hormiga de alto impacto",
      body: `«${top.subcategory}» (${top.category}) concentra muchos cargos pequeños. Reducir a la mitad este bloque liberaría ~$${Math.round(ifTrimAntByHalf).toLocaleString("es-CO")} en el mes.`,
      savingsMonthly: ifTrimAntByHalf,
      savingsAnnual: ifTrimAntByHalf * 12,
      ctaHref: `/finanzas/transactions?month=${encodeURIComponent(anchor)}&category=${encodeURIComponent(top.category)}&subcategory=${encodeURIComponent(top.subcategory)}&tipo=gasto`,
      ctaLabel: "Ir al detalle",
    })
  }

  if (vsPrevExpensePct != null && vsPrevExpensePct > 8) {
    insights.push({
      id: "total-exp-up",
      impact: "medio",
      title: "Gasto operativo por encima del mes pasado",
      body: `El gasto total subió ~${vsPrevExpensePct.toFixed(0)}% vs el mes anterior. Prioriza categorías en alerta y gastos hormiga.`,
    })
  }

  if (netAnchor < 0 && netForecast.filter((x) => x.isProjected).every((x) => x.net < 0)) {
    insights.push({
      id: "net-negative-run",
      impact: "alto",
      title: "Proyección de flujo bajo presión",
      body: `La extrapolación lineal sugiere meses con flujo negativo si no se corrige el ritmo de gasto o se aumentan ingresos.`,
    })
  }

  insights.sort((a, b) => {
    const rank = { alto: 0, medio: 1, bajo: 2 }
    return rank[a.impact] - rank[b.impact]
  })

  return {
    anchorMonth: anchor,
    monthsIncluded: months,
    params: {
      momAlertPct: p.momAlertPct,
      momWatchPct: p.momWatchPct,
      antShareMin: p.antShareMin,
      antTicketMax: p.antTicketMax,
      scopeOperational: input.scopeOperational === true,
    },
    kpis: {
      totalExpenseAnchor,
      totalIncomeAnchor,
      netAnchor,
      vsPrevExpensePct,
      vsAvg6ExpensePct,
    },
    fastGrowing,
    antExpenses,
    expensePie,
    incomePie,
    compare: {
      prevMonthExpenseByCategory,
      avg6ExpenseByCategory: Object.fromEntries(avg6ByCat),
    },
    netSeries,
    netForecast,
    scenarioImpact: {
      ifReduceFastGrowingByScenario: reduceFast,
      ifTrimAntByHalf,
    },
    insights,
  }
}

export type CategoryAnalyticsPayload = NonNullable<ReturnType<typeof buildCategoryAnalyticsPayload>>
