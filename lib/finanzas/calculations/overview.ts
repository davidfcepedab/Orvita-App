import type { FinanceTransaction } from "../types"
import { expenseAmount, incomeAmount, netCashFlow } from "./txMath"

export function calculateOverview(
  currentRows: FinanceTransaction[],
  previousRows: FinanceTransaction[],
) {
  const income = currentRows.reduce((a, b) => a + incomeAmount(b), 0)
  const expense = currentRows.reduce((a, b) => a + expenseAmount(b), 0)
  const net = netCashFlow(currentRows)

  const previousNet = previousRows.length > 0 ? netCashFlow(previousRows) : null

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
