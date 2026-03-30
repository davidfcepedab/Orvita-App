import type { FinanceTransaction } from "@/lib/finanzas/types"
import { netCashFlow } from "@/lib/finanzas/calculations/txMath"

/**
 * Base de liquidez compartida entre dashboard de Cuentas y cuentas sintéticas:
 * prioriza `finance_monthly_snapshots.balance` del mes si existe; si no, flujo neto del mes en TX.
 * (Misma regla que el overview cuando no hay fallback solo-snapshot en KPI.)
 */
export function householdLiquidityRawFromSnapshot(
  snapshotBalance: number | null,
  monthTransactions: FinanceTransaction[],
): number {
  const net = netCashFlow(monthTransactions)
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
