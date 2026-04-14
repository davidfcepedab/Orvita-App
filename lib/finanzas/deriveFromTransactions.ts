import type { FinanceTransaction } from "@/lib/finanzas/types"
import { excludeReconciliationFromOperativoAnalysis } from "@/lib/finanzas/reconciliationTxFilter"
import { monthBounds } from "@/lib/finanzas/monthRange"
import { expenseAmount, incomeAmount, netCashFlowWithExpenseRule } from "@/lib/finanzas/calculations/txMath"
import {
  normalizeFinanceCatalogKey,
  type FinanceSubcategoryCatalogEntry,
} from "@/lib/finanzas/subcategoryCatalog"

export type WeeklyBucketRow = {
  month: string
  ingresos: number
  gasto_operativo: number
  flujo: number
}

export type StructuralSub = {
  name: string
  total: number
  /** Gasto mismo sub en el mes anterior (negativo como `total`). */
  previousTotal?: number
  sheetTipo?: "fijo" | "variable" | "modulo_finanzas"
  financialImpact?: string
  budgetable?: boolean
  catalogCategory?: string
  categoryMismatch?: boolean
}

export type StructuralCategory = {
  name: string
  type: "fixed" | "variable"
  total: number
  previousTotal?: number
  delta?: number
  budget?: number
  budgetUsedPercent?: number
  budgetStatus?: "green" | "yellow" | "red"
  subcategories?: StructuralSub[]
}

const FIXED_HINT = /vivienda|arriend|rent|hipotec|seguro|salud|utilities|servicio públic|internet|luz|gas|agua|administrativ|cuota fija|póliza/i

function isFixedCategoryName(name: string) {
  return FIXED_HINT.test(name)
}

export function filterMonth(rows: FinanceTransaction[], month: string) {
  const b = monthBounds(month)
  if (!b) return []
  return rows.filter((r) => r.date >= b.startStr && r.date <= b.endStr)
}

function parseLocalDateFromIso(iso: string): Date | null {
  if (!iso || iso.length < 10) return null
  const y = Number(iso.slice(0, 4))
  const m = Number(iso.slice(5, 7)) - 1
  const d = Number(iso.slice(8, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null
  return new Date(y, m, d)
}

function formatIsoDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/** Lunes (inicio semana ISO) de la semana que contiene `d` en hora local. */
export function startOfIsoWeekContaining(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const day = x.getDay()
  const diff = day === 0 ? -6 : 1 - day
  x.setDate(x.getDate() + diff)
  return x
}

function labelWeekRangeEs(weekStart: Date, weekEnd: Date): string {
  const a = weekStart.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
  const b = weekEnd.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
  return `${a}–${b}`.replace(/\s+/g, " ").trim()
}

export type BuildWeeklyBucketsOptions = {
  /**
   * Movimientos para ventana de semanas (p. ej. varios meses). Si no se pasa, se usa `rows`.
   * Necesario cuando las 4 semanas corridas cruzan el inicio del mes seleccionado.
   */
  allRowsForWeekWindow?: FinanceTransaction[]
}

/**
 * Cuatro semanas calendario consecutivas (lun–dom), siempre 4 puntos (ceros si no hay movimientos).
 * La última semana es la que contiene la fecha de referencia: último movimiento del mes seleccionado,
 * o fin de mes si no hubo movimientos en ese mes.
 */
export function buildWeeklyBuckets(
  month: string,
  rows: FinanceTransaction[],
  expenseFn: (tx: FinanceTransaction) => number = expenseAmount,
  options?: BuildWeeklyBucketsOptions,
): WeeklyBucketRow[] {
  const bounds = monthBounds(month)
  if (!bounds) return []

  const rowsOp = excludeReconciliationFromOperativoAnalysis(rows)
  const pool = options?.allRowsForWeekWindow
    ? excludeReconciliationFromOperativoAnalysis(options.allRowsForWeekWindow)
    : rowsOp

  const inMonth = filterMonth(rowsOp, month)
  let refDateStr = bounds.endStr
  for (const tx of inMonth) {
    if (tx.date > refDateStr) refDateStr = tx.date
  }

  const refD = parseLocalDateFromIso(refDateStr)
  if (!refD) return []

  const week4Monday = startOfIsoWeekContaining(refD)

  const out: WeeklyBucketRow[] = []
  for (let i = 0; i < 4; i += 1) {
    const ws = new Date(week4Monday)
    ws.setDate(week4Monday.getDate() + (i - 3) * 7)
    const we = new Date(ws)
    we.setDate(ws.getDate() + 6)
    const wsStr = formatIsoDateLocal(ws)
    const weStr = formatIsoDateLocal(we)

    let ing = 0
    let exp = 0
    for (const tx of pool) {
      if (tx.date >= wsStr && tx.date <= weStr) {
        ing += incomeAmount(tx)
        exp += expenseFn(tx)
      }
    }

    out.push({
      month: labelWeekRangeEs(ws, we),
      ingresos: ing,
      gasto_operativo: exp,
      flujo: ing - exp,
    })
  }

  return out
}

export function buildStructuralCategories(
  current: FinanceTransaction[],
  previous: FinanceTransaction[],
): {
  structuralCategories: StructuralCategory[]
  totalFixed: number
  totalVariable: number
  totalStructural: number
} {
  const cur = excludeReconciliationFromOperativoAnalysis(current)
  const prev = excludeReconciliationFromOperativoAnalysis(previous)
  const curExp = cur.filter((r) => expenseAmount(r) > 0)
  const prevExp = prev.filter((r) => expenseAmount(r) > 0)

  const byCat = (rows: FinanceTransaction[]) => {
    const m = new Map<string, Map<string, number>>()
    for (const tx of rows) {
      const cat = tx.category?.trim() || "Sin categoría"
      const sub = (tx.subcategory?.trim() || "General") as string
      const amt = expenseAmount(tx)
      if (!m.has(cat)) m.set(cat, new Map())
      const sm = m.get(cat)!
      sm.set(sub, (sm.get(sub) ?? 0) + amt)
    }
    return m
  }

  const curMap = byCat(curExp)
  const prevMap = byCat(prevExp)

  const structuralCategories: StructuralCategory[] = []

  for (const [name, subs] of curMap) {
    const total = [...subs.values()].reduce((a, b) => a + b, 0)
    const prevSubs = prevMap.get(name)
    const previousTotal = prevSubs ? [...prevSubs.values()].reduce((a, b) => a + b, 0) : 0
    const delta =
      previousTotal > 1e-6 ? Math.round(((total - previousTotal) / previousTotal) * 100) : total > 0 ? 100 : 0
    const type: "fixed" | "variable" = isFixedCategoryName(name) ? "fixed" : "variable"
    const subcategories: StructuralSub[] = [...subs.entries()]
      .map(([n, t]) => {
        const prevAmt = prevSubs?.get(n) ?? 0
        return {
          name: n,
          total: -t,
          previousTotal: prevAmt > 1e-6 ? -prevAmt : undefined,
        }
      })
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

    const budget = total * 1.08
    const budgetUsedPercent = budget > 0 ? Math.min(150, Math.round((total / budget) * 100)) : 0
    let budgetStatus: "green" | "yellow" | "red" = "green"
    if (budgetUsedPercent >= 100) budgetStatus = "red"
    else if (budgetUsedPercent >= 88) budgetStatus = "yellow"

    structuralCategories.push({
      name,
      type,
      total: -total,
      previousTotal: previousTotal > 0 ? -previousTotal : undefined,
      delta,
      budget: Math.round(budget),
      budgetUsedPercent,
      budgetStatus,
      subcategories,
    })
  }

  structuralCategories.sort((a, b) => Math.abs(b.total) - Math.abs(a.total))

  const totalFixed = structuralCategories
    .filter((c) => c.type === "fixed")
    .reduce((a, c) => a + Math.abs(c.total), 0)
  const totalVariable = structuralCategories
    .filter((c) => c.type === "variable")
    .reduce((a, c) => a + Math.abs(c.total), 0)
  const totalStructural = totalFixed + totalVariable

  return { structuralCategories, totalFixed, totalVariable, totalStructural }
}

/**
 * Enlaza subcategorías del mes con el catálogo (hoja Categorías / orbita_finance_subcategory_catalog).
 */
export function attachCatalogToStructuralCategories(
  structuralCategories: StructuralCategory[],
  catalog: FinanceSubcategoryCatalogEntry[],
): { structuralCategories: StructuralCategory[]; unknownSubcategories: string[] } {
  const bySub = new Map<string, FinanceSubcategoryCatalogEntry>()
  for (const row of catalog) {
    if (row.active === false) continue
    bySub.set(normalizeFinanceCatalogKey(row.subcategory), row)
  }

  const unknown = new Set<string>()

  const next = structuralCategories.map((cat) => ({
    ...cat,
    subcategories: (cat.subcategories ?? []).map((sub) => {
      const meta = bySub.get(normalizeFinanceCatalogKey(sub.name))
      if (!meta) {
        unknown.add(sub.name)
        return sub
      }
      const mismatch =
        normalizeFinanceCatalogKey(meta.category) !== normalizeFinanceCatalogKey(cat.name)
      return {
        ...sub,
        sheetTipo: meta.expense_type,
        financialImpact: meta.financial_impact,
        budgetable: meta.budgetable,
        catalogCategory: meta.category,
        categoryMismatch: mismatch,
      }
    }),
  }))

  return { structuralCategories: next, unknownSubcategories: [...unknown] }
}

/**
 * Una misma categoría (p. ej. Hogar & Base) puede mezclar subcategorías fijas y variables según el catálogo.
 * Parte en dos filas (misma `name`, distinto `type`) para las columnas Fijo / Variable del mapa.
 */
export function splitStructuralCategoriesByCatalogExpenseType(
  categories: StructuralCategory[],
): StructuralCategory[] {
  const out: StructuralCategory[] = []
  const moduloSubsAll: StructuralSub[] = []

  for (const cat of categories) {
    const subs = cat.subcategories ?? []
    const fijoSubs: StructuralSub[] = []
    const varSubs: StructuralSub[] = []

    for (const sub of subs) {
      if (sub.sheetTipo === "modulo_finanzas") {
        moduloSubsAll.push(sub)
        continue
      }
      const isFijo =
        sub.sheetTipo === "fijo"
          ? true
          : sub.sheetTipo === "variable"
            ? false
            : isFixedCategoryName(cat.name)

      ;(isFijo ? fijoSubs : varSubs).push(sub)
    }

    const makeSlice = (type: "fixed" | "variable", subList: StructuralSub[]): StructuralCategory | null => {
      if (subList.length === 0) return null
      const total = subList.reduce((a, s) => a + s.total, 0)
      let previousSum = 0
      let hadPrev = false
      for (const s of subList) {
        if (s.previousTotal != null) {
          previousSum += s.previousTotal
          hadPrev = true
        }
      }
      const absTot = Math.abs(total)
      const absPrev = Math.abs(previousSum)
      const delta =
        hadPrev && absPrev > 1e-6
          ? Math.round(((absTot - absPrev) / absPrev) * 100)
          : absTot > 0
            ? 100
            : 0

      const budget = absTot * 1.08
      const budgetUsedPercent = budget > 0 ? Math.min(150, Math.round((absTot / budget) * 100)) : 0
      let budgetStatus: "green" | "yellow" | "red" = "green"
      if (budgetUsedPercent >= 100) budgetStatus = "red"
      else if (budgetUsedPercent >= 88) budgetStatus = "yellow"

      return {
        ...cat,
        type,
        total,
        previousTotal: hadPrev ? previousSum : undefined,
        delta,
        budget: Math.round(budget),
        budgetUsedPercent,
        budgetStatus,
        subcategories: [...subList].sort((a, b) => Math.abs(b.total) - Math.abs(a.total)),
      }
    }

    const fixedSlice = makeSlice("fixed", fijoSubs)
    const varSlice = makeSlice("variable", varSubs)
    if (fixedSlice) out.push(fixedSlice)
    if (varSlice) out.push(varSlice)
  }

  if (moduloSubsAll.length > 0) {
    const total = moduloSubsAll.reduce((a, s) => a + s.total, 0)
    let previousSum = 0
    let hadPrev = false
    for (const s of moduloSubsAll) {
      if (s.previousTotal != null) {
        previousSum += s.previousTotal
        hadPrev = true
      }
    }
    const absTot = Math.abs(total)
    const absPrev = Math.abs(previousSum)
    const delta =
      hadPrev && absPrev > 1e-6
        ? Math.round(((absTot - absPrev) / absPrev) * 100)
        : absTot > 0
          ? 100
          : 0
    const budget = absTot * 1.08
    const budgetUsedPercent = budget > 0 ? Math.min(150, Math.round((absTot / budget) * 100)) : 0
    let budgetStatus: "green" | "yellow" | "red" = "green"
    if (budgetUsedPercent >= 100) budgetStatus = "red"
    else if (budgetUsedPercent >= 88) budgetStatus = "yellow"

    out.push({
      name: "Módulo financiero (catálogo)",
      type: "variable",
      total,
      previousTotal: hadPrev ? previousSum : undefined,
      delta,
      budget: Math.round(budget),
      budgetUsedPercent,
      budgetStatus,
      subcategories: [...moduloSubsAll].sort((a, b) => Math.abs(b.total) - Math.abs(a.total)),
    })
  }

  out.sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
  return out
}

export function recomputeStructuralTotals(structuralCategories: StructuralCategory[]): {
  totalFixed: number
  totalVariable: number
  totalStructural: number
} {
  let totalFixed = 0
  let totalVariable = 0
  for (const c of structuralCategories) {
    if (c.type === "fixed") totalFixed += Math.abs(c.total)
    else totalVariable += Math.abs(c.total)
  }
  return {
    totalFixed,
    totalVariable,
    totalStructural: totalFixed + totalVariable,
  }
}

const SUBS_RE = /suscrip|saas|software|spotify|netflix|chatgpt|figma|copilot|github|notion|slack|openai|apple music/i

export function pickSubscriptionExpenses(
  rows: FinanceTransaction[],
  expenseFn: (tx: FinanceTransaction) => number = expenseAmount,
) {
  rows = excludeReconciliationFromOperativoAnalysis(rows)
  return rows.filter(
    (r) => expenseFn(r) > 0 && SUBS_RE.test(`${r.category} ${r.subcategory} ${r.description}`),
  )
}

const OBL_RE = /arriend|rent|hipotec|seguro oblig|internet|utilities|luz|agua|gas|car insurance/i

export function pickObligationExpenses(
  rows: FinanceTransaction[],
  expenseFn: (tx: FinanceTransaction) => number = expenseAmount,
) {
  const rowsOp = excludeReconciliationFromOperativoAnalysis(rows)
  const list = rowsOp.filter(
    (r) => expenseFn(r) > 0 && (isFixedCategoryName(r.category) || OBL_RE.test(r.description)),
  )
  return list.sort((a, b) => expenseFn(b) - expenseFn(a)).slice(0, 8)
}

export type InsightPayload = {
  score: number
  insight: { type: string; message: string; all: string[] }
  stability: {
    stabilityIndex: number
    status: "green" | "yellow" | "red"
    scoreOperativo: number
    scoreLiquidez: number
    scoreRiesgo: number
  }
  prediction: { projection: { month: string; projectedBalance: number }[] }
}

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

export type BuildInsightsFromHistoryOptions = {
  /** Por defecto {@link expenseAmount}; usar `createOperativoExpenseFn(catálogo)` para alinear con Resumen. */
  expenseAmount?: (tx: FinanceTransaction) => number
}

export function buildInsightsFromHistory(
  monthSlices: { month: string; rows: FinanceTransaction[] }[],
  options?: BuildInsightsFromHistoryOptions,
): InsightPayload {
  const expFn = options?.expenseAmount ?? expenseAmount
  const slices = monthSlices.map((s) => ({
    month: s.month,
    rows: excludeReconciliationFromOperativoAnalysis(s.rows),
  }))
  const nets = slices.map((s) => ({ month: s.month, net: netCashFlowWithExpenseRule(s.rows, expFn) }))
  const avgNet = nets.length ? nets.reduce((a, n) => a + n.net, 0) / nets.length : 0
  const lastNet = nets.length ? nets[nets.length - 1]!.net : 0
  const volatility =
    nets.length > 1
      ? Math.sqrt(
          nets.reduce((acc, n) => acc + (n.net - avgNet) ** 2, 0) / Math.max(1, nets.length - 1),
        )
      : 0

  const savingsLike = slices.length
    ? slices.map((s) => {
        const inc = s.rows.reduce((a, t) => a + incomeAmount(t), 0)
        const net = netCashFlowWithExpenseRule(s.rows, expFn)
        return inc > 0 ? (net / inc) * 100 : 0
      })
    : [0]
  const avgSav = savingsLike.reduce((a, b) => a + b, 0) / Math.max(1, savingsLike.length)

  const volAdj = volatility / Math.max(50_000, Math.abs(avgNet) || 50_000)
  const score = Math.max(
    0,
    Math.min(100, Math.round(52 + avgSav * 0.35 - Math.min(35, volAdj * 12))),
  )

  const stabilityIndex = Math.max(0, Math.min(100, Math.round(55 + avgSav * 0.4 - Math.min(30, volatility / 80_000))))
  let status: "green" | "yellow" | "red" = "green"
  if (stabilityIndex < 45) status = "red"
  else if (stabilityIndex < 62) status = "yellow"

  const messages: string[] = []
  if (lastNet < 0) messages.push("Flujo neto negativo en el último mes: revisa gastos variables discrecionales.")
  if (avgSav < 15) messages.push("Tasa de ahorro baja respecto a ingresos; prioriza automatizar ahorro al inicio del mes.")
  if (volatility > 800_000) messages.push("Alta variación mes a mes en flujo: conviene buffer de liquidez de 1–2 meses.")
  if (messages.length === 0) messages.push("Patrón de flujo estable. Mantén categorización para afinar proyecciones.")

  const insightIsAlert = lastNet < 0 || avgSav < 15 || volatility > 800_000

  const [Y, M] = slices.length
    ? slices[slices.length - 1]!.month.split("-").map(Number)
    : [new Date().getFullYear(), new Date().getMonth() + 1]
  let balanceCursor = lastNet
  const projection: { month: string; projectedBalance: number }[] = []
  for (let i = 1; i <= 3; i += 1) {
    const d = new Date(Y, M - 1 + i, 1)
    const label = MONTH_SHORT[d.getMonth()] ?? `M${i}`
    balanceCursor += avgNet
    projection.push({ month: label, projectedBalance: Math.round(balanceCursor) })
  }

  return {
    score,
    insight: { type: insightIsAlert ? "alert" : "positive", message: messages[0] ?? "", all: messages },
    stability: {
      stabilityIndex,
      status,
      scoreOperativo: Math.min(100, Math.round(60 + avgSav * 0.25)),
      scoreLiquidez: Math.min(100, Math.round(50 + (lastNet > 0 ? 20 : -10) + avgSav * 0.2)),
      scoreRiesgo: Math.max(0, Math.round(70 - stabilityIndex * 0.5)),
    },
    prediction: { projection },
  }
}
