import type { SupabaseClient } from "@supabase/supabase-js"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import type { FlowEvolutionRow } from "@/lib/finanzas/flowEvolutionBuckets"
import {
  buildMonthlyFlowBuckets,
  fillMonthlyFlowFromSnapshots,
  rollingYearMonths,
} from "@/lib/finanzas/flowEvolutionBuckets"

type SnapshotIncomeExpense = { income: number; expense: number }

function yearsFromMonths(months: string[]): { minYear: number; maxYear: number } {
  const yearsInFlow = months.map((ym) => Number(ym.split("-")[0])).filter(Number.isFinite)
  const now = new Date().getFullYear()
  return {
    minYear: yearsInFlow.length ? Math.min(...yearsInFlow) : now,
    maxYear: yearsInFlow.length ? Math.max(...yearsInFlow) : now,
  }
}

export async function fetchSnapshotMapForMonths(
  supabase: SupabaseClient,
  householdId: string,
  months: string[],
): Promise<Map<string, SnapshotIncomeExpense>> {
  if (!months.length) return new Map()
  const { minYear, maxYear } = yearsFromMonths(months)
  const { data: flowSnapRows } = await supabase
    .from("finance_monthly_snapshots")
    .select("year, month, total_income, total_expense")
    .eq("household_id", householdId)
    .gte("year", minYear)
    .lte("year", maxYear)

  const snapByYm = new Map<string, SnapshotIncomeExpense>()
  for (const r of flowSnapRows ?? []) {
    const yy = Number((r as { year?: number }).year)
    const mm = Number((r as { month?: number }).month)
    if (!yy || !mm || mm < 1 || mm > 12) continue
    const key = `${yy}-${String(mm).padStart(2, "0")}`
    snapByYm.set(key, {
      income: Number((r as { total_income?: unknown }).total_income ?? 0),
      expense: Number((r as { total_expense?: unknown }).total_expense ?? 0),
    })
  }
  return snapByYm
}

export function buildFlowSeriesWithSnapshots(
  months: string[],
  rowsThroughEnd: FinanceTransaction[],
  opex: (tx: FinanceTransaction) => number,
  hasOperativoCatalog: boolean,
  snapByYm: ReadonlyMap<string, SnapshotIncomeExpense>,
): FlowEvolutionRow[] {
  const snapFillOpts = { fillExpenseFromSnapshots: !hasOperativoCatalog } as const
  return fillMonthlyFlowFromSnapshots(
    months,
    buildMonthlyFlowBuckets(months, rowsThroughEnd, opex),
    snapByYm,
    snapFillOpts,
  )
}

/**
 * Serie mensual año móvil (misma lógica que Resumen / overview) para el P&L CFO.
 */
export async function fetchRollingYearFlowSeriesForHousehold(
  supabase: SupabaseClient,
  householdId: string,
  anchorMonthYm: string,
  rowsThroughEnd: FinanceTransaction[],
  opex: (tx: FinanceTransaction) => number,
  hasOperativoCatalog: boolean,
): Promise<FlowEvolutionRow[]> {
  const rollingMonths = rollingYearMonths(anchorMonthYm)
  if (rollingMonths.length === 0) return []
  const snapByYm = await fetchSnapshotMapForMonths(supabase, householdId, rollingMonths)
  return buildFlowSeriesWithSnapshots(rollingMonths, rowsThroughEnd, opex, hasOperativoCatalog, snapByYm)
}
