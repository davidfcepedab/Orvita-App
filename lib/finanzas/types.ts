export type FinanceTxType = "income" | "expense"

export interface FinanceTransaction {
  id: string
  profile_id?: string
  household_id?: string
  date: string
  description: string
  /** Positivo (v2 hardening en BD). */
  amount: number
  type?: FinanceTxType
  category: string
  subcategory?: string | null
  /** Texto de la columna Cuenta en la hoja Movimientos. */
  account_label?: string | null
  finance_account_id?: string | null
  currency?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}
