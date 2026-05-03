import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_FINANCE_DEMO_NOTICE } from "@/lib/checkins/flags"
import { calculateOverview } from "@/lib/finanzas/calculations/overview"
import { computeFinanceMonthState } from "@/lib/finanzas/computeFinanceMonthState"
import { createOperativoExpenseFn } from "@/lib/finanzas/operativoExpense"
import {
  eachMonthInclusive,
  rollingWindowStartYm,
  rollingYearMonths,
  buildMonthlyFlowBuckets,
} from "@/lib/finanzas/flowEvolutionBuckets"
import { buildPlCfoCatalogAggregate } from "@/lib/finanzas/plCfoCatalogAggregate"
import { fetchRollingYearFlowSeriesForHousehold } from "@/lib/finanzas/rollingYearFlowSeries"
import { mockTransactionsForMonth } from "@/lib/finanzas/mockFinancePayloads"
import { monthBounds } from "@/lib/finanzas/monthRange"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { getTransactionsByRange } from "@/lib/services/finanzasService"
import { excludeReconciliationFromOperativoAnalysis } from "@/lib/finanzas/reconciliationTxFilter"

export const runtime = "nodejs"

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month")
    if (!month) {
      return NextResponse.json({ success: false, error: "month required (YYYY-MM)" }, { status: 400 })
    }

    const bounds = monthBounds(month)
    if (!bounds) {
      return NextResponse.json({ success: false, error: "month inválido" }, { status: 400 })
    }

    const { startStr, endStr, prevStartStr, prevEndStr } = bounds
    const extendedStartYm = rollingWindowStartYm(month, 12)
    const extendedStartStr = `${extendedStartYm}-01`

    if (isAppMockMode()) {
      const mockMonths = eachMonthInclusive(extendedStartYm, month)
      const all = mockMonths.flatMap((mm) => mockTransactionsForMonth(mm))
      const currentRows = all.filter((r) => r.date >= startStr && r.date <= endStr)
      const previousRows = all.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr)
      const opex = createOperativoExpenseFn([])
      const curOp = excludeReconciliationFromOperativoAnalysis(currentRows)
      const prevOp = excludeReconciliationFromOperativoAnalysis(previousRows)
      const catalog = buildPlCfoCatalogAggregate(curOp, prevOp, [])
      const rollingYear = buildMonthlyFlowBuckets(rollingYearMonths(month), all, opex)
      const overview = calculateOverview(curOp, prevOp, { expenseAmount: opex })
      return NextResponse.json({
        success: true,
        source: "mock",
        data: {
          catalog,
          flowEvolution: { rollingYear },
          headline: {
            savingsRate: overview.savingsRate,
            runway: overview.runway,
            net: overview.net,
          },
        },
      })
    }

    if (!isSupabaseEnabled()) {
      return NextResponse.json({
        success: true,
        notice: UI_FINANCE_DEMO_NOTICE,
        data: null,
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const rows = await getTransactionsByRange(auth.supabase, extendedStartStr, endStr, { householdId })
    const currentRows = rows.filter((r) => r.date >= startStr && r.date <= endStr)
    const previousRows = rows.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr)

    const monthState = await computeFinanceMonthState(
      auth.supabase,
      householdId,
      month,
      currentRows,
      previousRows,
    )
    const { overview, opex, catalogRows, hasOperativoCatalog } = monthState

    const operativoCurrent = excludeReconciliationFromOperativoAnalysis(currentRows)
    const operativoPrevious = excludeReconciliationFromOperativoAnalysis(previousRows)
    const catalog = buildPlCfoCatalogAggregate(operativoCurrent, operativoPrevious, catalogRows)

    const rollingYear = await fetchRollingYearFlowSeriesForHousehold(
      auth.supabase,
      householdId,
      month,
      rows,
      opex,
      hasOperativoCatalog,
    )

    return NextResponse.json({
      success: true,
      data: {
        catalog,
        flowEvolution: { rollingYear },
        headline: {
          savingsRate: overview.savingsRate,
          runway: overview.runway,
          net: overview.net,
        },
        snapshotKpiNotice: monthState.snapshotKpiNotice,
      },
    })
  } catch (e) {
    console.error("pl-cfo GET", e)
    return NextResponse.json({ success: false, error: "Error al cargar P&L CFO" }, { status: 500 })
  }
}
