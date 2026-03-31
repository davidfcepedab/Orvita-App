import type {
  CuentasCreditCard,
  CuentasDashboardPayload,
  CuentasLoanCard,
  CuentasSavingsCard,
  FuenteDatosCuenta,
} from "@/lib/finanzas/cuentasDashboard"
import { normalizeReplacesSyntheticId } from "@/lib/finanzas/cuentasCardLedgerLink"
import { applyInitialCreditCardSeed } from "@/lib/finanzas/creditCardReconciliationSeed"
import type { ManualFinanceBundle } from "@/lib/finanzas/manualFinanceLocal"

function ledgerIdMap<T extends { id: string }>(items: T[]) {
  return new Map(items.map((x) => [x.id, x]))
}

/** Umbral conciliación silenciosa: < 5% y < $500k COP. */
const AUTO_RECONCILE_MAX_ABS = 500_000
const AUTO_RECONCILE_MAX_REL = 0.05

function isSmallDifference(a: number, b: number): boolean {
  const diff = Math.abs(a - b)
  const denom = Math.max(Math.abs(a), Math.abs(b), 1)
  return diff < AUTO_RECONCILE_MAX_ABS && diff / denom < AUTO_RECONCILE_MAX_REL
}

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function buildCreditFromLedger(
  L: CuentasCreditCard,
  manual: CuentasCreditCard,
  meta: {
    fuenteDatos: FuenteDatosCuenta
    diferenciaReconciliacion?: number
    fechaUltimaReconciliacion?: string | null
    conciliacionPendiente?: boolean
  },
): CuentasCreditCard {
  const limit = Number(manual.limit) > 0 ? manual.limit : L.limit
  const balance = L.balance
  const usagePct = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : L.usagePct
  return {
    ...manual,
    balance,
    limit,
    usagePct,
    paymentDueLabel: L.paymentDueLabel,
    paymentDay: L.paymentDay,
    score: L.score,
    cupo: L.cupo ?? limit,
    uso: L.uso ?? -balance,
    creditosExtras: L.creditosExtras,
    ajusteManual: L.ajusteManual,
    fechaUltimaReconciliacion: meta.fechaUltimaReconciliacion ?? L.fechaUltimaReconciliacion,
    disponibleOperativoLine: L.disponibleOperativoLine,
    fuenteDatos: meta.fuenteDatos,
    diferenciaReconciliacion: meta.diferenciaReconciliacion,
    conciliacionPendiente: meta.conciliacionPendiente ?? false,
  }
}

/**
 * Prioridad: ledger (catálogo + movimientos) salvo `manualFinancialOverride`.
 * Diferencia pequeña → alinear a ledger con `ajuste-auto` (menos fricción con el tiempo).
 * Diferencia grande → mostrar ledger pero `conciliacionPendiente` para que la UI avise.
 */
function enrichManualCreditWithLedger(
  manual: CuentasCreditCard,
  byId: Map<string, CuentasCreditCard>,
): CuentasCreditCard {
  const rep = normalizeReplacesSyntheticId(manual.replacesSyntheticId)
  if (!rep?.startsWith("ledger-")) {
    return {
      ...manual,
      fuenteDatos: manual.fuenteDatos ?? (manual.manualFinancialOverride ? "manual" : undefined),
    }
  }

  const L = byId.get(rep)
  if (!L) {
    return {
      ...manual,
      fuenteDatos: manual.fuenteDatos ?? (manual.manualFinancialOverride ? "manual" : "ledger"),
    }
  }

  if (manual.manualFinancialOverride) {
    const lim = Math.max(1, manual.limit)
    const bal = Math.max(0, manual.balance)
    return {
      ...manual,
      usagePct: Math.min(100, Math.round((bal / lim) * 100)),
      fuenteDatos: "manual",
      diferenciaReconciliacion: bal - L.balance,
      conciliacionPendiente: false,
    }
  }

  const mb = Number(manual.balance)
  const lb = Number(L.balance)

  if (mb === 0 && lb > 0) {
    return buildCreditFromLedger(L, manual, {
      fuenteDatos: "ledger",
      diferenciaReconciliacion: mb - lb,
      conciliacionPendiente: false,
    })
  }

  if (lb === 0 && mb > 0) {
    return {
      ...manual,
      fuenteDatos: "manual",
      diferenciaReconciliacion: mb - lb,
      conciliacionPendiente: true,
    }
  }

  if (isSmallDifference(mb, lb)) {
    return buildCreditFromLedger(L, manual, {
      fuenteDatos: "ajuste-auto",
      diferenciaReconciliacion: mb - lb,
      fechaUltimaReconciliacion: todayIso(),
      conciliacionPendiente: false,
    })
  }

  return buildCreditFromLedger(L, manual, {
    fuenteDatos: "ledger",
    diferenciaReconciliacion: mb - lb,
    conciliacionPendiente: true,
  })
}

function enrichManualSavingsWithLedger(
  manual: CuentasSavingsCard,
  byId: Map<string, CuentasSavingsCard>,
): CuentasSavingsCard {
  const rep = normalizeReplacesSyntheticId(manual.replacesSyntheticId)
  if (!rep?.startsWith("ledger-")) {
    return {
      ...manual,
      fuenteDatos: manual.fuenteDatos ?? (manual.manualFinancialOverride ? "manual" : undefined),
    }
  }

  const L = byId.get(rep)
  if (!L) {
    return {
      ...manual,
      fuenteDatos: manual.fuenteDatos ?? (manual.manualFinancialOverride ? "manual" : "ledger"),
    }
  }

  if (manual.manualFinancialOverride) {
    return {
      ...manual,
      fuenteDatos: "manual",
      diferenciaReconciliacion: manual.amount - L.amount,
      conciliacionPendiente: false,
    }
  }

  const ma = Number(manual.amount)
  const la = Number(L.amount)

  const fromLedger = (): CuentasSavingsCard => ({
    ...manual,
    amount: L.disponibleOperativoLine ?? L.amount,
    healthPct: L.healthPct,
    trendUp: L.trendUp,
    cupo: L.cupo,
    uso: L.uso ?? L.amount,
    creditosExtras: L.creditosExtras,
    ajusteManual: L.ajusteManual,
    fechaUltimaReconciliacion: L.fechaUltimaReconciliacion,
    disponibleOperativoLine: L.disponibleOperativoLine,
  })

  if (ma === 0 && la > 0) {
    return {
      ...fromLedger(),
      fuenteDatos: "ledger",
      diferenciaReconciliacion: ma - la,
      conciliacionPendiente: false,
    }
  }

  if (la === 0 && ma > 0) {
    return {
      ...manual,
      fuenteDatos: "manual",
      diferenciaReconciliacion: ma - la,
      conciliacionPendiente: true,
    }
  }

  if (isSmallDifference(ma, la)) {
    return {
      ...fromLedger(),
      fechaUltimaReconciliacion: todayIso(),
      fuenteDatos: "ajuste-auto",
      diferenciaReconciliacion: ma - la,
      conciliacionPendiente: false,
    }
  }

  return {
    ...fromLedger(),
    fuenteDatos: "ledger",
    diferenciaReconciliacion: ma - la,
    conciliacionPendiente: true,
  }
}

function enrichManualLoanWithLedger(
  manual: CuentasLoanCard,
  byId: Map<string, CuentasLoanCard>,
): CuentasLoanCard {
  const rep = normalizeReplacesSyntheticId(manual.replacesSyntheticId)
  if (!rep?.startsWith("ledger-")) {
    return {
      ...manual,
      fuenteDatos: manual.fuenteDatos ?? (manual.manualFinancialOverride ? "manual" : undefined),
    }
  }

  const L = byId.get(rep)
  if (!L) {
    return {
      ...manual,
      fuenteDatos: manual.fuenteDatos ?? (manual.manualFinancialOverride ? "manual" : "ledger"),
    }
  }

  if (manual.manualFinancialOverride) {
    return {
      ...manual,
      fuenteDatos: "manual",
      diferenciaReconciliacion: manual.saldoPendiente - L.saldoPendiente,
      conciliacionPendiente: false,
    }
  }

  const ms = Number(manual.saldoPendiente)
  const ls = Number(L.saldoPendiente)

  const fromLedger = (): CuentasLoanCard => ({
    ...manual,
    saldoPendiente: L.saldoPendiente,
    pctPagado: L.pctPagado,
    cuotaMensual: L.cuotaMensual,
    montoOriginal: L.montoOriginal,
    abonadoMonto: L.abonadoMonto,
    proximoPagoLabel: L.proximoPagoLabel,
    cupo: L.cupo,
    uso: L.uso,
    creditosExtras: L.creditosExtras,
    ajusteManual: L.ajusteManual,
    fechaUltimaReconciliacion: L.fechaUltimaReconciliacion,
    disponibleOperativoLine: L.disponibleOperativoLine,
  })

  if (ms === 0 && ls > 0) {
    return {
      ...fromLedger(),
      fuenteDatos: "ledger",
      diferenciaReconciliacion: ms - ls,
      conciliacionPendiente: false,
    }
  }

  if (ls === 0 && ms > 0) {
    return {
      ...manual,
      fuenteDatos: "manual",
      diferenciaReconciliacion: ms - ls,
      conciliacionPendiente: true,
    }
  }

  if (isSmallDifference(ms, ls)) {
    return {
      ...fromLedger(),
      fechaUltimaReconciliacion: todayIso(),
      fuenteDatos: "ajuste-auto",
      diferenciaReconciliacion: ms - ls,
      conciliacionPendiente: false,
    }
  }

  return {
    ...fromLedger(),
    fuenteDatos: "ledger",
    diferenciaReconciliacion: ms - ls,
    conciliacionPendiente: true,
  }
}

export type MergeCuentasManualOptions = {
  /**
   * Fuerza de nuevo la semilla por últimos 4 (localStorage).
   * También puedes poner `localStorage.setItem("orbita:force_seed_reconciliation","1")` antes de recargar.
   */
  forceSeedReconciliation?: boolean
}

/**
 * Fusiona dashboard API (ledger + TX) con ítems manuales.
 *
 * Prioridad de valores: **ledger > ajuste-auto > manual explícito** (`manualFinancialOverride`).
 * La semilla inicial de TC (últimos 4 conocidos) corre al final si aún no se aplicó (una vez por navegador).
 */
export function mergeCuentasDashboard(
  base: CuentasDashboardPayload,
  manual: ManualFinanceBundle,
  options?: MergeCuentasManualOptions,
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

  const savingsOut = [...base.savings.filter((s) => !hide.has(s.id)), ...savingsPatched].map((s) => ({
    ...s,
    fuenteDatos: s.fuenteDatos ?? (s.id.startsWith("ledger-") ? ("ledger" as const) : undefined),
  }))

  let creditOut: CuentasCreditCard[] = [...base.creditCards.filter((c) => !hide.has(c.id)), ...creditPatched].map(
    (c) => ({
      ...c,
      fuenteDatos: c.fuenteDatos ?? (c.id.startsWith("ledger-") ? ("ledger" as const) : undefined),
    }),
  )

  creditOut = applyInitialCreditCardSeed(creditOut, { force: options?.forceSeedReconciliation === true })

  const loansOut = [...base.loans.filter((l) => !hide.has(l.id)), ...loanPatched].map((l) => ({
    ...l,
    fuenteDatos: l.fuenteDatos ?? (l.id.startsWith("ledger-") ? ("ledger" as const) : undefined),
  }))

  return {
    ...base,
    savings: savingsOut,
    creditCards: creditOut,
    loans: loansOut,
  }
}
