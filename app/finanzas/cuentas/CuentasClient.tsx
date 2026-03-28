"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CalendarDays,
  CreditCard,
  GraduationCap,
  Home,
  Percent,
  TrendingDown,
  Plus,
  Wallet,
} from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import { useFinance } from "../FinanceContext"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { financeApiGet, financeApiJson } from "@/lib/finanzas/financeClientFetch"
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
import { payLabelForMonth } from "@/lib/finanzas/cuentasDashboard"
import { SubscriptionsBurnSection } from "./SubscriptionsBurnSection"
import { CashFlowSimulatorSection } from "./CashFlowSimulatorSection"
import { CuentasModalShell } from "./CuentasModalShell"
import { arcticPanel, formatMoney, formatShortMillions } from "./cuentasFormat"

const supabaseEnabled = process.env.NEXT_PUBLIC_SUPABASE_ENABLED === "true"

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

type TxRow = {
  fecha: string
  descripcion: string
  categoria: string
  subcategoria: string
  monto: number
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
}

function categoryIcon(cat: string, monto: number) {
  const c = `${cat}`.toLowerCase()
  if (monto > 0) return "↓"
  if (/stream|prime|netflix|spotify/i.test(c)) return "◷"
  if (/compra|super|mercado|éxito/i.test(c)) return "◫"
  if (/restaurant|aliment|comida/i.test(c)) return "◔"
  if (/servicio|luz|gas|codensa|claro|internet|wifi/i.test(c)) return "⚡"
  return "◆"
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
      <div className="absolute right-4 top-4 text-slate-300">{icon}</div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">{title}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[26px]">{value}</p>
      <div className="mt-2 text-sm text-slate-500">{sub}</div>
      {warning ? (
        <div className="absolute bottom-4 right-4 rounded-full bg-orange-100 p-1.5 text-orange-600">
          <TrendingDown className="h-4 w-4" aria-hidden />
        </div>
      ) : null}
    </Card>
  )
}

function SavingsPlank({ item, onEdit }: { item: CuentasSavingsCard; onEdit?: () => void }) {
  return (
    <div
      className={`relative overflow-hidden p-6 sm:p-8 ${arcticPanel}`}
      style={{
        background: "linear-gradient(120deg, rgba(240,253,250,0.95) 0%, rgba(255,255,255,0.98) 55%, rgba(236,254,255,0.88) 100%)",
      }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-teal-600/80">{item.institution}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{item.label}</h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border-[0.5px] border-emerald-200/80 bg-emerald-50/90 px-3 py-1 text-xs font-semibold text-emerald-700">
          {item.healthPct}% {item.trendUp ? <ArrowUpRight className="h-3.5 w-3.5" aria-hidden /> : null}
        </span>
      </div>
      <p className="mt-6 text-3xl font-semibold tracking-tight text-slate-900">${formatMoney(item.amount)}</p>
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

function CreditPlasticCard({
  card,
  onMovements,
  onPayDate,
  onPlan,
  onEdit,
}: {
  card: CuentasCreditCard
  onMovements: () => void
  onPayDate: () => void
  onPlan: () => void
  onEdit?: () => void
}) {
  const th = creditThemes[card.theme]
  const usageWidth = `${Math.min(100, Math.max(4, card.usagePct))}%`
  const barColor = card.usagePct >= 50 ? th.barHigh : "bg-white/50"

  return (
    <div
      className={`relative flex min-h-[200px] flex-col rounded-[18px] border-[0.5px] border-white/30 p-5 pb-14 text-white shadow-[0_20px_50px_-18px_rgba(15,23,42,0.45)] sm:min-h-[220px] sm:pb-14`}
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
      <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1 border-t border-white/20 pt-3 text-[11px] font-medium text-white/90">
        <button type="button" onClick={onMovements} className="hover:underline">
          Movimientos
        </button>
        <button type="button" onClick={onPayDate} className="hover:underline">
          Fecha pago
        </button>
        <button type="button" onClick={onPlan} className="hover:underline">
          Plan de pago
        </button>
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
            <h3 className="text-base font-semibold text-slate-900">{loan.title}</h3>
            <p className="text-xs text-slate-500">Crédito estructural</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onEdit ? (
            <button
              type="button"
              onClick={onEdit}
              className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50"
            >
              Editar
            </button>
          ) : null}
          <span className="rounded-full border-[0.5px] border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
            {loan.pctPagado}% pagado
          </span>
        </div>
      </div>
      <div className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
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
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">{c.label}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
        <span>Monto original ${formatMoney(loan.montoOriginal)}</span>
        <span className="rounded-full bg-violet-100/80 px-2.5 py-1 font-semibold text-violet-800">
          ${formatShortMillions(loan.abonadoMonto)} abonados
        </span>
      </div>
      {onPayDate || onPlan ? (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-4 text-[11px] font-semibold text-violet-800">
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

  const [dashboard, setDashboard] = useState<CuentasDashboardPayload | null>(null)
  const [accountsLegacy, setAccountsLegacy] = useState<AccountLegacy[]>([])
  const [loading, setLoading] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [layoutEdit, setLayoutEdit] = useState(false)

  const [activeCard, setActiveCard] = useState<CuentasCreditCard | null>(null)
  const [activeLoan, setActiveLoan] = useState<CuentasLoanCard | null>(null)
  const [modal, setModal] = useState<"movements" | "paydate" | "plan" | null>(null)

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

  const [txRows, setTxRows] = useState<TxRow[]>([])
  const [txLoading, setTxLoading] = useState(false)
  const [txLoadError, setTxLoadError] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState<string | "todas">("todas")

  const [payDay, setPayDay] = useState(5)

  const [planAmount, setPlanAmount] = useState(1_800_000)
  const [planRate, setPlanRate] = useState(2.5)
  const [planN, setPlanN] = useState(12)
  const [planType, setPlanType] = useState<"fija" | "variable">("fija")
  const installmentOptions = [6, 12, 18, 24]

  useEffect(() => {
    if (!month) return
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        setLoadError(null)
        setNotice(null)
        const res = await financeApiGet(`/api/orbita/finanzas/accounts?month=${encodeURIComponent(month)}`)
        const json = (await res.json()) as {
          success?: boolean
          data?: { accounts?: AccountLegacy[]; dashboard?: CuentasDashboardPayload | null }
          error?: string
          notice?: string
        }
        if (!res.ok || !json.success) {
          throw new Error(messageForHttpError(res.status, json.error, res.statusText))
        }
        if (!cancelled) {
          setAccountsLegacy(json.data?.accounts ?? [])
          setDashboard(json.data?.dashboard ?? null)
          setNotice(json.notice ?? null)
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Error")
          setDashboard(null)
          setAccountsLegacy([])
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [month])

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

  const loadMovements = useCallback(async () => {
    if (!month) return
    setTxLoading(true)
    setTxLoadError(null)
    try {
      const res = await financeApiGet(`/api/orbita/finanzas/transactions?month=${encodeURIComponent(month)}`)
      const json = (await res.json()) as { success?: boolean; data?: { transactions?: TxRow[] }; error?: string }
      if (!res.ok || !json.success) {
        setTxLoadError(messageForHttpError(res.status, json.error, res.statusText))
        setTxRows([])
        return
      }
      setTxRows(json.data?.transactions ?? [])
    } catch {
      setTxLoadError("Error de red al cargar movimientos.")
      setTxRows([])
    } finally {
      setTxLoading(false)
    }
  }, [month])

  useEffect(() => {
    if (modal === "movements" && activeCard) void loadMovements()
  }, [modal, activeCard, loadMovements])

  const mergedDashboard = useMemo(() => {
    if (!dashboard) return null
    return mergeCuentasDashboard(dashboard, manualBundle)
  }, [dashboard, manualBundle])

  const kpis: CuentasKpis | null = mergedDashboard?.kpis ?? null
  const savings: CuentasSavingsCard[] = mergedDashboard?.savings ?? []
  const creditCards: CuentasCreditCard[] = mergedDashboard?.creditCards ?? []
  const loans: CuentasLoanCard[] = mergedDashboard?.loans ?? []

  const categories = useMemo(() => {
    const s = new Set<string>()
    for (const r of txRows) {
      if (r.categoria) s.add(r.categoria)
    }
    return [...s].sort()
  }, [txRows])

  const filteredTx = useMemo(() => {
    if (categoryFilter === "todas") return txRows
    return txRows.filter((r) => r.categoria === categoryFilter)
  }, [txRows, categoryFilter])

  const movementSummary = useMemo(() => {
    let gastos = 0
    let ingresos = 0
    for (const r of filteredTx) {
      if (r.monto < 0) gastos += Math.abs(r.monto)
      else ingresos += r.monto
    }
    return { gastos, ingresos, n: filteredTx.length }
  }, [filteredTx])

  useEffect(() => {
    if (activeCard) setPayDay(activeCard.paymentDay)
    else if (activeLoan) setPayDay(5)
  }, [activeCard, activeLoan])

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

  const openCardModal = (card: CuentasCreditCard, m: typeof modal) => {
    setActiveLoan(null)
    setActiveCard(card)
    setModal(m)
    if (m === "movements") {
      setCategoryFilter("todas")
      setTxLoadError(null)
    }
    if (m === "plan") setPlanAmount(Math.max(50_000, card.balance))
  }

  const openLoanModal = (loan: CuentasLoanCard, m: "paydate" | "plan") => {
    setActiveCard(null)
    setActiveLoan(loan)
    setModal(m)
    if (m === "plan") setPlanAmount(Math.max(50_000, loan.saldoPendiente))
  }

  const closeModals = () => {
    setModal(null)
    setActiveCard(null)
    setActiveLoan(null)
  }

  const applyPayDate = () => {
    const labelCredit = payLabelForMonth(month, payDay)
    if (activeCard) {
      const updated: CuentasCreditCard = {
        ...activeCard,
        paymentDay: payDay,
        paymentDueLabel: labelCredit,
      }
      const existing = manualBundle.creditCards.find((c) => c.id === activeCard.id)
      const newId =
        activeCard.manualRowId || existing
          ? activeCard.id
          : activeCard.id.startsWith("manual-cc")
            ? activeCard.id
            : newManualId("manual-cc")
      let rep = activeCard.replacesSyntheticId
      if (!activeCard.manualRowId && !existing && !activeCard.id.startsWith("manual-cc")) {
        rep = activeCard.id
      }
      const row: CuentasCreditCard = {
        ...updated,
        id: newId,
        replacesSyntheticId: rep,
        manualRowId: activeCard.manualRowId,
      }
      const next: ManualFinanceBundle = {
        ...manualBundle,
        creditCards: [...manualBundle.creditCards.filter((c) => c.id !== row.id), row],
      }
      void persistBundle(next)
    } else if (activeLoan) {
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
      theme: c.theme,
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
      theme: creditForm.theme,
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

  if (!finance) {
    return (
      <div className="p-6 text-center text-slate-500">
        <p>Inicializando...</p>
      </div>
    )
  }

  if (loading) {
    return <div className="p-6 text-center text-slate-500">Cargando cuentas…</div>
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
    <div className="space-y-10 pb-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-[28px]">Cuentas</h1>
          <p className="mt-1 text-sm text-slate-500 sm:text-[15px]">
            Liquidez, exposición y disponibilidad por cuenta
          </p>
          <p className="mt-2 text-xs text-slate-400">
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

      {layoutEdit ? (
        <Card className={`p-4 text-sm text-slate-600 ${arcticPanel}`}>
          <p className="font-medium text-slate-800">Vista técnica (consolidado legacy)</p>
          <p className="mt-1 text-xs text-slate-500">
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
        <div className={`rounded-[20px] p-8 text-center text-sm text-slate-500 ${arcticPanel}`}>
          Sin panel de cuentas (activa Supabase o modo mock para datos).
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Cuentas de ahorro</h2>
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
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Tarjetas de crédito</h2>
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
                <CreditPlasticCard
                  key={c.id}
                  card={c}
                  onMovements={() => openCardModal(c, "movements")}
                  onPayDate={() => openCardModal(c, "paydate")}
                  onPlan={() => openCardModal(c, "plan")}
                  onEdit={() => openEditCredit(c)}
                />
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
                if (creditCards[0]) openCardModal(creditCards[0]!, "plan")
              }}
            />
          ) : null}

          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">Créditos estructurales</h2>
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
        open={modal === "movements" && !!activeCard}
        onClose={() => setModal(null)}
        title="Movimientos del mes"
        subtitle={activeCard ? `${activeCard.network} ${activeCard.bankLabel} ···· ${activeCard.last4}` : undefined}
      >
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {[
            { label: "Gastos", value: `$${formatMoney(movementSummary.gastos)}`, tone: "text-rose-600" },
            { label: "Ingresos", value: `$${formatMoney(movementSummary.ingresos)}`, tone: "text-emerald-600" },
            { label: "Transacciones", value: String(movementSummary.n), tone: "text-slate-900" },
          ].map((b) => (
            <div
              key={b.label}
              className="rounded-xl border-[0.5px] border-slate-200/90 bg-slate-50/80 p-3 text-center shadow-sm"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">{b.label}</p>
              <p className={`mt-1 text-lg font-semibold ${b.tone}`}>{b.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategoryFilter("todas")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              categoryFilter === "todas"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoryFilter(c)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium ${
                categoryFilter === c ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          {txLoadError ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-center text-sm text-amber-900">
              {txLoadError}
            </p>
          ) : null}
          {txLoading ? (
            <p className="text-center text-sm text-slate-500">Cargando…</p>
          ) : !txLoadError && filteredTx.length === 0 ? (
            <p className="text-center text-sm text-slate-500">No hay movimientos para este filtro.</p>
          ) : !txLoadError ? (
            filteredTx.map((r, i) => {
              const income = r.monto > 0
              return (
                <div
                  key={`${r.fecha}-${i}`}
                  className="flex items-center gap-3 rounded-xl border-[0.5px] border-slate-100 bg-slate-50/90 p-3"
                >
                  <div
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                      income ? "bg-emerald-100 text-emerald-700" : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {categoryIcon(r.categoria, r.monto)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900">{r.descripcion}</p>
                    <p className="text-xs text-slate-500">
                      {r.categoria} · {r.fecha.slice(5).replace("-", " ")}
                    </p>
                  </div>
                  <div
                    className={`flex-shrink-0 text-sm font-semibold ${income ? "text-emerald-600" : "text-slate-800"}`}
                  >
                    {income ? "+" : ""}${formatMoney(Math.abs(r.monto))}
                  </div>
                </div>
              )
            })
          ) : null}
        </div>
      </CuentasModalShell>

      <CuentasModalShell
        open={modal === "paydate" && (!!activeCard || !!activeLoan)}
        onClose={closeModals}
        title="Definir fecha de pago"
        subtitle={
          activeCard
            ? `${activeCard.network} ${activeCard.bankLabel} ···· ${activeCard.last4}`
            : activeLoan
              ? activeLoan.title
              : undefined
        }
        headerTint="linear-gradient(180deg, rgba(254,226,226,0.35) 0%, rgba(255,255,255,0) 100%)"
      >
        <p className="text-sm text-slate-700">Selecciona el día del mes para tu pago</p>
        <div className="mt-4 grid grid-cols-7 gap-2">
          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setPayDay(d)}
              className={`aspect-square rounded-lg text-sm font-semibold transition ${
                payDay === d
                  ? "bg-[#DE5E52] text-white shadow-md"
                  : "border border-slate-200/80 bg-slate-50 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-start gap-3 rounded-xl border-[0.5px] border-slate-200 bg-slate-50/90 p-4">
          <CalendarDays className="mt-0.5 h-5 w-5 text-rose-500" aria-hidden />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Nueva fecha de pago</p>
            <p className="mt-1 text-base font-semibold text-slate-900">Cada {payDay} del mes</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={closeModals}
            className="rounded-xl border border-slate-200 bg-slate-100 py-3 text-sm font-semibold text-slate-700"
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
        open={modal === "plan" && (!!activeCard || !!activeLoan)}
        onClose={closeModals}
        title="Simulador de plan de pago"
        subtitle={
          activeCard
            ? `${activeCard.network} ${activeCard.bankLabel} ···· ${activeCard.last4}`
            : activeLoan
              ? activeLoan.title
              : undefined
        }
        wide
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Parámetros del crédito</p>
            <label className="block text-sm font-medium text-slate-700">
              <span className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-slate-400" aria-hidden />
                Monto a financiar
              </span>
              <input
                type="number"
                className="mt-2 w-full rounded-xl border-[0.5px] border-slate-200 bg-white px-4 py-3 text-lg font-semibold text-slate-900"
                value={planAmount}
                min={0}
                onChange={(e) => setPlanAmount(Number(e.target.value))}
              />
              <span className="mt-1 block text-xs text-slate-500">
                Saldo / capital: $
                {formatMoney(activeCard?.balance ?? activeLoan?.saldoPendiente ?? 0)}
              </span>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              <span className="flex items-center gap-2">
                <Percent className="h-4 w-4 text-slate-400" aria-hidden />
                % Tasa de interés mensual
              </span>
              <input
                type="number"
                step="0.1"
                className="mt-2 w-full rounded-xl border-[0.5px] border-slate-200 px-4 py-2.5 text-slate-900"
                value={planRate}
                onChange={(e) => setPlanRate(Number(e.target.value))}
              />
            </label>
            <div>
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden />
                Número de cuotas
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                {installmentOptions.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setPlanN(n)}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      planN === n ? "bg-[#E54D42] text-white" : "border border-slate-200 bg-slate-50 text-slate-700"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <input
                type="number"
                className="mt-2 w-full rounded-xl border-[0.5px] border-slate-200 px-4 py-2.5 text-slate-900"
                value={planN}
                min={1}
                max={48}
                onChange={(e) => setPlanN(Number(e.target.value))}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">Tipo de amortización</p>
              <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setPlanType("fija")}
                  className={`rounded-xl border p-4 text-left text-sm ${
                    planType === "fija"
                      ? "border-[#E54D42] bg-rose-50/60"
                      : "border-slate-200 bg-slate-50/80"
                  }`}
                >
                  <p className="font-semibold text-slate-900">Cuota fija</p>
                  <p className="mt-1 text-xs text-slate-500">Mismo pago cada mes</p>
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType("variable")}
                  className={`rounded-xl border p-4 text-left text-sm ${
                    planType === "variable"
                      ? "border-[#E54D42] bg-rose-50/60"
                      : "border-slate-200 bg-slate-50/80"
                  }`}
                >
                  <p className="font-semibold text-slate-900">Cuota variable</p>
                  <p className="mt-1 text-xs text-slate-500">Decrece con el tiempo (aprox.)</p>
                </button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Resultados</p>
            <div className="rounded-2xl border-[0.5px] border-rose-200/80 bg-rose-50/50 p-5">
              <div className="flex items-center gap-2 text-rose-700">
                <Calculator className="h-5 w-5" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Cuota mensual</span>
              </div>
              <p className="mt-2 text-3xl font-bold text-slate-900">${formatMoney(cuotaSim)}</p>
              <p className="mt-1 text-sm text-slate-500">Durante {planN} meses</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border-[0.5px] border-slate-200 bg-white p-4">
                <p className="text-[10px] font-semibold uppercase text-slate-400">Total a pagar</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">${formatMoney(totalPagarSim)}</p>
              </div>
              <div className="rounded-xl border-[0.5px] border-slate-200 bg-white p-4">
                <p className="text-[10px] font-semibold uppercase text-slate-400">Intereses</p>
                <p className="mt-1 text-lg font-semibold text-amber-600">${formatMoney(interesesSim)}</p>
              </div>
            </div>
            <div className="rounded-2xl border-[0.5px] border-emerald-200/80 bg-emerald-50/40 p-4">
              <div className="flex items-center gap-2 text-emerald-800">
                <ArrowDownRight className="h-5 w-5" aria-hidden />
                <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Reducción de flujo</span>
              </div>
              <p className="mt-1 text-2xl font-bold text-slate-900">-{planFlow.reduccionPct}%</p>
              <p className="text-sm text-slate-600">${formatMoney(cuotaSim)} menos disponible</p>
            </div>
            <div className="space-y-2 rounded-xl border-[0.5px] border-slate-200 bg-slate-50/80 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Flujo actual</span>
                <span className="font-semibold text-slate-900">${formatMoney(flowBaseline.flujoActual)}</span>
              </div>
              <p className="text-xs text-slate-500">Obligaciones actuales: ${formatMoney(flowBaseline.obligActuales)}</p>
              <div className="flex justify-between pt-2">
                <span className="text-slate-500">Flujo con nuevo plan</span>
                <span className="font-semibold text-slate-900">${formatMoney(planFlow.flujoConPlan)}</span>
              </div>
              <p className="text-xs text-slate-500">
                Nuevas obligaciones: ${formatMoney(planFlow.nuevasObl)}
              </p>
            </div>
            <div className="rounded-xl border-[0.5px] border-slate-200 bg-white p-4 text-sm">
              <p className="text-[11px] font-semibold uppercase text-slate-400">Resumen obligaciones mensuales</p>
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
                <div className="flex justify-between border-t border-slate-100 pt-2 font-bold text-slate-900">
                  <span>Total mensual</span>
                  <span>${formatMoney(planFlow.nuevasObl)}</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={closeModals}
                className="rounded-xl border border-slate-200 bg-slate-100 py-3 text-sm font-semibold text-slate-800"
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
          <label className="block text-sm text-slate-700">
            Institución
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={savingForm.institution}
              onChange={(e) => setSavingForm((s) => ({ ...s, institution: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Nombre de cuenta
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={savingForm.label}
              onChange={(e) => setSavingForm((s) => ({ ...s, label: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Monto (COP)
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={savingForm.amount}
              onChange={(e) => setSavingForm((s) => ({ ...s, amount: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Salud %
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={savingForm.healthPct}
              onChange={(e) => setSavingForm((s) => ({ ...s, healthPct: Number(e.target.value) }))}
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={savingForm.trendUp}
              onChange={(e) => setSavingForm((s) => ({ ...s, trendUp: e.target.checked }))}
            />
            Tendencia positiva
          </label>
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              onClick={() => setManualModal(null)}
              className="rounded-xl border border-slate-200 py-2.5 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void submitSavings()}
              className="rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white"
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
          <label className="block text-sm text-slate-700">
            Banco
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={creditForm.bankLabel}
              onChange={(e) => setCreditForm((s) => ({ ...s, bankLabel: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Red
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={creditForm.network}
              onChange={(e) => setCreditForm((s) => ({ ...s, network: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Últimos 4
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={creditForm.last4}
              onChange={(e) => setCreditForm((s) => ({ ...s, last4: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Tema visual
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={creditForm.theme}
              onChange={(e) =>
                setCreditForm((s) => ({ ...s, theme: e.target.value as CuentasCreditCard["theme"] }))
              }
            >
              <option value="itau">Itaú</option>
              <option value="bbva">BBVA</option>
              <option value="davivienda">Davivienda</option>
              <option value="scotiabank">Scotiabank</option>
            </select>
          </label>
          <label className="block text-sm text-slate-700">
            Saldo
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={creditForm.balance}
              onChange={(e) => setCreditForm((s) => ({ ...s, balance: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Cupo
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={creditForm.limit}
              onChange={(e) => setCreditForm((s) => ({ ...s, limit: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Día de pago
            <input
              type="number"
              min={1}
              max={28}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={creditForm.paymentDay}
              onChange={(e) => setCreditForm((s) => ({ ...s, paymentDay: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Score
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={creditForm.score}
              onChange={(e) => setCreditForm((s) => ({ ...s, score: Number(e.target.value) }))}
            />
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setManualModal(null)}
            className="rounded-xl border border-slate-200 py-2.5 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void submitCredit()}
            className="rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white"
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
          <label className="block text-sm text-slate-700 sm:col-span-2">
            Título
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={loanForm.title}
              onChange={(e) => setLoanForm((s) => ({ ...s, title: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Tipo
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={loanForm.kind}
              onChange={(e) => setLoanForm((s) => ({ ...s, kind: e.target.value as "home" | "education" }))}
            >
              <option value="home">Vivienda</option>
              <option value="education">Educación</option>
            </select>
          </label>
          <label className="block text-sm text-slate-700">
            % pagado
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={loanForm.pctPagado}
              onChange={(e) => setLoanForm((s) => ({ ...s, pctPagado: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Saldo pendiente
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={loanForm.saldoPendiente}
              onChange={(e) => setLoanForm((s) => ({ ...s, saldoPendiente: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Cuota mensual
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={loanForm.cuotaMensual}
              onChange={(e) => setLoanForm((s) => ({ ...s, cuotaMensual: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-slate-700 sm:col-span-2">
            Próximo pago (texto)
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={loanForm.proximoPagoLabel}
              onChange={(e) => setLoanForm((s) => ({ ...s, proximoPagoLabel: e.target.value }))}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Monto original
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={loanForm.montoOriginal}
              onChange={(e) => setLoanForm((s) => ({ ...s, montoOriginal: Number(e.target.value) }))}
            />
          </label>
          <label className="block text-sm text-slate-700">
            Abonado
            <input
              type="number"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={loanForm.abonadoMonto}
              onChange={(e) => setLoanForm((s) => ({ ...s, abonadoMonto: Number(e.target.value) }))}
            />
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setManualModal(null)}
            className="rounded-xl border border-slate-200 py-2.5 text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void submitLoan()}
            className="rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white"
          >
            Guardar
          </button>
        </div>
      </CuentasModalShell>
    </div>
  )
}
