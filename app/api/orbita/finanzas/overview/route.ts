import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_FINANCE_DEMO_NOTICE } from "@/lib/checkins/flags"
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
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { getTransactionsByRange } from "@/lib/services/finanzasService"

export const runtime = "nodejs"

/**
 * KPI y series: primero desde movimientos del mes (fechas normalizadas en getTransactionsByRange);
 * si ingresos+gastos suman ~0 y existe fila en finance_monthly_snapshots, los KPI numéricos usan el snapshot.
 * Distinto de `/api/orbita/finanzas/accounts` (dashboard heurístico + merge manual para tarjetas Capital).
 */
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

    const rows = await getTransactionsByRange(auth.supabase, extendedStartStr, endStr)
    const currentRows = rows.filter((r) => r.date >= startStr && r.date <= endStr)
    const previousRows = rows.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr)

    let overview = calculateOverview(currentRows, previousRows)
    const [yStr, mStr] = month.split("-")
    const y = Number(yStr)
    const mo = Number(mStr)
    const prevYm =
      mo === 1
        ? { year: y - 1, month: 12 }
        : { year: y, month: mo - 1 }

    const [{ data: snapCur }, { data: snapPrev }] = await Promise.all([
      auth.supabase
        .from("finance_monthly_snapshots")
        .select("total_income,total_expense,balance")
        .eq("household_id", householdId)
        .eq("year", y)
        .eq("month", mo)
        .maybeSingle(),
      auth.supabase
        .from("finance_monthly_snapshots")
        .select("total_income,total_expense,balance")
        .eq("household_id", householdId)
        .eq("year", prevYm.year)
        .eq("month", prevYm.month)
        .maybeSingle(),
    ])

    const snapIn = Number(snapCur?.total_income ?? 0)
    const snapEx = Number(snapCur?.total_expense ?? 0)
    const txMag = overview.income + overview.expense
    const snapMag = snapIn + snapEx
    let snapshotKpiNotice: string | undefined
    if (txMag < 1 && snapMag > 1) {
      const prevIn = Number(snapPrev?.total_income ?? 0)
      const prevEx = Number(snapPrev?.total_expense ?? 0)
      const prevNet = prevIn - prevEx
      const net = snapIn - snapEx
      const deltaNet =
        Math.abs(prevNet) > 1e-6 ? ((net - prevNet) / Math.abs(prevNet)) * 100 : null
      overview = {
        income: snapIn,
        expense: snapEx,
        net,
        savingsRate: snapIn !== 0 ? (net / snapIn) * 100 : 0,
        previousNet: prevNet,
        deltaNet,
        runway: snapEx > 0 && net > 0 ? net / snapEx : 0,
      }
      snapshotKpiNotice =
        "KPI superiores tomados de finance_monthly_snapshots: la suma de movimientos del mes en esta API fue 0 (si esperabas gráficos, revisa fechas o tipos en orbita_finance_transactions)."
    }
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
      ...(snapshotKpiNotice ? { notice: snapshotKpiNotice } : {}),
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
