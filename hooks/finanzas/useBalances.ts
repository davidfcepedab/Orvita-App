"use client"

import { useMemo } from "react"
import { computeStrategicBalances } from "@/lib/finanzas/computeStrategicBalances"
import type { StrategicBalancesResult } from "@/lib/finanzas/accountBalanceTypes"
import type {
  CuentasCreditCard,
  CuentasLoanCard,
  CuentasSavingsCard,
} from "@/lib/finanzas/cuentasDashboard"

export type UseBalancesInput = {
  /** YYYY-MM del selector global (`useFinance().month`). */
  month: string
  savings: CuentasSavingsCard[]
  creditCards: CuentasCreditCard[]
  loans: CuentasLoanCard[]
  /** Compromisos aún no ejecutados (futuro: flag en transacciones). */
  pendienteOutflows?: number
  /** Ingresos − gastos programados en horizonte (p. ej. 30–90 días desde simulador / overview). */
  deltaProyectadoHorizonte?: number
  /** Opcional: invalidar memo cuando `touchCapitalData()` incrementa epoch en el mismo render pass. */
  capitalEpoch?: number
}

/**
 * Saldos estratégicos Órvita — siempre derivados en cliente (no persistir totales agregados).
 * Usar junto con `FinanceProvider` / `useFinance()` pasando el mismo `month`.
 */
export function useBalances(input: UseBalancesInput): StrategicBalancesResult {
  return useMemo(() => {
    return computeStrategicBalances(input.savings, input.creditCards, input.loans, {
      pendienteOutflows: input.pendienteOutflows,
      deltaProyectado: input.deltaProyectadoHorizonte,
    })
  }, [
    input.month,
    input.capitalEpoch,
    input.savings,
    input.creditCards,
    input.loans,
    input.pendienteOutflows,
    input.deltaProyectadoHorizonte,
  ])
}
