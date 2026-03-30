import type { FinanceTransaction } from "../types"
import { expenseAmount, incomeAmount } from "./txMath"

export type OverviewExpenseMode = {
  /** Por defecto: todo gasto marcado como expense en TX. */
  expenseAmount?: (tx: FinanceTransaction) => number
}

export function calculateOverview(
  currentRows: FinanceTransaction[],
  previousRows: FinanceTransaction[],
  options?: OverviewExpenseMode,
) {
  const expFn = options?.expenseAmount ?? expenseAmount
  const income = currentRows.reduce((a, b) => a + incomeAmount(b), 0)
  const expense = currentRows.reduce((a, b) => a + expFn(b), 0)
  const net = income - expense

  const previousNet =
    previousRows.length > 0
      ? previousRows.reduce((a, b) => a + incomeAmount(b), 0) -
        previousRows.reduce((a, b) => a + expFn(b), 0)
      : null

  const deltaNet =
    previousNet !== null && Math.abs(previousNet) > 1e-6
      ? ((net - previousNet) / Math.abs(previousNet)) * 100
      : null

  const savingsRate = income !== 0 ? (net / income) * 100 : 0

  const runway = expense > 0 && net > 0 ? net / expense : 0

  return {
    income,
    expense,
    net,
    savingsRate,
    previousNet,
    deltaNet,
    runway,
  }
}
