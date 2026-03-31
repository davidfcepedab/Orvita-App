import type { FinanceTransaction } from "@/lib/finanzas/types"
import { normalizeFinanceAccountLabel } from "@/lib/finanzas/ledgerAccountTxRollup"

/** Fila mínima de `orbita_finance_accounts` para ordenar en UI/API. */
export type LedgerAccountSortable = {
  id: string
  label: string
  account_class: string
  nature: string
  sort_order?: number | null
  credit_limit?: number | null
  balance_used?: number | null
  balance_available?: number | null
  manual_balance?: number | null
  manual_balance_on?: string | null
  creditos_extras?: number | null
  balance_reconciliation_adjustment?: number | null
  reconciliation_note?: string | null
}

const ACCOUNT_CLASS_RANK: Record<string, number> = {
  ahorro: 0,
  tarjeta_credito: 1,
  credito: 2,
}

function classRank(c: string): number {
  return ACCOUNT_CLASS_RANK[c] ?? 99
}

/** Saldo “relevante” para desempate visual (mayor magnitud = más visible arriba en activos; pasivos por uso). */
export function ledgerEffectiveBalanceMagnitude(a: LedgerAccountSortable): number {
  const manual = a.manual_balance != null ? Number(a.manual_balance) : NaN
  if (Number.isFinite(manual) && manual !== 0) return Math.abs(manual)
  if (a.account_class === "ahorro") {
    const avail = a.balance_available != null ? Number(a.balance_available) : 0
    return Number.isFinite(avail) ? Math.abs(avail) : 0
  }
  const used = a.balance_used != null ? Number(a.balance_used) : 0
  return Number.isFinite(used) ? Math.abs(used) : 0
}

/**
 * Cuenta movimientos del mes por `finance_account_id` y, si no hay id, por etiqueta normalizada
 * (coherente con importaciones que solo rellenan `account_label`).
 */
export function buildLedgerTxCounts(rows: FinanceTransaction[]): {
  byId: Map<string, number>
  byLabel: Map<string, number>
} {
  const byId = new Map<string, number>()
  const byLabel = new Map<string, number>()
  for (const r of rows) {
    const id = r.finance_account_id?.trim()
    if (id) {
      byId.set(id, (byId.get(id) ?? 0) + 1)
    } else {
      const lab = normalizeFinanceAccountLabel(r.account_label ?? "")
      if (lab) {
        byLabel.set(lab, (byLabel.get(lab) ?? 0) + 1)
      }
    }
  }
  return { byId, byLabel }
}

function txCountForAccount(
  a: LedgerAccountSortable,
  byId: Map<string, number>,
  byLabel: Map<string, number>,
): number {
  const idC = byId.get(a.id) ?? 0
  const labelC = byLabel.get(normalizeFinanceAccountLabel(a.label)) ?? 0
  return Math.max(idC, labelC)
}

/**
 * Orden: sort_order (usuario/BD) → tipo de cuenta → saldo relevante → uso en el mes → etiqueta.
 */
export function sortLedgerAccountsForDisplay<T extends LedgerAccountSortable>(
  accounts: T[],
  monthRows: FinanceTransaction[],
): T[] {
  const { byId, byLabel } = buildLedgerTxCounts(monthRows)
  return [...accounts].sort((a, b) => {
    const soA = Number(a.sort_order ?? 0)
    const soB = Number(b.sort_order ?? 0)
    if (soA !== soB) return soA - soB

    const crA = classRank(a.account_class)
    const crB = classRank(b.account_class)
    if (crA !== crB) return crA - crB

    const balA = ledgerEffectiveBalanceMagnitude(a)
    const balB = ledgerEffectiveBalanceMagnitude(b)
    if (balA !== balB) return balB - balA

    const uA = txCountForAccount(a, byId, byLabel)
    const uB = txCountForAccount(b, byId, byLabel)
    if (uA !== uB) return uB - uA

    return a.label.localeCompare(b.label, "es", { sensitivity: "base" })
  })
}
