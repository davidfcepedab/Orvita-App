export * from "./overview"
export * from "./txMath"

import type { FinanceTransaction } from "../types"
import { netCashFlow } from "./txMath"

/** Flujo neto del conjunto de transacciones (ingresos − gastos). */
export function calculateSubtotal(transactions: FinanceTransaction[]): number {
  return netCashFlow(transactions)
}
