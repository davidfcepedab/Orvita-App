import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { computeFinanceMonthState } from "@/lib/finanzas/computeFinanceMonthState"
import { monthBounds } from "@/lib/finanzas/monthRange"
import { getHouseholdId } from "@/lib/households/getHouseholdId"
import { getTransactionsByRange } from "@/lib/services/finanzasService"

export const runtime = "nodejs"

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

/** Mes anterior calendario (y, m) con m en 1..12 */
function previousCalendarMonth(y: number, m: number) {
  const d = new Date(Date.UTC(y, m - 2, 1))
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }
}

function parseMonthYm(s: string | null): { year: number; month: number } | null {
  if (!s || !/^\d{4}-\d{2}$/.test(s)) return null
  const [ys, ms] = s.split("-").map(Number)
  if (ms < 1 || ms > 12) return null
  return { year: ys, month: ms }
}

function ymKey(year: number, month: number) {
  return `${year}-${pad2(month)}`
}

async function monthOverviewForSummary(
  supabase: Parameters<typeof computeFinanceMonthState>[0],
  householdId: string,
  year: number,
  month: number,
) {
  const key = ymKey(year, month)
  const b = monthBounds(key)
  if (!b) {
    throw new Error("Mes inválido")
  }
  const rows = await getTransactionsByRange(supabase, b.prevStartStr, b.endStr, { householdId })
  const currentRows = rows.filter((r) => r.date >= b.startStr && r.date <= b.endStr)
  const previousRows = rows.filter((r) => r.date >= b.prevStartStr && r.date <= b.prevEndStr)
  const state = await computeFinanceMonthState(supabase, householdId, key, currentRows, previousRows)
  return {
    income: state.overview.income,
    expense: state.overview.expense,
    net: state.overview.net,
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const { supabase, userId } = auth
    const householdId = await getHouseholdId(supabase, userId)
    if (!householdId) {
      return NextResponse.json({ success: false, error: "Usuario sin hogar asignado" }, { status: 403 })
    }

    const monthParam = req.nextUrl.searchParams.get("month")
    const now = new Date()
    const defaultYm = { year: now.getFullYear(), month: now.getMonth() + 1 }
    const anchor = parseMonthYm(monthParam) ?? defaultYm
    const { year: currentYear, month: currentMonth } = anchor
    const { year: previousYear, month: previousMonth } = previousCalendarMonth(currentYear, currentMonth)

    const currentKey = ymKey(currentYear, currentMonth)
    const bCur = monthBounds(currentKey)
    if (!bCur) {
      return NextResponse.json({ success: false, error: "Mes inválido" }, { status: 400 })
    }

    const [curOv, prevOv] = await Promise.all([
      monthOverviewForSummary(supabase, householdId, currentYear, currentMonth),
      monthOverviewForSummary(supabase, householdId, previousYear, previousMonth),
    ])

    const total_income_current = curOv.income
    const total_expense_current = curOv.expense
    const balance_current = curOv.net

    const total_income_previous = prevOv.income
    const total_expense_previous = prevOv.expense
    const balance_previous = prevOv.net

    const delta_income = total_income_current - total_income_previous
    const delta_expense = total_expense_current - total_expense_previous
    const delta_balance = balance_current - balance_previous

    const { startStr, endStr } = bCur

    const { data: expenseByCategory } = await supabase
      .from("orbita_finance_transactions")
      .select("category, amount")
      .eq("household_id", householdId)
      .eq("type", "expense")
      .gte("date", startStr)
      .lte("date", endStr)
      .is("deleted_at", null)

    const { data: incomeByCategory } = await supabase
      .from("orbita_finance_transactions")
      .select("category, amount")
      .eq("household_id", householdId)
      .eq("type", "income")
      .gte("date", startStr)
      .lte("date", endStr)
      .is("deleted_at", null)

    return NextResponse.json({
      success: true,
      meta: {
        household_id: householdId,
        month: currentKey,
      },
      summary: {
        total_income_current,
        total_expense_current,
        balance_current,
        total_income_previous,
        total_expense_previous,
        balance_previous,
        delta_income,
        delta_expense,
        delta_balance,
      },
      breakdown: {
        expenseByCategory: expenseByCategory ?? [],
        incomeByCategory: incomeByCategory ?? [],
      },
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error calculando summary"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
