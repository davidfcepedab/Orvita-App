export * from "./overview"

import type { FinanceTransaction } from "../types"

export function calculateSubtotal(
  transactions: FinanceTransaction[]
): number {
  return transactions.reduce(
    (acc, tx) => acc + Number(tx.amount),
    0
  )
}
