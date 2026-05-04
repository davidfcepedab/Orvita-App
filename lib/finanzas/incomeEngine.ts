/**
 * Motor único de lectura de “ingreso” y flujo en Órvita Capital.
 *
 * | Lectura | Rol | Usar en |
 * |--------|-----|---------|
 * | **operativo** (`createIncomeForMetricsFn` / `incomeAmountCashEconomy` / `total_income_operativo` en `finance_monthly_snapshots`) | Ingreso operativo real; excluye ingresos enlazados a cuentas `tarjeta_credito` (FK o etiqueta; en SQL el rebuild no aplica heurística last4 de descripción). | Overview, P&L, series de flujo, coherencia, KPI vía snapshot sin TX. |
 * | **extracto** (`incomeAmount`, `netCashFlow`) | Todo lo contabilizado como ingreso/egreso en movimientos. | Cuadre de cuentas, saldos, liquidez agregada, flujo “lo que movió el banco”. |
 *
 * Regla: KPIs de dirección y salud → operativo. KPIs de movimiento y saldo → extracto; etiquetar en UI.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import { expenseAmount, incomeAmount, netCashFlow } from "@/lib/finanzas/calculations/txMath"
import {
  createIncomeForMetricsFn,
  fetchLedgerTcRefs,
  type LedgerTcRef,
} from "@/lib/finanzas/incomeCashEconomy"

export { incomeAmount, expenseAmount, netCashFlow, createIncomeForMetricsFn, fetchLedgerTcRefs }
export type { LedgerTcRef }

export const IncomeEngine = {
  operativo: {
    /** Factory: requiere refs TC del hogar; sin TC devuelve `incomeAmount`. */
    createIncomeFn: createIncomeForMetricsFn,
  },
  extracto: {
    income: incomeAmount,
    expense: expenseAmount,
    netCashFlow,
  },
}

/** Ingreso operativo para el hogar (consulta cuentas TC en Supabase). */
export async function createIncomeForMetricsForHousehold(
  supabase: SupabaseClient,
  householdId: string,
): Promise<(tx: FinanceTransaction) => number> {
  const tcRefs = await fetchLedgerTcRefs(supabase, householdId)
  return createIncomeForMetricsFn(tcRefs)
}
