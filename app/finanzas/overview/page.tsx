"use client"

import { useEffect, useRef, useState } from "react"
import { useFinance } from "../FinanceContext"
import { Card } from "@/src/components/ui/Card"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { rechartsDefaultMargin, rechartsTooltipContentStyle } from "@/lib/charts/rechartsShared"
import { UI_FINANCE_DEMO_MONTH } from "@/lib/checkins/flags"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts"

function financeTooltipNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (Array.isArray(value)) return financeTooltipNumber(value[0])
  if (typeof value === "string") {
    const n = parseFloat(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

interface MonthlyRow {
  month: string
  ingresos: number
  gasto_operativo: number
  flujo: number
}

type FlowEvolutionKey = "weeks" | "quarter" | "semester" | "rollingYear"

interface FlowEvolutionPayload {
  weeks: MonthlyRow[]
  quarter: MonthlyRow[]
  semester: MonthlyRow[]
  rollingYear: MonthlyRow[]
}

interface OverviewData {
  income: number
  expense: number
  net: number
  savingsRate: number
  previousNet: number | null
  deltaNet: number | null
  runway: number
  weeklySeries?: MonthlyRow[]
  flowEvolution?: FlowEvolutionPayload
  subscriptions?: { name: string; amount: number }[]
  obligations?: { name: string; due: string; amount: number }[]
  headline?: {
    liquidityIndex: number
    netCashFlow: number
    burnRunwayMonths: number
    debtToIncomeProxy: number
  }
}

interface OverviewResponse {
  success: boolean
  data?: OverviewData | null
  error?: string
  notice?: string
  source?: string
}

const FLOW_TABS: { id: FlowEvolutionKey; label: string; subtitle: string }[] = [
  { id: "weeks", label: "Semanas", subtitle: "Semanas del mes seleccionado (COP)" },
  {
    id: "quarter",
    label: "Trimestre",
    subtitle: "Meses del trimestre civil hasta el mes actual (COP)",
  },
  {
    id: "semester",
    label: "Semestre",
    subtitle: "Últimos 6 meses terminando en el mes seleccionado (COP)",
  },
  {
    id: "rollingYear",
    label: "Año móvil",
    subtitle: "Últimos 12 meses terminando en el mes seleccionado (COP)",
  },
]

export default function FinanzasOverview() {
  const finance = useFinance()
  const month = finance?.month ?? ""

  const [data, setData] = useState<OverviewData | null>(null)
  const [flowView, setFlowView] = useState<FlowEvolutionKey>("weeks")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const fetchSeq = useRef(0)

  useEffect(() => {
    if (!month) {
      setData(null)
      return
    }

    const seq = ++fetchSeq.current
    let cancelled = false

    const fetchOverview = async () => {
      try {
        setLoading(true)
        setError(null)
        setNotice(null)

        const response = await financeApiGet(`/api/orbita/finanzas/overview?month=${encodeURIComponent(month)}`)

        const json = (await response.json()) as OverviewResponse

        if (cancelled || seq !== fetchSeq.current) return

        if (!response.ok || !json.success) {
          throw new Error(messageForHttpError(response.status, json.error, response.statusText))
        }

        if (json.notice) setNotice(json.notice)
        setData(json.data ?? null)
      } catch (err) {
        if (cancelled || seq !== fetchSeq.current) return
        const message = err instanceof Error ? err.message : "Error desconocido"
        setError(message)
        setData(null)
      } finally {
        if (!cancelled && seq === fetchSeq.current) setLoading(false)
      }
    }

    fetchOverview()
    return () => {
      cancelled = true
    }
  }, [month])

  if (!finance) {
    return <div className="p-6 text-center text-gray-500">Inicializando...</div>
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Cargando datos...</div>
  }

  if (error) {
    return (
      <div className="card border border-red-200 text-red-600">
        <p className="font-semibold">Error al cargar datos</p>
        <p className="mt-2 text-xs">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="space-y-2 p-6 text-center text-slate-600">
        <p>{UI_FINANCE_DEMO_MONTH}</p>
        {notice && <p className="text-xs text-slate-500">{notice}</p>}
      </div>
    )
  }

  const { income, expense, net, savingsRate, runway, deltaNet, weeklySeries, flowEvolution, subscriptions, obligations } =
    data

  const formatMoney = (value: number) =>
    new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 0,
    }).format(Math.round(value || 0))

  const formatCompact = (value: number) => {
    const v = Math.abs(value)
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1000) return `${Math.round(v / 1000)}k`
    return String(Math.round(v))
  }

  const evolution: FlowEvolutionPayload = {
    weeks: flowEvolution?.weeks ?? weeklySeries ?? [],
    quarter: Array.isArray(flowEvolution?.quarter) ? flowEvolution.quarter : [],
    semester: Array.isArray(flowEvolution?.semester) ? flowEvolution.semester : [],
    rollingYear: Array.isArray(flowEvolution?.rollingYear) ? flowEvolution.rollingYear : [],
  }

  const chartData = evolution[flowView] ?? []
  const flowSubtitle = FLOW_TABS.find((t) => t.id === flowView)?.subtitle ?? FLOW_TABS[0]!.subtitle
  const tiltXAxis = flowView === "rollingYear" || flowView === "semester"
  const xAxisAngle = tiltXAxis ? -28 : 0
  const xAxisHeight = tiltXAxis ? 48 : 24
  const subs = subscriptions ?? []
  const obls = obligations ?? []
  const subsTotal = subs.reduce((a, s) => a + s.amount, 0)
  const oblsTotal = obls.reduce((a, o) => a + o.amount, 0)

  const deltaLabel =
    deltaNet != null && Number.isFinite(deltaNet)
      ? `${deltaNet >= 0 ? "+" : ""}${deltaNet.toFixed(1)}% vs mes anterior`
      : "Sin comparación"

  const runwayLabel = runway > 0 && net > 0 ? `${runway.toFixed(1)}×` : net <= 0 ? "En déficit" : "—"

  return (
    <div className="min-w-0 space-y-6 sm:space-y-8">
      {notice && <p className="text-xs text-slate-500">{notice}</p>}
      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Capacidad de ahorro",
            value: `${formatMoney(savingsRate)}%`,
            sub: `Ingresos ${formatMoney(income)} COP · ${deltaLabel}`,
            accent: "var(--color-accent-health)",
          },
          {
            label: "Flujo neto",
            value: `${net >= 0 ? "+" : ""}$${formatMoney(net)}`,
            sub: `Gastos ${formatMoney(expense)} · Ingresos ${formatMoney(income)}`,
            accent: "var(--color-accent-primary)",
          },
          {
            label: "Runway (superávit / gasto)",
            value: runwayLabel,
            sub: "Meses de superávit cubriendo el gasto del mes",
            accent: "var(--color-text-primary)",
          },
          {
            label: "Presión gasto / ingreso",
            value: `${Math.max(0, Math.min(100, Math.round((expense / Math.max(1, income)) * 100)))}%`,
            sub: "Gasto operativo sobre ingresos del mes",
            accent: "var(--color-accent-finance)",
          },
        ].map((metric) => (
          <Card key={metric.label} hover className="min-w-0 p-4 sm:p-8">
            <div className="grid min-w-0 gap-2">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">{metric.label}</p>
              <p className="break-words text-2xl font-semibold tabular-nums" style={{ color: metric.accent }}>
                {metric.value}
              </p>
              <p className="break-words text-xs leading-snug text-slate-500">{metric.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="min-w-0 p-4 sm:p-8">
        <div className="grid min-w-0 gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid min-w-0 gap-1">
              <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Evolución de flujo</p>
              <span className="text-xs text-slate-400">{flowSubtitle}</span>
            </div>
            <div
              className="flex flex-wrap gap-1 rounded-xl p-0.5"
              style={{
                background: "color-mix(in srgb, var(--color-border) 35%, transparent)",
                border: "0.5px solid var(--color-border)",
              }}
              role="tablist"
              aria-label="Vista del gráfico de flujo"
            >
              {FLOW_TABS.map((tab) => {
                const active = flowView === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFlowView(tab.id)}
                    className="min-h-9 shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors sm:min-h-10 sm:px-3 sm:text-xs"
                    style={{
                      background: active ? "var(--color-surface)" : "transparent",
                      color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                      boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain touch-pan-x">
            <div className="h-[200px] w-full min-w-0 sm:h-[260px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer key={`flow-${flowView}-${month}`} width="100%" height="100%">
                <LineChart data={chartData} margin={rechartsDefaultMargin}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.85} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                    stroke="var(--color-border)"
                    interval="preserveStartEnd"
                    angle={xAxisAngle}
                    textAnchor={tiltXAxis ? "end" : "middle"}
                    height={xAxisHeight}
                  />
                  <YAxis
                    width={44}
                    tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                    stroke="var(--color-border)"
                    tickFormatter={formatCompact}
                  />
                  <Tooltip
                    contentStyle={rechartsTooltipContentStyle}
                    formatter={(value, name) => [
                      formatMoney(financeTooltipNumber(value)),
                      String(name ?? ""),
                    ]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <ReferenceLine y={0} stroke="var(--color-border)" />
                  <Line type="monotone" dataKey="ingresos" stroke="var(--color-accent-health)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="gasto_operativo" stroke="var(--color-accent-danger)" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="flujo" stroke="var(--color-accent-primary)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center px-2 text-center text-sm text-slate-400">
                {flowView === "weeks"
                  ? "Sin movimientos suficientes para agrupar por semana"
                  : "Sin datos en este rango para el gráfico"}
              </div>
            )}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <Card className="min-w-0 p-4 sm:p-8">
          <div className="grid min-w-0 gap-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Suscripciones / SaaS (heurística)</p>
            {subs.length === 0 ? (
              <p className="text-sm text-slate-500">Sin partidas detectadas con patrón de suscripción.</p>
            ) : (
              subs.map((item) => (
                <div
                  key={item.name}
                  className="flex min-w-0 flex-col gap-1 rounded-xl bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                >
                  <span className="min-w-0 break-words text-sm text-slate-700">{item.name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-slate-500 sm:text-right">${formatMoney(item.amount)}</span>
                </div>
              ))
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Total</span>
              <span className="tabular-nums text-sm font-semibold text-slate-900">${formatMoney(subsTotal)}</span>
            </div>
          </div>
        </Card>
        <Card className="min-w-0 p-4 sm:p-8">
          <div className="grid min-w-0 gap-3">
            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Obligaciones fijas (heurística)</p>
            {obls.length === 0 ? (
              <p className="text-sm text-slate-500">Sin obligaciones detectadas por categoría / descripción.</p>
            ) : (
              obls.map((item) => (
                <div
                  key={item.name + item.due}
                  className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm text-slate-700">{item.name}</p>
                    <p className="text-xs text-slate-400">Fecha {item.due}</p>
                  </div>
                  <span className="shrink-0 tabular-nums text-xs text-slate-500 sm:text-right">${formatMoney(item.amount)}</span>
                </div>
              ))
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-3 sm:px-4">
              <span className="text-xs uppercase tracking-[0.14em] text-slate-500">Total</span>
              <span className="tabular-nums text-sm font-semibold text-slate-900">${formatMoney(oblsTotal)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
