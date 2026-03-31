import { filterMonth } from "@/lib/finanzas/deriveFromTransactions"
import { incomeAmount, expenseAmount, netCashFlow } from "@/lib/finanzas/calculations/txMath"
import {
  accountCumulativeExpenseIncomeThrough,
  cumulativeNetByAhorroLedgerRows,
  transactionMatchesLedgerAccount,
} from "@/lib/finanzas/ledgerAccountTxRollup"
import { monthBounds } from "@/lib/finanzas/monthRange"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import type {
  CuentasCreditCard,
  CuentasDashboardPayload,
  CuentasKpis,
  CuentasLoanCard,
  CuentasSavingsCard,
  CreditCardTheme,
} from "@/lib/finanzas/cuentasDashboard"
import { computeDisponibleCuenta } from "@/lib/finanzas/accountBalanceTypes"
import {
  ahorroSaldoOperativoFromCatalog,
  creditoSaldoPendienteFromCatalog,
} from "@/lib/finanzas/catalogLedgerBalances"
import { CREDIT_CARD_THEME_IDS, payLabelForMonth } from "@/lib/finanzas/cuentasDashboard"
import type { LedgerAccountSortable } from "@/lib/finanzas/sortLedgerAccounts"
import { creditHealthPctFromUsage } from "@/lib/finanzas/creditHealth"

function ledgerBalanceExtras(row: LedgerAccountSortable) {
  const creditosExtras = Math.max(0, Number(row.creditos_extras ?? 0))
  const ajusteManual = Number(row.balance_reconciliation_adjustment ?? 0)
  const fechaUltimaReconciliacion = row.manual_balance_on?.trim() || null
  return { creditosExtras, ajusteManual, fechaUltimaReconciliacion }
}

export function parseTcLabel(label: string): { bankLabel: string; network: string; last4: string } {
  const parts = label.split("|").map((p) => p.trim()).filter(Boolean)
  const last = parts[parts.length - 1] ?? ""
  const last4 = /^\d{4}$/.test(last) ? last : (/\b(\d{4})\b/.exec(label)?.[1] ?? "0000")

  const mid = parts[1] ?? parts[0] ?? "Banco"
  let network = "Tarjeta"
  if (/visa/i.test(mid)) network = "Visa"
  else if (/master/i.test(mid)) network = "Mastercard"
  else if (/amex/i.test(mid)) network = "Amex"

  let bankLabel = mid
    .replace(/^visa\s+/i, "")
    .replace(/^mastercard\s*/i, "")
    .replace(/^amex\s*/i, "")
    .trim()
  if (!bankLabel) bankLabel = parts[2] ?? "Banco"

  return { bankLabel, network, last4 }
}

function inferCreditTheme(hint: string, stableId: string): CreditCardTheme {
  const s = hint.toLowerCase()
  if (/itau|itáu/.test(s)) return "itau"
  if (/bbva/.test(s)) return "bbva"
  if (/davivienda/.test(s)) return "davivienda"
  if (/scoti|scotia|scotiabank/.test(s)) return "scotiabank"
  if (/avillas|villas/.test(s)) return "indigo"
  let h = 0
  for (let i = 0; i < stableId.length; i++) h = (h * 31 + stableId.charCodeAt(i)) | 0
  return CREDIT_CARD_THEME_IDS[Math.abs(h) % CREDIT_CARD_THEME_IDS.length]!
}

function ledgerRowToSaving(
  row: LedgerAccountSortable,
  month: string,
  monthRows: FinanceTransaction[],
  cumNetByAhorroId: Map<string, number>,
): CuentasSavingsCard {
  const fromCatalog = ahorroSaldoOperativoFromCatalog(row)
  /**
   * Sin saldo en catálogo: acumulado ingresos − gastos hasta fin de mes (mapa precalculado, una pasada).
   */
  let usoFromMovements = 0
  if (fromCatalog == null) {
    const cumNet = Math.round(cumNetByAhorroId.get(row.id) ?? 0)
    usoFromMovements = cumNet > 0 ? cumNet : 0
  }
  const uso = fromCatalog != null ? fromCatalog : usoFromMovements

  const parts = row.label.split("|").map((p) => p.trim()).filter(Boolean)
  const institution = parts[1] ?? parts[0] ?? "Ahorros"
  const cur = filterMonth(monthRows, month)
  const matched = cur.filter((t) => transactionMatchesLedgerAccount(t, row.id, row.label))
  const acctNet = matched.reduce((a, t) => a + incomeAmount(t) - expenseAmount(t), 0)
  const householdNet = netCashFlow(cur)
  const trendUp = matched.length > 0 ? acctNet >= 0 : householdNet >= 0
  const activity = matched.reduce((a, t) => a + Math.abs(Number(t.amount)), 0)
  const ratio = matched.length
    ? Math.min(1.2, activity / Math.max(1, matched.length * 500_000))
    : cur.length
      ? Math.min(1.2, cur.reduce((a, t) => a + Math.abs(t.amount), 0) / Math.max(1, cur.length * 500_000))
      : 0.4
  const netForHealth = matched.length > 0 ? acctNet : householdNet

  const { creditosExtras, ajusteManual, fechaUltimaReconciliacion } = ledgerBalanceExtras(row)
  const cupo = 0
  const disponibleOperativoLine = Math.max(
    0,
    Math.round(computeDisponibleCuenta(cupo, uso, creditosExtras, ajusteManual)),
  )
  const amount = disponibleOperativoLine
  const theme = inferCreditTheme(institution + " " + row.label, row.id)

  return {
    id: `ledger-${row.id}`,
    institution,
    label: row.label.trim(),
    amount,
    healthPct: Math.min(96, Math.max(52, Math.round(74 - ratio * 22 + (netForHealth >= 0 ? 10 : -8)))),
    trendUp,
    theme,
    cupo,
    uso,
    creditosExtras,
    ajusteManual,
    fechaUltimaReconciliacion,
    disponibleOperativoLine,
  }
}

function ledgerRowToCreditCard(
  row: LedgerAccountSortable,
  month: string,
  rollupRows: FinanceTransaction[],
  monthEndInclusive: string,
): CuentasCreditCard {
  let limit = Math.max(0, Number(row.credit_limit ?? 0))
  const dbUsed = Math.max(0, Number(row.balance_used ?? 0))
  const dbAvailRaw = row.balance_available != null ? Number(row.balance_available) : NaN
  const dbAvail = Number.isFinite(dbAvailRaw) && dbAvailRaw >= 0 ? dbAvailRaw : NaN
  const { expense, income } = accountCumulativeExpenseIncomeThrough(
    rollupRows,
    monthEndInclusive,
    row.id,
    row.label,
  )
  const txNetDebt = Math.max(0, Math.round(expense - income))
  let balance = dbUsed > 0 ? dbUsed : txNetDebt

  /**
   * Con cupo + disponible del banco: deuda ≈ cupo − disponible (evita "balance_used" mal cargado como disponible).
   * Si usado+disponible ≈ cupo, confiamos en `balance_used`; si no, preferimos la derivación por disponible.
   */
  if (limit > 0 && Number.isFinite(dbAvail)) {
    const fromAvail = Math.max(0, Math.min(limit, Math.round(limit - dbAvail)))
    if (dbUsed <= 0) {
      balance = fromAvail > 0 ? fromAvail : balance
    } else {
      const drift = Math.abs(dbUsed + dbAvail - limit) / limit
      balance = drift < 0.06 ? dbUsed : fromAvail
    }
  }

  if (limit < 1 && balance > 0) limit = Math.max(balance * 2, 1)
  const usagePct = limit > 0 ? Math.min(100, Math.round((balance / limit) * 100)) : balance > 0 ? 100 : 0
  const parsed = parseTcLabel(row.label)
  const theme = inferCreditTheme(parsed.bankLabel + " " + row.label, row.id)
  const paymentDay = 5
  const { creditosExtras, ajusteManual, fechaUltimaReconciliacion } = ledgerBalanceExtras(row)
  const cupo = limit
  const uso = -balance
  const disponibleOperativoLine = computeDisponibleCuenta(cupo, uso, creditosExtras, ajusteManual)
  return {
    id: `ledger-${row.id}`,
    bankLabel: parsed.bankLabel,
    network: parsed.network,
    last4: parsed.last4,
    balance,
    limit,
    usagePct,
    paymentDueLabel: payLabelForMonth(month, paymentDay),
    paymentDay,
    score: creditHealthPctFromUsage(usagePct),
    theme,
    cupo,
    uso,
    creditosExtras,
    ajusteManual,
    fechaUltimaReconciliacion,
    disponibleOperativoLine,
  }
}

function ledgerRowToLoan(
  row: LedgerAccountSortable,
  rollupRows: FinanceTransaction[],
  monthEndInclusive: string,
): CuentasLoanCard {
  /** Deuda a la fecha: `balance_used`; mismos fallbacks que TC si el saldo vino en otra columna del extracto. */
  let saldoPendiente = creditoSaldoPendienteFromCatalog(row)
  if (saldoPendiente == null || saldoPendiente < 1) {
    const { expense, income } = accountCumulativeExpenseIncomeThrough(
      rollupRows,
      monthEndInclusive,
      row.id,
      row.label,
    )
    saldoPendiente = Math.max(0, Math.round(expense - income))
  }

  /**
   * `credit_limit` en créditos estructurales = monto original / capital inicial del préstamo.
   * % pagado = abonado acumulado / original = (original − saldo) / original.
   */
  const catalogOriginal = Math.round(Math.max(0, Number(row.credit_limit ?? 0)))
  let montoOriginal = catalogOriginal
  let abonadoMonto = 0
  let pctPagado = 0

  if (catalogOriginal > 0 && saldoPendiente <= catalogOriginal) {
    abonadoMonto = Math.round(catalogOriginal - saldoPendiente)
    pctPagado = Math.min(100, Math.max(0, Math.round((abonadoMonto / catalogOriginal) * 100)))
  } else if (catalogOriginal > 0 && saldoPendiente > catalogOriginal) {
    abonadoMonto = 0
    pctPagado = 0
  } else if (saldoPendiente > 0) {
    montoOriginal = saldoPendiente
    abonadoMonto = 0
    pctPagado = 0
  }

  const cupoLine = catalogOriginal > 0 ? catalogOriginal : montoOriginal

  const cuotaMensual = Math.max(50_000, Math.round(saldoPendiente * 0.0035))
  const kind: "home" | "education" = /icetex|estudio|estudios|educacion|educación/i.test(row.label)
    ? "education"
    : "home"
  const title =
    row.label
      .split("|")
      .map((p) => p.trim())
      .filter(Boolean)
      .slice(1)
      .join(" · ") || row.label.trim()

  const { creditosExtras, ajusteManual, fechaUltimaReconciliacion } = ledgerBalanceExtras(row)
  const cupo = cupoLine
  const uso = -saldoPendiente
  const disponibleOperativoLine = computeDisponibleCuenta(cupo, uso, creditosExtras, ajusteManual)

  return {
    id: `ledger-${row.id}`,
    title,
    kind,
    pctPagado,
    saldoPendiente,
    cuotaMensual,
    proximoPagoLabel: "Próximo ciclo",
    montoOriginal,
    abonadoMonto,
    cupo,
    uso,
    creditosExtras,
    ajusteManual,
    fechaUltimaReconciliacion,
    disponibleOperativoLine,
  }
}

function kpisFromMergedCards(
  base: CuentasKpis,
  creditCards: CuentasCreditCard[],
  loans: CuentasLoanCard[],
): CuentasKpis {
  const creditoDisponible = creditCards.reduce((a, c) => a + Math.max(0, c.limit - c.balance), 0)
  const creditoUsoPromedioPct =
    creditCards.length > 0
      ? Math.round(
          creditCards.reduce((a, c) => a + (c.limit > 0 ? (c.balance / c.limit) * 100 : 0), 0) /
            creditCards.length,
        )
      : base.creditoUsoPromedioPct

  const cardDebt = creditCards.reduce((a, c) => a + c.balance, 0)
  const loanDebt = loans.reduce((a, l) => a + l.saldoPendiente, 0)
  const deudaTotal = Math.round(cardDebt + loanDebt)
  const deudaCuotaMensual = Math.round(loans.reduce((a, l) => a + l.cuotaMensual, 0) + cardDebt * 0.045)

  return {
    ...base,
    creditoDisponible: Math.round(creditoDisponible),
    creditoUsoPromedioPct,
    deudaTotal,
    deudaCuotaMensual,
  }
}

/**
 * Sustituye las tarjetas heurísticas por las filas de `orbita_finance_accounts` cuando el hogar ya tiene
 * cuentas catalogadas (importe Movimientos / hoja Cuentas). KPI de liquidez se mantiene del cálculo por snapshot+TX.
 */
export function mergeLiveDashboardWithLedger(
  live: CuentasDashboardPayload,
  month: string,
  ledgerSorted: LedgerAccountSortable[],
  monthRows: FinanceTransaction[],
  ledgerRollupRows?: FinanceTransaction[],
): CuentasDashboardPayload {
  if (ledgerSorted.length === 0) return live

  const bounds = monthBounds(month)
  const monthEndInclusive = bounds?.endStr ?? `${month}-28`
  const rollupRows = ledgerRollupRows ?? monthRows

  const hasAhorro = ledgerSorted.some((a) => a.account_class === "ahorro")
  const hasTc = ledgerSorted.some((a) => a.account_class === "tarjeta_credito")
  const hasCredito = ledgerSorted.some((a) => a.account_class === "credito")

  if (!hasAhorro && !hasTc && !hasCredito) return live

  const savings: CuentasSavingsCard[] = []
  const creditCards: CuentasCreditCard[] = []
  const loans: CuentasLoanCard[] = []

  const ahorroLedgerRows = ledgerSorted.filter((r) => r.account_class === "ahorro")
  const cumNetByAhorroId = cumulativeNetByAhorroLedgerRows(ahorroLedgerRows, rollupRows, monthEndInclusive)

  for (const row of ledgerSorted) {
    if (row.account_class === "ahorro")
      savings.push(ledgerRowToSaving(row, month, monthRows, cumNetByAhorroId))
    else if (row.account_class === "tarjeta_credito")
      creditCards.push(ledgerRowToCreditCard(row, month, rollupRows, monthEndInclusive))
    else if (row.account_class === "credito") loans.push(ledgerRowToLoan(row, rollupRows, monthEndInclusive))
  }

  /** Con catálogo en BD: no mezclar tarjetas sintéticas; secciones vacías si aún no hay ese tipo. */
  const nextSavings = hasAhorro ? savings : []
  const nextCards = hasTc ? creditCards : []
  const nextLoans = hasCredito ? loans : []

  const kpiNeedsMerge = hasTc || hasCredito
  let kpis = kpiNeedsMerge
    ? kpisFromMergedCards(live.kpis, nextCards, nextLoans)
    : hasAhorro
      ? {
          ...live.kpis,
          creditoDisponible: 0,
          creditoUsoPromedioPct: 0,
          deudaTotal: 0,
          deudaCuotaMensual: 0,
        }
      : live.kpis

  if (hasAhorro && nextSavings.length > 0) {
    const savingsLiquidezSum = nextSavings.reduce((a, s) => a + Math.max(0, Number(s.amount)), 0)
    if (savingsLiquidezSum > 0) {
      kpis = {
        ...kpis,
        totalLiquidez: Math.max(kpis.totalLiquidez, Math.round(savingsLiquidezSum)),
      }
    }
  }

  return {
    ...live,
    kpis,
    savings: nextSavings,
    creditCards: nextCards,
    loans: nextLoans,
  }
}
