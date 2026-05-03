import type { SupabaseClient } from "@supabase/supabase-js"
import type { FinanceTransaction } from "@/lib/finanzas/types"

export type LiveBelvoAnchors = {
  financeAccountIds: Set<string>
  ledgerLabelsLower: Set<string>
}

type RpcRow = { finance_account_id?: string | null; ledger_label?: string | null }

/**
 * Cuentas bancarias conectadas del hogar (todos los miembros) vía RPC SECURITY DEFINER.
 * Devuelve null si el RPC no existe aún (migración pendiente): el caller no filtra Belvo.
 */
export async function fetchLiveBelvoAnchors(
  supabase: SupabaseClient,
  householdId: string,
): Promise<LiveBelvoAnchors | null> {
  const { data, error } = await supabase.rpc("household_bank_belvo_ledger_anchors", {
    p_household: householdId,
  })
  if (error) {
    if (
      /not exist|could not find|PGRST202|42883|schema cache|not authenticated|household mismatch/i.test(
        error.message,
      )
    ) {
      console.warn("[belvo anchors rpc]", error.message)
      return null
    }
    throw new Error(error.message)
  }
  const financeAccountIds = new Set<string>()
  const ledgerLabelsLower = new Set<string>()
  for (const row of (data ?? []) as RpcRow[]) {
    const fid = typeof row.finance_account_id === "string" ? row.finance_account_id.trim() : ""
    if (fid) financeAccountIds.add(fid)
    const lb = typeof row.ledger_label === "string" ? row.ledger_label.trim().toLowerCase() : ""
    if (lb) ledgerLabelsLower.add(lb)
  }
  return { financeAccountIds, ledgerLabelsLower }
}

function accountLabelLower(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase()
}

/** Oculta movimientos Belvo sin enlace vivo a una cuenta bancaria conectada del hogar. */
export function filterBelvoOrphanTransactions(
  txs: FinanceTransaction[],
  anchors: LiveBelvoAnchors | null,
): FinanceTransaction[] {
  if (!anchors) return txs
  const hasLiveBank = anchors.financeAccountIds.size > 0 || anchors.ledgerLabelsLower.size > 0
  return txs.filter((tx) => {
    if (tx.sync_source !== "belvo") return true
    if (!hasLiveBank) return false
    const fid = (tx.finance_account_id ?? "").trim()
    if (fid && anchors.financeAccountIds.has(fid)) return true
    const al = accountLabelLower(tx.account_label)
    if (al && anchors.ledgerLabelsLower.has(al)) return true
    return false
  })
}

/** Cuentas del catálogo que tienen actividad distinta de sync Belvo (p. ej. hoja / manual). */
export function buildNonBelvoFinanceAccountIdsFromTransactions(txs: FinanceTransaction[]): Set<string> {
  const s = new Set<string>()
  for (const t of txs) {
    const id = (t.finance_account_id ?? "").trim()
    if (!id) continue
    if (t.sync_source !== "belvo") s.add(id)
  }
  return s
}

export type LedgerRowBelvoFilter = {
  id: string
  manual_balance?: number | null
  manual_balance_on?: string | null
}

/**
 * Quita filas del catálogo que solo existían para Belvo y ya no tienen banco enlazado
 * ni otra actividad en el ledger (ni saldos manuales).
 */
export function filterLedgerRowsWithDeadBelvoLinks<T extends LedgerRowBelvoFilter>(
  ledgerRows: T[],
  anchors: LiveBelvoAnchors | null,
  nonBelvoFinanceAccountIds: Set<string>,
): T[] {
  if (!anchors) return ledgerRows
  return ledgerRows.filter((row) => {
    if (anchors.financeAccountIds.has(row.id)) return true
    if (nonBelvoFinanceAccountIds.has(row.id)) return true
    const mbon = row.manual_balance_on
    if (mbon != null && String(mbon).trim() !== "") return true
    const mb = row.manual_balance
    if (mb != null && Number.isFinite(Number(mb)) && Number(mb) !== 0) return true
    return false
  })
}
