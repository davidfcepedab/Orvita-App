"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useFinance } from "../FinanceContext"
import { Card } from "@/src/components/ui/Card"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { rechartsTooltipContentStyle } from "@/lib/charts/rechartsShared"
import { UI_FINANCE_DEMO_MONTH } from "@/lib/checkins/flags"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import { isoDateInMonth } from "@/lib/finanzas/commitmentAnchorDate"
import type { FlowCommitment } from "@/lib/finanzas/flowCommitmentsTypes"
import { readFlowCommitmentsFromLocalStorage } from "@/lib/finanzas/flowCommitmentsLocal"
import { subscriptionActiveBurn, type UserSubscription } from "@/lib/finanzas/userSubscriptionsTypes"
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
  managedSubscriptions?: UserSubscription[]
  flowCommitments?: FlowCommitment[]
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

function formatCommitmentDayEs(isoDate: string) {
  const raw = isoDate.slice(0, 10)
  const [y, mo, da] = raw.split("-").map(Number)
  if (!y || !mo || !da) return raw
  const d = new Date(y, mo - 1, da)
  return d.toLocaleDateString("es-CO", { month: "short", day: "numeric" })
}

function isIncomeCommitmentRow(c: FlowCommitment) {
  return c.flowType === "income"
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

const supabaseEnabled = process.env.NEXT_PUBLIC_SUPABASE_ENABLED === "true"

export default function FinanzasOverview() {
  const finance = useFinance()
  const month = finance?.month ?? ""

  const [data, setData] = useState<OverviewData | null>(null)
  const [flowView, setFlowView] = useState<FlowEvolutionKey>("weeks")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [lsCommitments, setLsCommitments] = useState<FlowCommitment[]>([])
  const fetchSeq = useRef(0)

  useEffect(() => {
    if (supabaseEnabled) {
      if (data) setLsCommitments(data.flowCommitments ?? [])
      return
    }
    const raw = readFlowCommitmentsFromLocalStorage()
    if (!month) {
      setLsCommitments(raw)
      return
    }
    setLsCommitments(
      raw.map((c) => {
        const fallbackDay = Number(c.date.slice(8, 10)) || 1
        const dueDay = c.dueDay ?? fallbackDay
        return {
          ...c,
          dueDay,
          subcategory: c.subcategory ?? "",
          date: isoDateInMonth(month, dueDay),
        }
      }),
    )
  }, [month, data, supabaseEnabled])

  useEffect(() => {
    if (!month) {
      setData(null)
      setLoading(false)
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

  const {
    income,
    expense,
    net,
    savingsRate,
    runway,
    deltaNet,
    weeklySeries,
    flowEvolution,
    subscriptions,
    obligations,
    managedSubscriptions,
  } = data

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

  const managedActive = (managedSubscriptions ?? []).filter(subscriptionActiveBurn)
  const managedTotal = managedActive.reduce((a, s) => a + s.amount_monthly, 0)
  const commitmentsSorted = [...lsCommitments].sort((a, b) => {
    const da = a.dueDay ?? 1
    const db = b.dueDay ?? 1
    if (da !== db) return da - db
    return a.title.localeCompare(b.title)
  })

  const deltaLabel =
    deltaNet != null && Number.isFinite(deltaNet)
      ? `${deltaNet >= 0 ? "+" : ""}${deltaNet.toFixed(1)}% vs mes anterior`
      : "Sin comparación"

  const runwayLabel = runway > 0 && net > 0 ? `${runway.toFixed(1)}×` : net <= 0 ? "En déficit" : "—"

  const flowChartMargin = { top: 8, right: 2, left: 2, bottom: xAxisHeight + 6 } as const

  return (
    <div className="min-w-0 max-w-full space-y-6 sm:space-y-8">
      {notice && <p className="text-xs text-orbita-secondary">{notice}</p>}
      <section className="min-w-0 space-y-3" aria-labelledby="fin-overview-kpis-heading">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 max-w-full space-y-1">
            <h2
              id="fin-overview-kpis-heading"
              className="text-sm font-semibold tracking-tight text-orbita-primary"
            >
              Indicadores operativos del mes
            </h2>
            <p className="max-w-2xl text-[11px] leading-snug text-orbita-secondary sm:text-xs">
              Solo cuenta el gasto catalogado como <span className="font-medium text-orbita-primary">operativo</span>
              ; inversión y ajustes no entran en estas tarjetas si vienen del catálogo.
            </p>
          </div>
          <p className="shrink-0 text-[10px] font-medium uppercase tracking-[0.14em] text-orbita-secondary">
            4 métricas
          </p>
        </div>
        <div className="grid min-w-0 max-w-full grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                label: "Capacidad de ahorro",
                value: `${formatMoney(savingsRate)}%`,
                sub: `Ingresos ${formatMoney(income)} COP`,
                subExtra: deltaLabel,
                accent: "var(--color-accent-health)",
              },
              {
                label: "Flujo neto",
                value: `${net >= 0 ? "+" : ""}$${formatMoney(net)}`,
                sub: `Gasto operativo ${formatMoney(expense)} · Ingresos ${formatMoney(income)}`,
                accent: "var(--color-accent-primary)",
              },
              {
                label: "Runway (superávit / gasto)",
                value: runwayLabel,
                sub: "Meses de superávit cubriendo el gasto operativo del mes",
                accent: "var(--color-text-primary)",
              },
              {
                label: "Presión gasto / ingreso",
                value: `${Math.max(0, Math.min(100, Math.round((expense / Math.max(1, income)) * 100)))}%`,
                sub: "Gasto operativo sobre ingresos del mes",
                accent: "var(--color-accent-finance)",
              },
            ] as const
          ).map((metric) => (
            <Card key={metric.label} hover className="min-w-0 border border-orbita-border/70 p-4 sm:p-6">
              <div className="grid min-w-0 gap-2">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">{metric.label}</p>
                <p className="break-words text-2xl font-semibold tabular-nums" style={{ color: metric.accent }}>
                  {metric.value}
                </p>
                <p className="break-words text-xs leading-snug text-orbita-secondary">{metric.sub}</p>
                {"subExtra" in metric && metric.subExtra ? (
                  <p className="break-words text-xs leading-snug text-orbita-secondary">{metric.subExtra}</p>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </section>

      <Card className="min-w-0 overflow-x-clip p-4 sm:p-8">
        <div className="grid min-w-0 max-w-full gap-4">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid min-w-0 max-w-full gap-1">
              <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Evolución de flujo</p>
              <span className="break-words text-xs leading-snug text-orbita-secondary [overflow-wrap:anywhere]">
                {flowSubtitle}
              </span>
              <span className="text-[11px] leading-snug text-orbita-secondary/90">
                La serie roja es <strong className="font-medium text-orbita-primary">gasto operativo</strong> (misma
                lógica que los KPI de arriba).
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
          <div className="grid min-w-0 max-w-full gap-4">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Suscripciones registradas</p>
                <p className="mt-1 text-[11px] leading-snug text-orbita-secondary">
                  Misma lista que en Capital → Cuentas (suscripciones recurrentes).
                </p>
              </div>
              <Link
                href="/finanzas/cuentas#capital-suscripciones"
                className="shrink-0 text-[11px] font-medium text-orbita-secondary underline decoration-orbita-border/80 underline-offset-4 hover:text-orbita-primary"
                prefetch={false}
              >
                Editar
              </Link>
            </div>
            {managedActive.length === 0 ? (
              <p className="text-sm text-orbita-secondary">No hay suscripciones activas en tu registro.</p>
            ) : (
              managedActive.map((s) => (
                <div
                  key={s.id}
                  className="flex min-w-0 flex-col gap-1 rounded-xl bg-orbita-surface-alt px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                >
                  <span className="min-w-0 break-words text-sm font-medium text-orbita-primary">{s.name}</span>
                  <span className="shrink-0 tabular-nums text-xs text-orbita-secondary sm:text-right">
                    ${formatMoney(s.amount_monthly)}
                  </span>
                </div>
              ))
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orbita-border bg-orbita-surface px-3 py-3 sm:px-4">
              <span className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Total registrado</span>
              <span className="tabular-nums text-sm font-semibold text-orbita-primary">${formatMoney(managedTotal)}</span>
            </div>
            <details className="rounded-xl border border-orbita-border/70 bg-orbita-surface-alt/40 px-3 py-2 text-xs text-orbita-secondary">
              <summary className="cursor-pointer font-medium text-orbita-primary">
                Patrones en movimientos (operativo, mes)
              </summary>
              <p className="mt-2 text-[11px] leading-snug">
                Heurística sobre transacciones del mes (no reemplaza tu lista registrada).
              </p>
              {subs.length === 0 ? (
                <p className="mt-2 text-[11px]">Sin coincidencias tipo suscripción / SaaS.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {subs.map((item) => (
                    <li key={item.name} className="flex justify-between gap-2 tabular-nums">
                      <span className="min-w-0 break-words">{item.name}</span>
                      <span>${formatMoney(item.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 border-t border-orbita-border/50 pt-2 text-[11px]">
                Subtotal heurístico: ${formatMoney(subsTotal)}
              </p>
            </details>
          </div>
        </Card>
        <Card className="min-w-0 overflow-x-clip p-4 sm:p-8">
          <div className="grid min-w-0 max-w-full gap-4">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Compromisos (lista corta)</p>
                <p className="mt-1 text-[11px] leading-snug text-orbita-secondary">
                  {supabaseEnabled
                    ? "Misma lista que el simulador en Capital → Cuentas (guardada por hogar)."
                    : "Sincronizado con el simulador en Capital → Cuentas (este navegador)."}
                </p>
              </div>
              <Link
                href="/finanzas/cuentas#capital-compromisos"
                className="shrink-0 text-[11px] font-medium text-orbita-secondary underline decoration-orbita-border/80 underline-offset-4 hover:text-orbita-primary"
                prefetch={false}
              >
                Editar
              </Link>
            </div>
            {commitmentsSorted.length === 0 ? (
              <p className="text-sm text-orbita-secondary">Aún no hay compromisos guardados.</p>
            ) : (
              commitmentsSorted.slice(0, 10).map((c) => {
                const inc = isIncomeCommitmentRow(c)
                return (
                  <div
                    key={c.id}
                    className="flex min-w-0 flex-col gap-1 border-b border-orbita-border/50 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="break-words text-sm text-orbita-primary">{c.category?.trim() || c.title}</p>
                      {c.category?.trim() && c.title.trim().toLowerCase() !== c.category.trim().toLowerCase() ? (
                        <p className="text-[11px] text-orbita-secondary">{c.title}</p>
                      ) : null}
                      <p className="text-[11px] text-orbita-secondary">
                        Día {c.dueDay ?? "—"} · {formatCommitmentDayEs(c.date)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 tabular-nums text-sm font-medium sm:text-right ${inc ? "text-emerald-700" : "text-orbita-primary"}`}
                    >
                      {inc ? "+" : "-"}${formatMoney(c.amount)}
                    </span>
                  </div>
                )
              })
            )}
            <details className="rounded-xl border border-orbita-border/70 bg-orbita-surface-alt/40 px-3 py-2 text-xs text-orbita-secondary">
              <summary className="cursor-pointer font-medium text-orbita-primary">
                Sugerencias desde movimientos (operativo)
              </summary>
              <p className="mt-2 text-[11px] leading-snug">
                Cargos fijos detectados por categoría o texto; útil si aún no los copiaste a la lista.
              </p>
              {obls.length === 0 ? (
                <p className="mt-2 text-[11px]">Sin sugerencias este mes.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {obls.map((item) => (
                    <li key={item.name + item.due} className="flex justify-between gap-2 tabular-nums">
                      <span className="min-w-0 break-words">{item.name}</span>
                      <span>${formatMoney(item.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 border-t border-orbita-border/50 pt-2 text-[11px]">
                Subtotal sugerido: ${formatMoney(oblsTotal)}
              </p>
            </details>
          </div>
        </Card>
      </div>
    </div>
  )
}
