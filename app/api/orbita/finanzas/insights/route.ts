import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_SYNC_OFF_SHORT } from "@/lib/checkins/flags"
import { buildInsightsFromHistory } from "@/lib/finanzas/deriveFromTransactions"
import { eachMonthInclusive, rollingWindowStartYm } from "@/lib/finanzas/flowEvolutionBuckets"
import { mockTransactionsForMonth } from "@/lib/finanzas/mockFinancePayloads"
import { monthBounds } from "@/lib/finanzas/monthRange"
import { createOperativoExpenseFn } from "@/lib/finanzas/operativoExpense"
import { fetchSubcategoryCatalogMerged } from "@/lib/finanzas/subcategoryCatalog"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { getTransactionsByRange } from "@/lib/services/finanzasService"

export const runtime = "nodejs"

const INSIGHT_ROLLING_MONTHS = 6

export async function GET(req: NextRequest) {
  try {
    const month = req.nextUrl.searchParams.get("month")
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { success: false, error: "month requerido (YYYY-MM)" },
        { status: 400 },
      )
    }

    const months = eachMonthInclusive(rollingWindowStartYm(month, INSIGHT_ROLLING_MONTHS), month)
    const slices: { month: string; rows: FinanceTransaction[] }[] = []

    if (isAppMockMode()) {
      const opex = createOperativoExpenseFn([])
      for (const mk of months) {
        const b = monthBounds(mk)
        if (!b) continue
        const all = mockTransactionsForMonth(mk)
        const rows = all.filter((r) => r.date >= b.startStr && r.date <= b.endStr)
        slices.push({ month: mk, rows })
      }
      const data = buildInsightsFromHistory(slices, { expenseAmount: opex })
      return NextResponse.json({
        success: true,
        source: "mock",
        meta: {
          months: slices.length,
          throughMonth: month,
          basis: "operativo",
          catalogEntries: 0,
        },
        data,
      })
    }

    if (!isSupabaseEnabled()) {
      return NextResponse.json({
        success: true,
        notice: UI_SYNC_OFF_SHORT,
        data: null,
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    let catalogRows: Awaited<ReturnType<typeof fetchSubcategoryCatalogMerged>> = []
    try {
      catalogRows = await fetchSubcategoryCatalogMerged(auth.supabase, householdId)
    } catch (e) {
      console.warn("FINANCE INSIGHTS: catálogo no disponible", e)
    }
    const opex = createOperativoExpenseFn(catalogRows)

    for (const mk of months) {
      const b = monthBounds(mk)
      if (!b) continue
      const rows = await getTransactionsByRange(auth.supabase, b.startStr, b.endStr)
      slices.push({ month: mk, rows })
    }

    const data = buildInsightsFromHistory(slices, { expenseAmount: opex })
    return NextResponse.json({
      success: true,
      meta: {
        months: slices.length,
        throughMonth: month,
        basis: "operativo",
        catalogEntries: catalogRows.length,
      },
      data,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("INSIGHTS ERROR:", message)
    return NextResponse.json({ success: false, error: "Error cargando insights" }, { status: 500 })
  }
}
