"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, ChevronDown, TrendingUp } from "lucide-react"
import { financeApiGet, financeApiJson } from "@/lib/finanzas/financeClientFetch"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import type { CuentasKpis } from "@/lib/finanzas/cuentasDashboard"
import type { FlowCommitment, FlowCommitmentFlowType } from "@/lib/finanzas/flowCommitmentsTypes"
import {
  readFlowCommitmentsFromLocalStorage,
  writeFlowCommitmentsToLocalStorage,
} from "@/lib/finanzas/flowCommitmentsLocal"
import { CuentasModalShell } from "./CuentasModalShell"
import { arcticPanel, formatMoney } from "./cuentasFormat"

type FlowRow = { month: string; ingresos: number; gasto_operativo: number; flujo: number }

type Commitment = FlowCommitment
type CommitmentFlowType = FlowCommitmentFlowType

function isIncomeCommitment(c: Commitment) {
  return c.flowType === "income"
}

function obligationCategoryLabel(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("arriendo") || n.includes("vivienda") || n.includes("rent") || n.includes("alquiler")) {
    return "Rent Payment"
  }
  if (n.includes("seguro") && (n.includes("salud") || n.includes("health"))) return "Health Insurance"
  if (n.includes("seguro")) return "Insurance"
  if (n.includes("internet") || n.includes("utilities") || n.includes("servicio")) return "Utilities"
  return "Fixed expense"
}

function formatCommitmentDayEn(isoDate: string) {
  const raw = isoDate.slice(0, 10)
  const [y, mo, da] = raw.split("-").map(Number)
  if (!y || !mo || !da) return raw
  const d = new Date(y, mo - 1, da)
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

const FLOW_TYPE_OPTIONS: { value: CommitmentFlowType; label: string }[] = [
  { value: "fixed", label: "Gasto fijo" },
  { value: "one-time", label: "Única vez" },
  { value: "recurring", label: "Recurrente" },
  { value: "income", label: "Ingreso" },
]

function flowTypeBadgeClass(t: CommitmentFlowType) {
  if (t === "income") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (t === "recurring") return "border-sky-200 bg-sky-50 text-sky-900"
  if (t === "one-time") return "border-amber-200 bg-amber-50 text-amber-900"
  return "border-orbita-border bg-orbita-surface text-orbita-primary"
}

function addMonthsYm(ym: string, add: number): string {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m) return ym
  const d = new Date(y, m - 1 + add, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function ymLabel(ym: string) {
  const m = Number(ym.slice(5, 7))
  const SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  return SHORT[(m || 1) - 1] ?? ym
}

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `c-${Date.now()}`
}

export function CashFlowSimulatorSection({
  month,
  kpis,
  supabaseEnabled,
  subscriptionFixedMonthly,
  onApplyPaymentPlan,
}: {
  month: string
  kpis: CuentasKpis
  supabaseEnabled: boolean
  subscriptionFixedMonthly: number
  onApplyPaymentPlan: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [incomeBase, setIncomeBase] = useState(0)
  const [rolling, setRolling] = useState<FlowRow[]>([])
  const [commitments, setCommitments] = useState<Commitment[]>([])
  const [commitmentsHydrated, setCommitmentsHydrated] = useState(false)
  const [commitOpen, setCommitOpen] = useState(false)
  const [commitSaveErr, setCommitSaveErr] = useState<string | null>(null)
  const [draftC, setDraftC] = useState({
    title: "",
    category: "",
    date: "",
    amount: 0,
    flowType: "fixed" as CommitmentFlowType,
  })
  const [simulatorExpanded, setSimulatorExpanded] = useState(false)
  const [flowViz, setFlowViz] = useState<"table" | "bars">("table")

  const [ingresosAdjustPct, setIngresosAdjustPct] = useState(0)
  const [gastosFijos, setGastosFijos] = useState(0)
  const [gastosVariables, setGastosVariables] = useState(0)
  const [ahorroObjetivo, setAhorroObjetivo] = useState(0)

  const load = useCallback(async () => {
    if (!month) return
    setLoading(true)
    setErr(null)
    try {
      const res = await financeApiGet(`/api/orbita/finanzas/overview?month=${encodeURIComponent(month)}`)
      const json = (await res.json()) as {
        success?: boolean
        data?: {
          income?: number
          expense?: number
          flowEvolution?: { rollingYear?: FlowRow[] }
          obligations?: { name: string; due: string; amount: number }[]
          flowCommitments?: FlowCommitment[]
        } | null
        error?: string
      }
      if (!res.ok || !json.success || !json.data) {
        throw new Error(messageForHttpError(res.status, json.error, res.statusText))
      }
      const d = json.data
      const inc = Number(d.income) || 0
      const exp = Number(d.expense) || 0
      setIncomeBase(inc)
      const yr = d.flowEvolution?.rollingYear ?? []
      setRolling(yr)
      const seeded: Commitment[] = (d.obligations ?? []).map((o) => {
        const title = o.name
        const cat = obligationCategoryLabel(o.name)
        return {
          id: newId(),
          title,
          category: cat,
          date: o.due?.slice(0, 10) ?? month + "-01",
          amount: Number(o.amount) || 0,
          flowType: "fixed" as const,
        }
      })
      if (supabaseEnabled) {
        const fromApi = Array.isArray(d.flowCommitments) ? d.flowCommitments : []
        if (fromApi.length > 0) {
          setCommitments(fromApi)
        } else if (seeded.length > 0) {
          setCommitments(seeded)
        } else {
          setCommitments([])
        }
      } else {
        const stored = readFlowCommitmentsFromLocalStorage()
        if (stored.length > 0) {
          setCommitments(stored)
        } else if (seeded.length > 0) {
          setCommitments(seeded)
          writeFlowCommitmentsToLocalStorage(seeded)
        } else {
          setCommitments([])
        }
      }
      setCommitmentsHydrated(true)
      const defaultFijos = Math.round(kpis.deudaCuotaMensual * 0.42)
      const defaultVar = Math.round(exp * 0.32)
      setGastosFijos((f) => (f === 0 ? defaultFijos : f))
      setGastosVariables((v) => (v === 0 ? defaultVar : v))
      setAhorroObjetivo((a) => (a === 0 ? Math.max(0, Math.round(inc * 0.08)) : a))
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sin datos de overview")
      setIncomeBase((i) => i || 5_000_000)
      setGastosFijos((f) => f || Math.round(kpis.deudaCuotaMensual * 0.42))
      setGastosVariables((v) => v || 1_200_000)
      if (supabaseEnabled) {
        setCommitments([])
      } else {
        setCommitments(readFlowCommitmentsFromLocalStorage())
      }
      setCommitmentsHydrated(true)
    } finally {
      setLoading(false)
    }
  }, [month, kpis.deudaCuotaMensual, subscriptionFixedMonthly, supabaseEnabled])

  useEffect(() => {
    if (!commitmentsHydrated || supabaseEnabled) return
    writeFlowCommitmentsToLocalStorage(commitments)
  }, [commitments, commitmentsHydrated, supabaseEnabled])

  useEffect(() => {
    void load()
  }, [load])

  const trendFromHistory = useMemo(() => {
    if (rolling.length < 2) return 0
    const first = rolling[0]!.ingresos
    const last = rolling[rolling.length - 1]!.ingresos
    if (first < 1) return 0
    return ((last - first) / first) * 100
  }, [rolling])

  const incomeHistoricalAvg = useMemo(() => {
    if (rolling.length === 0) return incomeBase
    const s = rolling.reduce((a, r) => a + r.ingresos, 0)
    return s / rolling.length
  }, [rolling, incomeBase])

  const ingresosEstimados = useMemo(() => {
    const trendFactor = 1 + (trendFromHistory / 100) * 0.35
    const adj = 1 + ingresosAdjustPct / 100
    return Math.max(0, Math.round(incomeBase * trendFactor * adj))
  }, [incomeBase, trendFromHistory, ingresosAdjustPct])

  const variacionVsBasePct = useMemo(() => {
    if (incomeBase < 1) return 0
    return Math.round(((ingresosEstimados - incomeBase) / incomeBase) * 1000) / 10
  }, [ingresosEstimados, incomeBase])

  const fixedWithSubs = useMemo(
    () => Math.max(0, gastosFijos + subscriptionFixedMonthly),
    [gastosFijos, subscriptionFixedMonthly],
  )

  const totalGastosMes = useMemo(
    () => fixedWithSubs + Math.max(0, gastosVariables) + Math.max(0, ahorroObjetivo),
    [fixedWithSubs, gastosVariables, ahorroObjetivo],
  )

  const disponible = useMemo(() => ingresosEstimados - totalGastosMes, [ingresosEstimados, totalGastosMes])

  const netImpact30 = useMemo(
    () =>
      commitments.reduce((acc, c) => acc + (isIncomeCommitment(c) ? c.amount : -c.amount), 0),
    [commitments],
  )

  const commitmentsSorted = useMemo(
    () => [...commitments].sort((a, b) => a.date.localeCompare(b.date)),
    [commitments],
  )

  const pipelineMonths = useMemo(() => {
    const out: { ym: string; label: string; ing: number; egr: number; net: number }[] = []
    for (let i = 0; i < 7; i += 1) {
      const ym = addMonthsYm(month, i)
      const drift = 1 + (trendFromHistory / 100) * (i / 8)
      const ing = Math.max(0, Math.round(ingresosEstimados * drift))
      const egr = Math.round(totalGastosMes * (1 + i * 0.008))
      out.push({
        ym,
        label: ymLabel(ym),
        ing,
        egr,
        net: ing - egr,
      })
    }
    return out
  }, [month, ingresosEstimados, totalGastosMes, trendFromHistory])

  const maxBar = useMemo(() => {
    let m = 1
    for (const row of pipelineMonths) {
      m = Math.max(m, row.ing, row.egr)
    }
    return m
  }, [pipelineMonths])

  const addCommitment = async () => {
    if (!draftC.title.trim() || !draftC.date) return
    setCommitSaveErr(null)
    const title = draftC.title.trim()
    const category = draftC.category.trim()
    const date = draftC.date
    const amount = Math.max(0, draftC.amount)
    const flowType = draftC.flowType

    if (supabaseEnabled) {
      try {
        const res = await financeApiJson("/api/orbita/finanzas/commitments", {
          method: "POST",
          body: { title, category, date, amount, flow_type: flowType },
        })
        const json = (await res.json()) as {
          success?: boolean
          data?: { commitment?: FlowCommitment }
          error?: string
        }
        const created = json.data?.commitment
        if (!res.ok || !json.success || !created) {
          throw new Error(messageForHttpError(res.status, json.error, res.statusText))
        }
        setCommitments((c) => [...c, created])
      } catch (e) {
        setCommitSaveErr(e instanceof Error ? e.message : "No se pudo guardar el compromiso")
        return
      }
    } else {
      setCommitments((c) => [
        ...c,
        { id: newId(), title, category, date, amount, flowType },
      ])
    }
    setDraftC({ title: "", category: "", date: month + "-15", amount: 0, flowType: "fixed" })
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
            Simulador de cash flow
          </h2>
          <p className="mt-1 max-w-xl text-xs text-orbita-secondary sm:text-sm">
            What-if en vivo: ajusta palancas y observa el tubo de ingresos vs egresos (mes actual + 6 meses).
          </p>
        </div>
        <button
          type="button"
          onClick={onApplyPaymentPlan}
          className="min-h-[48px] w-full shrink-0 touch-manipulation rounded-full border-[0.5px] border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-rose-700 hover:bg-rose-100 active:bg-rose-200 sm:w-auto sm:min-h-0 sm:py-2"
        >
          Aplicar plan de pago
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-orbita-secondary">Cargando contexto de flujo…</p>
      ) : null}
      {err ? <p className="text-sm text-amber-800">Vista limitada: {err}</p> : null}

      <div className={arcticPanel}>
        <button
          type="button"
          onClick={() => setSimulatorExpanded((v) => !v)}
          className="flex w-full touch-manipulation items-start justify-between gap-3 p-4 text-left sm:p-5"
          aria-expanded={simulatorExpanded}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
              Parámetros y proyección de flujo
            </p>
            <p className="mt-1 text-xs text-orbita-secondary">
              {simulatorExpanded
                ? "Toca para ocultar ajustes y la vista por mes."
                : "Ingresos estimados, gastos del escenario y horizonte de 7 meses."}
            </p>
            {!simulatorExpanded ? (
              <p className="mt-2 text-sm text-orbita-primary">
                Ingresos est.{" "}
                <span className="font-semibold tabular-nums">${formatMoney(ingresosEstimados)}</span>
                {" · "}
                Disponible{" "}
                <span
                  className={`font-semibold tabular-nums ${disponible >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                >
                  {disponible < 0 ? "-" : ""}${formatMoney(Math.abs(disponible))}
                </span>
              </p>
            ) : null}
          </div>
          <ChevronDown
            className={`mt-0.5 h-5 w-5 shrink-0 text-orbita-secondary transition-transform duration-200 ${simulatorExpanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>

        {simulatorExpanded ? (
          <div className="border-t border-orbita-border p-4 sm:p-6">
            <div className="grid gap-5 lg:grid-cols-2">
        <div className="order-2 space-y-4 touch-manipulation lg:order-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Parámetros</p>
          <div className="rounded-2xl border-[0.5px] border-emerald-100 bg-emerald-50/40 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase text-emerald-800">Ingresos base (mes)</p>
                <p className="text-xl font-bold text-orbita-primary">${formatMoney(incomeBase)}</p>
              </div>
              <div className="text-right text-xs text-orbita-secondary">
                <p>Prom. histórico (12m)</p>
                <p className="font-semibold text-orbita-primary">${formatMoney(incomeHistoricalAvg)}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-orbita-secondary">
              Tendencia histórica ~{trendFromHistory >= 0 ? "+" : ""}
              {Math.round(trendFromHistory * 10) / 10}% en ventana
            </p>
          </div>
          <div className="py-1">
            <div className="flex justify-between text-sm font-medium text-orbita-primary">
              <span>Ajuste escenario ingresos</span>
              <span className="tabular-nums text-emerald-700">
                {ingresosAdjustPct >= 0 ? "+" : ""}
                {ingresosAdjustPct}%
              </span>
            </div>
            <input
              type="range"
              min={-12}
              max={22}
              value={ingresosAdjustPct}
              onChange={(e) => setIngresosAdjustPct(Number(e.target.value))}
              className="mt-3 h-11 w-full cursor-pointer accent-emerald-600 sm:h-auto sm:mt-2"
            />
          </div>
          <div className="rounded-2xl border-[0.5px] border-sky-100 bg-sky-50/50 p-4">
            <p className="text-[10px] font-semibold uppercase text-sky-800">Ingresos estimados</p>
            <p className="mt-1 text-2xl font-bold text-orbita-primary">${formatMoney(ingresosEstimados)}</p>
            <p className="mt-1 text-xs text-orbita-secondary">
              vs base {variacionVsBasePct >= 0 ? "+" : ""}
              {variacionVsBasePct}% (tendencia + slider)
            </p>
          </div>
          <label className="block text-sm text-orbita-primary">
            Gastos fijos (sin contar suscripciones del simulador duplicadas)
            <input
              type="number"
              inputMode="numeric"
              className="mt-1 min-h-[44px] w-full rounded-xl border border-orbita-border px-3 py-2 text-base sm:text-sm"
              value={gastosFijos || ""}
              onChange={(e) => setGastosFijos(Number(e.target.value))}
            />
            <span className="mt-1 block text-[11px] text-orbita-secondary">
              + Suscripciones en simulador: ${formatMoney(subscriptionFixedMonthly)}
            </span>
          </label>
          <label className="block text-sm text-orbita-primary">
            Gastos variables
            <input
              type="number"
              inputMode="numeric"
              className="mt-1 min-h-[44px] w-full rounded-xl border border-orbita-border px-3 py-2 text-base sm:text-sm"
              value={gastosVariables || ""}
              onChange={(e) => setGastosVariables(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm text-orbita-primary">
            Ahorro objetivo
            <input
              type="number"
              inputMode="numeric"
              className="mt-1 min-h-[44px] w-full rounded-xl border border-orbita-border px-3 py-2 text-base sm:text-sm"
              value={ahorroObjetivo || ""}
              onChange={(e) => setAhorroObjetivo(Number(e.target.value))}
            />
          </label>
        </div>

        <div className="order-1 space-y-3 lg:order-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
                Vista por mes (7 meses)
              </p>
              <p className="mt-0.5 text-xs text-orbita-secondary">
                Números del escenario: entradas estimadas vs salidas (fijas + variables + ahorro + suscripciones en simulador).
              </p>
            </div>
            <div className="flex rounded-full border border-orbita-border bg-orbita-surface-alt/80 p-0.5 text-[10px] font-semibold uppercase tracking-wide text-orbita-secondary">
              <button
                type="button"
                onClick={() => setFlowViz("table")}
                className={`rounded-full px-3 py-1.5 transition ${flowViz === "table" ? "bg-orbita-surface text-orbita-primary shadow-sm" : "text-orbita-secondary"}`}
              >
                Tabla clara
              </button>
              <button
                type="button"
                onClick={() => setFlowViz("bars")}
                className={`rounded-full px-3 py-1.5 transition ${flowViz === "bars" ? "bg-orbita-surface text-orbita-primary shadow-sm" : "text-orbita-secondary"}`}
              >
                Barras comparadas
              </button>
            </div>
          </div>

          <div
            className="rounded-2xl border-[0.5px] border-orbita-border/90 p-3 shadow-inner sm:p-4"
            style={{
              background: `linear-gradient(to bottom, var(--color-surface), color-mix(in srgb, var(--color-surface-alt) 88%, var(--color-border)))`,
            }}
          >
            {flowViz === "table" ? (
              <div className="max-h-[min(72vh,560px)] space-y-3 overflow-y-auto overscroll-contain pr-1 sm:max-h-none sm:overflow-visible sm:pr-0">
                {pipelineMonths.map((row) => {
                  const netPos = row.net >= 0
                  const total = row.ing + row.egr
                  const wIng = total > 0 ? Math.round((row.ing / total) * 100) : 50
                  const wEgr = 100 - wIng
                  return (
                    <div
                      key={row.ym}
                      className="rounded-xl border border-orbita-border px-3 py-3 shadow-sm sm:px-4"
                      style={{
                        background: "color-mix(in srgb, var(--color-surface) 90%, transparent)",
                      }}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-bold text-orbita-primary">{row.label}</span>
                        <span className={`text-sm font-bold tabular-nums ${netPos ? "text-emerald-600" : "text-rose-600"}`}>
                          Neto {netPos ? "+" : ""}${formatMoney(row.net)}
                        </span>
                      </div>
                      <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                        <div className="rounded-lg bg-emerald-50/80 px-2.5 py-2">
                          <dt className="font-medium text-emerald-800/90">Entradas estimadas</dt>
                          <dd className="mt-0.5 font-bold tabular-nums text-emerald-700">${formatMoney(row.ing)}</dd>
                        </div>
                        <div className="rounded-lg bg-rose-50/80 px-2.5 py-2">
                          <dt className="font-medium text-rose-800/90">Salidas estimadas</dt>
                          <dd className="mt-0.5 font-bold tabular-nums text-rose-700">${formatMoney(row.egr)}</dd>
                        </div>
                      </dl>
                      <div className="mt-3">
                        <p className="text-[10px] font-medium uppercase tracking-wide text-orbita-secondary">
                          Reparto del mes (solo proporción, no escala de pesos)
                        </p>
                        <div className="mt-1 flex h-2.5 w-full overflow-hidden rounded-full bg-orbita-surface-alt">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
                            style={{ width: `${wIng}%` }}
                            title={`Entradas ${wIng}%`}
                          />
                          <div
                            className="h-full bg-gradient-to-l from-rose-500 to-rose-400 transition-all duration-500"
                            style={{ width: `${wEgr}%` }}
                            title={`Salidas ${wEgr}%`}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <>
                <p className="mb-3 text-xs leading-relaxed text-orbita-secondary">
                  Cada barra verde y roja mide el mes frente al <strong>mes más alto</strong> del período (para comparar meses entre sí).
                  El recuadro central es el <strong>neto</strong> (entradas − salidas).
                </p>
                <div className="max-h-[min(70vh,520px)] space-y-4 overflow-y-auto overscroll-contain pr-1 sm:max-h-none sm:space-y-5 sm:overflow-visible sm:pr-0">
                  {pipelineMonths.map((row) => {
                    const wIng = Math.round((row.ing / maxBar) * 100)
                    const wEgr = Math.round((row.egr / maxBar) * 100)
                    const netPos = row.net >= 0
                    return (
                      <div key={row.ym} className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-orbita-primary">
                          <span>{row.label}</span>
                          <span className={netPos ? "text-emerald-600" : "text-rose-600"}>
                            Neto {netPos ? "+" : ""}${formatMoney(row.net)}
                          </span>
                        </div>
                        <div className="relative flex h-14 items-center gap-1.5 sm:h-12 sm:gap-2">
                          <div
                            className="flex h-11 min-w-0 flex-1 items-center overflow-hidden rounded-full border border-emerald-200/60 bg-emerald-50/80 sm:h-10"
                            title={`Entradas ${formatMoney(row.ing)}`}
                          >
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 shadow-sm transition-all duration-500"
                              style={{ width: `${Math.min(100, wIng)}%` }}
                            />
                          </div>
                          <div
                            className="flex w-[3.25rem] flex-shrink-0 flex-col items-center justify-center rounded-xl border border-orbita-border bg-orbita-surface px-0.5 py-1 text-[9px] font-bold leading-tight text-orbita-primary shadow-sm sm:w-14 sm:px-1 sm:text-[10px]"
                            title={`Flujo neto ${formatMoney(row.net)}`}
                          >
                            <TrendingUp
                              className={`mb-0.5 h-3.5 w-3.5 ${netPos ? "text-emerald-600" : "text-rose-500 rotate-180"}`}
                            />
                            {netPos ? "↑" : "↓"}
                          </div>
                          <div
                            className="flex h-11 min-w-0 flex-1 items-center justify-end overflow-hidden rounded-full border border-rose-200/60 bg-rose-50/80 sm:h-10"
                            title={`Salidas ${formatMoney(row.egr)}`}
                          >
                            <div
                              className="h-full rounded-full bg-gradient-to-l from-rose-500 to-rose-400 shadow-sm transition-all duration-500"
                              style={{ width: `${Math.min(100, wEgr)}%` }}
                            />
                          </div>
                        </div>
                        <div className="flex justify-between gap-2 text-[10px] font-medium text-orbita-secondary">
                          <span className="text-emerald-700">Entradas ${formatMoney(row.ing)}</span>
                          <span className="text-rose-600">Salidas ${formatMoney(row.egr)}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Obligaciones mensuales", v: formatMoney(fixedWithSubs), sub: "Fijos + suscripciones (sim.)" },
          { k: "Total gastos", v: formatMoney(totalGastosMes), sub: "Incluye variables y ahorro" },
          {
            k: "Disponible",
            v: `${disponible < 0 ? "-" : ""}${formatMoney(Math.abs(disponible))}`,
            sub: "Tras escenario",
            tone: disponible >= 0 ? "text-emerald-700" : "text-rose-600",
          },
          {
            k: "Net impact (30d)",
            v: `${netImpact30 >= 0 ? "+" : "-"}${formatMoney(Math.abs(netImpact30))}`,
            sub: "Compromisos listados",
            tone: netImpact30 >= 0 ? "text-emerald-700" : "text-rose-600",
          },
        ].map((c) => (
          <div key={c.k} className={`rounded-2xl border-[0.5px] border-orbita-border/90 bg-orbita-surface p-4 shadow-sm ${arcticPanel}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">{c.k}</p>
            <p className={`mt-2 text-lg font-bold ${c.tone ?? "text-orbita-primary"}`}>${c.v}</p>
            <p className="mt-1 text-[11px] text-orbita-secondary">{c.sub}</p>
          </div>
        ))}
      </div>

      <div id="capital-compromisos" className={`${arcticPanel} scroll-mt-24 p-3 sm:p-4`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex items-center gap-1.5 text-orbita-primary">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">
              Próximos compromisos (30 días)
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setCommitSaveErr(null)
              setCommitOpen(true)
            }}
            className="text-[11px] font-medium text-orbita-secondary underline decoration-orbita-border underline-offset-4 hover:text-orbita-primary"
          >
            Editar
          </button>
        </div>
        <ul className="mt-3 space-y-2">
          {commitmentsSorted.slice(0, 8).map((c) => {
            const inc = isIncomeCommitment(c)
            const cat = c.category.trim()
            const showCat = Boolean(cat)
            const titleDiffers = c.title.trim().toLowerCase() !== cat.toLowerCase()
            return (
              <li
                key={c.id}
                className="rounded-lg border border-orbita-border bg-orbita-surface-alt/80 px-2.5 py-2 sm:flex sm:items-start sm:gap-3 sm:px-3 sm:py-2.5"
              >
                <div className="flex gap-2 sm:min-w-0 sm:flex-1 sm:items-start sm:gap-3">
                  <div
                    className="w-12 shrink-0 text-xs font-bold tabular-nums text-orbita-primary sm:w-[3.75rem] sm:pt-0.5 sm:text-sm"
                    title={c.date}
                  >
                    {formatCommitmentDayEn(c.date)}
                  </div>
                  <div className="min-w-0 flex-1">
                    {showCat ? (
                      <>
                        <p className="text-[13px] font-semibold leading-snug text-orbita-primary sm:text-sm">{cat}</p>
                        {titleDiffers ? (
                          <p className="mt-0.5 text-[11px] leading-snug text-orbita-secondary">{c.title}</p>
                        ) : null}
                      </>
                    ) : (
                      <p className="text-[13px] font-semibold leading-snug text-orbita-primary sm:text-sm">{c.title}</p>
                    )}
                    <span
                      className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${flowTypeBadgeClass(c.flowType)}`}
                    >
                      {FLOW_TYPE_OPTIONS.find((o) => o.value === c.flowType)?.label ?? c.flowType}
                    </span>
                  </div>
                </div>
                <div
                  className={`mt-1.5 text-right sm:mt-0 sm:shrink-0 sm:self-center sm:pl-2 ${inc ? "text-emerald-600" : "text-orbita-primary"}`}
                >
                  <p className="text-sm font-bold tabular-nums sm:text-base">
                    {inc ? "+" : "-"}${formatMoney(c.amount)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <CuentasModalShell
        open={commitOpen}
        onClose={() => setCommitOpen(false)}
        title="Gestionar compromisos"
        subtitle="Agrega cargos o ingresos esperados en la ventana de 30 días."
        wide
      >
        <table className="w-full border-collapse text-sm">
          <tbody className="align-top">
            <tr className="border-b border-orbita-border/60">
              <th className="w-[30%] py-2.5 pr-3 text-left text-xs font-medium text-orbita-secondary sm:w-[22%]">
                Título
              </th>
              <td className="py-2.5">
                <input
                  className="min-h-[40px] w-full rounded-lg border border-orbita-border px-3 py-2 text-orbita-primary"
                  placeholder="Ej. Arriendo, factura cliente…"
                  value={draftC.title}
                  onChange={(e) => setDraftC((d) => ({ ...d, title: e.target.value }))}
                />
              </td>
            </tr>
            <tr className="border-b border-orbita-border/60">
              <th className="py-2.5 pr-3 text-left text-xs font-medium text-orbita-secondary">Categoría</th>
              <td className="py-2.5">
                <input
                  className="min-h-[40px] w-full rounded-lg border border-orbita-border px-3 py-2 text-orbita-primary"
                  placeholder="Opcional · ej. Vivienda"
                  value={draftC.category}
                  onChange={(e) => setDraftC((d) => ({ ...d, category: e.target.value }))}
                />
              </td>
            </tr>
            <tr className="border-b border-orbita-border/60">
              <th className="py-2.5 pr-3 text-left text-xs font-medium text-orbita-secondary">Fecha</th>
              <td className="py-2.5">
                <input
                  type="date"
                  className="min-h-[40px] w-full rounded-lg border border-orbita-border px-3 py-2 text-orbita-primary"
                  value={draftC.date || month + "-01"}
                  onChange={(e) => setDraftC((d) => ({ ...d, date: e.target.value }))}
                />
              </td>
            </tr>
            <tr className="border-b border-orbita-border/60">
              <th className="py-2.5 pr-3 text-left text-xs font-medium text-orbita-secondary">Monto (COP)</th>
              <td className="py-2.5">
                <input
                  type="number"
                  inputMode="numeric"
                  className="min-h-[40px] w-full rounded-lg border border-orbita-border px-3 py-2 text-orbita-primary"
                  placeholder="0"
                  value={draftC.amount || ""}
                  onChange={(e) => setDraftC((d) => ({ ...d, amount: Number(e.target.value) }))}
                />
              </td>
            </tr>
            <tr>
              <th className="py-2.5 pr-3 text-left text-xs font-medium text-orbita-secondary">Tipo</th>
              <td className="py-2.5">
                <select
                  className="min-h-[40px] w-full rounded-lg border border-orbita-border px-3 py-2 text-orbita-primary"
                  value={draftC.flowType}
                  onChange={(e) => setDraftC((d) => ({ ...d, flowType: e.target.value as CommitmentFlowType }))}
                >
                  {FLOW_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                {draftC.flowType === "income" ? (
                  <p className="mt-1.5 text-[11px] text-orbita-secondary">Suma al flujo como entrada esperada.</p>
                ) : null}
              </td>
            </tr>
          </tbody>
        </table>
        {commitSaveErr ? <p className="mt-3 text-sm text-rose-600">{commitSaveErr}</p> : null}
        {supabaseEnabled ? (
          <p className="mt-2 text-[11px] text-orbita-secondary">
            Los compromisos se guardan en tu cuenta (hogar).
          </p>
        ) : null}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => void addCommitment()}
            className="min-h-[44px] touch-manipulation rounded-xl border border-orbita-border bg-orbita-surface px-5 py-2.5 text-sm font-semibold text-orbita-primary hover:bg-orbita-surface-alt"
          >
            Agregar a la lista
          </button>
        </div>
        <p className="mt-4 text-xs text-orbita-secondary">
          Net impact (30 días) se recalcula al instante con la lista actual (${formatMoney(netImpact30)}).
        </p>
      </CuentasModalShell>
    </section>
  )
}
