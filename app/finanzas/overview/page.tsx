"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useFinance } from "../FinanceContext"
import { FinanceViewHeader } from "../_components/FinanceViewHeader"
import { financeSubnavTabClass, financeViewRootClass } from "../_components/financeChrome"
import { Card } from "@/src/components/ui/Card"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { rechartsTooltipContentStyle } from "@/lib/charts/rechartsShared"
import { UI_FINANCE_DEMO_MONTH } from "@/lib/checkins/flags"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import { dayFromIso, isoDateInMonth } from "@/lib/finanzas/commitmentAnchorDate"
import { localDateKeyFromIso } from "@/lib/agenda/localDateKey"
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
import { ChevronDown } from "lucide-react"

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

function formatYmLongEs(ym: string) {
  const [ys, ms] = ym.split("-")
  const y = Number(ys)
  const m = Number(ms)
  if (!ys || !ms || !Number.isFinite(y) || !Number.isFinite(m)) return ym
  return new Date(y, m - 1, 15).toLocaleDateString("es-CO", { month: "long", year: "numeric" })
}

function formatCommitmentDayEs(isoDate: string) {
  const key = localDateKeyFromIso(isoDate) ?? (isoDate.length >= 10 ? isoDate.slice(0, 10) : "")
  if (key.length < 10) return "—"
  const y = Number(key.slice(0, 4))
  const mo = Number(key.slice(5, 7)) - 1
  const da = Number(key.slice(8, 10))
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) return key
  const d = new Date(y, mo, da)
  return d.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })
}

function isIncomeCommitmentRow(c: FlowCommitment) {
  return c.flowType === "income"
}

/** Colores de serie: ingresos (verde) vs flujo neto (azul finanzas) vs gasto (rojo) — evita confundir flujo con ingreso. */
const FLOW_SERIES_COLORS = {
  ingresos: "var(--color-accent-health)",
  gasto_operativo: "var(--color-accent-danger)",
  flujo: "var(--color-accent-finance)",
} as const

function FlowChartLegend() {
  const items = [
    { key: "ingresos", label: "Ingresos", color: FLOW_SERIES_COLORS.ingresos },
    { key: "gasto", label: "Gasto operativo", color: FLOW_SERIES_COLORS.gasto_operativo },
    { key: "flujo", label: "Flujo neto", color: FLOW_SERIES_COLORS.flujo },
  ]
  return (
    <ul className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2 px-0.5 text-[10px] text-orbita-secondary sm:gap-x-6 sm:text-[11px]">
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

function FlowEvolutionTable({
  rows,
  formatMoney,
  tableWrapClassName,
}: {
  rows: MonthlyRow[]
  formatMoney: (value: number) => string
  /** Por defecto margen superior; en `<details>` usar sin mt-4. */
  tableWrapClassName?: string
}) {
  if (rows.length === 0) return null

  const thBase =
    "px-2 py-2 font-semibold text-orbita-primary first:rounded-tl-lg last:rounded-tr-lg sm:px-3 sm:py-2.5"
  const tdBase = "border-t border-orbita-border/60 px-2 py-1.5 tabular-nums sm:px-3 sm:py-2"
  const tdLabel = `${tdBase} max-w-[min(40vw,11rem)] text-orbita-primary [overflow-wrap:anywhere] sm:max-w-none`

  return (
    <div
      className={
        tableWrapClassName ??
        "mt-4 overflow-x-auto rounded-lg border border-orbita-border/70 [scrollbar-gutter:stable]"
      }
    >
      <table className="w-full min-w-[min(100%,380px)] border-collapse text-[11px] sm:min-w-[420px] sm:text-xs">
        <caption className="sr-only">
          Valores numéricos por periodo: ingresos, gasto operativo y flujo neto en pesos colombianos
        </caption>
        <thead>
          <tr>
            <th
              scope="col"
              className={thBase}
              style={{
                background: "color-mix(in srgb, var(--color-surface-alt) 88%, var(--color-text-primary) 4%)",
              }}
            >
              Periodo
            </th>
            <th
              scope="col"
              className={`${thBase} text-right`}
              style={{
                background: "color-mix(in srgb, var(--color-surface) 72%, var(--color-accent-health) 28%)",
              }}
            >
              Ingresos
            </th>
            <th
              scope="col"
              className={`${thBase} text-right`}
              style={{
                background: "color-mix(in srgb, var(--color-surface) 78%, var(--color-accent-danger) 22%)",
              }}
            >
              Gasto op.
            </th>
            <th
              scope="col"
              className={`${thBase} text-right`}
              style={{
                background: "color-mix(in srgb, var(--color-surface) 72%, var(--color-accent-finance) 28%)",
              }}
            >
              Flujo neto
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const net = row.flujo
            const flowTone =
              net < -0.5
                ? "var(--color-accent-danger)"
                : net > 0.5
                  ? "var(--color-accent-finance)"
                  : "var(--color-text-secondary)"
            return (
              <tr
                key={row.month}
                className="odd:bg-orbita-surface-alt/35 hover:bg-orbita-surface-alt/55"
              >
                <th scope="row" className={tdLabel}>
                  {row.month}
                </th>
                <td className={`${tdBase} text-right`} style={{ color: "var(--color-accent-health)" }}>
                  {formatMoney(row.ingresos)}
                </td>
                <td className={`${tdBase} text-right`} style={{ color: "var(--color-accent-danger)" }}>
                  {formatMoney(row.gasto_operativo)}
                </td>
                <td className={`${tdBase} text-right font-semibold`} style={{ color: flowTone }}>
                  {net >= 0 ? "+" : ""}
                  {formatMoney(net)}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

const FLOW_TABS: { id: FlowEvolutionKey; label: string; subtitle: string }[] = [
  {
    id: "weeks",
    label: "Semanas",
    subtitle: "Últimas 4 semanas corridas (lun–dom), ancladas al último movimiento del mes o al cierre del mes (COP)",
  },
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
  const [lsCommitments, setLsCommitments] = useState<FlowCommitment[]>([])
  const fetchSeq = useRef(0)
  const capitalEpoch = finance?.capitalDataEpoch ?? 0

  // === CORREGIDO: Manejo seguro de compromisos locales ===
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
        const fallbackDay = c.date ? dayFromIso(c.date) : 1
        const dueDay = c.dueDay != null && c.dueDay >= 1 ? c.dueDay : fallbackDay

        return {
          ...c,
          dueDay,
          subcategory: c.subcategory ?? "",
          date: isoDateInMonth(month, dueDay),
        }
      })
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

        const response = await financeApiGet(`/api/orbita/finanzas/overview?month=${encodeURIComponent(month)}`)

        const json = (await response.json()) as OverviewResponse

        if (cancelled || seq !== fetchSeq.current) return

        if (!response.ok || !json.success) {
          throw new Error(messageForHttpError(response.status, json.error, response.statusText))
        }

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
  }, [month, capitalEpoch])

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
  const commitmentsOutTotal = commitmentsSorted
    .filter((c) => !isIncomeCommitmentRow(c))
    .reduce((a, c) => a + c.amount, 0)
  const commitmentsInTotal = commitmentsSorted
    .filter((c) => isIncomeCommitmentRow(c))
    .reduce((a, c) => a + c.amount, 0)
  const commitmentsNetMonthly = commitmentsInTotal - commitmentsOutTotal

  const deltaLabel =
    deltaNet != null && Number.isFinite(deltaNet)
      ? `${deltaNet >= 0 ? "+" : ""}${deltaNet.toFixed(1)}% vs mes anterior`
      : "Sin comparación"

  const kpiHasSignal =
    finance?.financeMeta?.kpiHasSignal ?? (income > 0.5 || expense > 0.5)

  const runwayLabel =
    !kpiHasSignal ? "—" : runway > 0 && net > 0 ? `${runway.toFixed(1)}×` : net <= 0 ? "En déficit" : "—"

  const pressurePct = kpiHasSignal
    ? Math.max(0, Math.min(100, Math.round((expense / Math.max(1, income)) * 100)))
    : null

  const flowChartMargin = { top: 8, right: 2, left: 2, bottom: xAxisHeight + 6 } as const

  return (
    <div className={`${financeViewRootClass} max-w-full`}>
      <section className="min-w-0 space-y-2.5" aria-labelledby="fin-overview-kpis-heading">
        <FinanceViewHeader
          kicker="Resumen"
          title="Indicadores del mes"
          titleId="fin-overview-kpis-heading"
          subtitle="Gasto operativo según catálogo; inversión y ajustes fuera de estas tarjetas."
        />
        <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-4">
          {(
            [
              {
                label: "Capacidad de ahorro",
                value: kpiHasSignal ? `${formatMoney(savingsRate)}%` : "—",
                sub: kpiHasSignal
                  ? `Ingresos ${formatMoney(income)} COP`
                  : "Sin base de ingresos/gastos para calcular el mes.",
                subExtra: kpiHasSignal ? deltaLabel : undefined,
                accent: "var(--color-accent-health)",
              },
              {
                label: "Flujo neto",
                value: kpiHasSignal ? `${net >= 0 ? "+" : ""}$${formatMoney(net)}` : "—",
                sub: kpiHasSignal
                  ? `Gasto operativo ${formatMoney(expense)} · Ingresos ${formatMoney(income)}`
                  : "Importa movimientos o elige un mes con resumen guardado.",
                accent: "var(--color-accent-finance)",
              },
              {
                label: "Cobertura (superávit ÷ gasto)",
                value: runwayLabel,
                sub: kpiHasSignal
                  ? "Meses que cubrirían el gasto operativo con el flujo positivo del mes"
                  : "Sin superávit/gasto comparable este mes.",
                accent: "var(--color-text-primary)",
              },
              {
                label: "Presión gasto / ingreso",
                value: pressurePct != null ? `${pressurePct}%` : "—",
                sub: kpiHasSignal
                  ? "Gasto operativo sobre ingresos del mes"
                  : "Necesitas ingresos y gasto operativo del periodo.",
                accent: "var(--color-accent-finance)",
              },
            ] as const
          ).map((metric) => (
            <Card key={metric.label} hover className="min-w-0 border border-orbita-border/70 p-3 sm:p-4">
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

      <Card className="min-w-0 overflow-x-clip p-3 sm:p-5">
        <div className="grid min-w-0 max-w-full gap-3">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid min-w-0 max-w-full gap-1">
              <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Evolución de flujo</p>
              <span className="break-words text-xs leading-snug text-orbita-secondary [overflow-wrap:anywhere]">
                {flowSubtitle}
              </span>
              <span className="hidden text-[11px] leading-snug text-orbita-secondary/90 md:inline">
                Verde <span style={{ color: FLOW_SERIES_COLORS.ingresos }}>ingresos</span>
                {" · "}
                <span style={{ color: FLOW_SERIES_COLORS.gasto_operativo }}>gasto operativo</span>
                {" · "}
                <span style={{ color: FLOW_SERIES_COLORS.flujo }}>flujo neto</span> (COP, misma lógica que KPI).
              </span>
            </div>
            <div
              className="flex max-w-full min-w-0 flex-wrap gap-0.5 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_45%,var(--color-surface))] p-0.5"
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
                    className={`${financeSubnavTabClass(active)} min-h-8 shrink-0 px-2 py-1.5 text-[10px] normal-case tracking-normal sm:min-h-9 sm:px-2.5 sm:text-[11px]`}
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
                          name === "ingresos"
                            ? "Ingresos"
                            : name === "gasto_operativo"
                              ? "Gasto operativo"
                              : name === "flujo"
                                ? "Flujo neto"
                                : String(name ?? ""),
                        ]}
                      />
                      <ReferenceLine y={0} stroke="var(--color-border)" />
                      <Line
                        type="monotone"
                        dataKey="ingresos"
                        name="ingresos"
                        stroke={FLOW_SERIES_COLORS.ingresos}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="gasto_operativo"
                        name="gasto_operativo"
                        stroke={FLOW_SERIES_COLORS.gasto_operativo}
                        strokeWidth={2.25}
                        dot={{ r: 3 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="flujo"
                        name="flujo"
                        stroke={FLOW_SERIES_COLORS.flujo}
                        strokeWidth={2.5}
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
            {chartData.length > 0 ? (
              <>
                <FlowChartLegend />
                <details className="group mt-3">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-orbita-border/60 bg-orbita-surface-alt/35 px-3 py-2 text-left text-xs font-semibold text-orbita-primary sm:text-sm [&::-webkit-details-marker]:hidden">
                    <span>Tabla de datos (periodo, ingresos, gasto op., flujo neto)</span>
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-orbita-secondary transition-transform duration-200 group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <FlowEvolutionTable
                    rows={chartData}
                    formatMoney={formatMoney}
                    tableWrapClassName="mt-2 overflow-x-auto rounded-lg border border-orbita-border/70 [scrollbar-gutter:stable]"
                  />
                </details>
              </>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
        <Card
          className="relative min-w-0 overflow-hidden p-0"
          style={{
            background:
              "linear-gradient(165deg, color-mix(in srgb, var(--color-surface-alt) 58%, var(--color-surface)) 0%, var(--color-surface) 38%, var(--color-surface) 100%)",
            border: "0.5px solid color-mix(in srgb, var(--color-border) 78%, transparent)",
            boxShadow:
              "0 4px 22px color-mix(in srgb, var(--color-text-primary) 6%, transparent), inset 0 1px 0 color-mix(in srgb, #fff 8%, transparent)",
          }}
        >
          <div
            className="h-1 w-full bg-gradient-to-r from-[color-mix(in_srgb,var(--color-accent-health)_55%,transparent)] via-[color-mix(in_srgb,var(--color-accent-finance)_38%,transparent)] to-[color-mix(in_srgb,var(--color-accent-health)_18%,transparent)]"
            aria-hidden
          />
          <div className="grid min-w-0 max-w-full gap-3 p-3 sm:p-4">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orbita-secondary">
                  Suscripciones registradas
                </p>
                <p className="mt-1 text-[11px] leading-snug text-orbita-secondary">
                  Misma lista que en Capital → Cuentas (suscripciones recurrentes).
                </p>
              </div>
              <Link
                href="/finanzas/cuentas#capital-suscripciones"
                className="shrink-0 rounded-full border border-orbita-border/45 bg-[color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] px-2.5 py-1 text-[11px] font-medium text-orbita-primary transition hover:border-orbita-border/70 hover:bg-[color-mix(in_srgb,var(--color-text-primary)_7%,transparent)]"
                prefetch={false}
              >
                Editar
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-orbita-border/45 bg-[color-mix(in_srgb,var(--color-surface-alt)_42%,transparent)] px-3 py-2.5 shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_10%,transparent)] backdrop-blur-[2px] sm:px-3.5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-orbita-secondary">Total mensual</p>
                <p className="mt-0.5 text-[11px] text-orbita-secondary">
                  {managedActive.length === 0 ? "Sin ítems" : `${managedActive.length} activa${managedActive.length === 1 ? "" : "s"}`}
                </p>
              </div>
              <span className="shrink-0 tabular-nums text-lg font-semibold tracking-tight text-orbita-primary">
                ${formatMoney(managedTotal)}
              </span>
            </div>

            {managedActive.length === 0 ? (
              <p className="text-sm text-orbita-secondary">No hay suscripciones activas en tu registro.</p>
            ) : (
              <details className="group rounded-2xl border border-orbita-border/50 bg-[color-mix(in_srgb,var(--color-surface-alt)_28%,transparent)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-orbita-primary transition-colors hover:bg-[color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-center gap-2">
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-orbita-secondary transition-transform duration-200 group-open:rotate-180"
                      aria-hidden
                    />
                    Ver lista
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-orbita-secondary">{managedActive.length} ítems</span>
                </summary>
                <div className="space-y-1.5 border-t border-orbita-border/40 px-3 pb-3 pt-2">
                  {managedActive.map((s) => (
                    <div
                      key={s.id}
                      className="flex min-w-0 items-start justify-between gap-2 rounded-xl border border-orbita-border/35 bg-[color-mix(in_srgb,var(--color-text-primary)_3.5%,transparent)] px-2.5 py-2 transition hover:border-orbita-border/55 hover:bg-[color-mix(in_srgb,var(--color-text-primary)_5.5%,transparent)]"
                    >
                      <span className="min-w-0 break-words text-sm font-medium leading-snug text-orbita-primary">
                        {s.name}
                      </span>
                      <span className="shrink-0 tabular-nums text-xs text-orbita-secondary">${formatMoney(s.amount_monthly)}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}

            <details className="rounded-2xl border border-orbita-border/45 bg-[color-mix(in_srgb,var(--color-surface-alt)_22%,transparent)] px-3 py-2 text-xs text-orbita-secondary backdrop-blur-[1px]">
              <summary className="cursor-pointer list-none font-medium text-orbita-primary [&::-webkit-details-marker]:hidden">
                Patrones en movimientos (operativo, mes)
              </summary>
              <p className="mt-2 text-[11px] leading-snug">
                Heurística sobre transacciones del mes (no reemplaza tu lista registrada).
              </p>
              {subs.length === 0 ? (
                <p className="mt-2 text-[11px]">Sin coincidencias tipo suscripción / SaaS.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {subs.map((item) => (
                    <li
                      key={item.name}
                      className="flex justify-between gap-2 rounded-lg border border-orbita-border/30 bg-[color-mix(in_srgb,var(--color-text-primary)_3%,transparent)] px-2 py-1.5 tabular-nums"
                    >
                      <span className="min-w-0 break-words">{item.name}</span>
                      <span>${formatMoney(item.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 border-t border-orbita-border/40 pt-2 text-[11px]">
                Subtotal heurístico: ${formatMoney(subsTotal)}
              </p>
            </details>
          </div>
        </Card>

        <Card
          className="relative min-w-0 overflow-hidden p-0"
          style={{
            background:
              "linear-gradient(165deg, color-mix(in srgb, var(--color-surface-alt) 58%, var(--color-surface)) 0%, var(--color-surface) 38%, var(--color-surface) 100%)",
            border: "0.5px solid color-mix(in srgb, var(--color-border) 78%, transparent)",
            boxShadow:
              "0 4px 22px color-mix(in srgb, var(--color-text-primary) 6%, transparent), inset 0 1px 0 color-mix(in srgb, #fff 8%, transparent)",
          }}
        >
          <div
            className="h-1 w-full bg-gradient-to-r from-[color-mix(in_srgb,var(--color-accent-finance)_48%,transparent)] via-[color-mix(in_srgb,var(--color-accent-health)_28%,transparent)] to-[color-mix(in_srgb,var(--color-accent-finance)_15%,transparent)]"
            aria-hidden
          />
          <div className="grid min-w-0 max-w-full gap-3 p-3 sm:p-4">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orbita-secondary">
                  Compromisos (lista corta)
                </p>
                <p className="mt-1 text-[11px] leading-snug text-orbita-secondary">
                  {supabaseEnabled
                    ? "Misma lista que el simulador en Capital → Cuentas (guardada por hogar)."
                    : "Sincronizado con el simulador en Capital → Cuentas (este navegador)."}
                </p>
              </div>
              <Link
                href="/finanzas/cuentas#capital-compromisos"
                className="shrink-0 rounded-full border border-orbita-border/45 bg-[color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] px-2.5 py-1 text-[11px] font-medium text-orbita-primary transition hover:border-orbita-border/70 hover:bg-[color-mix(in_srgb,var(--color-text-primary)_7%,transparent)]"
                prefetch={false}
              >
                Editar
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-orbita-border/45 bg-[color-mix(in_srgb,var(--color-surface-alt)_42%,transparent)] px-3 py-2.5 shadow-[inset_0_1px_0_color-mix(in_srgb,#fff_10%,transparent)] backdrop-blur-[2px] sm:px-3.5">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.14em] text-orbita-secondary">Impacto neto (mes)</p>
                <p className="mt-0.5 text-[11px] text-orbita-secondary">
                  {commitmentsSorted.length === 0
                    ? "Sin ítems"
                    : `Salidas ${formatMoney(commitmentsOutTotal)} · Entradas ${formatMoney(commitmentsInTotal)}`}
                </p>
              </div>
              <span
                className={`shrink-0 tabular-nums text-lg font-semibold tracking-tight ${
                  commitmentsNetMonthly >= 0 ? "text-emerald-700" : "text-orbita-primary"
                }`}
              >
                {commitmentsSorted.length === 0
                  ? "—"
                  : `${commitmentsNetMonthly >= 0 ? "+" : ""}$${formatMoney(commitmentsNetMonthly)}`}
              </span>
            </div>

            {commitmentsSorted.length === 0 ? (
              <p className="text-sm text-orbita-secondary">Aún no hay compromisos guardados.</p>
            ) : (
              <details className="group rounded-2xl border border-orbita-border/50 bg-[color-mix(in_srgb,var(--color-surface-alt)_28%,transparent)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-orbita-primary transition-colors hover:bg-[color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] [&::-webkit-details-marker]:hidden">
                  <span className="flex min-w-0 items-center gap-2">
                    <ChevronDown
                      className="h-4 w-4 shrink-0 text-orbita-secondary transition-transform duration-200 group-open:rotate-180"
                      aria-hidden
                    />
                    Ver lista
                  </span>
                  <span className="shrink-0 text-[11px] tabular-nums text-orbita-secondary">
                    {commitmentsSorted.length} ítems
                  </span>
                </summary>
                <div className="space-y-1.5 border-t border-orbita-border/40 px-3 pb-3 pt-2">
                  {commitmentsSorted.map((c) => {
                    const inc = isIncomeCommitmentRow(c)
                    return (
                      <div
                        key={c.id}
                        className="flex min-w-0 items-start justify-between gap-2 rounded-xl border border-orbita-border/35 bg-[color-mix(in_srgb,var(--color-text-primary)_3.5%,transparent)] px-2.5 py-2 transition hover:border-orbita-border/55 hover:bg-[color-mix(in_srgb,var(--color-text-primary)_5.5%,transparent)]"
                      >
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium leading-snug text-orbita-primary">
                            {c.category?.trim() || c.title}
                          </p>
                          {c.category?.trim() && c.title.trim().toLowerCase() !== c.category.trim().toLowerCase() ? (
                            <p className="text-[11px] text-orbita-secondary">{c.title}</p>
                          ) : null}
                          <p className="text-[11px] text-orbita-secondary">
                            Día {c.dueDay ?? "—"} · {formatCommitmentDayEs(c.date)}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 tabular-nums text-xs font-medium ${inc ? "text-emerald-700" : "text-orbita-primary"}`}
                        >
                          {inc ? "+" : "-"}${formatMoney(c.amount)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </details>
            )}

            <details className="rounded-2xl border border-orbita-border/45 bg-[color-mix(in_srgb,var(--color-surface-alt)_22%,transparent)] px-3 py-2 text-xs text-orbita-secondary backdrop-blur-[1px]">
              <summary className="cursor-pointer list-none font-medium text-orbita-primary [&::-webkit-details-marker]:hidden">
                Sugerencias desde movimientos (operativo)
              </summary>
              <p className="mt-2 text-[11px] leading-snug">
                Cargos fijos detectados por categoría o texto; útil si aún no los copiaste a la lista.
              </p>
              {obls.length === 0 ? (
                <p className="mt-2 text-[11px]">Sin sugerencias este mes.</p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {obls.map((item) => (
                    <li
                      key={item.name + item.due}
                      className="flex justify-between gap-2 rounded-lg border border-orbita-border/30 bg-[color-mix(in_srgb,var(--color-text-primary)_3%,transparent)] px-2 py-1.5 tabular-nums"
                    >
                      <span className="min-w-0 break-words">{item.name}</span>
                      <span>${formatMoney(item.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-2 border-t border-orbita-border/40 pt-2 text-[11px]">
                Subtotal sugerido: ${formatMoney(oblsTotal)}
              </p>
            </details>
          </div>
        </Card>
      </div>
    </div>
  )
}
