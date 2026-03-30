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
import { monthBounds } from "@/lib/finanzas/monthRange"
import { fetchSubcategoryCatalogMerged } from "@/lib/finanzas/subcategoryCatalog"
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
      const all = mockTransactionsForMonth(month)
      const current = all.filter((r) => r.date >= startStr && r.date <= endStr)
      const previous = all.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr)
      const base = buildStructuralCategories(current, previous)
      const { structuralCategories: withCat } = attachCatalogToStructuralCategories(base.structuralCategories, [])
      const structuralCategories = splitStructuralCategoriesByCatalogExpenseType(withCat)
      const totals = recomputeStructuralTotals(structuralCategories)
      return NextResponse.json({
        success: true,
        source: "mock",
        data: {
          ...base,
          ...totals,
          structuralCategories,
          subcategoryCatalog: [],
          unknownSubcategories: [],
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
        },
      })
    }

    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const householdId = await getHouseholdId(auth.supabase, auth.userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const rangeRows = await getTransactionsByRange(auth.supabase, prevStartStr, endStr)
    const current = rangeRows.filter((r) => r.date >= startStr && r.date <= endStr)
    const previous = rangeRows.filter((r) => r.date >= prevStartStr && r.date <= prevEndStr)

    const base = buildStructuralCategories(current, previous)
    let catalog: Awaited<ReturnType<typeof fetchSubcategoryCatalogMerged>> = []
    try {
      catalog = await fetchSubcategoryCatalogMerged(auth.supabase, householdId)
    } catch (e) {
      console.warn("CATEGORIES: catalog fetch skipped:", e instanceof Error ? e.message : e)
    }
    const { structuralCategories: withCatalog, unknownSubcategories } = attachCatalogToStructuralCategories(
      base.structuralCategories,
      catalog,
    )
    const structuralCategories = splitStructuralCategoriesByCatalogExpenseType(withCatalog)
    const { totalFixed, totalVariable, totalStructural } = recomputeStructuralTotals(structuralCategories)
    const data = {
      ...base,
      totalFixed,
      totalVariable,
      totalStructural,
      structuralCategories,
      subcategoryCatalog: catalog,
      unknownSubcategories,
    }
    return NextResponse.json({ success: true, data })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error"
    console.error("CATEGORIES ERROR:", message)
    return NextResponse.json({ success: false, error: "Error cargando categorías" }, { status: 500 })
  }
}
