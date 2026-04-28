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
  /** Origen automático (p. ej. belvo) — ver migración `orbita_finance_tx_belvo_sync`. */
  sync_source?: string | null
  sync_external_id?: string | null
}
