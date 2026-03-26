import type { FinanceTransaction } from "../types"

export function calculateOverview(
  currentRows: FinanceTransaction[],
  previousRows: FinanceTransaction[]
) {
  const income = currentRows
    .filter((r) => Number(r.amount) > 0)
    .reduce((a, b) => a + Number(b.amount), 0)

  const expense = Math.abs(
    currentRows
      .filter((r) => Number(r.amount) < 0)
      .reduce((a, b) => a + Number(b.amount), 0)
  )

  const net = currentRows.reduce((a, b) => a + Number(b.amount), 0)

  const previousNet =
    previousRows.length > 0
      ? previousRows.reduce((a, b) => a + Number(b.amount), 0)
      : null

  const deltaNet =
    previousNet !== null && previousNet !== 0
      ? ((net - previousNet) / Math.abs(previousNet)) * 100
      : null

  const savingsRate =
    income !== 0 ? (net / income) * 100 : 0

  // Runway mensual (cuántos meses podrías cubrir gasto actual con el net actual)
  const runway =
    expense > 0 && net > 0
      ? net / expense
      : 0

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
