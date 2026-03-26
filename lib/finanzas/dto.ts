import type { FinanceTransaction } from "./types"

export interface TransactionsResponse {
  success: true
  data: {
    transactions: FinanceTransaction[]
    subtotal: number
    previousSubtotal: number | null
    delta: number | null
  }
}

export interface ErrorResponse {
  success: false
  error: string
}
