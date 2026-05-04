import type { SupabaseClient } from "@supabase/supabase-js"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import { incomeAmount } from "@/lib/finanzas/calculations/txMath"
import { transactionMatchesLedgerAccount } from "@/lib/finanzas/ledgerAccountTxRollup"

/** Referencia mínima a una TC del ledger (`orbita_finance_accounts`). */
export type LedgerTcRef = { id: string; label: string }

/**
 * Ingreso “económico” para KPI tipo P&L: excluye importes marcados como ingreso pero **enlazados a una
 * tarjeta de crédito** (abonos, contracargos contabilizados como ingreso en la TC, etc.).
 * No es efectivo nuevo; el disponible de TC sigue modelándose en Capital / saldos por cuenta.
 */
export function incomeAmountCashEconomy(tx: FinanceTransaction, tcRefs: readonly LedgerTcRef[]): number {
  const base = incomeAmount(tx)
  if (base <= 0) return 0
  for (const r of tcRefs) {
    if (transactionMatchesLedgerAccount(tx, r.id, r.label)) return 0
  }
  return base
}

export function createIncomeForMetricsFn(tcRefs: readonly LedgerTcRef[]): (tx: FinanceTransaction) => number {
  if (tcRefs.length === 0) return incomeAmount
  return (tx) => incomeAmountCashEconomy(tx, tcRefs)
}

export async function fetchLedgerTcRefs(supabase: SupabaseClient, householdId: string): Promise<LedgerTcRef[]> {
  const { data: tcRows } = await supabase
    .from("orbita_finance_accounts")
    .select("id, label")
    .eq("household_id", householdId)
    .eq("account_class", "tarjeta_credito")
  return (tcRows ?? [])
    .map((r) => ({
      id: String((r as { id?: unknown }).id ?? "").trim(),
      label: String((r as { label?: unknown }).label ?? "").trim(),
    }))
    .filter((r) => r.id.length > 0)
}
