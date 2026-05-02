"use client"

import Link from "next/link"
import type { CSSProperties } from "react"
import { useEffect, useRef, useState } from "react"
import { useFinance } from "../FinanceContext"
import { motion } from "framer-motion"
import { ChevronDown, TrendingDown, TrendingUp, Zap } from "lucide-react"
import { CapitalOverviewStrategicDeck } from "../_components/CapitalOverviewStrategicDeck"
import { financeSubnavTabClass } from "../_components/financeChrome"
import { Card } from "@/src/components/ui/Card"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { rechartsTooltipContentStyle } from "@/lib/charts/rechartsShared"
import { UI_FINANCE_DEMO_MONTH } from "@/lib/checkins/flags"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import { dayFromIso, isoDateInMonth } from "@/lib/finanzas/commitmentAnchorDate"
import { formatLocalDateWeekdayShortDayMonthEsCo, localDateKeyFromIso } from "@/lib/agenda/localDateKey"
import type { FlowCommitment } from "@/lib/finanzas/flowCommitmentsTypes"
import { readFlowCommitmentsFromLocalStorage } from "@/lib/finanzas/flowCommitmentsLocal"
import { subscriptionActiveBurn, type UserSubscription } from "@/lib/finanzas/userSubscriptionsTypes"
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts"
import { cn } from "@/lib/utils"

const PULSE_INCOME_CARD_STYLE: CSSProperties = {
  background:
    "linear-gradient(155deg, color-mix(in srgb, var(--color-accent-health) 18%, var(--color-surface)) 0%, var(--color-surface) 55%, color-mix(in srgb, var(--color-accent-health) 6%, var(--color-surface)) 100%)",
  borderColor: "color-mix(in srgb, var(--color-accent-health) 42%, var(--color-border))",
}

const PULSE_EXPENSE_CARD_STYLE: CSSProperties = {
  background:
    "linear-gradient(155deg, color-mix(in srgb, var(--color-accent-danger) 14%, var(--color-surface)) 0%, var(--color-surface) 58%, color-mix(in srgb, var(--color-accent-danger) 5%, var(--color-surface)) 100%)",
  borderColor: "color-mix(in srgb, var(--color-accent-danger) 38%, var(--color-border))",
}

const PULSE_NET_POSITIVE_STYLE: CSSProperties = {
  background:
    "linear-gradient(155deg, color-mix(in srgb, var(--color-accent-health) 16%, var(--color-surface)) 0%, var(--color-surface) 55%, color-mix(in srgb, var(--color-accent-health) 8%, var(--color-surface)) 100%)",
  borderColor: "color-mix(in srgb, var(--color-accent-health) 44%, var(--color-border))",
}

const PULSE_NET_NEGATIVE_STYLE: CSSProperties = {
  background:
    "linear-gradient(155deg, color-mix(in srgb, var(--color-accent-danger) 14%, var(--color-surface)) 0%, var(--color-surface) 58%, color-mix(in srgb, var(--color-accent-danger) 5%, var(--color-surface)) 100%)",
  borderColor: "color-mix(in srgb, var(--color-accent-danger) 40%, var(--color-border))",
}

const PULSE_EMPTY_CARD_STYLE: CSSProperties = {
  background: "color-mix(in srgb, var(--color-surface-alt) 38%, var(--color-surface))",
  borderColor: "color-mix(in srgb, var(--color-border) 72%, transparent)",
}

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
  const key = localDateKeyFromIso(isoDate) ?? (isoDate.length >= 10 ? isoDate.slice(0, 10) : "")
  if (key.length < 10) return "—"
  return formatLocalDateWeekdayShortDayMonthEsCo(key)
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

/** Hex para degradado bajo flujo neto: `stopColor="var(--token)"` en SVG falla en varios navegadores con Recharts. */
const FLOW_NET_GRADIENT_HEX = "#0ea5e9" as const

const FLOW_CHART_ANIM = {
  duration: 480,
  easing: "ease-out" as const,
  /** Líneas un poco después del área para una lectura en capas. */
  lineBegin1: 70,
  lineBegin2: 120,
} as const

/** Escala propia para flujo neto (ingreso − gasto): sin esto la curva queda casi plana frente a montos brutos. */
function monthlyRowsNetYDomain(rows: MonthlyRow[]): [number, number] | undefined {
  if (!rows.length) return undefined
  const vals = rows.map((r) => r.flujo).filter((n) => typeof n === "number" && Number.isFinite(n))
  if (!vals.length) return undefined
  let lo = Math.min(...vals)
  let hi = Math.max(...vals)
  lo = Math.min(lo, 0)
  hi = Math.max(hi, 0)
  const span = hi - lo || Math.max(Math.abs(hi), Math.abs(lo), 1)
  const pad = span * 0.14
  return [lo - pad, hi + pad]
}

/** Degradado bajo flujo neto (solo área; ingreso/gasto siguen siendo líneas). */
function FlowChartNetFillGradient() {
  return (
    <defs>
      <linearGradient id="orbita-flow-fill-flujo" x1="0" y1="0" x2="0" y2="1">
        <stop offset="5%" stopColor={FLOW_NET_GRADIENT_HEX} stopOpacity={0.22} />
        <stop offset="95%" stopColor={FLOW_NET_GRADIENT_HEX} stopOpacity={0} />
      </linearGradient>
    </defs>
  )
}

function FlowChartLegend() {
  const items = [
    {
      key: "ingresos",
      label: "Ingresos",
      swatch: "line" as const,
      color: FLOW_SERIES_COLORS.ingresos,
      hint: "Línea · eje izquierdo (COP)",
    },
    {
      key: "gasto",
      label: "Gasto operativo",
      swatch: "line" as const,
      color: FLOW_SERIES_COLORS.gasto_operativo,
      hint: "Línea · eje izquierdo (COP)",
    },
    {
      key: "flujo",
      label: "Flujo neto",
      swatch: "area" as const,
      color: FLOW_SERIES_COLORS.flujo,
      hint: "Solo área · eje derecho (escala propia)",
    },
  ] as const
  return (
    <ul className="mt-2 grid w-full max-w-full grid-cols-1 gap-x-3 gap-y-2.5 px-0 text-[10px] text-orbita-secondary sm:flex sm:flex-wrap sm:justify-center sm:gap-x-6 sm:gap-y-2 sm:text-[11px]">
      {items.map((item) => (
        <li
          key={item.key}
          className="grid min-w-0 max-w-full grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-0.5 sm:flex sm:max-w-[min(100%,14rem)] sm:flex-col sm:gap-0.5"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {item.swatch === "line" ? (
              <span
                className="h-2 w-2 shrink-0 rounded-full sm:h-2 sm:w-2"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
            ) : (
              <span
                className="h-2 w-6 shrink-0 rounded-sm sm:h-2 sm:w-6"
                style={{
                  backgroundColor: `color-mix(in srgb, ${item.color} 42%, transparent)`,
                  boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${item.color} 55%, transparent)`,
                }}
                aria-hidden
              />
            )}
            <span className="min-w-0 break-words leading-tight font-medium text-[var(--color-text-primary)]">
              {item.label}
            </span>
          </span>
          <span className="max-w-[min(100%,11.5rem)] text-right text-[9px] leading-snug opacity-90 [overflow-wrap:anywhere] sm:max-w-none sm:pl-[calc(0.75rem+2px)] sm:text-left sm:text-[10px]">
            {item.hint}
          </span>
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
    label: "3 meses",
    subtitle: "Ventana móvil de 3 meses terminando en el mes seleccionado (misma lógica que semestre y año móvil; COP)",
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
  const [flowView, setFlowView] = useState<FlowEvolutionKey>("semester")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [flowChartCompact, setFlowChartCompact] = useState(false)
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

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)")
    const apply = () => setFlowChartCompact(mq.matches)
    apply()
    mq.addEventListener("change", apply)
    return () => mq.removeEventListener("change", apply)
  }, [])

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
  const netFlujoYDomain = monthlyRowsNetYDomain(chartData)
  const flowSubtitle = FLOW_TABS.find((t) => t.id === flowView)?.subtitle ?? FLOW_TABS[0]!.subtitle
  /** Siempre horizontal (evita diagonales); altura mínima para ticks + margen inferior del plot. */
  const xAxisHeight = flowChartCompact ? 22 : 24
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

  const kpiHasSignal =
    finance?.financeMeta?.kpiHasSignal ?? (income > 0.5 || expense > 0.5)

  const pressurePct = kpiHasSignal
    ? Math.max(0, Math.min(100, Math.round((expense / Math.max(1, income)) * 100)))
    : null

  const monthDisplay =
    month.length >= 7
      ? (() => {
          const [ys, ms] = month.split("-")
          const y = Number(ys)
          const mo = Number(ms)
          if (!Number.isFinite(y) || !Number.isFinite(mo)) return month
          return new Date(y, mo - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" })
        })()
      : month

  const strategicInsights: string[] = []
  if (!kpiHasSignal) {
    strategicInsights.push(
      "Importa movimientos operativos o elige un mes donde ya exista ingreso y gasto catalogados para activar el tablero estratégico.",
    )
    strategicInsights.push(
      "Cuando haya señal suficiente, Orvita comparará este mes con el anterior y estimará presión, cobertura y capacidad de ahorro.",
    )
  } else {
    if (net > 0.5) {
      strategicInsights.push(
        `Cerraste el período con flujo positivo de ${formatMoney(net)} COP: refuerza colchón y decisiones de inversión con calma.`,
      )
    } else if (net < -0.5) {
      strategicInsights.push(
        `El gasto operativo superó a los ingresos en ${formatMoney(Math.abs(net))} COP. Revisa primero categorías pesadas y compromisos fijos antes de gasto discrecional.`,
      )
    } else {
      strategicInsights.push(
        "El mes está casi en equilibrio: pequeños ajustes en recurrentes o ingresos pueden definir si terminas en verde o en rojo.",
      )
    }
    if (pressurePct != null) {
      if (pressurePct >= 92) {
        strategicInsights.push(
          `Presión muy alta (${pressurePct}% del ingreso en gasto operativo): conviene posponer decisiones grandes hasta recuperar margen.`,
        )
      } else if (pressurePct >= 78) {
        strategicInsights.push(
          `Presión elevada (${pressurePct}%): el margen es limitado; vale la pena repasar suscripciones y el simulador de compromisos en Cuentas.`,
        )
      } else {
        strategicInsights.push(
          `Presión moderada (${pressurePct}%): mantén revisión semanal en Movimientos para no erosionar el margen sin darte cuenta.`,
        )
      }
    }
    if (deltaNet != null && Number.isFinite(deltaNet)) {
      strategicInsights.push(
        deltaNet >= 0
          ? `El flujo neto mejoró un ${deltaNet.toFixed(1)}% frente al mes anterior — confirma en P&L que el cambio sea estructural, no puntual.`
          : `El flujo neto cayó un ${Math.abs(deltaNet).toFixed(1)}% vs el mes previo; cruza la lectura con P&L y Categorías para ver qué líneas lo movieron.`,
      )
    }
  }

  const flowDualAxis = chartData.length > 0 && Boolean(netFlujoYDomain)
  /** Laterales simétricos; el ancho del `YAxis` hace el resto del alineado con las etiquetas. */
  const flowChartSideMargin = flowDualAxis ? (flowChartCompact ? 2 : 6) : flowChartCompact ? 4 : 10
  const flowChartBottomPad = flowChartCompact ? 6 : 8
  const flowChartMargin = {
    top: flowChartCompact ? 8 : 12,
    right: flowChartSideMargin,
    left: flowChartSideMargin,
    bottom: xAxisHeight + flowChartBottomPad,
  } as const
  /** Mismo ancho en ambos ejes Y cuando hay doble escala — laterales visualmente parejos. */
  const flowDualAxisYWidth = flowChartCompact ? 30 : 36
  const flowYAxisWidth = flowDualAxisYWidth

  return (
    <div className="min-w-0 max-w-full space-y-6 sm:space-y-7 lg:space-y-8">
      <CapitalOverviewStrategicDeck
        monthDisplay={monthDisplay}
        snapshot={{
          kpiHasSignal,
          income,
          expense,
          net,
          savingsRate,
          deltaNet,
          runway,
          pressurePct,
        }}
        formatMoney={formatMoney}
        strategicInsights={strategicInsights}
      />

      {/* Pulso del mes · tres lecturas con tinte y micro-motion */}
      <section className="min-w-0" aria-label="Pulso financiero del mes">
        <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-orbita-secondary">
          Pulso del mes
        </p>
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          {(
            [
              {
                key: "income" as const,
                label: "Ingresos operativos",
                value: kpiHasSignal ? formatMoney(income) : "—",
                hint: "Sumatoria catalogada como ingreso.",
                cardStyle: kpiHasSignal ? PULSE_INCOME_CARD_STYLE : PULSE_EMPTY_CARD_STYLE,
                valueColor: "text-[color-mix(in_srgb,var(--color-accent-health)_88%,var(--color-text-primary))]",
                hintColor: "text-[color-mix(in_srgb,var(--color-text-secondary)_92%,var(--color-accent-health))]",
              },
              {
                key: "expense" as const,
                label: "Gasto operativo",
                value: kpiHasSignal ? formatMoney(expense) : "—",
                hint: "Catálogo operativo (sin inversión ni ajustes).",
                cardStyle: kpiHasSignal ? PULSE_EXPENSE_CARD_STYLE : PULSE_EMPTY_CARD_STYLE,
                valueColor: "text-[color-mix(in_srgb,var(--color-accent-danger)_85%,var(--color-text-primary))]",
                hintColor: "text-[color-mix(in_srgb,var(--color-text-secondary)_90%,var(--color-accent-danger))]",
              },
              {
                key: "net" as const,
                label: "Resultado neto",
                value: kpiHasSignal ? `${net >= 0 ? "+" : "−"}${formatMoney(Math.abs(net))}` : "—",
                hint: "Ingresos − gasto operativo del mes.",
                cardStyle: kpiHasSignal
                  ? net >= 0
                    ? PULSE_NET_POSITIVE_STYLE
                    : PULSE_NET_NEGATIVE_STYLE
                  : PULSE_EMPTY_CARD_STYLE,
                valueColor: kpiHasSignal
                  ? net >= 0
                    ? "text-[color-mix(in_srgb,var(--color-accent-health)_88%,var(--color-text-primary))]"
                    : "text-[color-mix(in_srgb,var(--color-accent-danger)_85%,var(--color-text-primary))]"
                  : "text-[var(--color-text-primary)]",
                hintColor: kpiHasSignal
                  ? net >= 0
                    ? "text-[color-mix(in_srgb,var(--color-text-secondary)_92%,var(--color-accent-health))]"
                    : "text-[color-mix(in_srgb,var(--color-text-secondary)_90%,var(--color-accent-danger))]"
                  : "text-[var(--color-text-secondary)]",
              },
            ] as const
          ).map((row, idx) => (
            <motion.div
              key={row.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.06, ease: [0.22, 1, 0.36, 1] }}
              whileHover={kpiHasSignal ? { y: -3, transition: { duration: 0.2 } } : undefined}
              className="min-w-0"
            >
              <Card
                hover
                style={row.cardStyle}
                className="relative isolate min-w-0 overflow-hidden rounded-2xl border p-4 shadow-[var(--shadow-card)] sm:rounded-3xl sm:p-5"
              >
                {row.key === "income" && kpiHasSignal ? (
                  <motion.span
                    className="pointer-events-none absolute right-1 top-2 z-0 text-[var(--color-accent-health)] sm:right-2 sm:top-3"
                    style={{ opacity: 0.14 }}
                    animate={{ y: [0, -3, 0], rotate: [0, 5, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden
                  >
                    <TrendingUp className="h-14 w-14 sm:h-[3.75rem] sm:w-[3.75rem]" strokeWidth={1.25} />
                  </motion.span>
                ) : null}
                {row.key === "expense" && kpiHasSignal ? (
                  <motion.span
                    className="pointer-events-none absolute right-1 top-3 z-0 text-[var(--color-accent-danger)] sm:right-2 sm:top-4"
                    style={{ opacity: 0.12 }}
                    animate={{ y: [0, 3, 0], rotate: [0, -4, 0] }}
                    transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden
                  >
                    <TrendingDown className="h-12 w-12 sm:h-14 sm:w-14" strokeWidth={1.25} />
                  </motion.span>
                ) : null}
                {row.key === "net" && kpiHasSignal && net > 0.5 ? (
                  <motion.span
                    className="pointer-events-none absolute right-3 top-3 text-amber-500"
                    animate={{ scale: [1, 1.12, 1], opacity: [0.65, 1, 0.65] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden
                  >
                    <Zap className="h-5 w-5 fill-amber-400/35" strokeWidth={2} />
                  </motion.span>
                ) : null}
                {row.key === "net" && kpiHasSignal && net < 0 ? (
                  <motion.span
                    className="pointer-events-none absolute right-3 top-3 text-[var(--color-accent-danger)]"
                    animate={{ scale: [1, 1.08, 1], opacity: [0.55, 0.95, 0.55] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    aria-hidden
                  >
                    <TrendingDown className="h-5 w-5" strokeWidth={2.5} />
                  </motion.span>
                ) : null}
                <motion.div
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--color-accent-finance)_35%,transparent)] to-transparent"
                  initial={{ opacity: 0, scaleX: 0.4 }}
                  animate={{ opacity: kpiHasSignal ? 0.65 : 0.2, scaleX: 1 }}
                  transition={{ duration: 0.8, delay: idx * 0.08 + 0.15, ease: [0.22, 1, 0.36, 1] }}
                  aria-hidden
                />
                <p className="relative z-[1] m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-primary)] opacity-85">
                  {row.label}
                </p>
                <p
                  className={cn(
                    "relative z-[1] mt-2 break-words text-[clamp(1.35rem,3.2vw,1.85rem)] font-bold tabular-nums leading-none",
                    row.valueColor,
                  )}
                >
                  {row.value}
                  {kpiHasSignal ? (
                    <span className="ml-1 text-[0.42em] font-semibold opacity-80">COP</span>
                  ) : null}
                </p>
                <p className={cn("relative z-[1] mt-2 text-[11px] leading-snug sm:text-xs", row.hintColor)}>{row.hint}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      <Card className="min-w-0 overflow-x-clip rounded-[22px] border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] px-3 pb-5 pt-4 shadow-[var(--shadow-card)] sm:rounded-3xl sm:p-7">
        <div className="grid min-w-0 max-w-full gap-3">
          <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="grid min-w-0 max-w-full gap-1">
              <p className="text-xs uppercase tracking-[0.14em] text-orbita-secondary">Evolución de flujo</p>
              <span className="break-words text-xs leading-snug text-orbita-secondary [overflow-wrap:anywhere]">
                {flowSubtitle}
              </span>
              <span className="hidden text-[11px] leading-snug text-orbita-secondary/90 md:inline">
                <span style={{ color: FLOW_SERIES_COLORS.ingresos }}>Ingresos</span> y{" "}
                <span style={{ color: FLOW_SERIES_COLORS.gasto_operativo }}>gasto operativo</span> como líneas (eje
                izquierdo, COP).                 <span style={{ color: FLOW_SERIES_COLORS.flujo }}>Flujo neto</span> solo como área sombreada, sin
                contorno (eje derecho, escala propia; misma lógica que el KPI).
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
            <div className="relative h-[248px] w-full max-w-full min-w-0 min-[400px]:h-[260px] sm:h-[272px]">
              <div className="absolute inset-0 min-w-0 max-w-full px-0">
                {chartData.length > 0 ? (
                  <ResponsiveContainer key={`flow-${flowView}-${month}`} width="100%" height="100%">
                    <ComposedChart data={chartData} margin={flowChartMargin}>
                      <FlowChartNetFillGradient />
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="var(--color-border)"
                        opacity={0.85}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tick={{
                          fontSize: flowChartCompact ? 8 : 9,
                          fill: "var(--color-text-secondary)",
                          style: { fontVariantNumeric: "tabular-nums" },
                        }}
                        stroke="var(--color-border)"
                        interval="preserveStartEnd"
                        angle={0}
                        textAnchor="middle"
                        height={xAxisHeight}
                        tickMargin={6}
                        minTickGap={flowChartCompact ? 12 : 16}
                      />
                      {netFlujoYDomain ? (
                        <>
                          <YAxis
                            yAxisId="cash"
                            width={flowDualAxisYWidth}
                            tick={{ fontSize: flowChartCompact ? 8 : 9, fill: "var(--color-text-secondary)" }}
                            stroke="var(--color-border)"
                            tickFormatter={formatCompact}
                          />
                          <YAxis
                            yAxisId="net"
                            orientation="right"
                            width={flowDualAxisYWidth}
                            domain={netFlujoYDomain}
                            tick={{ fontSize: flowChartCompact ? 8 : 9, fill: "var(--color-accent-finance)" }}
                            stroke="color-mix(in srgb, var(--color-accent-finance) 35%, var(--color-border))"
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
                          <ReferenceLine yAxisId="net" y={0} stroke="var(--color-border)" strokeDasharray="4 4" />
                          <Area
                            yAxisId="net"
                            type="monotone"
                            dataKey="flujo"
                            name="flujo"
                            stroke="none"
                            strokeWidth={0}
                            fill="url(#orbita-flow-fill-flujo)"
                            dot={false}
                            activeDot={{
                              r: 4,
                              fill: "var(--color-accent-finance)",
                              stroke: "var(--color-surface)",
                              strokeWidth: 1,
                            }}
                            isAnimationActive
                            animationDuration={FLOW_CHART_ANIM.duration}
                            animationEasing={FLOW_CHART_ANIM.easing}
                            animationBegin={0}
                          />
                          <Line
                            yAxisId="cash"
                            type="monotone"
                            dataKey="ingresos"
                            name="ingresos"
                            stroke={FLOW_SERIES_COLORS.ingresos}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 1, stroke: "var(--color-surface)" }}
                            isAnimationActive
                            animationDuration={FLOW_CHART_ANIM.duration}
                            animationEasing={FLOW_CHART_ANIM.easing}
                            animationBegin={FLOW_CHART_ANIM.lineBegin1}
                          />
                          <Line
                            yAxisId="cash"
                            type="monotone"
                            dataKey="gasto_operativo"
                            name="gasto_operativo"
                            stroke={FLOW_SERIES_COLORS.gasto_operativo}
                            strokeWidth={2.25}
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 1, stroke: "var(--color-surface)" }}
                            isAnimationActive
                            animationDuration={FLOW_CHART_ANIM.duration}
                            animationEasing={FLOW_CHART_ANIM.easing}
                            animationBegin={FLOW_CHART_ANIM.lineBegin2}
                          />
                        </>
                      ) : (
                        <>
                          <YAxis
                            width={flowYAxisWidth}
                            tick={{ fontSize: flowChartCompact ? 8 : 9, fill: "var(--color-text-secondary)" }}
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
                          <Area
                            type="monotone"
                            dataKey="flujo"
                            name="flujo"
                            stroke="none"
                            strokeWidth={0}
                            fill="url(#orbita-flow-fill-flujo)"
                            dot={false}
                            activeDot={{
                              r: 4,
                              fill: "var(--color-accent-finance)",
                              stroke: "var(--color-surface)",
                              strokeWidth: 1,
                            }}
                            isAnimationActive
                            animationDuration={FLOW_CHART_ANIM.duration}
                            animationEasing={FLOW_CHART_ANIM.easing}
                            animationBegin={0}
                          />
                          <Line
                            type="monotone"
                            dataKey="ingresos"
                            name="ingresos"
                            stroke={FLOW_SERIES_COLORS.ingresos}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 1, stroke: "var(--color-surface)" }}
                            isAnimationActive
                            animationDuration={FLOW_CHART_ANIM.duration}
                            animationEasing={FLOW_CHART_ANIM.easing}
                            animationBegin={FLOW_CHART_ANIM.lineBegin1}
                          />
                          <Line
                            type="monotone"
                            dataKey="gasto_operativo"
                            name="gasto_operativo"
                            stroke={FLOW_SERIES_COLORS.gasto_operativo}
                            strokeWidth={2.25}
                            dot={false}
                            activeDot={{ r: 5, strokeWidth: 1, stroke: "var(--color-surface)" }}
                            isAnimationActive
                            animationDuration={FLOW_CHART_ANIM.duration}
                            animationEasing={FLOW_CHART_ANIM.easing}
                            animationBegin={FLOW_CHART_ANIM.lineBegin2}
                          />
                        </>
                      )}
                    </ComposedChart>
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
                <details className="group mt-2">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-orbita-border/45 bg-orbita-surface-alt/25 px-2.5 py-1.5 text-left [&::-webkit-details-marker]:hidden">
                    <span className="min-w-0 text-[11px] font-medium leading-snug text-orbita-secondary">
                      <span className="font-semibold text-orbita-primary">Tabla</span>
                      {" · "}
                      mismos datos que la curva (COP)
                    </span>
                    <ChevronDown
                      className="h-3.5 w-3.5 shrink-0 text-orbita-secondary transition-transform duration-200 group-open:rotate-180"
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

      <div className="grid min-w-0 max-w-full grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6">
        <Card
          className="relative min-w-0 overflow-hidden rounded-[22px] p-0 sm:rounded-3xl"
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
          <div className="grid min-w-0 max-w-full gap-4 p-5 sm:gap-5 sm:p-6">
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
          className="relative min-w-0 overflow-hidden rounded-[22px] p-0 sm:rounded-3xl"
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
          <div className="grid min-w-0 max-w-full gap-4 p-5 sm:gap-5 sm:p-6">
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
