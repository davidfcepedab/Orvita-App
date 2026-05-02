import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { isAppMockMode, isSupabaseEnabled, UI_SYNC_OFF_SHORT } from "@/lib/checkins/flags"
import {
  attachCatalogToStructuralCategories,
  buildStructuralCategories,
  recomputeStructuralTotals,
  splitStructuralCategoriesByCatalogExpenseType,
} from "@/lib/finanzas/deriveFromTransactions"
import { mockTransactionsForMonth } from "@/lib/finanzas/mockFinancePayloads"
import { computeRollingSixMonthByBudgetKey } from "@/lib/finanzas/categoryRollingSixMonth"
import { monthBounds, lastNMonthsInclusive } from "@/lib/finanzas/monthRange"
import {
  fetchHouseholdSubcategoryCatalogRows,
  fetchSubcategoryCatalogMerged,
} from "@/lib/finanzas/subcategoryCatalog"
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
      const monthsWin = lastNMonthsInclusive(month, 6)
      const allSix = monthsWin.flatMap((ym) => mockTransactionsForMonth(ym))
      const current = allSix.filter((r) => r.date >= startStr && r.date <= endStr)
      const previous = allSix.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr)
      const base = buildStructuralCategories(current, previous)
      const { structuralCategories: withCat } = attachCatalogToStructuralCategories(base.structuralCategories, [])
      const structuralCategories = splitStructuralCategoriesByCatalogExpenseType(withCat)
      const totals = recomputeStructuralTotals(structuralCategories)
      const rollingSixMonthByBudgetKey = computeRollingSixMonthByBudgetKey({
        anchorMonth: month,
        transactions: allSix,
        catalog: [],
      })
      return NextResponse.json({
        success: true,
        source: "mock",
        data: {
          ...base,
          ...totals,
          structuralCategories,
          subcategoryCatalog: [],
          unknownSubcategories: [],
          rollingSixMonthByBudgetKey,
        },
      })
    }

    if (!isSupabaseEnabled()) {
      return NextResponse.json({
        success: true,
        notice: UI_SYNC_OFF_SHORT,
        data: {
          structuralCategories: [],
          totalFixed: 0,
          totalVariable: 0,
          totalStructural: 0,
          subcategoryCatalog: [],
          unknownSubcategories: [],
          rollingSixMonthByBudgetKey: {},
        },
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const monthsWin = lastNMonthsInclusive(month, 6)
    const rangeStartRolling = monthBounds(monthsWin[0])!.startStr
    const rangeRows = await getTransactionsByRange(auth.supabase, rangeStartRolling, endStr)
    const current = rangeRows.filter((r) => r.date >= startStr && r.date <= endStr)
    const previous = rangeRows.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr)

    const base = buildStructuralCategories(current, previous)
    let catalog: Awaited<ReturnType<typeof fetchSubcategoryCatalogMerged>> = []
    let householdCatalog: Awaited<ReturnType<typeof fetchHouseholdSubcategoryCatalogRows>> = []
    try {
      catalog = await fetchSubcategoryCatalogMerged(auth.supabase, householdId)
      householdCatalog = await fetchHouseholdSubcategoryCatalogRows(auth.supabase, householdId)
    } catch (e) {
      console.warn("CATEGORIES: catalog fetch skipped:", e instanceof Error ? e.message : e)
    }
    const { structuralCategories: withCatalog, unknownSubcategories } = attachCatalogToStructuralCategories(
      base.structuralCategories,
      catalog,
    )
    const structuralCategories = splitStructuralCategoriesByCatalogExpenseType(withCatalog)
    const { totalFixed, totalVariable, totalStructural } = recomputeStructuralTotals(structuralCategories)
    const rollingSixMonthByBudgetKey = computeRollingSixMonthByBudgetKey({
      anchorMonth: month,
      transactions: rangeRows,
      catalog,
    })
    const data = {
      ...base,
      totalFixed,
      totalVariable,
      totalStructural,
      structuralCategories,
      subcategoryCatalog: householdCatalog,
      unknownSubcategories,
      rollingSixMonthByBudgetKey,
    }
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("CATEGORIES ERROR:", message)
    return NextResponse.json({ success: false, error: "Error cargando categorías" }, { status: 500 })
  }
}
