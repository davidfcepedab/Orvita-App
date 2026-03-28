import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import { calculateOverview } from "@/lib/finanzas/calculations/overview"
import { expenseAmount } from "@/lib/finanzas/calculations/txMath"
import {
  buildMonthlyFlowBuckets,
  calendarQuarterMonthsThrough,
  eachMonthInclusive,
  rollingSemesterMonths,
  rollingYearMonths,
  rollingWindowStartYm,
} from "@/lib/finanzas/flowEvolutionBuckets"
import {
  buildWeeklyBuckets,
  pickObligationExpenses,
  pickSubscriptionExpenses,
} from "@/lib/finanzas/deriveFromTransactions"
import { mockTransactionsForMonth } from "@/lib/finanzas/mockFinancePayloads"
import { monthBounds } from "@/lib/finanzas/monthRange"
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
    const extendedStartYm = rollingWindowStartYm(month, 12)
    const extendedStartStr = `${extendedStartYm}-01`

    if (isAppMockMode()) {
      const mockMonths = eachMonthInclusive(extendedStartYm, month)
      const all = mockMonths.flatMap((mm) => mockTransactionsForMonth(mm))
      const currentRows = all.filter((r) => r.date >= startStr && r.date <= endStr)
      const previousRows = all.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr)
      const overview = calculateOverview(currentRows, previousRows)
      const weeklySeries = buildWeeklyBuckets(month, currentRows)
      const flowEvolution = {
        weeks: weeklySeries,
        quarter: buildMonthlyFlowBuckets(calendarQuarterMonthsThrough(month), all),
        semester: buildMonthlyFlowBuckets(rollingSemesterMonths(month), all),
        rollingYear: buildMonthlyFlowBuckets(rollingYearMonths(month), all),
      }
      const subs = pickSubscriptionExpenses(currentRows)
      const obls = pickObligationExpenses(currentRows)
      return NextResponse.json({
        success: true,
        source: "mock",
        data: {
          ...overview,
          weeklySeries,
          flowEvolution,
          subscriptions: subs.map((t) => ({
            name: t.description.slice(0, 48),
            amount: expenseAmount(t),
          })),
          obligations: obls.map((t) => ({
            name: t.description.slice(0, 48),
            due: t.date,
            amount: expenseAmount(t),
          })),
          headline: {
            liquidityIndex: overview.savingsRate,
            netCashFlow: overview.net,
            burnRunwayMonths: overview.runway,
            debtToIncomeProxy: Math.max(0, Math.min(100, 100 - overview.savingsRate)),
          },
        },
      })
    }

    if (!isSupabaseEnabled()) {
      return NextResponse.json({
        success: true,
        notice:
          "NEXT_PUBLIC_SUPABASE_ENABLED≠true: sin lectura de transacciones. Activa el flag y reconstruye la app.",
        data: null,
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const rows = await getTransactionsByRange(auth.supabase, extendedStartStr, endStr)
    const currentRows = rows.filter((r) => r.date >= startStr && r.date <= endStr)
    const previousRows = rows.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr)

    const overview = calculateOverview(currentRows, previousRows)
    const weeklySeries = buildWeeklyBuckets(month, currentRows)
    const flowEvolution = {
      weeks: weeklySeries,
      quarter: buildMonthlyFlowBuckets(calendarQuarterMonthsThrough(month), rows),
      semester: buildMonthlyFlowBuckets(rollingSemesterMonths(month), rows),
      rollingYear: buildMonthlyFlowBuckets(rollingYearMonths(month), rows),
    }
    const subs = pickSubscriptionExpenses(currentRows)
    const obls = pickObligationExpenses(currentRows)

    return NextResponse.json({
      success: true,
      data: {
        ...overview,
        weeklySeries,
        flowEvolution,
        subscriptions: subs.map((t) => ({
          name: t.description.slice(0, 48),
          amount: expenseAmount(t),
        })),
        obligations: obls.map((t) => ({
          name: t.description.slice(0, 48),
          due: t.date,
          amount: expenseAmount(t),
        })),
        headline: {
          liquidityIndex: overview.savingsRate,
          netCashFlow: overview.net,
          burnRunwayMonths: overview.runway,
          debtToIncomeProxy: Math.max(0, Math.min(100, 100 - overview.savingsRate)),
        },
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("OVERVIEW ERROR:", message)
    return NextResponse.json({ success: false, error: "Error cargando overview" }, { status: 500 })
  }
}
