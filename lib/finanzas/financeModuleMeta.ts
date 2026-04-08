/**
 * Metadatos compartidos del módulo Capital (honestidad de datos, última actividad).
 * Usado por /api/orbita/finanzas/overview, /meta y el FinanceProvider.
 */
export type FinanceModuleMeta = {
  selectedMonth: string
  lastTransactionDate: string | null
  lastTransactionUpdatedAt: string | null
  transactionsInSelectedMonth: number
  kpiSource: "transactions" | "snapshot" | "empty"
  /** Hay ingresos o gasto operativo > 0.5 en el mes según la misma lógica que overview. */
  kpiHasSignal: boolean
  reference?: { month: string; income: number; expense: number; balance: number }
}
