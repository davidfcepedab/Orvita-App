import type { MonthFinanceCoherence } from "@/lib/finanzas/monthFinanceCoherence"

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
  /**
   * Base del ingreso mostrado en KPI/resumen principal del mes.
   * - `operativo_transactions`: desde TX del mes (incomeForMetrics).
   * - `operativo_snapshot`: sin TX del mes; ingreso desde `total_income_operativo` del cierre mensual.
   * - `extracto_snapshot`: fallback legacy si no existe columna operativo en snapshot (solo extracto).
   */
  kpiIncomeBasis?: "operativo_transactions" | "operativo_snapshot" | "extracto_snapshot"
  /** Hay ingresos o gasto operativo > 0.5 en el mes según la misma lógica que overview. */
  kpiHasSignal: boolean
  reference?: { month: string; income: number; expense: number; balance: number }
  /** Desglose del mes para explicar diferencias entre Movimientos, Categorías y Cuentas. */
  coherence?: MonthFinanceCoherence | null
}
