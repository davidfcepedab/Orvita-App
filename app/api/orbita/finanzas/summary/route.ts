import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/lib/api/requireUser"

function getCurrentMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

function getPreviousMonth() {
  const now = new Date()
  now.setMonth(now.getMonth() - 1)
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await requireUser(req)
    if (auth instanceof NextResponse) return auth

    const { supabase } = auth
    const { year: currentYear, month: currentMonth } = getCurrentMonth()
    const { year: previousYear, month: previousMonth } = getPreviousMonth()

    const { data: currentSnapshot } = await supabase
      .from("finance_monthly_snapshots")
      .select("*")
      .eq("year", currentYear)
      .eq("month", currentMonth)
      .maybeSingle()

    const { data: previousSnapshot } = await supabase
      .from("finance_monthly_snapshots")
      .select("*")
      .eq("year", previousYear)
      .eq("month", previousMonth)
      .maybeSingle()

    const total_income_current = currentSnapshot?.total_income ?? 0
    const total_expense_current = currentSnapshot?.total_expense ?? 0
    const balance_current = currentSnapshot?.balance ?? 0

    const total_income_previous = previousSnapshot?.total_income ?? 0
    const total_expense_previous = previousSnapshot?.total_expense ?? 0
    const balance_previous = previousSnapshot?.balance ?? 0

    const delta_income = total_income_current - total_income_previous
    const delta_expense = total_expense_current - total_expense_previous
    const delta_balance = balance_current - balance_previous

    const startOfMonth = new Date(currentYear, currentMonth - 1, 1).toISOString()

    const { data: expenseByCategory } = await supabase
      .from("orbita_finance_transactions")
      .select("category, amount")
      .eq("type", "expense")
      .gte("date", startOfMonth)

    const { data: incomeByCategory } = await supabase
      .from("orbita_finance_transactions")
      .select("category, amount")
      .eq("type", "income")
      .gte("date", startOfMonth)

    return NextResponse.json({
      success: true,
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
        expenseByCategory,
        incomeByCategory,
      },
    })
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error calculando summary"

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
