import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_FINANCE_DEMO_NOTICE } from "@/lib/checkins/flags"
import { calculateOverview } from "@/lib/finanzas/calculations/overview"
import { computeFinanceMonthState } from "@/lib/finanzas/computeFinanceMonthState"
import { createOperativoExpenseFn } from "@/lib/finanzas/operativoExpense"
import {
  buildMonthlyFlowBuckets,
  eachMonthInclusive,
  rollingQuarterMonths,
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
import { dayFromIso } from "@/lib/finanzas/commitmentAnchorDate"
import { monthBounds } from "@/lib/finanzas/monthRange"
import { normalizeBillingFrequency } from "@/lib/finanzas/subscriptionBilling"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { getTransactionsByRange } from "@/lib/services/finanzasService"
import { flowCommitmentFromDbRow, type UserFlowCommitmentRow } from "@/lib/finanzas/flowCommitmentsDbMap"
import type { FlowCommitment } from "@/lib/finanzas/flowCommitmentsTypes"
import { normalizeUserSubscription } from "@/lib/finanzas/userSubscriptionsNormalize"
import type { SubscriptionStatus, UserSubscription } from "@/lib/finanzas/userSubscriptionsTypes"
import { excludeReconciliationFromOperativoAnalysis } from "@/lib/finanzas/reconciliationTxFilter"
import {
  buildFlowSeriesWithSnapshots,
  fetchSnapshotMapForMonths,
} from "@/lib/finanzas/rollingYearFlowSeries"

export const runtime = "nodejs"

type SubDbRow = {
  id: string
  name: string
  category: string
  amount_monthly: number | string
  renewal_date: string
  billing_frequency?: string | null
  renewal_day?: number | string | null
  include_in_simulator: boolean
  active: boolean
  status: string
  created_at?: string
  updated_at?: string
}

function mapManagedSubscription(r: SubDbRow): UserSubscription {
  const renewal_date =
    typeof r.renewal_date === "string" ? r.renewal_date.slice(0, 10) : String(r.renewal_date)
  const renewal_day =
    r.renewal_day != null && r.renewal_day !== ""
      ? Math.min(28, Math.max(1, Math.round(Number(r.renewal_day))))
      : dayFromIso(renewal_date)
  return normalizeUserSubscription({
    id: r.id,
    name: r.name,
    category: r.category,
    amount_monthly: Number(r.amount_monthly),
    renewal_date,
    billing_frequency: normalizeBillingFrequency(r.billing_frequency),
    renewal_day,
    include_in_simulator: r.include_in_simulator,
    active: r.active,
    status: r.status as SubscriptionStatus,
    created_at: r.created_at,
    updated_at: r.updated_at,
  })
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
      const curOp = excludeReconciliationFromOperativoAnalysis(currentRows)
      const prevOp = excludeReconciliationFromOperativoAnalysis(previousRows)
      const overview = calculateOverview(curOp, prevOp, { expenseAmount: opex })
      const weeklySeries = buildWeeklyBuckets(month, currentRows, opex, { allRowsForWeekWindow: all })
      const flowEvolution = {
        weeks: weeklySeries,
        quarter: buildMonthlyFlowBuckets(rollingQuarterMonths(month), all, opex),
        semester: buildMonthlyFlowBuckets(rollingSemesterMonths(month), all, opex),
        rollingYear: buildMonthlyFlowBuckets(rollingYearMonths(month), all, opex),
      }
      const subs = pickSubscriptionExpenses(currentRows, opex)
      const obls = pickObligationExpenses(currentRows, opex)
      return NextResponse.json({
        success: true,
        source: "mock",
        meta: {
          selectedMonth: month,
          lastTransactionDate: currentRows.length ? endStr.slice(0, 10) : null,
          lastTransactionUpdatedAt: new Date().toISOString(),
          transactionsInSelectedMonth: curOp.length,
          kpiSource: "transactions" as const,
          kpiHasSignal: overview.income > 0.5 || overview.expense > 0.5,
          reference: undefined as
            | { month: string; income: number; expense: number; balance: number }
            | undefined,
        },
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

    const monthState = await computeFinanceMonthState(
      auth.supabase,
      householdId,
      month,
      currentRows,
      previousRows,
    )
    const { overview, opex, snapshotKpiNotice, meta, hasOperativoCatalog } = monthState

    const weeklySeries = buildWeeklyBuckets(month, currentRows, opex, { allRowsForWeekWindow: rows })

    const quarterMonths = rollingQuarterMonths(month)
    const semesterMonths = rollingSemesterMonths(month)
    const rollingMonths = rollingYearMonths(month)
    const flowMonthsUnion = [...new Set([...quarterMonths, ...semesterMonths, ...rollingMonths])]
    const snapByYm = await fetchSnapshotMapForMonths(auth.supabase, householdId, flowMonthsUnion)
    const flowEvolution = {
      weeks: weeklySeries,
      quarter: buildFlowSeriesWithSnapshots(quarterMonths, rows, opex, hasOperativoCatalog, snapByYm),
      semester: buildFlowSeriesWithSnapshots(semesterMonths, rows, opex, hasOperativoCatalog, snapByYm),
      rollingYear: buildFlowSeriesWithSnapshots(rollingMonths, rows, opex, hasOperativoCatalog, snapByYm),
    }
    const subs = pickSubscriptionExpenses(currentRows, opex)
    const obls = pickObligationExpenses(currentRows, opex)

    const [{ data: managedSubData }, commitsRes] = await Promise.all([
      auth.supabase
        .from("user_subscriptions")
        .select("*")
        .eq("household_id", householdId)
        .order("renewal_date", { ascending: true }),
      auth.supabase
        .from("user_flow_commitments")
        .select(
          "id, household_id, title, category, subcategory, due_day, due_date, amount, flow_type, created_at, updated_at",
        )
        .eq("household_id", householdId)
        .order("due_day", { ascending: true })
        .order("title", { ascending: true }),
    ])

    const managedSubscriptions = ((managedSubData ?? []) as SubDbRow[]).map(mapManagedSubscription)

    let flowCommitments: FlowCommitment[] = []
    if (commitsRes.error) {
      console.warn("OVERVIEW: user_flow_commitments", commitsRes.error.message)
    } else {
      flowCommitments = ((commitsRes.data ?? []) as UserFlowCommitmentRow[]).map((r) =>
        flowCommitmentFromDbRow(r, month),
      )
    }

    return NextResponse.json({
      success: true,
      ...(snapshotKpiNotice ? { notice: snapshotKpiNotice } : {}),
      meta,
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
