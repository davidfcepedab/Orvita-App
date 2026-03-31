/**
 * Dashboard heurístico de la hoja Cuentas (Capital): KPI y tarjetas derivados de movimientos del mes +
 * balance del snapshot mensual (`householdLiquidezDisplayRounded`). Es independiente del cálculo de KPI
 * del Overview (transacciones + fallback snapshot en la ruta `/api/orbita/finanzas/overview`).
 */
import type { FinanceTransaction } from "@/lib/finanzas/types"
import { expenseAmount, incomeAmount, netCashFlow } from "@/lib/finanzas/calculations/txMath"
import { householdLiquidezDisplayRounded, householdLiquidityRawFromSnapshot } from "@/lib/finanzas/householdLiquidityFromSnapshot"
import { filterMonth, pickObligationExpenses } from "@/lib/finanzas/deriveFromTransactions"

export type CuentasKpis = {
  totalLiquidez: number
  liquidezTrendPct: number
  creditoDisponible: number
  creditoUsoPromedioPct: number
  deudaTotal: number
  deudaCuotaMensual: number
}

/** Origen del valor mostrado tras fusionar ledger + manual + semilla. */
export type FuenteDatosCuenta = "ledger" | "manual" | "ajuste-auto" | "seed"

/** Campos opcionales del modelo de saldos (ver `accountBalanceTypes.ts`). */
export type CuentasBalanceFields = {
  cupo?: number
  uso?: number
  creditosExtras?: number
  ajusteManual?: number
  fechaUltimaReconciliacion?: string | null
  /** Si viene del motor; si no, se deriva con cupo+uso+extras+ajuste. */
  disponibleOperativoLine?: number
  fuenteDatos?: FuenteDatosCuenta
  /** manual − ledger (o similar) en última decisión de merge. */
  diferenciaReconciliacion?: number
  /** Si true, el usuario exigió que prevalezca lo guardado en manual sobre el ledger. */
  manualFinancialOverride?: boolean
  /** Diferencia grande: conviene revisar o aceptar automático en UI. */
  conciliacionPendiente?: boolean
}

export type CreditCardTheme =
  | "itau"
  | "bbva"
  | "davivienda"
  | "scotiabank"
  | "emerald"
  | "indigo"
  | "rose"
  | "amber"

export type CuentasSavingsCard = {
  id: string
  institution: string
  label: string
  amount: number
  healthPct: number
  trendUp: boolean
  /** Gradiente visual (misma paleta que tarjetas de crédito). */
  theme?: CreditCardTheme
  /** Si existe, oculta la tarjeta sintética con este id al fusionar manual + API. */
  replacesSyntheticId?: string
  /** Fila Supabase `household_finance_manual_items.id` cuando aplica. */
  manualRowId?: string
} & CuentasBalanceFields

export const CREDIT_CARD_THEME_IDS: CreditCardTheme[] = [
  "itau",
  "bbva",
  "davivienda",
  "scotiabank",
  "emerald",
  "indigo",
  "rose",
  "amber",
]

export function normalizeCreditCardTheme(raw: unknown): CreditCardTheme {
  if (typeof raw === "string" && (CREDIT_CARD_THEME_IDS as string[]).includes(raw)) {
    return raw as CreditCardTheme
  }
  return "bbva"
}

export type CuentasCreditCard = {
  id: string
  bankLabel: string
  network: string
  last4: string
  balance: number
  limit: number
  usagePct: number
  paymentDueLabel: string
  paymentDay: number
  score: number
  theme: CreditCardTheme
  replacesSyntheticId?: string
  manualRowId?: string
} & CuentasBalanceFields

export type CuentasLoanCard = {
  id: string
  title: string
  kind: "home" | "education"
  pctPagado: number
  saldoPendiente: number
  cuotaMensual: number
  proximoPagoLabel: string
  montoOriginal: number
  abonadoMonto: number
  replacesSyntheticId?: string
  manualRowId?: string
} & CuentasBalanceFields

export type CuentasDashboardPayload = {
  kpis: CuentasKpis
  savings: CuentasSavingsCard[]
  creditCards: CuentasCreditCard[]
  loans: CuentasLoanCard[]
}

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

export function payLabelForMonth(month: string, day: number): string {
  const ys = Number(month.slice(0, 4))
  const ms = Number(month.slice(5, 7))
  if (!ys || !ms) return `día ${day}`
  const due = new Date(ys, ms - 1 + 1, day)
  const label = MONTH_SHORT[due.getMonth()] ?? ""
  return `Pago: ${label} ${day}`
}

function mockDashboard(month: string): CuentasDashboardPayload {
  const m = Number(month.slice(5, 7)) || 1
  const jitter = (m % 5) * 12_000
  return {
    kpis: {
      totalLiquidez: 21_350_000 + jitter,
      liquidezTrendPct: 8,
      creditoDisponible: 12_200_000,
      creditoUsoPromedioPct: 35,
      deudaTotal: 160_500_000,
      deudaCuotaMensual: 2_430_000,
    },
    savings: [
      {
        id: "ahorro-bancolombia",
        institution: "Bancolombia",
        label: "Ahorros Principal",
        amount: 12_850_000 + Math.round(jitter * 0.4),
        healthPct: 92,
        trendUp: true,
        theme: "emerald",
      },
      {
        id: "ahorro-skandia",
        institution: "Skandia",
        label: "Fondo de Emergencia",
        amount: 8_500_000 + Math.round(jitter * 0.35),
        healthPct: 88,
        trendUp: true,
        theme: "indigo",
      },
    ],
    creditCards: [
      {
        id: "cc-itau",
        bankLabel: "Itaú",
        network: "Visa",
        last4: "4242",
        balance: 3_200_000,
        limit: 9_000_000,
        usagePct: 36,
        paymentDueLabel: payLabelForMonth(month, 5),
        paymentDay: 5,
        score: 72,
        theme: "itau",
      },
      {
        id: "cc-bbva",
        bankLabel: "BBVA",
        network: "Mastercard",
        last4: "8811",
        balance: 1_875_000,
        limit: 7_500_000,
        usagePct: 25,
        paymentDueLabel: payLabelForMonth(month, 12),
        paymentDay: 12,
        score: 81,
        theme: "bbva",
      },
      {
        id: "cc-davivienda",
        bankLabel: "Davivienda",
        network: "Visa",
        last4: "3090",
        balance: 4_950_000,
        limit: 9_000_000,
        usagePct: 55,
        paymentDueLabel: payLabelForMonth(month, 8),
        paymentDay: 8,
        score: 64,
        theme: "davivienda",
      },
      {
        id: "cc-scotiabank",
        bankLabel: "Scotiabank",
        network: "Visa",
        last4: "7721",
        balance: 1_380_000,
        limit: 6_000_000,
        usagePct: 23,
        paymentDueLabel: payLabelForMonth(month, 18),
        paymentDay: 18,
        score: 86,
        theme: "scotiabank",
      },
    ],
    loans: [
      {
        id: "loan-vivienda",
        title: "Crédito Vivienda",
        kind: "home",
        pctPagado: 21,
        saldoPendiente: 142_000_000,
        cuotaMensual: 1_890_000,
        proximoPagoLabel: "Abr 2",
        montoOriginal: 180_000_000,
        abonadoMonto: 38_000_000,
      },
      {
        id: "loan-estudios",
        title: "Crédito Estudios",
        kind: "education",
        pctPagado: 44,
        saldoPendiente: 18_500_000,
        cuotaMensual: 540_000,
        proximoPagoLabel: "Abr 10",
        montoOriginal: 33_000_000,
        abonadoMonto: 14_500_000,
      },
    ],
  }
}

function liveDashboard(
  month: string,
  snapshotBalance: number | null,
  rows: FinanceTransaction[],
  previousRows: FinanceTransaction[],
): CuentasDashboardPayload {
  const cur = filterMonth(rows, month)
  const income = cur.reduce((a, t) => a + incomeAmount(t), 0)
  const expense = cur.reduce((a, t) => a + expenseAmount(t), 0)
  const net = netCashFlow(cur)
  const balance = householdLiquidityRawFromSnapshot(snapshotBalance, cur)

  const prevNet = netCashFlow(previousRows)
  const liquidezTrendPct =
    Math.abs(prevNet) > 10_000
      ? Math.max(-18, Math.min(22, Math.round(((net - prevNet) / Math.abs(prevNet)) * 100)))
      : net > 150_000
        ? 8
        : net < -150_000
          ? -6
          : 3

  const obligations = pickObligationExpenses(cur)
  const obligationSum = obligations.reduce((a, t) => a + expenseAmount(t), 0)

  const totalLiquidez = householdLiquidezDisplayRounded(snapshotBalance, cur)
  const ratio = income > 0 ? Math.min(1.15, expense / income) : expense > 0 ? 0.85 : 0.35

  const limits = [0.3, 0.26, 0.24, 0.2].map((w) => Math.round(Math.max(800_000, income * w * 1.15)))
  const usageTargets = [0.34, 0.26, 0.52, 0.22]
  const debts = limits.map((lim, i) => Math.min(lim - 50_000, Math.round(lim * usageTargets[i]! * (0.85 + ratio * 0.2))))
  const creditCards: CuentasCreditCard[] = [
    {
      id: "cc-synth-1",
      bankLabel: "Itaú",
      network: "Visa",
      last4: "4242",
      balance: debts[0]!,
      limit: limits[0]!,
      usagePct: limits[0]! > 0 ? Math.round((debts[0]! / limits[0]!) * 100) : 0,
      paymentDueLabel: payLabelForMonth(month, 5),
      paymentDay: 5,
      score: Math.max(48, Math.min(92, Math.round(100 - ratio * 55))),
      theme: "itau",
    },
    {
      id: "cc-synth-2",
      bankLabel: "BBVA",
      network: "Mastercard",
      last4: "8811",
      balance: debts[1]!,
      limit: limits[1]!,
      usagePct: limits[1]! > 0 ? Math.round((debts[1]! / limits[1]!) * 100) : 0,
      paymentDueLabel: payLabelForMonth(month, 12),
      paymentDay: 12,
      score: Math.max(52, Math.min(94, Math.round(102 - ratio * 48))),
      theme: "bbva",
    },
    {
      id: "cc-synth-3",
      bankLabel: "Davivienda",
      network: "Visa",
      last4: "3090",
      balance: debts[2]!,
      limit: limits[2]!,
      usagePct: limits[2]! > 0 ? Math.round((debts[2]! / limits[2]!) * 100) : 0,
      paymentDueLabel: payLabelForMonth(month, 8),
      paymentDay: 8,
      score: Math.max(44, Math.min(88, Math.round(96 - ratio * 62))),
      theme: "davivienda",
    },
    {
      id: "cc-synth-4",
      bankLabel: "Scotiabank",
      network: "Visa",
      last4: "7721",
      balance: debts[3]!,
      limit: limits[3]!,
      usagePct: limits[3]! > 0 ? Math.round((debts[3]! / limits[3]!) * 100) : 0,
      paymentDueLabel: payLabelForMonth(month, 18),
      paymentDay: 18,
      score: Math.max(50, Math.min(95, Math.round(104 - ratio * 45))),
      theme: "scotiabank",
    },
  ]

  const creditoDisponible = creditCards.reduce((a, c) => a + Math.max(0, c.limit - c.balance), 0)
  const creditoUsoPromedioPct =
    creditCards.length > 0
      ? Math.round(creditCards.reduce((a, c) => a + (c.limit > 0 ? (c.balance / c.limit) * 100 : 0), 0) / creditCards.length)
      : 0

  const loanBalanceHome = Math.round(Math.max(obligationSum * 38, expense * 14, 12_000_000))
  const loanBalanceEdu = Math.round(Math.max(obligationSum * 5, expense * 2.2, 2_400_000))
  const moPart = Number(month.slice(5, 7)) || 1
  const pctHome = Math.max(12, Math.min(48, Math.round(22 + (net > 0 ? 6 : -4) + moPart * 0.4)))
  const pctEdu = Math.max(18, Math.min(62, Math.round(36 + (net > 0 ? 4 : -3))))

  const cuotaHome = Math.round(Math.max(320_000, obligationSum * 0.42))
  const cuotaEdu = Math.round(Math.max(120_000, obligationSum * 0.12))

  const abonadoHome = Math.round((pctHome / 100) * (loanBalanceHome / Math.max(0.01, 1 - pctHome / 100)))
  const originalHome = loanBalanceHome + abonadoHome
  const abonadoEdu = Math.round((pctEdu / 100) * (loanBalanceEdu / Math.max(0.01, 1 - pctEdu / 100)))
  const originalEdu = loanBalanceEdu + abonadoEdu

  const cardDebt = debts.reduce((a, b) => a + b, 0)
  const deudaTotal = loanBalanceHome + loanBalanceEdu + cardDebt
  const deudaCuotaMensual = cuotaHome + cuotaEdu + Math.round(cardDebt * 0.045)

  const s1 = Math.round(totalLiquidez * 0.6)
  const s2 = Math.max(0, totalLiquidez - s1)
  const healthBase = Math.max(58, Math.min(96, Math.round(88 - ratio * 28)))

  return {
    kpis: {
      totalLiquidez,
      liquidezTrendPct,
      creditoDisponible: Math.round(creditoDisponible),
      creditoUsoPromedioPct,
      deudaTotal: Math.round(deudaTotal),
      deudaCuotaMensual: Math.round(deudaCuotaMensual),
    },
    savings: [
      {
        id: "ahorro-a",
        institution: "Bancolombia",
        label: "Ahorros Principal",
        amount: s1,
        healthPct: healthBase + 3,
        trendUp: net >= 0,
        theme: "emerald",
      },
      {
        id: "ahorro-b",
        institution: "Skandia",
        label: "Fondo de Emergencia",
        amount: s2,
        healthPct: healthBase - 2,
        trendUp: net >= 0,
        theme: "indigo",
      },
    ],
    creditCards,
    loans: [
      {
        id: "loan-vivienda",
        title: "Crédito Vivienda",
        kind: "home",
        pctPagado: pctHome,
        saldoPendiente: loanBalanceHome,
        cuotaMensual: cuotaHome,
        proximoPagoLabel: "Próximo ciclo",
        montoOriginal: Math.round(originalHome),
        abonadoMonto: Math.round(abonadoHome),
      },
      {
        id: "loan-estudios",
        title: "Crédito Estudios",
        kind: "education",
        pctPagado: pctEdu,
        saldoPendiente: loanBalanceEdu,
        cuotaMensual: cuotaEdu,
        proximoPagoLabel: "Próximo ciclo",
        montoOriginal: Math.round(originalEdu),
        abonadoMonto: Math.round(abonadoEdu),
      },
    ],
  }
}

/** Payload visual para la página Cuentas; convive con `buildSyntheticAccounts` (lista legacy). */
export function buildCuentasDashboard(
  month: string,
  snapshotBalance: number | null,
  rows: FinanceTransaction[],
  previousRows: FinanceTransaction[],
  isMock: boolean,
): CuentasDashboardPayload {
  if (isMock) return mockDashboard(month)
  return liveDashboard(month, snapshotBalance, rows, previousRows)
}
