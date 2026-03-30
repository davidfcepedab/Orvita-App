import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_FINANCE_DEMO_NOTICE } from "@/lib/checkins/flags"
import { calculateOverview } from "@/lib/finanzas/calculations/overview"
import { createOperativoExpenseFn } from "@/lib/finanzas/operativoExpense"
import { fetchSubcategoryCatalogMerged } from "@/lib/finanzas/subcategoryCatalog"
import {
  buildMonthlyFlowBuckets,
  calendarQuarterMonthsThrough,
  eachMonthInclusive,
  fillMonthlyFlowFromSnapshots,
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
import { flowCommitmentFromDbRow, type UserFlowCommitmentRow } from "@/lib/finanzas/flowCommitmentsDbMap"
import type { FlowCommitment } from "@/lib/finanzas/flowCommitmentsTypes"
import type { SubscriptionStatus, UserSubscription } from "@/lib/finanzas/userSubscriptionsTypes"

export const runtime = "nodejs"

type SubDbRow = {
  id: string
  name: string
  category: string
  amount_monthly: number | string
  renewal_date: string
  include_in_simulator: boolean
  active: boolean
  status: string
  created_at?: string
  updated_at?: string
}

function mapManagedSubscription(r: SubDbRow): UserSubscription {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    amount_monthly: Number(r.amount_monthly),
    renewal_date: typeof r.renewal_date === "string" ? r.renewal_date.slice(0, 10) : String(r.renewal_date),
    include_in_simulator: r.include_in_simulator,
    active: r.active,
    status: r.status as SubscriptionStatus,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}

/**
 * KPI y series desde movimientos; el gasto numérico usa solo subcategorías con impacto **operativo** en el catálogo
 * (si el hogar tiene filas en `orbita_finance_subcategory_catalog`). Sin catálogo, el gasto equivale al total de egresos.
 * Si no hay TX en el mes y sí snapshot, el reemplazo por snapshot solo aplica cuando no hay catálogo (evita mezclar totales).
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
      const opex = createOperativoExpenseFn([])
      const overview = calculateOverview(currentRows, previousRows, { expenseAmount: opex })
      const weeklySeries = buildWeeklyBuckets(month, currentRows, opex)
      const flowEvolution = {
        weeks: weeklySeries,
        quarter: buildMonthlyFlowBuckets(calendarQuarterMonthsThrough(month), all, opex),
        semester: buildMonthlyFlowBuckets(rollingSemesterMonths(month), all, opex),
        rollingYear: buildMonthlyFlowBuckets(rollingYearMonths(month), all, opex),
      }
      const subs = pickSubscriptionExpenses(currentRows, opex)
      const obls = pickObligationExpenses(currentRows, opex)
      return NextResponse.json({
        success: true,
        source: "mock",
        data: {
          ...overview,
          weeklySeries,
          flowEvolution,
          subscriptions: subs.map((t) => ({
            name: t.description.slice(0, 48),
            amount: opex(t),
          })),
          obligations: obls.map((t) => ({
            name: t.description.slice(0, 48),
            due: t.date,
            amount: opex(t),
          })),
          managedSubscriptions: [] as UserSubscription[],
          flowCommitments: [] as FlowCommitment[],
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

    let catalogRows: Awaited<ReturnType<typeof fetchSubcategoryCatalogMerged>> = []
    try {
      catalogRows = await fetchSubcategoryCatalogMerged(auth.supabase, householdId)
    } catch (e) {
      console.warn("OVERVIEW: catálogo de subcategorías no disponible", e)
    }
    const opex = createOperativoExpenseFn(catalogRows)
    const hasOperativoCatalog = catalogRows.length > 0

    let overview = calculateOverview(currentRows, previousRows, { expenseAmount: opex })
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
    if (txMag < 1 && snapMag > 1 && !hasOperativoCatalog) {
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
    } else if (txMag < 1 && snapMag > 1 && hasOperativoCatalog) {
      snapshotKpiNotice =
        "Hay resumen almacenado para el mes pero no se aplicó a los KPI para no mezclarlo con el filtro de gasto operativo (sin movimientos TX en el mes)."
    }
    const weeklySeries = buildWeeklyBuckets(month, currentRows, opex)

    const quarterMonths = calendarQuarterMonthsThrough(month)
    const semesterMonths = rollingSemesterMonths(month)
    const rollingMonths = rollingYearMonths(month)
    const flowMonthsUnion = [...new Set([...quarterMonths, ...semesterMonths, ...rollingMonths])]
    const yearsInFlow = flowMonthsUnion.map((ym) => Number(ym.split("-")[0])).filter(Number.isFinite)
    const minFlowYear = yearsInFlow.length ? Math.min(...yearsInFlow) : y
    const maxFlowYear = yearsInFlow.length ? Math.max(...yearsInFlow) : y

    const { data: flowSnapRows } = await auth.supabase
      .from("finance_monthly_snapshots")
      .select("year, month, total_income, total_expense")
      .eq("household_id", householdId)
      .gte("year", minFlowYear)
      .lte("year", maxFlowYear)

    const snapByYm = new Map<string, { income: number; expense: number }>()
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

    const snapFillOpts = { fillExpenseFromSnapshots: !hasOperativoCatalog } as const
    const flowEvolution = {
      weeks: weeklySeries,
      quarter: fillMonthlyFlowFromSnapshots(
        quarterMonths,
        buildMonthlyFlowBuckets(quarterMonths, rows, opex),
        snapByYm,
        snapFillOpts,
      ),
      semester: fillMonthlyFlowFromSnapshots(
        semesterMonths,
        buildMonthlyFlowBuckets(semesterMonths, rows, opex),
        snapByYm,
        snapFillOpts,
      ),
      rollingYear: fillMonthlyFlowFromSnapshots(
        rollingMonths,
        buildMonthlyFlowBuckets(rollingMonths, rows, opex),
        snapByYm,
        snapFillOpts,
      ),
    }
    const subs = pickSubscriptionExpenses(currentRows, opex)
    const obls = pickObligationExpenses(currentRows, opex)

    const [{ data: managedSubData }, commitsRes] = await Promise.all([
      auth.supabase
        .from("user_subscriptions")
        .select(
          "id, name, category, amount_monthly, renewal_date, include_in_simulator, active, status, created_at, updated_at",
        )
        .eq("household_id", householdId)
        .order("renewal_date", { ascending: true }),
      auth.supabase
        .from("user_flow_commitments")
        .select("id, household_id, title, category, due_date, amount, flow_type, created_at, updated_at")
        .eq("household_id", householdId)
        .order("due_date", { ascending: true }),
    ])

    const managedSubscriptions = ((managedSubData ?? []) as SubDbRow[]).map(mapManagedSubscription)

    let flowCommitments: FlowCommitment[] = []
    if (commitsRes.error) {
      console.warn("OVERVIEW: user_flow_commitments", commitsRes.error.message)
    } else {
      flowCommitments = ((commitsRes.data ?? []) as UserFlowCommitmentRow[]).map(flowCommitmentFromDbRow)
    }

    return NextResponse.json({
      success: true,
      ...(snapshotKpiNotice ? { notice: snapshotKpiNotice } : {}),
      data: {
        ...overview,
        weeklySeries,
        flowEvolution,
        subscriptions: subs.map((t) => ({
          name: t.description.slice(0, 48),
          amount: opex(t),
        })),
        obligations: obls.map((t) => ({
          name: t.description.slice(0, 48),
          due: t.date,
          amount: opex(t),
        })),
        managedSubscriptions,
        flowCommitments,
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
