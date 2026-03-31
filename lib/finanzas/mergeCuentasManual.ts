import type {
  CuentasCreditCard,
  CuentasDashboardPayload,
  CuentasLoanCard,
  CuentasSavingsCard,
} from "@/lib/finanzas/cuentasDashboard"
import { normalizeReplacesSyntheticId } from "@/lib/finanzas/cuentasCardLedgerLink"
import type { ManualFinanceBundle } from "@/lib/finanzas/manualFinanceLocal"

function ledgerIdMap<T extends { id: string }>(items: T[]) {
  return new Map(items.map((x) => [x.id, x]))
}

/**
 * Si un ítem manual sustituye una tarjeta `ledger-*` pero guardó saldo 0, el usuario deja de ver el
 * saldo derivado de movimientos (`finance_account_id` / etiqueta). Heredamos métricas del ledger
 * solo cuando el manual no aporta un monto positivo.
 */
function enrichManualCreditWithLedger(
  manual: CuentasCreditCard,
  byId: Map<string, CuentasCreditCard>,
): CuentasCreditCard {
  const rep = normalizeReplacesSyntheticId(manual.replacesSyntheticId)
  if (!rep?.startsWith("ledger-")) return manual
  const L = byId.get(rep)
  if (!L || Number(manual.balance) > 0) return manual
  if (Number(L.balance) <= 0) return manual
  const limit = Number(manual.limit) > 0 ? manual.limit : L.limit
  const usagePct =
    limit > 0 ? Math.min(100, Math.round((L.balance / limit) * 100)) : L.usagePct
  return {
    ...manual,
    balance: L.balance,
    usagePct,
    limit,
    paymentDueLabel: L.paymentDueLabel,
    paymentDay: L.paymentDay,
    score: L.score,
  }
}

function enrichManualSavingsWithLedger(
  manual: CuentasSavingsCard,
  byId: Map<string, CuentasSavingsCard>,
): CuentasSavingsCard {
  const rep = normalizeReplacesSyntheticId(manual.replacesSyntheticId)
  if (!rep?.startsWith("ledger-")) return manual
  const L = byId.get(rep)
  if (!L || Number(manual.amount) > 0) return manual
  if (Number(L.amount) <= 0) return manual
  return {
    ...manual,
    amount: L.amount,
    healthPct: L.healthPct,
    trendUp: L.trendUp,
  }
}

function enrichManualLoanWithLedger(
  manual: CuentasLoanCard,
  byId: Map<string, CuentasLoanCard>,
): CuentasLoanCard {
  const rep = normalizeReplacesSyntheticId(manual.replacesSyntheticId)
  if (!rep?.startsWith("ledger-")) return manual
  const L = byId.get(rep)
  if (!L || Number(manual.saldoPendiente) > 0) return manual
  if (Number(L.saldoPendiente) <= 0) return manual
  return {
    ...manual,
    saldoPendiente: L.saldoPendiente,
    pctPagado: L.pctPagado,
    cuotaMensual: L.cuotaMensual,
    montoOriginal: L.montoOriginal,
    abonadoMonto: L.abonadoMonto,
    proximoPagoLabel: L.proximoPagoLabel,
  }
}

/**
 * Capa de presentación sobre `buildCuentasDashboard`: añade/reemplaza tarjetas de ahorro, TC y créditos
 * definidas por el usuario (`household_finance_manual_items` o localStorage). No altera snapshots ni TX en BD.
 *
 * Los movimientos se atribuyen a cuentas por `finance_account_id` (prioritario) o `account_label` / últimos 4.
 * Si un ítem manual oculta la tarjeta ledger con `replacesSyntheticId` y trae saldo 0, se reutiliza el saldo
 * calculado del ledger para no perder el vínculo por ID en la vista.
 */
export function mergeCuentasDashboard(
  base: CuentasDashboardPayload,
  manual: ManualFinanceBundle,
): CuentasDashboardPayload {
  const hide = new Set(manual.hiddenSyntheticIds)
  const mark = (row: { replacesSyntheticId?: string }) => {
    const n = normalizeReplacesSyntheticId(row.replacesSyntheticId)
    if (n) hide.add(n)
  }
  for (const s of manual.savings) mark(s)
  for (const c of manual.creditCards) mark(c)
  for (const l of manual.loans) mark(l)

  const savingsById = ledgerIdMap(base.savings)
  const creditById = ledgerIdMap(base.creditCards)
  const loanById = ledgerIdMap(base.loans)

  const savingsPatched = manual.savings.map((s) => enrichManualSavingsWithLedger(s, savingsById))
  const creditPatched = manual.creditCards.map((c) => enrichManualCreditWithLedger(c, creditById))
  const loanPatched = manual.loans.map((l) => enrichManualLoanWithLedger(l, loanById))

  return {
    ...base,
    savings: [...base.savings.filter((s) => !hide.has(s.id)), ...savingsPatched],
    creditCards: [...base.creditCards.filter((c) => !hide.has(c.id)), ...creditPatched],
    loans: [...base.loans.filter((l) => !hide.has(l.id)), ...loanPatched],
  }
}
