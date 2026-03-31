import { computeDisponibleCuenta } from "@/lib/finanzas/accountBalanceTypes"

/** Disponible aproximado para filas ledger sin recalcular movimientos del mes (lista compacta). */
export function quickDisponibleFromLedgerRow(a: {
  account_class: string
  credit_limit?: number | null
  balance_used?: number | null
  balance_available?: number | null
  manual_balance?: number | null
  manual_balance_on?: string | null
  creditos_extras?: number | null
  balance_reconciliation_adjustment?: number | null
}): number {
  const extras = Math.max(0, Number(a.creditos_extras ?? 0))
  const adj = Number(a.balance_reconciliation_adjustment ?? 0)

  if (a.account_class === "ahorro") {
    const manualRaw = a.manual_balance != null ? Number(a.manual_balance) : NaN
    const availRaw = a.balance_available != null ? Number(a.balance_available) : NaN
    const manualExplicit =
      a.manual_balance != null &&
      Number.isFinite(manualRaw) &&
      (manualRaw !== 0 || Boolean(a.manual_balance_on?.trim()))
    let uso = 0
    if (manualExplicit) uso = Math.max(0, manualRaw)
    else if (Number.isFinite(availRaw)) uso = Math.max(0, availRaw)
    return computeDisponibleCuenta(0, uso, extras, adj)
  }

  if (a.account_class === "tarjeta_credito") {
    const cupo = Math.max(0, Number(a.credit_limit ?? 0))
    const debt = Math.max(0, Number(a.balance_used ?? 0))
    return computeDisponibleCuenta(cupo, -debt, extras, adj)
  }

  if (a.account_class === "credito") {
    const cupo = Math.max(0, Number(a.credit_limit ?? 0))
    const saldo = Math.max(0, Number(a.balance_used ?? a.manual_balance ?? 0))
    return computeDisponibleCuenta(cupo, -saldo, extras, adj)
  }

  return computeDisponibleCuenta(0, 0, extras, adj)
}
