import type { FinanceTransaction } from "@/lib/finanzas/types"
import { netCashFlow } from "@/lib/finanzas/calculations/txMath"

/**
 * Base del KPI «Total liquidez» (y cuentas sintéticas) en Cuentas.
 *
 * Si hay movimientos del mes en memoria, el valor es el **flujo neto** (ingresos − gastos), igual que
 * el subtotal de Movimientos **sin filtros**. Así se evita desfase con importaciones cuando el snapshot
 * mensual (`finance_monthly_snapshots`) va rezagado o falló el RPC `rebuild_month_snapshot`.
 *
 * Solo si **no** hay movimientos en el mes se usa `snapshotBalance` como respaldo (p. ej. mes cerrado solo en snapshot).
 */
export function householdLiquidityRawFromSnapshot(
  snapshotBalance: number | null,
  monthTransactions: FinanceTransaction[],
): number {
  const net = netCashFlow(monthTransactions)
  if (monthTransactions.length > 0) {
    return net
  }
  if (typeof snapshotBalance === "number" && Number.isFinite(snapshotBalance)) {
    return snapshotBalance
  }
  return net
}

/** Valor no negativo redondeado para KPI “Total liquidez” y reparto en tarjetas de ahorro sintéticas. */
export function householdLiquidezDisplayRounded(
  snapshotBalance: number | null,
  monthTransactions: FinanceTransaction[],
): number {
  const raw = householdLiquidityRawFromSnapshot(snapshotBalance, monthTransactions)
  return Math.max(0, Math.round(raw))
}
