"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CalendarDays,
  ChevronDown,
  CreditCard,
  GripVertical,
  GraduationCap,
  Home,
  Percent,
  TrendingDown,
  Plus,
  Wallet,
} from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import { useFinance } from "../FinanceContext"
import { useLedgerAccounts } from "../useLedgerAccounts"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { financeApiDelete, financeApiGet, financeApiJson } from "@/lib/finanzas/financeClientFetch"
import { dedupeCreditCards, dedupeLoanCards, dedupeSavingsCards } from "@/lib/finanzas/dedupeCuentasCards"
import { mergeCuentasDashboard } from "@/lib/finanzas/mergeCuentasManual"
import type { ManualFinanceBundle } from "@/lib/finanzas/manualFinanceLocal"
import { readManualFinanceFromLocalStorage, writeManualFinanceToLocalStorage } from "@/lib/finanzas/manualFinanceLocal"
import { bundleFromManualApiItems } from "@/lib/finanzas/manualFinanceApi"
import type {
  CuentasCreditCard,
  CuentasDashboardPayload,
  CuentasKpis,
  CuentasLoanCard,
  CuentasSavingsCard,
} from "@/lib/finanzas/cuentasDashboard"
import { CREDIT_CARD_THEME_IDS, normalizeCreditCardTheme, payLabelForMonth } from "@/lib/finanzas/cuentasDashboard"
import { SubscriptionsBurnSection } from "./SubscriptionsBurnSection"
import { CashFlowSimulatorSection } from "./CashFlowSimulatorSection"
import { CuentasModalShell } from "./CuentasModalShell"
import { arcticPanel, formatMoney, formatShortMillions } from "./cuentasFormat"

const supabaseEnabled = process.env.NEXT_PUBLIC_SUPABASE_ENABLED === "true"

/** Texto en modales de edición manual (ahorro / TC / crédito): borrar, discreto */
const manualItemDeleteTextBtnClass =
  "w-fit text-left text-xs font-medium text-orbita-secondary/75 underline decoration-transparent underline-offset-[3px] transition hover:text-rose-600/95 hover:decoration-rose-500/35"

function reorderLedgerAccountList<T>(items: T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items]
  const [removed] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, removed!)
  return next
}

type AccountLegacy = {
  id: string
  name: string
  type: string
  institution: string
  available: number
  debt: number
  limit: number
  status: string
  score: number
}

function pmtFixed(pv: number, monthlyRatePercent: number, n: number) {
  if (n <= 0 || pv <= 0) return 0
  const r = monthlyRatePercent / 100
  if (r === 0) return pv / n
  return (pv * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

const creditThemes: Record<
  CuentasCreditCard["theme"],
  { gradient: string; barHigh: string; barTrack: string }
> = {
  itau: {
    gradient: "linear-gradient(145deg, #E11D48 0%, #FB7185 45%, #BE123C 100%)",
    barHigh: "bg-amber-200/90",
    barTrack: "bg-white/25",
  },
  bbva: {
    gradient: "linear-gradient(145deg, #1D4ED8 0%, #60A5FA 50%, #1E3A8A 100%)",
    barHigh: "bg-emerald-200/80",
    barTrack: "bg-white/25",
  },
  davivienda: {
    gradient: "linear-gradient(145deg, #EA580C 0%, #FB923C 45%, #C2410C 100%)",
    barHigh: "bg-amber-300/90",
    barTrack: "bg-white/25",
  },
  scotiabank: {
    gradient: "linear-gradient(145deg, #0F172A 0%, #334155 55%, #020617 100%)",
    barHigh: "bg-emerald-300/70",
    barTrack: "bg-white/20",
  },
  emerald: {
    gradient: "linear-gradient(145deg, #047857 0%, #34D399 50%, #065F46 100%)",
    barHigh: "bg-lime-200/90",
    barTrack: "bg-white/25",
  },
  indigo: {
    gradient: "linear-gradient(145deg, #3730A3 0%, #818CF8 48%, #312E81 100%)",
    barHigh: "bg-violet-200/85",
    barTrack: "bg-white/25",
  },
  rose: {
    gradient: "linear-gradient(145deg, #BE185D 0%, #F472B6 45%, #9D174D 100%)",
    barHigh: "bg-orange-200/80",
    barTrack: "bg-white/25",
  },
  amber: {
    gradient: "linear-gradient(145deg, #B45309 0%, #FBBF24 50%, #92400E 100%)",
    barHigh: "bg-yellow-100/90",
    barTrack: "bg-white/25",
  },
}

const CREDIT_THEME_LABELS: Record<CuentasCreditCard["theme"], string> = {
  itau: "Itaú — rosa",
  bbva: "BBVA — azul",
  davivienda: "Davivienda — naranja",
  scotiabank: "Scotiabank — grafito",
  emerald: "Esmeralda",
  indigo: "Índigo",
  rose: "Rosa",
  amber: "Ámbar",
}

function StatKpiCard({
  title,
  value,
  sub,
  icon,
  warning,
}: {
  title: string
  value: string
  sub: ReactNode
  icon: ReactNode
  warning?: boolean
}) {
  return (
    <Card className={`relative overflow-hidden p-6 sm:p-8 ${arcticPanel}`}>
      <div className="absolute right-4 top-4 text-orbita-secondary">{icon}</div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orbita-secondary">{title}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-orbita-primary sm:text-[26px]">{value}</p>
      <div className="mt-2 text-sm text-orbita-secondary">{sub}</div>
      {warning ? (
        <div className="absolute bottom-4 right-4 rounded-full bg-orange-100 p-1.5 text-orange-600">
          <TrendingDown className="h-4 w-4" aria-hidden />
        </div>
      ) : null}
    </Card>
  )
}

function SavingsPlank({ item, onEdit }: { item: CuentasSavingsCard; onEdit?: () => void }) {
  const raw = Number(item.amount)
  const hasAmount = Number.isFinite(raw) && raw !== 0
  const fromManual = Boolean(item.manualRowId)
  const tipManual =
    "Monto de esta tarjeta: datos manuales (guardados en el dispositivo o en Supabase según tu configuración). Edita para actualizar."

  return (
    <div
      className={`relative overflow-hidden p-6 sm:p-8 ${arcticPanel}`}
      style={{
        background: "linear-gradient(120deg, rgba(240,253,250,0.95) 0%, rgba(255,255,255,0.98) 55%, rgba(236,254,255,0.88) 100%)",
      }}
      title={fromManual ? tipManual : undefined}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-600/80">{item.institution}</p>
          <h3 className="mt-1 text-lg font-semibold text-orbita-primary">{item.label}</h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border-[0.5px] border-emerald-200/80 bg-emerald-50/90 px-3 py-1 text-xs font-semibold text-emerald-700">
          {item.healthPct}% {item.trendUp ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : null}
        </span>
      </div>
      {hasAmount ? (
        <p className="mt-6 text-3xl font-semibold tracking-tight text-orbita-primary">${formatMoney(raw)}</p>
      ) : (
        <div className="mt-6 grid gap-2">
          <p className="text-lg font-semibold text-orbita-secondary">Sin saldo registrado</p>
          <p className="text-sm leading-snug text-orbita-secondary">
            Pendiente de completar.
            {fromManual
              ? " Edita la tarjeta para fijar el monto manual."
              : " Si usas datos manuales, edita la tarjeta; si no, la liquidez del mes puede ser 0 o aún no repartida en estas tarjetas."}
          </p>
          {fromManual ? (
            <p className="text-[11px] text-orbita-secondary" title={tipManual}>
              Origen: datos manuales · Pasa el cursor para más info
            </p>
          ) : null}
        </div>
      )}
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="absolute bottom-4 left-4 rounded-full border border-teal-200/80 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-teal-800 shadow-sm hover:bg-white"
        >
          Editar
        </button>
      ) : null}
      <Wallet className="pointer-events-none absolute bottom-4 right-4 h-14 w-14 text-teal-200/50" aria-hidden />
    </div>
  )
}

function CreditPlasticCard({ card, onEdit }: { card: CuentasCreditCard; onEdit?: () => void }) {
  const th = creditThemes[normalizeCreditCardTheme(card.theme)]
  const usageWidth = `${Math.min(100, Math.max(4, card.usagePct))}%`
  const barColor = card.usagePct >= 50 ? th.barHigh : "bg-white/50"

  return (
    <div
      className={`relative flex min-h-[200px] flex-col rounded-[18px] border-[0.5px] border-white/30 p-5 pb-12 text-white shadow-[0_20px_50px_-18px_rgba(15,23,42,0.45)] sm:min-h-[220px] sm:pb-12`}
      style={{
        background: th.gradient,
        boxShadow: "0 20px 50px -18px rgba(15,23,42,0.4), inset 0 1px 0 rgba(255,255,255,0.22)",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-white/75">{card.bankLabel}</p>
          <p className="mt-1 text-sm font-semibold">
            {card.network} ···· {card.last4}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="text-[11px] text-white/80">{card.paymentDueLabel}</p>
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-white/15 text-sm font-bold backdrop-blur-sm"
            title="Score"
          >
            {card.score}
          </div>
        </div>
      </div>
      <div className="mt-4 flex-1">
        <p className="text-[11px] uppercase tracking-[0.14em] text-white/70">Saldo actual</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight sm:text-[26px]">${formatMoney(card.balance)} COP</p>
      </div>
      <div className="mt-4 space-y-2">
        <div className={`h-1.5 w-full overflow-hidden rounded-full ${th.barTrack}`}>
          <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: usageWidth }} />
        </div>
        <div className="flex justify-between text-[10px] uppercase tracking-wide text-white/75">
          <span>Uso {card.usagePct}%</span>
          <span>Cupo ${formatMoney(card.limit)}</span>
        </div>
      </div>
      {onEdit ? (
        <button
          type="button"
          onClick={onEdit}
          className="absolute bottom-4 left-4 rounded-full border border-white/40 bg-white/15 px-3 py-1.5 text-[10px] font-semibold text-white backdrop-blur-sm hover:bg-white/25"
        >
          Editar
        </button>
      ) : null}
    </div>
  )
}

function LoanStructuralCard({
  loan,
  onEdit,
  onPayDate,
  onPlan,
}: {
  loan: CuentasLoanCard
  onEdit?: () => void
  onPayDate?: () => void
  onPlan?: () => void
}) {
  const Icon = loan.kind === "home" ? Home : GraduationCap
  return (
    <Card className={`p-6 sm:p-8 ${arcticPanel}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
            <Icon className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <h3 className="text-base font-semibold text-orbita-primary">{loan.title}</h3>
            <p className="text-xs text-orbita-secondary">Crédito estructural</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full border border-orbita-border bg-orbita-surface px-3 py-1 text-[11px] font-semibold text-orbita-primary hover:bg-orbita-surface-alt"
            >
              Editar
            </button>
          ) : null}
          <span className="rounded-full border-[0.5px] border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            {loan.pctPagado}% pagado
          </span>
        </div>
      </div>
      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-orbita-surface-alt">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
          style={{ width: `${Math.min(100, loan.pctPagado)}%` }}
        />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: "Saldo pendiente", value: `$${formatMoney(loan.saldoPendiente)}` },
          { label: "Cuota mensual", value: `$${formatMoney(loan.cuotaMensual)}` },
          { label: "Próximo pago", value: loan.proximoPagoLabel },
        ].map((c) => (
          <div key={c.label}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orbita-secondary">{c.label}</p>
            <p className="mt-1 text-sm font-semibold text-orbita-primary">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-orbita-border pt-4 text-xs text-orbita-secondary">
        <span>Monto original ${formatMoney(loan.montoOriginal)}</span>
        <span className="rounded-full bg-violet-100/80 px-2.5 py-1 font-semibold text-violet-800">
          ${formatShortMillions(loan.abonadoMonto)} abonados
        </span>
      </div>
      {onPayDate || onPlan ? (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-orbita-border pt-4 text-[11px] font-semibold text-violet-800">
          {onPayDate ? (
            <button type="button" onClick={onPayDate} className="hover:underline">
              Fecha de pago
            </button>
          ) : null}
          {onPlan ? (
            <button type="button" onClick={onPlan} className="hover:underline">
              Plan de pago
            </button>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}

function newManualId(prefix: string) {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}`
}

export default function CuentasClient() {
  const finance = useFinance()
  const month = finance?.month ?? ""

  const {
    accounts: ledgerAccounts,
    refetch: refetchLedger,
    loading: ledgerLoading,
    error: ledgerError,
  } = useLedgerAccounts({ enabled: supabaseEnabled })
  const [ledgerReorderMessage, setLedgerReorderMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!ledgerReorderMessage) return
    const t = window.setTimeout(() => setLedgerReorderMessage(null), 4200)
    return () => window.clearTimeout(t)
  }, [ledgerReorderMessage])

  const [dashboard, setDashboard] = useState<CuentasDashboardPayload | null>(null)
  const [accountsLegacy, setAccountsLegacy] = useState<AccountLegacy[]>([])
  const [ledgerReorderBusy, setLedgerReorderBusy] = useState(false)
  const [draggingLedgerIndex, setDraggingLedgerIndex] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [layoutEdit, setLayoutEdit] = useState(false)

  const [activeLoan, setActiveLoan] = useState<CuentasLoanCard | null>(null)
  const [modal, setModal] = useState<"paydate" | "plan" | null>(null)

  const [manualBundle, setManualBundle] = useState<ManualFinanceBundle>(() => readManualFinanceFromLocalStorage())
  const [subscriptionSimulatorMonthly, setSubscriptionSimulatorMonthly] = useState(0)
  const [manualModal, setManualModal] = useState<"savings" | "credit" | "loan" | null>(null)
  const [savingForm, setSavingForm] = useState({
    id: "" as string | undefined,
    institution: "Bancolombia",
    label: "Ahorros",
    amount: 1_000_000,
    healthPct: 88,
    trendUp: true,
    replacesSyntheticId: "" as string | undefined,
  })
  const [creditForm, setCreditForm] = useState({
    id: "" as string | undefined,
    bankLabel: "Banco",
    network: "Visa",
    last4: "0000",
    balance: 500_000,
    limit: 3_000_000,
    paymentDay: 5,
    score: 75,
    theme: "bbva" as CuentasCreditCard["theme"],
    replacesSyntheticId: "" as string | undefined,
  })
  const [loanForm, setLoanForm] = useState({
    id: "" as string | undefined,
    title: "Crédito",
    kind: "home" as "home" | "education",
    pctPagado: 20,
    saldoPendiente: 50_000_000,
    cuotaMensual: 1_200_000,
    proximoPagoLabel: "Próximo ciclo",
    montoOriginal: 80_000_000,
    abonadoMonto: 10_000_000,
    replacesSyntheticId: "" as string | undefined,
  })

  const [payDay, setPayDay] = useState(5)

  const [planAmount, setPlanAmount] = useState(1_800_000)
  const [planRate, setPlanRate] = useState(2.5)
  const [planN, setPlanN] = useState(12)
  const [planType, setPlanType] = useState<"fija" | "variable">("fija")
  const installmentOptions = [6, 12, 18, 24]

  const refetchAccountsDashboard = useCallback(async () => {
    if (!month) return
    try {
      setLoading(true)
      setLoadError(null)
      setNotice(null)
      const res = await financeApiGet(`/api/orbita/finanzas/accounts?month=${encodeURIComponent(month)}`)
      const json = (await res.json()) as {
        success?: boolean
        data?: {
          accounts?: AccountLegacy[]
          dashboard?: CuentasDashboardPayload | null
        }
        error?: string
        notice?: string
      }
      if (!res.ok || !json.success) {
        throw new Error(messageForHttpError(res.status, json.error, res.statusText))
      }
      setAccountsLegacy(json.data?.accounts ?? [])
      setDashboard(json.data?.dashboard ?? null)
      setNotice(json.notice ?? null)
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Error")
      setDashboard(null)
      setAccountsLegacy([])
    } finally {
      setLoading(false)
    }
  }, [month])

  useEffect(() => {
    if (!month) {
      setDashboard(null)
      setAccountsLegacy([])
      setLoadError(null)
      setLoading(false)
      return
    }
    void refetchAccountsDashboard()
  }, [month, refetchAccountsDashboard])

  const persistLedgerOrder = useCallback(
    async (orderedIds: string[]) => {
      setLedgerReorderBusy(true)
      try {
        const res = await financeApiJson("/api/orbita/finanzas/ledger-accounts", {
          method: "PATCH",
          body: { orderedIds },
        })
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (!res.ok || !json.success) {
          setNotice(messageForHttpError(res.status, json.error, res.statusText))
          return
        }
        await refetchLedger()
        await refetchAccountsDashboard()
        setLedgerReorderMessage("Orden de cuentas guardado.")
      } catch {
        setNotice("No se pudo guardar el orden de cuentas.")
      } finally {
        setLedgerReorderBusy(false)
      }
    },
    [refetchAccountsDashboard, refetchLedger],
  )

  const onDropLedgerReorder = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx || ledgerAccounts.length < 2) return
      const next = reorderLedgerAccountList(ledgerAccounts, fromIdx, toIdx)
      void persistLedgerOrder(next.map((x) => x.id))
    },
    [ledgerAccounts, persistLedgerOrder],
  )

  const reloadManualFromApi = useCallback(async () => {
    if (!supabaseEnabled) return
    try {
      const res = await financeApiGet("/api/orbita/finanzas/manual-items")
      const json = (await res.json()) as {
        success?: boolean
        error?: string
        data?: { items?: { id: string; item_kind: string; data: Record<string, unknown> }[] }
      }
      if (!res.ok || !json.success) {
        setNotice(messageForHttpError(res.status, json.error, res.statusText))
        setManualBundle(readManualFinanceFromLocalStorage())
        return
      }
      if (json.data?.items && json.data.items.length > 0) {
        setManualBundle(bundleFromManualApiItems(json.data.items))
      } else {
        setManualBundle(readManualFinanceFromLocalStorage())
      }
    } catch {
      setNotice("No se pudieron cargar ítems manuales; se usa copia local.")
      setManualBundle(readManualFinanceFromLocalStorage())
    }
  }, [])

  useEffect(() => {
    if (supabaseEnabled) void reloadManualFromApi()
    else setManualBundle(readManualFinanceFromLocalStorage())
  }, [supabaseEnabled, reloadManualFromApi])

  const persistBundle = useCallback((next: ManualFinanceBundle) => {
    setManualBundle(next)
    writeManualFinanceToLocalStorage(next)
  }, [])

  const mergedDashboard = useMemo(() => {
    if (!dashboard) return null
    const m = mergeCuentasDashboard(dashboard, manualBundle)
    return {
      ...m,
      savings: dedupeSavingsCards(m.savings),
      creditCards: dedupeCreditCards(m.creditCards),
      loans: dedupeLoanCards(m.loans),
    }
  }, [dashboard, manualBundle])

  const kpis: CuentasKpis | null = mergedDashboard?.kpis ?? null
  const savings: CuentasSavingsCard[] = mergedDashboard?.savings ?? []
  const creditCards: CuentasCreditCard[] = mergedDashboard?.creditCards ?? []
  const loans: CuentasLoanCard[] = mergedDashboard?.loans ?? []

  useEffect(() => {
    if (activeLoan) setPayDay(5)
  }, [activeLoan])

  const cuotaSim = useMemo(() => {
    const base = pmtFixed(planAmount, planRate, planN)
    return planType === "variable" ? base * 0.94 : base
  }, [planAmount, planRate, planN, planType])

  const totalPagarSim = useMemo(() => Math.round(cuotaSim * planN), [cuotaSim, planN])
  const interesesSim = useMemo(
    () => Math.max(0, totalPagarSim - planAmount),
    [totalPagarSim, planAmount],
  )

  const flowBaseline = useMemo(() => {
    if (!kpis) return { flujoActual: 0, obligActuales: 0, tarjetas: 0, estructurales: 0 }
    const estructurales = kpis.deudaCuotaMensual
    const tarjetas = Math.round(kpis.deudaTotal * 0.012)
    const obligActuales = tarjetas + estructurales
    const flujoActual = Math.round(kpis.totalLiquidez * 0.22 + obligActuales * 1.85)
    return { flujoActual, obligActuales, tarjetas, estructurales }
  }, [kpis])

  const planFlow = useMemo(() => {
    const nuevasObl = flowBaseline.obligActuales + cuotaSim
    const flujoConPlan = Math.max(0, flowBaseline.flujoActual - cuotaSim)
    const reduccionPct =
      flowBaseline.flujoActual > 0 ? Math.round((cuotaSim / flowBaseline.flujoActual) * 1000) / 10 : 0
    return { nuevasObl, flujoConPlan, reduccionPct }
  }, [flowBaseline, cuotaSim])

  const openLoanModal = (loan: CuentasLoanCard, m: "paydate" | "plan") => {
    setActiveLoan(loan)
    setModal(m)
    if (m === "plan") setPlanAmount(Math.max(50_000, loan.saldoPendiente))
  }

  const closeModals = () => {
    setModal(null)
    setActiveLoan(null)
  }

  const applyPayDate = () => {
    if (activeLoan) {
      const updated: CuentasLoanCard = {
        ...activeLoan,
        proximoPagoLabel: `Cada ${payDay} del mes`,
      }
      const existing = manualBundle.loans.find((l) => l.id === activeLoan.id)
      const newId =
        activeLoan.manualRowId || existing
          ? activeLoan.id
          : activeLoan.id.startsWith("manual-loan")
            ? activeLoan.id
            : newManualId("manual-loan")
      const row: CuentasLoanCard = {
        ...updated,
        id: newId,
        manualRowId: activeLoan.manualRowId,
        replacesSyntheticId: activeLoan.replacesSyntheticId,
      }
      if (!activeLoan.manualRowId && !existing && !activeLoan.id.startsWith("manual-loan")) {
        row.replacesSyntheticId = activeLoan.id
      }
      const next: ManualFinanceBundle = {
        ...manualBundle,
        loans: [...manualBundle.loans.filter((l) => l.id !== row.id), row],
      }
      void persistBundle(next)
    }
    closeModals()
  }

  const openAddSavings = () => {
    setSavingForm({
      id: undefined,
      institution: "Bancolombia",
      label: "Nueva cuenta de ahorro",
      amount: 2_000_000,
      healthPct: 88,
      trendUp: true,
      replacesSyntheticId: undefined,
    })
    setManualModal("savings")
  }

  const openEditSavings = (item: CuentasSavingsCard) => {
    setSavingForm({
      id: item.id,
      institution: item.institution,
      label: item.label,
      amount: item.amount,
      healthPct: item.healthPct,
      trendUp: item.trendUp,
      replacesSyntheticId: item.replacesSyntheticId ?? (item.id.startsWith("manual-saving") ? undefined : item.id),
    })
    setManualModal("savings")
  }

  const submitSavings = async () => {
    if (savingForm.amount === 0) {
      const ok = window.confirm(
        "¿Estás seguro de registrar saldo cero? La tarjeta mostrará «Sin saldo registrado» hasta que edites el monto.",
      )
      if (!ok) return
    }
    const existing = savingForm.id ? manualBundle.savings.find((s) => s.id === savingForm.id) : undefined
    const newId =
      existing?.manualRowId || String(existing?.id ?? "").startsWith("manual-saving")
        ? savingForm.id!
        : savingForm.id && !String(savingForm.id).startsWith("manual-saving")
          ? newManualId("manual-saving")
          : savingForm.id ?? newManualId("manual-saving")
    let rep = savingForm.replacesSyntheticId
    if (savingForm.id && !String(savingForm.id).startsWith("manual-saving") && !existing?.manualRowId) {
      rep = savingForm.id
    }
    const row: CuentasSavingsCard = {
      id: newId,
      institution: savingForm.institution.trim() || "Banco",
      label: savingForm.label.trim() || "Ahorros",
      amount: Math.max(0, savingForm.amount),
      healthPct: Math.min(100, Math.max(0, savingForm.healthPct)),
      trendUp: savingForm.trendUp,
      replacesSyntheticId: rep,
      manualRowId: existing?.manualRowId,
    }
    const next: ManualFinanceBundle = {
      ...manualBundle,
      savings: [...manualBundle.savings.filter((s) => s.id !== newId && s.id !== savingForm.id), row],
    }
    if (supabaseEnabled) {
      try {
        const dbRow = manualBundle.savings.find((s) => s.id === savingForm.id)
        const body = dbRow?.manualRowId ? { id: dbRow.manualRowId, data: row } : null
        if (body) {
          const res = await financeApiJson("/api/orbita/finanzas/manual-items", {
            method: "PATCH",
            body: { id: body.id, data: row },
          })
          if (!res.ok) throw new Error("PATCH falló")
        } else {
          const res = await financeApiJson("/api/orbita/finanzas/manual-items", {
            method: "POST",
            body: { item_kind: "savings", data: row },
          })
          if (!res.ok) throw new Error("POST falló")
        }
        await reloadManualFromApi()
      } catch {
        writeManualFinanceToLocalStorage(next)
        setManualBundle(next)
      }
    } else {
      await persistBundle(next)
    }
    setManualModal(null)
  }

  const openAddCredit = () => {
    setCreditForm({
      id: undefined,
      bankLabel: "Banco",
      network: "Visa",
      last4: "4242",
      balance: 800_000,
      limit: 5_000_000,
      paymentDay: 5,
      score: 72,
      theme: "bbva",
      replacesSyntheticId: undefined,
    })
    setManualModal("credit")
  }

  const openEditCredit = (c: CuentasCreditCard) => {
    setCreditForm({
      id: c.id,
      bankLabel: c.bankLabel,
      network: c.network,
      last4: c.last4,
      balance: c.balance,
      limit: c.limit,
      paymentDay: c.paymentDay,
      score: c.score,
      theme: normalizeCreditCardTheme(c.theme),
      replacesSyntheticId: c.replacesSyntheticId ?? (c.id.startsWith("manual-cc") ? undefined : c.id),
    })
    setManualModal("credit")
  }

  const submitCredit = async () => {
    const lim = Math.max(1, creditForm.limit)
    const bal = Math.min(creditForm.balance, lim)
    const usagePct = Math.round((bal / lim) * 100)
    const existing = creditForm.id ? manualBundle.creditCards.find((c) => c.id === creditForm.id) : undefined
    const newId =
      existing?.manualRowId || existing?.id.startsWith("manual-cc")
        ? creditForm.id!
        : creditForm.id && !String(creditForm.id).startsWith("manual-cc")
          ? newManualId("manual-cc")
          : creditForm.id ?? newManualId("manual-cc")
    let rep = creditForm.replacesSyntheticId
    if (creditForm.id && !String(creditForm.id).startsWith("manual-cc") && !existing?.manualRowId) {
      rep = creditForm.id
    }
    const row: CuentasCreditCard = {
      id: newId,
      bankLabel: creditForm.bankLabel.trim() || "Banco",
      network: creditForm.network.trim() || "Visa",
      last4: creditForm.last4.replace(/\D/g, "").slice(-4).padStart(4, "0") || "0000",
      balance: bal,
      limit: lim,
      usagePct,
      paymentDay: creditForm.paymentDay,
      paymentDueLabel: payLabelForMonth(month, creditForm.paymentDay),
      score: Math.min(100, Math.max(0, creditForm.score)),
      theme: normalizeCreditCardTheme(creditForm.theme),
      replacesSyntheticId: rep,
      manualRowId: existing?.manualRowId,
    }
    const next: ManualFinanceBundle = {
      ...manualBundle,
      creditCards: [...manualBundle.creditCards.filter((c) => c.id !== newId && c.id !== creditForm.id), row],
    }
    if (supabaseEnabled) {
      try {
        const dbRow = manualBundle.creditCards.find((c) => c.id === creditForm.id)
        if (dbRow?.manualRowId) {
          const res = await financeApiJson("/api/orbita/finanzas/manual-items", {
            method: "PATCH",
            body: { id: dbRow.manualRowId, data: row },
          })
          if (!res.ok) throw new Error("PATCH falló")
        } else {
          const res = await financeApiJson("/api/orbita/finanzas/manual-items", {
            method: "POST",
            body: { item_kind: "credit_card", data: row },
          })
          if (!res.ok) throw new Error("POST falló")
        }
        await reloadManualFromApi()
      } catch {
        writeManualFinanceToLocalStorage(next)
        setManualBundle(next)
      }
    } else {
      await persistBundle(next)
    }
    setManualModal(null)
  }

  const openAddLoan = () => {
    setLoanForm({
      id: undefined,
      title: "Nuevo crédito",
      kind: "home",
      pctPagado: 15,
      saldoPendiente: 40_000_000,
      cuotaMensual: 900_000,
      proximoPagoLabel: "Próximo ciclo",
      montoOriginal: 55_000_000,
      abonadoMonto: 5_000_000,
      replacesSyntheticId: undefined,
    })
    setManualModal("loan")
  }

  const openEditLoan = (loan: CuentasLoanCard) => {
    setLoanForm({
      id: loan.id,
      title: loan.title,
      kind: loan.kind,
      pctPagado: loan.pctPagado,
      saldoPendiente: loan.saldoPendiente,
      cuotaMensual: loan.cuotaMensual,
      proximoPagoLabel: loan.proximoPagoLabel,
      montoOriginal: loan.montoOriginal,
      abonadoMonto: loan.abonadoMonto,
      replacesSyntheticId: loan.replacesSyntheticId ?? (loan.id.startsWith("manual-loan") ? undefined : loan.id),
    })
    setManualModal("loan")
  }

  const submitLoan = async () => {
    const existing = loanForm.id ? manualBundle.loans.find((l) => l.id === loanForm.id) : undefined
    const newId =
      existing?.manualRowId || existing?.id.startsWith("manual-loan")
        ? loanForm.id!
        : loanForm.id && !String(loanForm.id).startsWith("manual-loan")
          ? newManualId("manual-loan")
          : loanForm.id ?? newManualId("manual-loan")
    let rep = loanForm.replacesSyntheticId
    if (loanForm.id && !String(loanForm.id).startsWith("manual-loan") && !existing?.manualRowId) {
      rep = loanForm.id
    }
    const row: CuentasLoanCard = {
      id: newId,
      title: loanForm.title.trim() || "Crédito",
      kind: loanForm.kind,
      pctPagado: Math.min(100, Math.max(0, loanForm.pctPagado)),
      saldoPendiente: Math.max(0, loanForm.saldoPendiente),
      cuotaMensual: Math.max(0, loanForm.cuotaMensual),
      proximoPagoLabel: loanForm.proximoPagoLabel.trim() || "Próximo ciclo",
      montoOriginal: Math.max(0, loanForm.montoOriginal),
      abonadoMonto: Math.max(0, loanForm.abonadoMonto),
      replacesSyntheticId: rep,
      manualRowId: existing?.manualRowId,
    }
    const next: ManualFinanceBundle = {
      ...manualBundle,
      loans: [...manualBundle.loans.filter((l) => l.id !== newId && l.id !== loanForm.id), row],
    }
    if (supabaseEnabled) {
      try {
        const dbRow = manualBundle.loans.find((l) => l.id === loanForm.id)
        if (dbRow?.manualRowId) {
          const res = await financeApiJson("/api/orbita/finanzas/manual-items", {
            method: "PATCH",
            body: { id: dbRow.manualRowId, data: row },
          })
          if (!res.ok) throw new Error("PATCH falló")
        } else {
          const res = await financeApiJson("/api/orbita/finanzas/manual-items", {
            method: "POST",
            body: { item_kind: "structural_loan", data: row },
          })
          if (!res.ok) throw new Error("POST falló")
        }
        await reloadManualFromApi()
      } catch {
        writeManualFinanceToLocalStorage(next)
        setManualBundle(next)
      }
    } else {
      await persistBundle(next)
    }
    setManualModal(null)
  }

  const deleteSavings = async () => {
    if (!savingForm.id) return
    if (!window.confirm("¿Eliminar esta cuenta de ahorro del listado? No se puede deshacer.")) return
    const row = manualBundle.savings.find((s) => s.id === savingForm.id)
    const next: ManualFinanceBundle = {
      ...manualBundle,
      savings: manualBundle.savings.filter((s) => s.id !== savingForm.id),
    }
    if (supabaseEnabled && row?.manualRowId) {
      try {
        const res = await financeApiDelete(
          `/api/orbita/finanzas/manual-items?id=${encodeURIComponent(row.manualRowId)}`,
        )
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (!res.ok || !json.success) {
          setNotice(messageForHttpError(res.status, json.error, res.statusText))
          return
        }
        await reloadManualFromApi()
      } catch {
        setNotice("No se pudo eliminar en el servidor.")
        return
      }
    } else {
      persistBundle(next)
    }
    setManualModal(null)
  }

  const deleteCredit = async () => {
    if (!creditForm.id) return
    if (!window.confirm("¿Eliminar esta tarjeta del listado? No se puede deshacer.")) return
    const row = manualBundle.creditCards.find((c) => c.id === creditForm.id)
    const next: ManualFinanceBundle = {
      ...manualBundle,
      creditCards: manualBundle.creditCards.filter((c) => c.id !== creditForm.id),
    }
    if (supabaseEnabled && row?.manualRowId) {
      try {
        const res = await financeApiDelete(
          `/api/orbita/finanzas/manual-items?id=${encodeURIComponent(row.manualRowId)}`,
        )
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (!res.ok || !json.success) {
          setNotice(messageForHttpError(res.status, json.error, res.statusText))
          return
        }
        await reloadManualFromApi()
      } catch {
        setNotice("No se pudo eliminar en el servidor.")
        return
      }
    } else {
      persistBundle(next)
    }
    setManualModal(null)
  }

  const deleteLoan = async () => {
    if (!loanForm.id) return
    if (!window.confirm("¿Eliminar este crédito estructural del listado? No se puede deshacer.")) return
    const row = manualBundle.loans.find((l) => l.id === loanForm.id)
    const next: ManualFinanceBundle = {
      ...manualBundle,
      loans: manualBundle.loans.filter((l) => l.id !== loanForm.id),
    }
    if (supabaseEnabled && row?.manualRowId) {
      try {
        const res = await financeApiDelete(
          `/api/orbita/finanzas/manual-items?id=${encodeURIComponent(row.manualRowId)}`,
        )
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (!res.ok || !json.success) {
          setNotice(messageForHttpError(res.status, json.error, res.statusText))
          return
        }
        await reloadManualFromApi()
      } catch {
        setNotice("No se pudo eliminar en el servidor.")
        return
      }
    } else {
      persistBundle(next)
    }
    setManualModal(null)
  }

  if (!finance) {
    return (
      <div className="p-6 text-center text-orbita-secondary">
        <p>Inicializando...</p>
      </div>
    )
  }

  if (loading) {
    return <div className="p-6 text-center text-orbita-secondary">Cargando cuentas…</div>
  }

  if (loadError) {
    return (
      <div className="rounded-[16px] border-[0.5px] border-red-200 bg-red-50/50 p-4 text-red-800">
        <p className="font-semibold">Error</p>
        <p className="mt-1 text-sm">{loadError}</p>
      </div>
    )
  }

  return (
    <div className="min-w-0 space-y-8 pb-10 sm:space-y-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight text-orbita-primary sm:text-[28px]">Cuentas</h1>
          <p className="mt-1 text-sm text-orbita-secondary sm:text-[15px]">
            Liquidez, exposición y disponibilidad por cuenta
          </p>
          <p className="mt-2 text-xs text-orbita-secondary">
            Periodo {month}
            {notice ? ` · ${notice}` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setLayoutEdit((v) => !v)}
            className="rounded-full border-[0.5px] border-sky-200 bg-sky-50/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 transition hover:bg-sky-100"
          >
            Editar layout
          </button>
        </div>
      </div>

      {supabaseEnabled && (ledgerLoading || ledgerAccounts.length > 0 || ledgerError) ? (
        <details
          className={`group rounded-[var(--radius-card)] border-[0.5px] border-orbita-border/90 shadow-card ${arcticPanel}`}
          style={{
            background: "var(--color-surface)",
            border: "0.5px solid var(--color-border)",
            borderRadius: "var(--radius-card)",
            boxShadow: "rgba(0, 0, 0, 0.05) 0px 1px 3px, rgba(0, 0, 0, 0.02) 0px 1px 2px",
          }}
        >
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-6 [&::-webkit-details-marker]:hidden">
            <div className="min-w-0 text-left">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
                Cuentas desde movimientos (Supabase)
              </h2>
              <p className="mt-0.5 text-[11px] text-orbita-secondary">
                {ledgerAccounts.length > 0
                  ? `${ledgerAccounts.length} cuenta${ledgerAccounts.length === 1 ? "" : "s"} · importe hoja Movimientos`
                  : "Catálogo ledger del hogar"}
              </p>
            </div>
            <ChevronDown
              className="h-5 w-5 shrink-0 text-orbita-secondary transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="border-t border-orbita-border/80 px-4 pb-4 pt-2 sm:px-6 sm:pb-6">
            <p className="text-xs text-orbita-secondary">
              Creadas o actualizadas al importar la hoja Movimientos (columna Cuenta). Orden: arrastra ⋮⋮ y suelta para
              guardar en Supabase.
            </p>
            {ledgerReorderMessage ? (
              <p
                className="mt-2 rounded-lg border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-xs font-medium text-emerald-900"
                role="status"
              >
                {ledgerReorderMessage}
              </p>
            ) : null}
            {ledgerError ? (
              <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">{ledgerError}</p>
            ) : null}
            {ledgerLoading && ledgerAccounts.length === 0 ? (
              <p className="mt-3 text-sm text-orbita-secondary">Cargando cuentas ledger…</p>
            ) : null}
            {!ledgerLoading && ledgerAccounts.length === 0 && !ledgerError ? (
              <p className="mt-3 text-sm text-orbita-secondary">
                No hay filas en orbita_finance_accounts para este hogar (importa movimientos con columna Cuenta o crea
                cuentas en BD).
              </p>
            ) : null}
            {ledgerAccounts.length > 0 ? (
              <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                {ledgerAccounts.map((a, idx) => (
                  <li
                    key={a.id}
                    onDragOver={(e) => {
                      if (ledgerReorderBusy) return
                      e.preventDefault()
                      e.dataTransfer.dropEffect = "move"
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      if (ledgerReorderBusy) return
                      const raw = e.dataTransfer.getData("text/plain")
                      const from = Number.parseInt(raw, 10)
                      if (!Number.isFinite(from)) return
                      onDropLedgerReorder(from, idx)
                    }}
                    className={`flex gap-2 rounded-xl border border-orbita-border/80 bg-orbita-surface px-2 py-2.5 [overflow-wrap:anywhere] transition-shadow ${
                      draggingLedgerIndex === idx ? "opacity-60 shadow-lg ring-1 ring-orbita-border" : ""
                    }`}
                  >
                    <div
                      draggable={!ledgerReorderBusy}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move"
                        e.dataTransfer.setData("text/plain", String(idx))
                        setDraggingLedgerIndex(idx)
                      }}
                      onDragEnd={() => setDraggingLedgerIndex(null)}
                      className="flex shrink-0 cursor-grab touch-none select-none items-center rounded-md px-1 text-orbita-secondary hover:bg-orbita-surface-alt active:cursor-grabbing"
                      aria-label={`Arrastrar para reordenar ${a.label}`}
                    >
                      <GripVertical className="h-5 w-5 shrink-0" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-orbita-primary">{a.label}</p>
                      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-orbita-secondary">
                        {a.account_class.replace(/_/g, " ")} · {a.nature.replace(/_/g, " ")}
                      </p>
                      {(() => {
                        const bits: string[] = []
                        if (a.manual_balance != null && Number(a.manual_balance) !== 0) {
                          bits.push(`Manual $${formatMoney(Number(a.manual_balance))}`)
                        }
                        if (a.account_class === "ahorro" && a.balance_available != null) {
                          bits.push(`Disp. $${formatMoney(Number(a.balance_available))}`)
                        }
                        if (a.account_class !== "ahorro" && a.balance_used != null) {
                          bits.push(`Usado $${formatMoney(Number(a.balance_used))}`)
                        }
                        if (bits.length === 0) return null
                        return (
                          <p className="mt-1 text-[11px] tabular-nums text-orbita-secondary">{bits.join(" · ")}</p>
                        )
                      })()}
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </details>
      ) : null}

      {layoutEdit ? (
        <Card className={`p-4 text-sm text-orbita-secondary ${arcticPanel}`}>
          <p className="font-medium text-orbita-primary">Vista técnica (consolidado legacy)</p>
          <p className="mt-1 text-xs text-orbita-secondary">
            {accountsLegacy.length} filas derivadas de snapshot + movimientos. La cuadrícula principal sigue el diseño
            Capital.
          </p>
          <ul className="mt-3 list-inside list-disc text-xs">
            {accountsLegacy.map((a) => (
              <li key={a.id}>
                {a.name} — disponible ${formatMoney(a.available)} / deuda ${formatMoney(a.debt)}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {!kpis ? (
        <div className={`rounded-[20px] p-4 text-center text-sm text-orbita-secondary sm:p-8 ${arcticPanel}`}>
          Sin panel de cuentas (activa Supabase o modo mock para datos).
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatKpiCard
              title="Total liquidez"
              value={`$${formatMoney(kpis.totalLiquidez)}`}
              sub={
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    kpis.liquidezTrendPct >= 0 ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {kpis.liquidezTrendPct >= 0 ? (
                    <ArrowUpRight className="h-4 w-4" aria-hidden />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" aria-hidden />
                  )}
                  {kpis.liquidezTrendPct >= 0 ? "+" : ""}
                  {kpis.liquidezTrendPct}% vs mes anterior
                </span>
              }
              icon={<Wallet className="h-5 w-5" />}
            />
            <StatKpiCard
              title="Crédito disponible"
              value={`$${formatMoney(kpis.creditoDisponible)}`}
              sub={<span>{kpis.creditoUsoPromedioPct}% uso promedio</span>}
              icon={<CreditCard className="h-5 w-5" />}
            />
            <StatKpiCard
              title="Deuda total"
              value={`$${formatMoney(kpis.deudaTotal)}`}
              sub={<span>${formatMoney(kpis.deudaCuotaMensual)}/mes en obligaciones estimadas</span>}
              icon={<TrendingDown className="h-5 w-5" />}
              warning
            />
          </div>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Cuentas de ahorro</h2>
              <button
                type="button"
                onClick={openAddSavings}
                className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-teal-800 hover:bg-teal-100"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Agregar cuenta
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {savings.map((s) => (
                <SavingsPlank key={s.id} item={s} onEdit={() => openEditSavings(s)} />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Tarjetas de crédito</h2>
              <button
                type="button"
                onClick={openAddCredit}
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-sky-800 hover:bg-sky-100"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Agregar tarjeta
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {creditCards.map((c) => (
                <CreditPlasticCard key={c.id} card={c} onEdit={() => openEditCredit(c)} />
              ))}
            </div>
          </section>

          <SubscriptionsBurnSection
            supabaseEnabled={supabaseEnabled}
            baselineMonthlyIncome={kpis ? Math.max(1, Math.round(kpis.totalLiquidez * 0.04)) : 4_000_000}
            onSubscriptionSimulatorMonthlyChange={setSubscriptionSimulatorMonthly}
          />

          {kpis ? (
            <CashFlowSimulatorSection
              month={month}
              kpis={kpis}
              subscriptionFixedMonthly={subscriptionSimulatorMonthly}
              onApplyPaymentPlan={() => {
                if (creditCards[0]) openEditCredit(creditCards[0]!)
              }}
            />
          ) : null}

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Créditos estructurales</h2>
              <button
                type="button"
                onClick={openAddLoan}
                className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-violet-800 hover:bg-violet-100"
              >
                <Plus className="h-4 w-4" aria-hidden />
                Agregar crédito
              </button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {loans.map((loan) => (
                <LoanStructuralCard
                  key={loan.id}
                  loan={loan}
                  onEdit={() => openEditLoan(loan)}
                  onPayDate={() => openLoanModal(loan, "paydate")}
                  onPlan={() => openLoanModal(loan, "plan")}
                />
              ))}
            </div>
          </section>
        </>
      )}

      <CuentasModalShell
        open={modal === "paydate" && !!activeLoan}
        onClose={closeModals}
        title="Definir fecha de pago"
        subtitle={activeLoan ? activeLoan.title : undefined}
        headerTint="linear-gradient(180deg, rgba(254,226,226,0.35) 0%, rgba(255,255,255,0) 100%)"
      >
        <p className="text-sm text-orbita-primary">Selecciona el día del mes para tu pago</p>
        <div className="mt-4 grid grid-cols-4 gap-1.5 sm:grid-cols-7 sm:gap-2">
          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPayDay(d)}
              className={`aspect-square min-h-[40px] rounded-lg text-xs font-semibold transition sm:min-h-0 sm:text-sm ${
                payDay === d
                  ? "bg-[#DE5E52] text-white shadow-md"
                  : "border border-orbita-border/80 bg-orbita-surface-alt text-orbita-primary hover:bg-orbita-surface-alt"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-xl border-[0.5px] border-orbita-border bg-orbita-surface-alt/90 p-4">
          <CalendarDays className="mt-0.5 h-5 w-5 text-rose-500" aria-hidden />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Nueva fecha de pago</p>
            <p className="mt-1 text-base font-semibold text-orbita-primary">Cada {payDay} del mes</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={closeModals}
            className="rounded-xl border border-orbita-border bg-orbita-surface-alt py-3 text-sm font-semibold text-orbita-primary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => applyPayDate()}
            className="rounded-xl bg-[#DE5E52] py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            Guardar
          </button>
        </div>
      </CuentasModalShell>

      <CuentasModalShell
        open={modal === "plan" && !!activeLoan}
        onClose={closeModals}
        title="Simulador de plan de pago"
        subtitle={activeLoan ? activeLoan.title : undefined}
        wide
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Parámetros del crédito</p>
            <label className="block text-sm font-medium text-orbita-primary">
              <span className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-orbita-secondary" aria-hidden />
                Monto a financiar
              </span>
              <input
                type="number"
                className="mt-2 w-full rounded-xl border-[0.5px] border-orbita-border bg-orbita-surface px-4 py-3 text-lg font-semibold text-orbita-primary"
                value={planAmount}
                min={0}
                onChange={(e) => setPlanAmount(Number(e.target.value))}
              />
              <span className="mt-1 block text-xs text-orbita-secondary">
                Saldo / capital: ${formatMoney(activeLoan?.saldoPendiente ?? 0)}
              </span>
            </label>
            <label className="block text-sm font-medium text-orbita-primary">
              <span className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-orbita-secondary" aria-hidden />
                % Tasa de interés mensual
              </span>
              <input
                type="number"
                step="0.1"
                className="mt-2 w-full rounded-xl border-[0.5px] border-orbita-border px-4 py-2.5 text-orbita-primary"
                value={planRate}
                onChange={(e) => setPlanRate(Number(e.target.value))}
              />
            </label>
            <div>
              <span className="flex items-center gap-2 text-sm font-medium text-orbita-primary">
                <CalendarDays className="h-4 w-4 text-orbita-secondary" aria-hidden />
                Número de cuotas
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {installmentOptions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPlanN(n)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      planN === n ? "bg-[#E54D42] text-white" : "border border-orbita-border bg-orbita-surface-alt text-orbita-primary"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                type="number"
                className="mt-2 w-full rounded-xl border-[0.5px] border-orbita-border px-4 py-2.5 text-orbita-primary"
                value={planN}
                min={1}
                max={48}
                onChange={(e) => setPlanN(Number(e.target.value))}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-orbita-primary">Tipo de amortización</p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPlanType("fija")}
                  className={`rounded-xl border p-4 text-left text-sm ${
                    planType === "fija"
                      ? "border-[#E54D42] bg-rose-50/60"
                      : "border-orbita-border bg-orbita-surface-alt/80"
                  }`}
                >
                  <p className="font-semibold text-orbita-primary">Cuota fija</p>
                  <p className="mt-1 text-xs text-orbita-secondary">Mismo pago cada mes</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType("variable")}
                  className={`rounded-xl border p-4 text-left text-sm ${
                    planType === "variable"
                      ? "border-[#E54D42] bg-rose-50/60"
                      : "border-orbita-border bg-orbita-surface-alt/80"
                  }`}
                >
                  <p className="font-semibold text-orbita-primary">Cuota variable</p>
                  <p className="mt-1 text-xs text-orbita-secondary">Decrece con el tiempo (aprox.)</p>
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Resultados</p>
            <div className="rounded-2xl border-[0.5px] border-rose-200/80 bg-rose-50/50 p-5">
              <div className="flex items-center gap-2 text-rose-700">
                <Calculator className="h-5 w-5" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Cuota mensual</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-orbita-primary">${formatMoney(cuotaSim)}</p>
              <p className="mt-1 text-sm text-orbita-secondary">Durante {planN} meses</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border-[0.5px] border-orbita-border bg-orbita-surface p-4">
                <p className="text-[10px] font-semibold uppercase text-orbita-secondary">Total a pagar</p>
                <p className="mt-1 text-lg font-semibold text-orbita-primary">${formatMoney(totalPagarSim)}</p>
              </div>
              <div className="rounded-xl border-[0.5px] border-orbita-border bg-orbita-surface p-4">
                <p className="text-[10px] font-semibold uppercase text-orbita-secondary">Intereses</p>
                <p className="mt-1 text-lg font-semibold text-amber-600">${formatMoney(interesesSim)}</p>
              </div>
            </div>
            <div className="rounded-2xl border-[0.5px] border-emerald-200/80 bg-emerald-50/40 p-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <ArrowDownRight className="h-5 w-5" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Reducción de flujo</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-orbita-primary">-{planFlow.reduccionPct}%</p>
              <p className="text-sm text-orbita-secondary">${formatMoney(cuotaSim)} menos disponible</p>
            </div>
            <div className="space-y-2 rounded-xl border-[0.5px] border-orbita-border bg-orbita-surface-alt/80 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-orbita-secondary">Flujo actual</span>
                <span className="font-semibold text-orbita-primary">${formatMoney(flowBaseline.flujoActual)}</span>
              </div>
              <p className="text-xs text-orbita-secondary">Obligaciones actuales: ${formatMoney(flowBaseline.obligActuales)}</p>
              <div className="flex justify-between pt-2">
                <span className="text-orbita-secondary">Flujo con nuevo plan</span>
                <span className="font-semibold text-orbita-primary">${formatMoney(planFlow.flujoConPlan)}</span>
              </div>
              <p className="text-xs text-orbita-secondary">
                Nuevas obligaciones: ${formatMoney(planFlow.nuevasObl)}
              </p>
            </div>
            <div className="rounded-xl border-[0.5px] border-orbita-border bg-orbita-surface p-4 text-sm">
              <p className="text-[11px] font-semibold uppercase text-orbita-secondary">Resumen obligaciones mensuales</p>
              <div className="mt-2 space-y-1.5">
                <div className="flex justify-between">
                  <span>Tarjetas de crédito</span>
                  <span>${formatMoney(flowBaseline.tarjetas)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Créditos estructurales</span>
                  <span>${formatMoney(flowBaseline.estructurales)}</span>
                </div>
                <div className="flex justify-between text-rose-600">
                  <span>+ Nuevo plan de pago</span>
                  <span>${formatMoney(cuotaSim)}</span>
                </div>
                <div className="flex justify-between border-t border-orbita-border pt-2 font-bold text-orbita-primary">
                  <span>Total mensual</span>
                  <span>${formatMoney(planFlow.nuevasObl)}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeModals}
                className="rounded-xl border border-orbita-border bg-orbita-surface-alt py-3 text-sm font-semibold text-orbita-primary"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={closeModals}
                className="rounded-xl bg-[#E54D42] py-3 text-sm font-semibold text-white"
              >
                Aplicar plan de pago
              </button>
            </div>
          </div>
        </div>
      </CuentasModalShell>

      <CuentasModalShell
        open={manualModal === "savings"}
        onClose={() => setManualModal(null)}
        title={savingForm.id ? "Editar cuenta de ahorro" : "Nueva cuenta de ahorro"}
      >
        <div className="space-y-3">
          <label className="block text-sm text-orbita-primary">
            Institución
            <input
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={savingForm.institution}
              onChange={(e) => setSavingForm((s) => ({ ...s, institution: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Nombre de cuenta
            <input
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={savingForm.label}
              onChange={(e) => setSavingForm((s) => ({ ...s, label: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Monto (COP)
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={savingForm.amount}
              onChange={(e) => setSavingForm((s) => ({ ...s, amount: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Salud %
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={savingForm.healthPct}
              onChange={(e) => setSavingForm((s) => ({ ...s, healthPct: Number(e.target.value) }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-orbita-primary">
            <input
              type="checkbox"
              checked={savingForm.trendUp}
              onChange={(e) => setSavingForm((s) => ({ ...s, trendUp: e.target.checked }))}
            />
            Tendencia positiva
          </label>
          {savingForm.id && manualBundle.savings.some((s) => s.id === savingForm.id) ? (
            <div className="border-t border-orbita-border/60 pt-3">
              <button type="button" className={manualItemDeleteTextBtnClass} onClick={() => void deleteSavings()}>
                Eliminar cuenta
              </button>
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => setManualModal(null)}
              className="rounded-xl border border-orbita-border py-2.5 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void submitSavings()}
              className="rounded-[var(--radius-button)] bg-[var(--color-text-primary)] py-2.5 text-sm font-semibold text-[var(--color-surface)] active:opacity-90"
            >
              Guardar
            </button>
          </div>
        </div>
      </CuentasModalShell>

      <CuentasModalShell
        open={manualModal === "credit"}
        onClose={() => setManualModal(null)}
        title={creditForm.id ? "Editar tarjeta" : "Nueva tarjeta"}
        wide
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-orbita-primary">
            Banco
            <input
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={creditForm.bankLabel}
              onChange={(e) => setCreditForm((s) => ({ ...s, bankLabel: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Red
            <input
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={creditForm.network}
              onChange={(e) => setCreditForm((s) => ({ ...s, network: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Últimos 4
            <input
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={creditForm.last4}
              onChange={(e) => setCreditForm((s) => ({ ...s, last4: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Tema visual
            <select
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={creditForm.theme}
              onChange={(e) =>
                setCreditForm((s) => ({ ...s, theme: e.target.value as CuentasCreditCard["theme"] }))
              }
            >
              {CREDIT_CARD_THEME_IDS.map((id) => (
                <option key={id} value={id}>
                  {CREDIT_THEME_LABELS[id]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-orbita-primary">
            Saldo
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={creditForm.balance}
              onChange={(e) => setCreditForm((s) => ({ ...s, balance: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Cupo
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={creditForm.limit}
              onChange={(e) => setCreditForm((s) => ({ ...s, limit: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Día de pago
            <input
              type="number"
              min={1}
              max={28}
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={creditForm.paymentDay}
              onChange={(e) => setCreditForm((s) => ({ ...s, paymentDay: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Score
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={creditForm.score}
              onChange={(e) => setCreditForm((s) => ({ ...s, score: Number(e.target.value) }))}
            />
          </label>
        </div>
        {creditForm.id && manualBundle.creditCards.some((c) => c.id === creditForm.id) ? (
          <div className="mt-4 border-t border-orbita-border/60 pt-3">
            <button type="button" className={manualItemDeleteTextBtnClass} onClick={() => void deleteCredit()}>
              Eliminar tarjeta
            </button>
          </div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setManualModal(null)}
            className="rounded-xl border border-orbita-border py-2.5 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void submitCredit()}
            className="rounded-[var(--radius-button)] bg-[var(--color-text-primary)] py-2.5 text-sm font-semibold text-[var(--color-surface)] active:opacity-90"
          >
            Guardar
          </button>
        </div>
      </CuentasModalShell>

      <CuentasModalShell
        open={manualModal === "loan"}
        onClose={() => setManualModal(null)}
        title={loanForm.id ? "Editar crédito estructural" : "Nuevo crédito estructural"}
        wide
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm text-orbita-primary sm:col-span-2">
            Título
            <input
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={loanForm.title}
              onChange={(e) => setLoanForm((s) => ({ ...s, title: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Tipo
            <select
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={loanForm.kind}
              onChange={(e) => setLoanForm((s) => ({ ...s, kind: e.target.value as "home" | "education" }))}
            >
              <option value="home">Vivienda</option>
              <option value="education">Educación</option>
            </select>
          </label>
          <label className="block text-sm text-orbita-primary">
            % pagado
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={loanForm.pctPagado}
              onChange={(e) => setLoanForm((s) => ({ ...s, pctPagado: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Saldo pendiente
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={loanForm.saldoPendiente}
              onChange={(e) => setLoanForm((s) => ({ ...s, saldoPendiente: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Cuota mensual
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={loanForm.cuotaMensual}
              onChange={(e) => setLoanForm((s) => ({ ...s, cuotaMensual: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary sm:col-span-2">
            Próximo pago (texto)
            <input
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={loanForm.proximoPagoLabel}
              onChange={(e) => setLoanForm((s) => ({ ...s, proximoPagoLabel: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Monto original
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={loanForm.montoOriginal}
              onChange={(e) => setLoanForm((s) => ({ ...s, montoOriginal: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Abonado
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-orbita-border px-3 py-2"
              value={loanForm.abonadoMonto}
              onChange={(e) => setLoanForm((s) => ({ ...s, abonadoMonto: Number(e.target.value) }))}
            />
          </label>
        </div>
        {loanForm.id && manualBundle.loans.some((l) => l.id === loanForm.id) ? (
          <div className="mt-4 border-t border-orbita-border/60 pt-3">
            <button type="button" className={manualItemDeleteTextBtnClass} onClick={() => void deleteLoan()}>
              Eliminar crédito
            </button>
          </div>
        ) : null}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setManualModal(null)}
            className="rounded-xl border border-orbita-border py-2.5 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void submitLoan()}
            className="rounded-[var(--radius-button)] bg-[var(--color-text-primary)] py-2.5 text-sm font-semibold text-[var(--color-surface)] active:opacity-90"
          >
            Guardar
          </button>
        </div>
      </CuentasModalShell>
    </div>
  )
}
