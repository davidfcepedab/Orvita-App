"use client"

import { useEffect, useRef, useState } from "react"
import { useFinance } from "../FinanceContext"
import { Card } from "@/src/components/ui/Card"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { rechartsTooltipContentStyle } from "@/lib/charts/rechartsShared"
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

interface DbSnapshotSummary {
  month: string
  income: number
  expense: number
  balance: number
}

function FlowChartLegend() {
  const items = [
    { key: "flujo", label: "Flujo", color: "var(--color-accent-primary)" },
    { key: "gasto", label: "Gasto operativo", color: "var(--color-accent-danger)" },
    { key: "ingresos", label: "Ingresos", color: "var(--color-accent-health)" },
  ]
  return (
    <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-2 px-0.5 text-[10px] text-orbita-secondary sm:gap-x-5 sm:text-[11px]">
      {items.map((item) => (
        <li key={item.key} className="flex max-w-full items-center gap-1.5">
          <span
            className="h-0.5 w-3 shrink-0 rounded-full sm:h-2 sm:w-4"
            style={{ backgroundColor: item.color }}
            aria-hidden
          />
          <span className="min-w-0 break-words leading-tight">{item.label}</span>
        </li>
      ))}
    </ul>
  )
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
  const [dbSnapshot, setDbSnapshot] = useState<DbSnapshotSummary | null>(null)
  const [dbSnapshotError, setDbSnapshotError] = useState<string | null>(null)
  const fetchSeq = useRef(0)

  useEffect(() => {
    if (!month) {
      setDbSnapshot(null)
      setDbSnapshotError(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        setDbSnapshotError(null)
        const res = await financeApiGet(`/api/orbita/finanzas/summary?month=${encodeURIComponent(month)}`)
        const json = (await res.json()) as {
          success?: boolean
          meta?: { month?: string }
          summary?: {
            total_income_current?: number
            total_expense_current?: number
            balance_current?: number
          }
          error?: string
        }
        if (cancelled) return
        if (!res.ok || !json.success) {
          setDbSnapshot(null)
          setDbSnapshotError(json.error ?? "No se pudo cargar el resumen de base de datos")
          return
        }
        const s = json.summary
        setDbSnapshot({
          month: json.meta?.month ?? month,
          income: Number(s?.total_income_current ?? 0),
          expense: Number(s?.total_expense_current ?? 0),
          balance: Number(s?.balance_current ?? 0),
        })
      } catch {
        if (!cancelled) {
          setDbSnapshot(null)
          setDbSnapshotError("No se pudo cargar el resumen de base de datos")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [month])

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
    return <div className="p-6 text-center text-orbita-secondary">Inicializando...</div>
  }

  if (loading) {
    return <div className="p-6 text-center text-orbita-secondary">Cargando datos...</div>
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
      <div className="space-y-2 p-6 text-center text-orbita-secondary">
        <p>{UI_FINANCE_DEMO_MONTH}</p>
        {notice && <p className="text-xs text-orbita-secondary">{notice}</p>}
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

  const flowChartMargin = { top: 8, right: 2, left: 2, bottom: xAxisHeight + 6 } as const

  return (
    <div className="min-w-0 max-w-full space-y-6 sm:space-y-8">
      {notice && <p className="text-xs text-orbita-secondary">{notice}</p>}
      <div className="grid min-w-0 max-w-full grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
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
              <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">{metric.label}</p>
              <p className="break-words text-2xl font-semibold tabular-nums" style={{ color: metric.accent }}>
                {metric.value}
              </p>
              <p className="break-words text-xs leading-snug text-orbita-secondary">{metric.sub}</p>
            </div>
          </Card>
        ))}
      </div>

      {(dbSnapshot || dbSnapshotError) && (
        <Card className="min-w-0 border border-orbita-border/80 p-4 sm:p-6">
          <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">
            Resumen almacenado (snapshots)
          </p>
          <p className="mt-1 text-xs leading-snug text-orbita-secondary">
            Mismo periodo que arriba: totales en{" "}
            <code className="rounded bg-orbita-surface px-1 text-[10px]">finance_monthly_snapshots</code> y
            desglose por categoría desde transacciones del mes.
          </p>
          {dbSnapshotError ? (
            <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">{dbSnapshotError}</p>
          ) : dbSnapshot ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-[11px] text-orbita-secondary">Ingresos (BD)</p>
                <p className="tabular-nums text-lg font-semibold text-orbita-primary">
                  ${formatMoney(dbSnapshot.income)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-orbita-secondary">Gastos (BD)</p>
                <p className="tabular-nums text-lg font-semibold text-orbita-primary">
                  ${formatMoney(dbSnapshot.expense)}
                </p>
              </div>
              <div>
                <p className="text-[11px] text-orbita-secondary">Balance mes (BD)</p>
                <p className="tabular-nums text-lg font-semibold text-orbita-primary">
                  ${formatMoney(dbSnapshot.balance)}
                </p>
              </div>
            </div>
          ) : null}
        </Card>
      )}

      <Card className="min-w-0 overflow-x-clip p-4 sm:p-8">
        <div className="grid min-w-0 max-w-full gap-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid min-w-0 max-w-full gap-1">
              <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Evolución de flujo</p>
              <span className="break-words text-xs leading-snug text-orbita-secondary [overflow-wrap:anywhere]">
                {flowSubtitle}
              </span>
            </div>
            <div
              className="flex max-w-full min-w-0 flex-wrap gap-1 rounded-xl p-0.5"
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
          <div className="min-w-0 max-w-full">
            <div className="relative h-[200px] w-full max-w-full min-w-0 sm:h-[260px]">
              <div className="absolute inset-0 min-w-0 max-w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer key={`flow-${flowView}-${month}`} width="100%" height="100%">
                    <LineChart data={chartData} margin={flowChartMargin}>
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
                        width={36}
                        tick={{ fontSize: 9, fill: "var(--color-text-secondary)" }}
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
                      <ReferenceLine y={0} stroke="var(--color-border)" />
                      <Line
                        type="monotone"
                        dataKey="ingresos"
                        name="ingresos"
                        stroke="var(--color-accent-health)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="gasto_operativo"
                        name="gasto_operativo"
                        stroke="var(--color-accent-danger)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="flujo"
                        name="flujo"
                        stroke="var(--color-accent-primary)"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center px-2 text-center text-sm text-orbita-secondary">
                    {flowView === "weeks"
                      ? "Sin movimientos suficientes para agrupar por semana"
                      : "Sin datos en este rango para el gráfico"}
                  </div>
                )}
              </div>
            </div>
            {chartData.length > 0 ? <FlowChartLegend /> : null}
          </div>
        </div>
      </Card>

      <div className="grid min-w-0 max-w-full grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
        <Card className="min-w-0 overflow-x-clip p-4 sm:p-8">
          <div className="grid min-w-0 max-w-full gap-3">
            <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Suscripciones / SaaS (heurística)</p>
            {subs.length === 0 ? (
              <p className="text-sm text-orbita-secondary">Sin partidas detectadas con patrón de suscripción.</p>
            ) : (
              subs.map((item) => (
                <div
                  key={item.name}
                  className="flex min-w-0 flex-col gap-1 rounded-xl bg-orbita-surface-alt px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                >
                  <span className="min-w-0 break-words text-sm text-orbita-primary">{item.name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-orbita-secondary sm:text-right">${formatMoney(item.amount)}</span>
                </div>
              ))
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orbita-border bg-orbita-surface px-3 py-3 sm:px-4">
              <span className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Total</span>
              <span className="tabular-nums text-sm font-semibold text-orbita-primary">${formatMoney(subsTotal)}</span>
            </div>
          </div>
        </Card>
        <Card className="min-w-0 overflow-x-clip p-4 sm:p-8">
          <div className="grid min-w-0 max-w-full gap-3">
            <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Obligaciones fijas (heurística)</p>
            {obls.length === 0 ? (
              <p className="text-sm text-orbita-secondary">Sin obligaciones detectadas por categoría / descripción.</p>
            ) : (
              obls.map((item) => (
                <div
                  key={item.name + item.due}
                  className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm text-orbita-primary">{item.name}</p>
                    <p className="text-xs text-orbita-secondary">Fecha {item.due}</p>
                  </div>
                  <span className="shrink-0 tabular-nums text-xs text-orbita-secondary sm:text-right">${formatMoney(item.amount)}</span>
                </div>
              ))
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orbita-border bg-orbita-surface px-3 py-3 sm:px-4">
              <span className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Total</span>
              <span className="tabular-nums text-sm font-semibold text-orbita-primary">${formatMoney(oblsTotal)}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
