import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"
import { getHouseholdId } from "@/lib/households/getHouseholdId"

export const runtime = "nodejs"

function pad2(n: number) {
  return String(n).padStart(2, "0")
}

function monthBounds(y: number, m: number) {
  const startStr = `${y}-${pad2(m)}-01`
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const endStr = `${y}-${pad2(m)}-${pad2(lastDay)}`
  return { startStr, endStr }
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

    const { data: currentSnapshot } = await supabase
      .from("finance_monthly_snapshots")
      .select("*")
      .eq("household_id", householdId)
      .eq("year", currentYear)
      .eq("month", currentMonth)
      .maybeSingle()

    const { data: previousSnapshot } = await supabase
      .from("finance_monthly_snapshots")
      .select("*")
      .eq("household_id", householdId)
      .eq("year", previousYear)
      .eq("month", previousMonth)
      .maybeSingle()

    const total_income_current = Number(currentSnapshot?.total_income ?? 0)
    const total_expense_current = Number(currentSnapshot?.total_expense ?? 0)
    const balance_current = Number(currentSnapshot?.balance ?? 0)

    const total_income_previous = Number(previousSnapshot?.total_income ?? 0)
    const total_expense_previous = Number(previousSnapshot?.total_expense ?? 0)
    const balance_previous = Number(previousSnapshot?.balance ?? 0)

    const delta_income = total_income_current - total_income_previous
    const delta_expense = total_expense_current - total_expense_previous
    const delta_balance = balance_current - balance_previous

    const { startStr, endStr } = monthBounds(currentYear, currentMonth)

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
        month: `${currentYear}-${pad2(currentMonth)}`,
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
