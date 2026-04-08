import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_FINANCE_DEMO_NOTICE } from "@/lib/checkins/flags"
import { calculateOverview } from "@/lib/finanzas/calculations/overview"
import { computeFinanceMonthState } from "@/lib/finanzas/computeFinanceMonthState"
import { createOperativoExpenseFn } from "@/lib/finanzas/operativoExpense"
import { eachMonthInclusive, rollingWindowStartYm } from "@/lib/finanzas/flowEvolutionBuckets"
import { mockTransactionsForMonth } from "@/lib/finanzas/mockFinancePayloads"
import { monthBounds } from "@/lib/finanzas/monthRange"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { getTransactionsByRange } from "@/lib/services/finanzasService"

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

    if (isAppMockMode()) {
      const extendedStartYm = rollingWindowStartYm(month, 12)
      const mockMonths = eachMonthInclusive(extendedStartYm, month)
      const all = mockMonths.flatMap((mm) => mockTransactionsForMonth(mm))
      const currentRows = all.filter((r) => r.date >= startStr && r.date <= endStr)
      const previousRows = all.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr)
      const opex = createOperativoExpenseFn([])
      const overview = calculateOverview(currentRows, previousRows, { expenseAmount: opex })
      const sortedByDate = [...all].sort((a, b) => b.date.localeCompare(a.date))
      const last = sortedByDate[0]
      const lastTransactionDate =
        typeof last?.date === "string" && last.date.length >= 10 ? last.date.slice(0, 10) : null

      return NextResponse.json({
        success: true,
        source: "mock",
        meta: {
          selectedMonth: month,
          lastTransactionDate,
          lastTransactionUpdatedAt: new Date().toISOString(),
          transactionsInSelectedMonth: currentRows.length,
          kpiSource: "transactions" as const,
          kpiHasSignal: overview.income > 0.5 || overview.expense > 0.5,
        },
      })
    }

    if (!isSupabaseEnabled()) {
      return NextResponse.json({
        success: true,
        notice: UI_FINANCE_DEMO_NOTICE,
        meta: null,
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const rangeRows = await getTransactionsByRange(auth.supabase, prevStartStr, endStr)
    const currentRows = rangeRows.filter((r) => r.date >= startStr && r.date <= endStr)
    const previousRows = rangeRows.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr)

    const monthState = await computeFinanceMonthState(
      auth.supabase,
      householdId,
      month,
      currentRows,
      previousRows,
    )

    return NextResponse.json({
      success: true,
      ...(monthState.snapshotKpiNotice ? { notice: monthState.snapshotKpiNotice } : {}),
      meta: monthState.meta,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("FINANCE META ERROR:", message)
    return NextResponse.json({ success: false, error: "Error cargando meta de finanzas" }, { status: 500 })
  }
}
