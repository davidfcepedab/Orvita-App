import type { FinanceTransaction } from "@/lib/finanzas/types"
import { expenseAmount, incomeAmount, netCashFlow } from "@/lib/finanzas/calculations/txMath"
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
  sheetTipo?: "fijo" | "variable"
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
  return rows.filter((r) => r.date >= `${month}-01` && r.date <= `${month}-31`)
}

export function buildWeeklyBuckets(month: string, rows: FinanceTransaction[]): WeeklyBucketRow[] {
  const inMonth = filterMonth(rows, month)
  const bucketTotals = new Map<number, { ing: number; exp: number }>()
  for (let w = 1; w <= 5; w += 1) bucketTotals.set(w, { ing: 0, exp: 0 })

  for (const tx of inMonth) {
    const day = Number(tx.date.slice(8, 10))
    if (!Number.isFinite(day) || day < 1) continue
    const w = Math.min(5, Math.ceil(day / 7))
    const b = bucketTotals.get(w)!
    b.ing += incomeAmount(tx)
    b.exp += expenseAmount(tx)
  }

  return [1, 2, 3, 4, 5].map((w) => {
    const b = bucketTotals.get(w)!
    return {
      month: `S${w}`,
      ingresos: b.ing,
      gasto_operativo: b.exp,
      flujo: b.ing - b.exp,
    }
  }).filter((row) => row.ingresos > 0 || row.gasto_operativo > 0)
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
  const curExp = current.filter((r) => expenseAmount(r) > 0)
  const prevExp = previous.filter((r) => expenseAmount(r) > 0)

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
      .map(([n, t]) => ({ name: n, total: -t }))
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

const SUBS_RE = /suscrip|saas|software|spotify|netflix|chatgpt|figma|copilot|github|notion|slack|openai|apple music/i

export function pickSubscriptionExpenses(rows: FinanceTransaction[]) {
  return rows.filter((r) => expenseAmount(r) > 0 && SUBS_RE.test(`${r.category} ${r.subcategory} ${r.description}`))
}

const OBL_RE = /arriend|rent|hipotec|seguro oblig|internet|utilities|luz|agua|gas|car insurance/i

export function pickObligationExpenses(rows: FinanceTransaction[]) {
  const list = rows.filter((r) => expenseAmount(r) > 0 && (isFixedCategoryName(r.category) || OBL_RE.test(r.description)))
  return list.sort((a, b) => expenseAmount(b) - expenseAmount(a)).slice(0, 8)
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

export function buildInsightsFromHistory(monthSlices: { month: string; rows: FinanceTransaction[] }[]): InsightPayload {
  const nets = monthSlices.map((s) => ({ month: s.month, net: netCashFlow(s.rows) }))
  const avgNet = nets.length ? nets.reduce((a, n) => a + n.net, 0) / nets.length : 0
  const lastNet = nets.length ? nets[nets.length - 1]!.net : 0
  const volatility =
    nets.length > 1
      ? Math.sqrt(
          nets.reduce((acc, n) => acc + (n.net - avgNet) ** 2, 0) / Math.max(1, nets.length - 1),
        )
      : 0

  const savingsLike = monthSlices.length
    ? monthSlices.map((s) => {
        const inc = s.rows.reduce((a, t) => a + incomeAmount(t), 0)
        const net = netCashFlow(s.rows)
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

  const [Y, M] = monthSlices.length
    ? monthSlices[monthSlices.length - 1]!.month.split("-").map(Number)
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
    insight: { type: "alert", message: messages[0] ?? "", all: messages },
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
