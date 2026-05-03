"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Flame,
  Landmark,
  Lightbulb,
  PieChart as PieChartGlyph,
  Scale,
  Sparkles,
  Stethoscope,
  Table,
  Target,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  LineChart,
  Line,
  PieChart,
  Pie,
  Legend,
  ReferenceLine,
  Treemap,
} from "recharts"
import { useFinance } from "../../FinanceContext"
import {
  financeCardMicroLabelClass,
  financeKpiCardClass,
  financeNoticeChipClass,
  financeSectionEyebrowClass,
  financeSectionIntroClass,
} from "../../_components/financeChrome"
import { Card } from "@/src/components/ui/Card"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { rechartsTooltipContentStyle } from "@/lib/charts/rechartsShared"
import type { CategoryAnalyticsPayload, StrategicInsight } from "@/lib/finanzas/categoryAnalyticsEngine"
import { loadMonthBudgets } from "@/lib/finanzas/categoryBudgetStorage"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import type { HabitRef } from "@/lib/finanzas/operationalFinanceBridges"
import { cn } from "@/lib/utils"
import {
  buildGrowthOperationalRows,
  buildPieWithDrivers,
  buildStrategicAlertTable,
  enrichStrategicInsights,
  scenarioOriginAdjustment,
  type EnrichedStrategicInsight,
  type StrategicAlertRow,
} from "@/lib/finanzas/operationalCategoryAugment"

const PIE_COLORS = [
  "var(--color-accent-finance)",
  "var(--color-accent-health)",
  "var(--color-accent-danger)",
  "#6366f1",
  "#0ea5e9",
  "#a855f7",
  "#f97316",
  "#14b8a6",
]

/** Tabla dentro de la misión «gasto variable»: misma familia que el anillo finance del Card. */
const variableMissionTableHeadRowClass =
  "border-b-2 border-[color-mix(in_srgb,var(--color-accent-finance)_22%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-finance)_8%,var(--color-surface-alt))] text-[10px] uppercase tracking-[0.07em] text-orbita-secondary"

/** Tabla de alertas estratégicas: acento danger discretamente alineado con el hero del Card. */
const alertMissionTableHeadRowClass =
  "border-b-2 border-[color-mix(in_srgb,var(--color-accent-danger)_22%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-danger)_9%,var(--color-surface-alt))] text-[10px] uppercase tracking-[0.07em] text-orbita-secondary"

/** Párrafos intro en heroes de misión: cómodos en móvil y más anchos en desktop para no “cortar” junto a chips. */
const financeMissionHeroIntroMeasureClass =
  "max-w-[min(100%,46ch)] sm:max-w-[min(100%,58ch)] md:max-w-[min(100%,68ch)] lg:max-w-[min(100%,82ch)] xl:max-w-[min(100%,96ch)]"

const WEEKDAY_SHORT_ES = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const

function fixedIncomeLoadZoneUi(ratio: number) {
  if (ratio >= 0.55) {
    return {
      badge: "Prioridad",
      Icon: Flame,
      chipClass:
        "border-[color-mix(in_srgb,var(--color-accent-danger)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-danger)_12%,var(--color-surface))] text-[color-mix(in_srgb,var(--color-accent-danger)_92%,var(--color-text-primary))]",
      hint: "Zona alta: prioriza margen para variable.",
      barClass: "bg-gradient-to-r from-amber-500 to-rose-500",
      pctClass: "text-amber-800 dark:text-amber-200",
    }
  }
  if (ratio >= 0.42) {
    return {
      badge: "Atención",
      Icon: AlertTriangle,
      chipClass:
        "border-[color-mix(in_srgb,var(--color-accent-warning)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-warning)_10%,var(--color-surface))] text-amber-900 dark:text-amber-100",
      hint: "Zona media: cuida imprevistos.",
      barClass: "bg-gradient-to-r from-[var(--color-accent-finance)] to-amber-400",
      pctClass: "text-orbita-primary",
    }
  }
  return {
    badge: "Buen margen",
    Icon: CheckCircle2,
    chipClass:
      "border-[color-mix(in_srgb,var(--color-accent-health)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface))] text-[color-mix(in_srgb,var(--color-accent-health)_88%,var(--color-text-primary))]",
    hint: "Margen cómodo si lo sostienes.",
    barClass: "bg-[var(--color-accent-health)]",
    pctClass: "text-[color-mix(in_srgb,var(--color-accent-health)_88%,var(--color-text-primary))]",
  }
}

function growthMissionSeverityUi(severity: "ok" | "watch" | "alert") {
  switch (severity) {
    case "alert":
      return {
        label: "Prioridad",
        Icon: Flame,
        chipClass:
          "border-[color-mix(in_srgb,var(--color-accent-danger)_48%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-danger)_11%,var(--color-surface))] text-[color-mix(in_srgb,var(--color-accent-danger)_92%,var(--color-text-primary))]",
        rowClass:
          "border-l-[3px] border-[color-mix(in_srgb,var(--color-accent-danger)_72%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-danger)_6%,transparent)]",
      }
    case "watch":
      return {
        label: "Radar",
        Icon: Target,
        chipClass:
          "border-[color-mix(in_srgb,var(--color-accent-finance)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-finance)_10%,var(--color-surface))] text-[color-mix(in_srgb,var(--color-accent-finance)_88%,var(--color-text-primary))]",
        rowClass:
          "border-l-[3px] border-[color-mix(in_srgb,var(--color-accent-finance)_58%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-finance)_6%,transparent)]",
      }
    default:
      return {
        label: "Estable",
        Icon: CheckCircle2,
        chipClass:
          "border-[color-mix(in_srgb,var(--color-accent-health)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_10%,var(--color-surface))] text-[color-mix(in_srgb,var(--color-accent-health)_88%,var(--color-text-primary))]",
        rowClass:
          "border-l-[3px] border-[color-mix(in_srgb,var(--color-accent-health)_48%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-text-primary)_2%,transparent)]",
      }
  }
}

function WeekdayInsightsSection({
  insights,
}: {
  insights: { text: string; category: string; weekday: number }[]
}) {
  if (insights.length === 0) return null
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-accent-health)_14%,var(--color-surface))] ring-1 ring-[color-mix(in_srgb,var(--color-accent-health)_22%,transparent)]">
          <CalendarDays
            className="h-4 w-4 text-[color-mix(in_srgb,var(--color-accent-health)_88%,var(--color-text-primary))]"
            strokeWidth={2}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className={financeCardMicroLabelClass}>Patrón por día del mes</p>
          <h3 className="mt-0.5 text-sm font-semibold leading-snug text-orbita-primary">
            ¿Hay un día que concentra el gasto?
          </h3>
          <p
            className={cn(
              "mt-1 text-[11px] leading-snug text-orbita-secondary sm:text-xs",
              financeMissionHeroIntroMeasureClass,
            )}
          >
            Solo categorías con gasto alto donde un día arrastra buena parte del rubro.
          </p>
        </div>
      </div>
      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-3.5">
        {insights.map((row, idx) => (
          <li key={`${row.category}-${row.weekday}-${idx}`} className="min-w-0">
            <Card
              hover
              className={cn(
                "group relative h-full overflow-hidden p-3 sm:p-3.5",
                "ring-1 ring-[color-mix(in_srgb,var(--color-border)_45%,transparent)]",
                "transition-[transform,box-shadow] duration-300 ease-out motion-safe:hover:-translate-y-0.5",
              )}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-3 left-3 top-3 w-[3px] rounded-full bg-[color-mix(in_srgb,var(--color-accent-health)_72%,var(--color-border))] sm:left-3.5"
              />
              <div className="flex flex-col gap-2.5 pl-4 sm:flex-row sm:items-center sm:gap-3 sm:pl-5">
                <span className="inline-flex h-7 min-w-[2.75rem] shrink-0 items-center justify-center self-start rounded-lg bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface-alt))] px-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-accent-health)_90%,var(--color-text-primary))] ring-1 ring-[color-mix(in_srgb,var(--color-accent-health)_26%,transparent)] sm:self-auto">
                  {WEEKDAY_SHORT_ES[row.weekday] ?? "—"}
                </span>
                <p className="min-w-0 flex-1 text-[11px] leading-relaxed text-orbita-primary [text-wrap:pretty] sm:text-[12px]">
                  {row.text}
                </p>
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  )
}

function formatCop(n: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(n))
}

/** Eje Y alineado con Capital / P&L: miles → `k`, millones → `M`. */
function formatCompactCop(n: number) {
  const v = Math.abs(n)
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `${Math.round(v / 1000)}k`
  return String(Math.round(v))
}

function momTone(mom: number | null, alert: number) {
  if (mom == null || !Number.isFinite(mom)) return "text-orbita-secondary"
  if (mom >= alert) return "font-semibold text-[var(--color-accent-danger)]"
  if (mom >= alert * 0.55) return "font-medium text-[var(--color-accent-warning)]"
  return "text-orbita-primary"
}

function insightImpactLabel(impact: string) {
  const i = impact.toLowerCase()
  if (i === "alto") return "Impacto alto"
  if (i === "medio") return "Impacto medio"
  if (i === "bajo") return "Impacto bajo"
  return impact
}

function InsightCard({ insight }: { insight: EnrichedStrategicInsight | StrategicInsight }) {
  const border =
    insight.impact === "alto"
      ? "border-rose-300/80 bg-[color-mix(in_srgb,var(--color-accent-danger)_8%,var(--color-surface))]"
      : insight.impact === "medio"
        ? "border-amber-300/70 bg-[color-mix(in_srgb,var(--color-accent-finance)_10%,var(--color-surface))]"
        : "border-orbita-border/60 bg-orbita-surface-alt/40"
  const enriched = insight as EnrichedStrategicInsight
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${border}`}>
      <div className="flex flex-wrap items-center justify-between gap-1">
        <p className={financeCardMicroLabelClass}>{insightImpactLabel(insight.impact)}</p>
        <div className="flex flex-wrap items-center gap-2 text-[10px] tabular-nums text-[var(--color-accent-health)]">
          {insight.savingsMonthly != null ? <span>~${formatCop(insight.savingsMonthly)}/mes</span> : null}
          {insight.savingsAnnual != null ? (
            <span className="text-orbita-secondary">· ${formatCop(insight.savingsAnnual)}/año</span>
          ) : null}
        </div>
      </div>
      <p className="mt-1 text-sm font-semibold leading-snug text-orbita-primary">{insight.title}</p>
      <p className={cn(financeSectionIntroClass, "mt-1 text-orbita-secondary")}>{insight.body}</p>
      {enriched.rootCauseOperational ? (
        <p className="mt-2 border-t border-orbita-border/50 pt-2 text-[10px] leading-relaxed text-orbita-primary">
          <span className="font-semibold text-orbita-secondary">Por qué pasa: </span>
          {enriched.rootCauseOperational}
        </p>
      ) : null}
      {enriched.agendaAction ? (
        <p className="mt-1 text-[10px] leading-relaxed text-orbita-secondary">
          <span className="font-semibold text-orbita-primary">Siguiente paso: </span>
          {enriched.agendaAction}
        </p>
      ) : null}
      {enriched.energyOrTimeNote ? (
        <p className="mt-1 text-[10px] leading-relaxed text-orbita-secondary">
          <span className="font-semibold text-orbita-primary">Tiempo y energía: </span>
          {enriched.energyOrTimeNote}
        </p>
      ) : null}
      {insight.ctaHref ? (
        <Link
          href={insight.ctaHref}
          className="mt-2 inline-flex text-[11px] font-semibold text-[var(--color-accent-finance)] underline-offset-4 hover:underline"
        >
          {insight.ctaLabel ?? "Abrir"}
        </Link>
      ) : null}
    </div>
  )
}

function alertKindLabel(k: StrategicAlertRow["kind"]) {
  if (k === "ant") return "Hormiga"
  if (k === "budget") return "Presupuesto"
  return "Crecimiento"
}

function alertSeverityRowClass(s: StrategicAlertRow["severity"]) {
  if (s === "alto") return "bg-[color-mix(in_srgb,var(--color-accent-danger)_8%,transparent)]"
  if (s === "medio") return "bg-[color-mix(in_srgb,var(--color-accent-finance)_7%,transparent)]"
  return ""
}

/** Umbral MoM enviado al motor de analíticas (sin UI en esta vista). */
const CATEGORY_ANALYTICS_MOM_ALERT_PCT = 15

export function CategoryAnalysisPanels({
  mode,
  budgetRevision = 0,
}: {
  mode: "estrategica" | "predictiva"
  budgetRevision?: number
}) {
  const finance = useFinance()
  const router = useRouter()
  const month = finance?.month ?? ""
  const capitalEpoch = finance?.capitalDataEpoch ?? 0

  const [data, setData] = useState<CategoryAnalyticsPayload | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [habits, setHabits] = useState<HabitRef[]>([])

  const load = useCallback(async () => {
    if (!month) {
      setData(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const q = new URLSearchParams()
      q.set("month", month)
      q.set("mom_alert", String(CATEGORY_ANALYTICS_MOM_ALERT_PCT))
      const res = await financeApiGet(`/api/orbita/finanzas/category-analytics?${q.toString()}`)
      const json = (await res.json()) as {
        success?: boolean
        data?: CategoryAnalyticsPayload | null
        error?: string
        notice?: string
      }
      if (!res.ok || !json.success) {
        throw new Error(messageForHttpError(res.status, json.error, res.statusText))
      }
      setNotice(json.notice ?? null)
      setData(json.data ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [month, capitalEpoch])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await financeApiGet("/api/habits")
        const json = (await res.json()) as {
          success?: boolean
          data?: { habits?: { name: string; domain?: string | null }[] }
        }
        if (!res.ok || !json.success || !json.data?.habits) {
          if (!cancelled) setHabits([])
          return
        }
        const list: HabitRef[] = json.data.habits.map((h) => ({
          name: h.name,
          domain: h.domain ?? undefined,
        }))
        if (!cancelled) setHabits(list)
      } catch {
        if (!cancelled) setHabits([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [capitalEpoch, month])

  const monthBudgets = useMemo(() => loadMonthBudgets(month), [month, budgetRevision])

  const growthRows = useMemo(
    () => (data ? buildGrowthOperationalRows(data.fastGrowing, habits) : []),
    [data, habits],
  )

  const variableGrowthMissionStats = useMemo(() => {
    const slice = growthRows.slice(0, 18)
    return {
      alert: slice.filter((r) => r.severity === "alert").length,
      watch: slice.filter((r) => r.severity === "watch").length,
      ok: slice.filter((r) => r.severity === "ok").length,
      total: slice.length,
    }
  }, [growthRows])

  const strategicAlerts = useMemo(
    () => (data ? buildStrategicAlertTable(data, monthBudgets, habits) : []),
    [data, monthBudgets, habits],
  )

  const pieExpenseOp = useMemo(
    () => (data ? buildPieWithDrivers(data.expensePie, "expense") : []),
    [data],
  )

  const pieIncomeOp = useMemo(() => (data ? buildPieWithDrivers(data.incomePie, "income") : []), [data])

  const enrichedInsights = useMemo(
    () => (data ? enrichStrategicInsights(data.insights, data, habits) : []),
    [data, habits],
  )

  const originScenario = useMemo(() => (data ? scenarioOriginAdjustment(data) : null), [data])

  const alertTreemapData = useMemo(() => {
    return strategicAlerts.slice(0, 18).map((a, i) => ({
      name: a.title.length > 22 ? `${a.title.slice(0, 20)}…` : a.title,
      size: Math.max(a.amountCop, 1),
      kind: a.kind,
      severity: a.severity,
      idx: i,
      fill:
        a.severity === "alto"
          ? "color-mix(in srgb, var(--color-accent-danger) 82%, var(--color-surface))"
          : a.severity === "medio"
            ? "color-mix(in srgb, var(--color-accent-finance) 75%, var(--color-surface))"
            : "color-mix(in srgb, var(--color-accent-health) 55%, var(--color-surface))",
    }))
  }, [strategicAlerts])

  const drillTx = (opts: { category: string; subcategory?: string }) => {
    const p = new URLSearchParams()
    p.set("month", month)
    p.set("category", opts.category)
    if (opts.subcategory) p.set("subcategory", opts.subcategory)
    p.set("tipo", "gasto")
    router.push(`/finanzas/transactions?${p.toString()}`)
  }

  const growthChartData = useMemo(() => {
    if (!growthRows.length) return []
    return growthRows.slice(0, 10).map((r) => ({
      name: r.category.length > 14 ? `${r.category.slice(0, 12)}…` : r.category,
      fullName: r.category,
      mom: r.momPct ?? 0,
      monto: r.expenseCurrent,
      severity: r.severity,
    }))
  }, [growthRows])

  const netChartData = useMemo(() => {
    if (!data) return []
    const lift = originScenario?.monthlyCop ?? 0
    return data.netForecast.map((row) => ({
      label: row.month,
      net: row.net,
      netIfOriginFix: row.isProjected ? row.net + lift : row.net,
      projected: Boolean(row.isProjected),
    }))
  }, [data, originScenario])

  /** Dominio ajustado al máximo real para que las curvas no queden planas. */
  const categoryTrendSpendYDomain = useMemo(() => {
    const trend = data?.topOperativeCategoryTrend
    if (!trend?.points.length) return [0, 1] as const
    let max = 0
    for (const row of trend.points) {
      for (const k of trend.keys) {
        const v = Number(row[k.key as keyof typeof row])
        if (Number.isFinite(v) && v > max) max = v
      }
    }
    if (max <= 0) return [0, 1] as const
    const pad = Math.max(max * 0.07, 2500)
    return [0, max + pad] as const
  }, [data])

  if (!finance || !month) {
    return (
      <div className="rounded-xl border border-orbita-border/60 bg-orbita-surface-alt/40 px-4 py-8 text-center text-sm text-orbita-secondary">
        Selecciona un mes en la parte superior de Finanzas para ver este análisis.
      </div>
    )
  }

  if (loading && !data) {
    return (
      <div className="rounded-xl border border-orbita-border/60 bg-orbita-surface-alt/30 px-4 py-12 text-center text-sm text-orbita-secondary">
        Armando tu vista… un momento.
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="rounded-xl border px-4 py-4 text-sm"
        style={{
          borderColor: "color-mix(in srgb, var(--color-accent-danger) 35%, var(--color-border))",
          background: "color-mix(in srgb, var(--color-accent-danger) 8%, var(--color-surface))",
          color: "var(--color-accent-danger)",
        }}
      >
        {error}
      </div>
    )
  }

  if (!data) {
    return (
      <div className="rounded-xl border border-orbita-border/60 bg-orbita-surface-alt/40 px-4 py-8 text-center text-sm text-orbita-secondary">
        {notice ?? "Todavía no hay información suficiente para este mes."}
      </div>
    )
  }

  const alertPct = data.params.momAlertPct

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {notice ? (
        <div className="flex justify-center">
          <span className={financeNoticeChipClass}>{notice}</span>
        </div>
      ) : null}

      {data.topOperativeCategoryTrend.keys.length > 0 &&
      data.topOperativeCategoryTrend.points.length > 0 ? (
        <Card
          hover
          className={cn(
            "overflow-hidden p-0",
            "ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_22%,transparent)]",
            "shadow-[var(--shadow-card)]",
          )}
        >
          <div
            className={cn(
              "relative overflow-hidden border-b border-[color-mix(in_srgb,var(--color-border)_48%,transparent)]",
              "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--color-accent-finance)_15%,var(--color-surface))_0%,var(--color-surface)_44%,color-mix(in_srgb,var(--color-accent-health)_11%,var(--color-surface))_100%)]",
            )}
          >
            <div
              className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-finance)_17%,transparent)_0%,transparent_70%)]"
              aria-hidden
            />
            <div className="relative flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:px-5 sm:py-4">
              <div className="flex min-w-0 flex-1 gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-surface)_56%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_6%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_28%,transparent)]">
                  <PieChartGlyph
                    className="h-[22px] w-[22px] text-[color-mix(in_srgb,var(--color-accent-finance)_88%,var(--color-text-primary))]"
                    strokeWidth={2}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className={financeCardMicroLabelClass}>Misión · peso por categoría</p>
                  <h3 className="mt-0.5 text-[16px] font-bold leading-snug tracking-tight text-orbita-primary sm:text-[17px]">
                    Dónde se concentra el gasto
                  </h3>
                  <p
                    className={cn(
                      financeSectionIntroClass,
                      "mt-1 text-[11px] leading-snug text-orbita-secondary",
                      financeMissionHeroIntroMeasureClass,
                    )}
                  >
                    Top categorías operativas en la ventana (sin inversiones ni módulo finanzas).{" "}
                    <span className="font-medium text-orbita-primary">Curvas en COP por mes</span> (eje k/M como Capital). Abajo,
                    la tabla de participación % viene colapsada: ábrela para el detalle.
                  </p>
                </div>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[color-mix(in_srgb,var(--color-accent-finance)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-finance)_11%,var(--color-surface))] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-orbita-primary shadow-sm sm:self-center">
                <Target className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--color-accent-finance)_75%,var(--color-text-primary))]" aria-hidden />
                Top 5
              </span>
            </div>
          </div>
          <div className="border-t border-[color-mix(in_srgb,var(--color-border)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-text-primary)_2%,var(--color-surface))] px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
            <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_94%,var(--color-surface-alt))] p-2 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] sm:p-2.5">
              <div className="h-64 w-full sm:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.topOperativeCategoryTrend.points}
                    margin={{ top: 10, right: 10, left: 4, bottom: 6 }}
                  >
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.85} vertical={false} />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                      stroke="var(--color-border)"
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                      stroke="var(--color-border)"
                      width={52}
                      domain={categoryTrendSpendYDomain}
                      tickFormatter={(v) => formatCompactCop(Number(v))}
                    />
                    <Tooltip
                      contentStyle={rechartsTooltipContentStyle}
                      formatter={(value, name, item) => {
                        const v = typeof value === "number" ? value : Number(value)
                        const label = typeof name === "string" ? name : String(name)
                        const dataKey = item && typeof item === "object" && "dataKey" in item ? item.dataKey : undefined
                        const payload =
                          item && typeof item === "object" && "payload" in item
                            ? (item.payload as { monthKey?: string } | undefined)
                            : undefined
                        const mk = payload?.monthKey
                        const shareRow =
                          typeof dataKey === "string" && mk
                            ? data.topOperativeCategoryTrend.pointsShare.find((r) => r.monthKey === mk)
                            : undefined
                        const pct =
                          typeof dataKey === "string" && shareRow
                            ? Number((shareRow as Record<string, number | string>)[dataKey]) || 0
                            : 0
                        return [
                          `${Number.isFinite(v) ? `$${formatCop(v)}` : "—"}${
                            Number.isFinite(pct) ? ` · ${pct.toFixed(1)}% del gasto del mes` : ""
                          }`,
                          label,
                        ]
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />
                    {data.topOperativeCategoryTrend.keys.map((k, i) => (
                      <Line
                        key={k.key}
                        type="monotone"
                        dataKey={k.key}
                        name={k.label}
                        stroke={PIE_COLORS[i % PIE_COLORS.length]}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 1, stroke: "var(--color-surface)" }}
                        isAnimationActive={false}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
          <details className="group border-t border-[color-mix(in_srgb,var(--color-border)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_18%,var(--color-surface))]">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] sm:items-center sm:px-5 [&::-webkit-details-marker]:hidden">
              <div className="flex min-w-0 flex-1 gap-2.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-accent-finance)_12%,var(--color-surface))] ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_22%,transparent)]">
                  <Table
                    className="h-4 w-4 text-[color-mix(in_srgb,var(--color-accent-finance)_72%,var(--color-text-secondary))]"
                    aria-hidden
                  />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold leading-snug text-orbita-primary">
                    Participación por categoría (% del gasto operativo)
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-orbita-secondary">
                    Peso en el mes en foco y oscilación en el periodo del gráfico. Pulsa para expandir la tabla.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 self-start sm:self-center">
                <span className="rounded-full border border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] bg-orbita-surface/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orbita-secondary">
                  Tabla
                </span>
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-orbita-secondary transition-transform duration-200 group-open:rotate-180"
                  aria-hidden
                />
              </div>
            </summary>
            <div className="overflow-x-auto px-3 pb-3 pt-0 sm:px-5">
              <table className="w-full min-w-[560px] border-collapse text-left text-[11px]">
                <thead>
                  <tr className={variableMissionTableHeadRowClass}>
                    <th className="px-2 py-2 font-semibold sm:px-3">Categoría</th>
                    <th
                      className="max-w-[7rem] px-2 py-2 text-right text-[10px] font-semibold leading-tight sm:max-w-none sm:px-3 sm:text-[11px]"
                      title="Porcentaje del gasto operativo total del mes seleccionado en el selector (el mismo mes que ves en el resto de la vista)."
                    >
                      <span className="block sm:inline">% gasto</span>
                      <span className="block text-[9px] font-normal normal-case tracking-normal text-orbita-secondary sm:inline sm:text-[10px]">
                        {" "}
                        · mes en foco
                      </span>
                    </th>
                    <th
                      className="max-w-[7rem] px-2 py-2 text-right text-[10px] font-semibold leading-tight sm:max-w-none sm:px-3 sm:text-[11px]"
                      title="Menor participación % de esta categoría en los meses incluidos en el gráfico de arriba."
                    >
                      <span className="block sm:inline">Mín. %</span>
                      <span className="block text-[9px] font-normal normal-case tracking-normal text-orbita-secondary sm:inline sm:text-[10px]">
                        {" "}
                        en el periodo
                      </span>
                    </th>
                    <th
                      className="max-w-[7rem] px-2 py-2 text-right text-[10px] font-semibold leading-tight sm:max-w-none sm:px-3 sm:text-[11px]"
                      title="Mayor participación % de esta categoría en los mismos meses del gráfico."
                    >
                      <span className="block sm:inline">Máx. %</span>
                      <span className="block text-[9px] font-normal normal-case tracking-normal text-orbita-secondary sm:inline sm:text-[10px]">
                        {" "}
                        en el periodo
                      </span>
                    </th>
                    <th
                      className="max-w-[6.5rem] px-2 py-2 text-right text-[10px] font-semibold leading-tight sm:max-w-none sm:px-3 sm:text-[11px]"
                      title="Diferencia entre máximo y mínimo en puntos porcentuales (p.p.): cuánto ‘baila’ el peso de la categoría."
                    >
                      <span className="block sm:inline">Oscilación</span>
                      <span className="block text-[9px] font-normal normal-case tracking-normal text-orbita-secondary sm:inline sm:text-[10px]">
                        {" "}
                        (p. p.)
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.topOperativeCategoryTrend.trendShareSummary.map((row, idx) => (
                    <tr key={row.label} className="border-b border-orbita-border/40">
                      <td className="flex items-center gap-2 px-2 py-1.5 font-medium text-orbita-primary sm:px-3">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                          aria-hidden
                        />
                        {row.label}
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-orbita-primary sm:px-3">
                        {row.shareAnchorPct.toFixed(1)}%
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-orbita-secondary sm:px-3">
                        {row.minPct.toFixed(1)}%
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-orbita-secondary sm:px-3">
                        {row.maxPct.toFixed(1)}%
                      </td>
                      <td className="px-2 py-1.5 text-right tabular-nums text-orbita-secondary sm:px-3">
                        {row.rangePp.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Card>
      ) : null}

      {mode === "predictiva" && data.weekdayOperativeInsights.length > 0 ? (
        <WeekdayInsightsSection insights={data.weekdayOperativeInsights} />
      ) : null}

      {mode === "estrategica" ? (
        <div className="min-w-0 space-y-7 sm:space-y-9">
          <div className="min-w-0 space-y-5 sm:space-y-6">
            {data.fixedStructuralGuidance ? (
              <Card
                hover
                className={cn(
                  "overflow-hidden p-0",
                  "ring-1 ring-[color-mix(in_srgb,var(--color-accent-health)_26%,transparent)]",
                  "shadow-[var(--shadow-card)]",
                )}
              >
                <div
                  className={cn(
                    "relative overflow-hidden border-b border-[color-mix(in_srgb,var(--color-border)_48%,transparent)]",
                    "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--color-accent-health)_18%,var(--color-surface))_0%,var(--color-surface)_38%,color-mix(in_srgb,var(--color-accent-finance)_9%,var(--color-surface))_100%)]",
                  )}
                >
                  <div
                    className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-health)_22%,transparent)_0%,transparent_70%)]"
                    aria-hidden
                  />
                  <div className="relative flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-3.5">
                    <div className="flex min-w-0 flex-1 gap-2.5 sm:gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-surface)_58%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_6%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-health)_28%,transparent)]">
                        <Landmark
                          className="h-[22px] w-[22px] text-[color-mix(in_srgb,var(--color-accent-health)_88%,var(--color-text-primary))]"
                          strokeWidth={2}
                          aria-hidden
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={financeCardMicroLabelClass}>Checkpoint · antes del gasto variable</p>
                        <h3 className="mt-0.5 text-[15px] font-bold leading-snug tracking-tight text-orbita-primary sm:text-base">
                          {data.fixedStructuralGuidance.headline}
                        </h3>
                        <p
                          className={cn(
                            financeSectionIntroClass,
                            "mt-1 text-[11px] leading-snug text-orbita-secondary",
                            financeMissionHeroIntroMeasureClass,
                          )}
                        >
                          Obligaciones vs ingreso: espacio libre para variable e imprevistos.
                        </p>
                      </div>
                    </div>
                    <p className="max-w-full shrink-0 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_35%,transparent)] px-2.5 py-1.5 text-[10px] font-medium leading-snug text-orbita-primary sm:max-w-[14rem] sm:text-right">
                      <span className="mr-1 font-bold uppercase tracking-wide text-orbita-secondary">Regla · </span>
                      Fijos altos = menos oxígeno para hábitos y emergencias.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 px-4 py-3 sm:space-y-3 sm:px-5 sm:py-4">
                  {data.fixedStructuralGuidance.ratioFixedToIncome != null ? (
                    (() => {
                      const ratio = data.fixedStructuralGuidance.ratioFixedToIncome
                      const zone = fixedIncomeLoadZoneUi(ratio)
                      const ZoneIcon = zone.Icon
                      const pct = Math.min(100, Math.round(ratio * 100))
                      return (
                        <div className="border-b border-orbita-border/35 pb-3">
                          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em]",
                                zone.chipClass,
                              )}
                            >
                              <ZoneIcon className="h-3 w-3 shrink-0" aria-hidden />
                              {zone.badge}
                            </span>
                            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">
                              Fijos / ingreso
                            </span>
                          </div>
                          <p className="mt-1.5 text-[10px] leading-snug text-orbita-muted">{zone.hint}</p>
                          <div className="mt-2 flex items-center gap-2 sm:gap-2.5">
                            <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-orbita-border/35">
                              <div
                                className={cn("h-full rounded-full", zone.barClass)}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span
                              className={cn(
                                "w-10 shrink-0 text-right text-[13px] font-bold tabular-nums sm:w-11",
                                zone.pctClass,
                              )}
                            >
                              {pct}%
                            </span>
                          </div>
                        </div>
                      )
                    })()
                  ) : null}

                  <div className="flex gap-2.5 border-b border-orbita-border/35 pb-3 sm:gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface-alt))] ring-1 ring-[color-mix(in_srgb,var(--color-accent-health)_22%,transparent)]">
                      <Stethoscope
                        className="h-4 w-4 text-[color-mix(in_srgb,var(--color-accent-health)_88%,var(--color-text-primary))]"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0 flex-1 pt-px">
                      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">
                        Diagnóstico express
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium leading-relaxed text-orbita-primary sm:text-[12px]">
                        {data.fixedStructuralGuidance.diagnosis}
                      </p>
                    </div>
                  </div>

                  {data.fixedStructuralGuidance.actions.length > 0 ? (
                    <div className="space-y-1.5">
                      {(() => {
                        const fg = data.fixedStructuralGuidance
                        if (!fg) return null
                        const several = fg.actions.length > 1
                        return fg.actions.map((line, i) => (
                          <div key={i} className="flex gap-2.5 rounded-lg py-1 sm:gap-3">
                            <span
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-accent-finance)_12%,var(--color-surface-alt))] ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_20%,transparent)]"
                              aria-hidden
                            >
                              <Lightbulb className="h-3.5 w-3.5 text-amber-600/95 dark:text-amber-400/95" strokeWidth={2} />
                            </span>
                            <div className="min-w-0 flex-1 border-l border-orbita-border/40 pl-2.5">
                              <p className="text-[9px] font-semibold uppercase tracking-[0.1em] text-orbita-secondary">
                                {several ? `Paso ${i + 1}` : "Siguiente paso"}
                              </p>
                              <p className="mt-0.5 text-[11px] leading-relaxed text-orbita-primary sm:text-[12px]">{line}</p>
                            </div>
                          </div>
                        ))
                      })()}
                    </div>
                  ) : null}
                </div>
              </Card>
            ) : null}

            <div className="min-w-0 space-y-2 border-0 bg-transparent px-0 py-0">
              <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-orbita-primary sm:text-base">
                ¿Tus hábitos se relacionan con tus gastos no planeados?
              </h3>
              <p className={cn(financeSectionIntroClass, "!mt-0 text-orbita-secondary")}>
                Los fijos ya los revisaste arriba. Aquí va lo que sí mueves con rutina y decisiones cotidianas; ajustar el
                hábito suele rendir más que solo recortar el rubro.
              </p>
            </div>

            {data.weekdayOperativeInsights.length > 0 ? (
              <WeekdayInsightsSection insights={data.weekdayOperativeInsights} />
            ) : null}

            <Card
              hover
              className={cn(
                "overflow-hidden p-0",
                "ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_22%,transparent)]",
                "shadow-[var(--shadow-card)]",
              )}
            >
              <div
                className={cn(
                  "relative overflow-hidden border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)]",
                  "bg-[linear-gradient(135deg,color-mix(in_srgb,var(--color-accent-finance)_14%,var(--color-surface))_0%,var(--color-surface)_42%,color-mix(in_srgb,var(--color-accent-health)_10%,var(--color-surface))_100%)]",
                )}
              >
                <div
                  className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-finance)_18%,transparent)_0%,transparent_68%)]"
                  aria-hidden
                />
                <div className="relative flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:px-5 sm:py-5">
                  <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-surface)_55%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_6%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_28%,transparent)]">
                      <Zap
                        className="h-6 w-6 text-[color-mix(in_srgb,var(--color-accent-finance)_88%,var(--color-text-primary))]"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={financeCardMicroLabelClass}>Misión · gasto variable</p>
                      <h3 className="mt-1 text-[17px] font-bold leading-tight tracking-tight text-orbita-primary sm:text-lg">
                        Qué acelera mes a mes
                      </h3>
                      <p
                        className={cn(
                          financeSectionIntroClass,
                          "mt-1.5 text-orbita-secondary",
                          financeMissionHeroIntroMeasureClass,
                        )}
                      >
                        Cada fila es una palanca tuya: ritmo (MoM), contexto (año) y lectura operativa + hábito. Prioriza
                        primero lo marcado en{" "}
                        <span className="font-medium text-orbita-primary">Prioridad</span>, luego{" "}
                        <span className="font-medium text-orbita-primary">Radar</span>.
                      </p>
                    </div>
                  </div>
                  {variableGrowthMissionStats.total > 0 ? (
                    <div className="flex flex-wrap gap-2 sm:max-w-[20rem] sm:justify-end">
                      {variableGrowthMissionStats.alert > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-accent-danger)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-danger)_10%,var(--color-surface))] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--color-accent-danger)_90%,var(--color-text-primary))] shadow-sm">
                          <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {variableGrowthMissionStats.alert}{" "}
                          {variableGrowthMissionStats.alert === 1 ? "prioridad" : "prioridades"}
                        </span>
                      ) : null}
                      {variableGrowthMissionStats.watch > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-accent-finance)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-finance)_10%,var(--color-surface))] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--color-accent-finance)_88%,var(--color-text-primary))] shadow-sm">
                          <Target className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {variableGrowthMissionStats.watch} en radar
                        </span>
                      ) : null}
                      {variableGrowthMissionStats.ok > 0 ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-accent-health)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_10%,var(--color-surface))] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-[color-mix(in_srgb,var(--color-accent-health)_88%,var(--color-text-primary))] shadow-sm">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {variableGrowthMissionStats.ok}{" "}
                          {variableGrowthMissionStats.ok === 1 ? "estable" : "estables"}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="border-t border-[color-mix(in_srgb,var(--color-border)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-text-primary)_2.5%,var(--color-surface))]">
                <div className="px-4 pb-1 pt-3 sm:px-5 sm:pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orbita-secondary">
                    Tablero de categorías
                  </p>
                  <p
                    className={cn(
                      "mt-1 w-full text-[11px] leading-snug text-orbita-muted",
                      financeMissionHeroIntroMeasureClass,
                    )}
                  >
                    Gasto del mes, ritmo de cambio y lecturas para afinar hábitos.{" "}
                    <span className="font-medium text-orbita-secondary">
                      Los acentos de fila repiten el nivel de la primera columna
                    </span>{" "}
                    (prioridad · radar · estable).
                  </p>
                </div>
                <div className="overflow-x-auto px-2 pb-3 sm:px-4 sm:pb-4">
                <table className="w-full min-w-[760px] border-collapse text-left text-[11px]">
                  <thead>
                    <tr className={variableMissionTableHeadRowClass}>
                      <th className="px-2 py-2 font-semibold sm:px-3">Estado</th>
                      <th className="px-2 py-2 font-semibold sm:px-3">Categoría</th>
                      <th className="px-2 py-2 text-right font-semibold sm:px-3">Gasto mes</th>
                      <th className="px-2 py-2 text-right font-semibold sm:px-3" title="Variación vs mes anterior">
                        Δ Mes
                      </th>
                      <th className="px-2 py-2 text-right font-semibold sm:px-3" title="Variación vs mismo mes año anterior">
                        Δ Año
                      </th>
                      <th className="px-2 py-2 text-right font-semibold sm:px-3" title="Proyección ~3 meses (orden de magnitud)">
                        ~3 meses
                      </th>
                      <th className="min-w-[12rem] px-2 py-2 font-semibold sm:px-3">Ideas para ajustar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {growthRows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-10 text-center text-[11px] leading-relaxed text-orbita-secondary">
                          No hay categorías variables con gasto este mes para comparar con el mes anterior. Cuando haya
                          movimiento, verás aquí el tablero con niveles y lecturas.
                        </td>
                      </tr>
                    ) : (
                      growthRows.slice(0, 18).map((r) => {
                        const sev = growthMissionSeverityUi(r.severity)
                        const SevIcon = sev.Icon
                        return (
                          <tr
                            key={r.category}
                            className={cn(
                              "border-b border-orbita-border/40 transition-colors hover:bg-[color-mix(in_srgb,var(--color-text-primary)_3.5%,transparent)]",
                              sev.rowClass,
                            )}
                          >
                            <td className="whitespace-nowrap px-2 py-2.5 align-middle sm:px-3">
                              <span
                                className={cn(
                                  "inline-flex min-w-[5.75rem] justify-center items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide",
                                  sev.chipClass,
                                )}
                              >
                                <SevIcon className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
                                {sev.label}
                              </span>
                            </td>
                            <td className="max-w-[11rem] align-middle px-2 py-2.5 sm:max-w-[13rem] sm:px-3">
                              <div className="flex flex-col items-center text-center">
                                <div className="text-[12px] font-semibold leading-snug text-orbita-primary">{r.category}</div>
                                <button
                                  type="button"
                                  onClick={() => drillTx({ category: r.category })}
                                  className="mt-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-orbita-secondary underline-offset-2 transition-colors hover:bg-orbita-surface-alt/80 hover:text-[var(--color-accent-finance)] hover:underline"
                                >
                                  Ver movimientos
                                </button>
                              </div>
                            </td>
                            <td className="px-2 py-2.5 text-right align-middle tabular-nums text-[11px] font-medium text-orbita-primary sm:px-3">
                              ${formatCop(r.expenseCurrent)}
                            </td>
                            <td
                              className={`px-2 py-2.5 text-right align-middle tabular-nums text-[11px] sm:px-3 ${momTone(r.momPct, alertPct)}`}
                            >
                              {r.momPct == null ? "—" : `${r.momPct >= 0 ? "+" : ""}${r.momPct.toFixed(1)}%`}
                            </td>
                            <td className="px-2 py-2.5 text-right align-middle tabular-nums text-[11px] text-orbita-secondary sm:px-3">
                              {r.yoyPct == null ? "—" : `${r.yoyPct >= 0 ? "+" : ""}${r.yoyPct.toFixed(1)}%`}
                            </td>
                            <td className="px-2 py-2.5 text-right align-middle tabular-nums text-[11px] text-orbita-secondary sm:px-3">
                              ${formatCop(r.forecastNext3[2] ?? 0)}
                            </td>
                            <td
                              className="max-w-[20rem] px-2 py-2.5 align-top sm:max-w-[24rem] sm:px-3"
                              title={[r.operationalLine, r.habitEcho].filter(Boolean).join(" ")}
                            >
                              <div className="space-y-2 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_40%,var(--color-surface))] p-2.5 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_4%,transparent)]">
                                {r.operationalLine ? (
                                  <div className="flex gap-2">
                                    <Activity
                                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent-finance)]"
                                      strokeWidth={2}
                                      aria-hidden
                                    />
                                    <p className="text-[11px] leading-snug text-orbita-primary">{r.operationalLine}</p>
                                  </div>
                                ) : null}
                                {r.habitEcho ? (
                                  <div className="flex gap-2 border-t border-orbita-border/40 pt-2">
                                    <Sparkles
                                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent-health)]"
                                      strokeWidth={2}
                                      aria-hidden
                                    />
                                    <p className="text-[11px] leading-snug text-orbita-secondary">{r.habitEcho}</p>
                                  </div>
                                ) : null}
                                {!r.operationalLine && !r.habitEcho ? (
                                  <p className="text-[11px] leading-snug text-orbita-muted">Sin lectura automática aún.</p>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
                </div>
              </div>

              <div
                className={cn(
                  "border-t border-[color-mix(in_srgb,var(--color-border)_42%,transparent)]",
                  "bg-[linear-gradient(165deg,color-mix(in_srgb,var(--color-accent-finance)_12%,var(--color-surface))_0%,color-mix(in_srgb,var(--color-surface-alt)_26%,var(--color-surface))_52%,var(--color-surface)_100%)]",
                )}
              >
                <div className="relative px-4 pb-2 pt-4 sm:px-5 sm:pt-5">
                  <div
                    className="pointer-events-none absolute right-0 top-0 h-32 w-40 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-health)_14%,transparent)_0%,transparent_72%)]"
                    aria-hidden
                  />
                  <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
                    <div className="flex min-w-0 flex-1 gap-3 sm:gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-surface)_58%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_5%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_26%,transparent)]">
                        <TrendingUp
                          className="h-5 w-5 text-[color-mix(in_srgb,var(--color-accent-finance)_85%,var(--color-text-primary))]"
                          strokeWidth={2}
                          aria-hidden
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={financeCardMicroLabelClass}>Mapa de ritmo · mismo código de color</p>
                        <p className="mt-0.5 text-[13px] font-semibold leading-snug text-orbita-primary">
                          Variación vs mes anterior (MoM %)
                        </p>
                        <p className="mt-2 w-full max-w-[min(100%,42rem)] text-[11px] leading-relaxed text-orbita-secondary [text-wrap:pretty]">
                          La altura de cada barra es el cambio porcentual del gasto respecto al mes pasado en esa categoría.
                          Los colores coinciden con los chips de{" "}
                          <span className="font-medium text-orbita-primary">Estado</span> arriba: así ves de un vistazo qué rubro
                          acelera y con qué nivel de alerta.
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 lg:max-w-[17rem] lg:justify-end">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-accent-danger)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-danger)_8%,var(--color-surface))] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.06em] text-orbita-primary shadow-sm">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent-danger)]" aria-hidden />
                        Prioridad
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-accent-finance)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-finance)_9%,var(--color-surface))] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.06em] text-orbita-primary shadow-sm">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-accent-finance)_72%,var(--color-accent-danger))]" aria-hidden />
                        Radar
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-accent-health)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_10%,var(--color-surface))] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.06em] text-orbita-primary shadow-sm">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent-health)]" aria-hidden />
                        Estable
                      </span>
                    </div>
                  </div>
                </div>
                <div className="px-4 pb-4 pt-0 sm:px-5 sm:pb-5">
                  <div className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_92%,var(--color-surface-alt))] p-2 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] sm:p-2.5">
                <div className="h-56 w-full sm:h-64">
                  {growthChartData.length === 0 ? (
                    <div className="flex h-full min-h-[12rem] items-center justify-center rounded-xl border border-dashed border-[color-mix(in_srgb,var(--color-accent-finance)_28%,transparent)] bg-[color-mix(in_srgb,var(--color-text-primary)_3%,var(--color-surface))] px-4 text-center text-[11px] leading-relaxed text-orbita-secondary">
                      Cuando haya variación en categorías variables, aquí verás barras con el mismo código de color que la
                      tabla (prioridad · radar · estable).
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={growthChartData} margin={{ top: 10, right: 10, left: 0, bottom: 4 }}>
                        <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.55} vertical={false} />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                          stroke="var(--color-border)"
                          interval={0}
                          angle={-16}
                          textAnchor="end"
                          height={54}
                        />
                        <YAxis
                          tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }}
                          stroke="var(--color-border)"
                          tickFormatter={(v) => `${v}%`}
                          width={38}
                        />
                        <Tooltip
                          contentStyle={rechartsTooltipContentStyle}
                          formatter={(value, _n, p) => {
                            const v = typeof value === "number" ? value : Number(value)
                            const monto = (p?.payload as { monto?: number } | undefined)?.monto ?? 0
                            return [
                              `${Number.isFinite(v) ? v.toFixed(1) : "—"}% MoM · $${formatCop(monto)} gasto mes`,
                              "Ritmo",
                            ]
                          }}
                        />
                        <Bar dataKey="mom" name="MoM %" radius={[6, 6, 0, 0]} maxBarSize={44}>
                          {growthChartData.map((entry, i) => (
                            <Cell
                              key={i}
                              fill={
                                entry.severity === "alert"
                                  ? "var(--color-accent-danger)"
                                  : entry.severity === "watch"
                                    ? "color-mix(in srgb, var(--color-accent-finance) 72%, var(--color-accent-danger))"
                                    : "var(--color-accent-health)"
                              }
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card
              hover
              className={cn(
                "overflow-hidden p-0",
                "ring-1 ring-[color-mix(in_srgb,var(--color-accent-danger)_26%,transparent)]",
                "shadow-[var(--shadow-card)]",
              )}
            >
              <div
                className={cn(
                  "relative overflow-hidden border-b border-[color-mix(in_srgb,var(--color-border)_48%,transparent)]",
                  "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--color-accent-danger)_12%,var(--color-surface))_0%,var(--color-surface)_42%,color-mix(in_srgb,var(--color-accent-finance)_10%,var(--color-surface))_100%)]",
                )}
              >
                <div
                  className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-danger)_18%,transparent)_0%,transparent_70%)]"
                  aria-hidden
                />
                <div className="relative flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:px-5 sm:py-4">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-surface)_56%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_6%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-danger)_32%,transparent)]">
                      <AlertTriangle
                        className="h-[22px] w-[22px] text-[color-mix(in_srgb,var(--color-accent-danger)_88%,var(--color-text-primary))]"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={financeCardMicroLabelClass}>Misión · radar de alertas</p>
                      <h3 className="mt-0.5 text-[16px] font-bold leading-snug tracking-tight text-orbita-primary sm:text-[17px]">
                        Alertas que conviene revisar
                      </h3>
                      <p
                        className={cn(
                          financeSectionIntroClass,
                          "mt-1 text-[11px] leading-snug text-orbita-secondary",
                          financeMissionHeroIntroMeasureClass,
                        )}
                      >
                        Incluye gasto hormiga (mucho gasto chico), presión contra tus topes y rubros que crecen fuerte.{" "}
                        <span className="font-medium text-orbita-primary">Los montos priorizan tu lista</span>; carga presupuestos en
                        la vista Operativa para activar más avisos.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[color-mix(in_srgb,var(--color-accent-danger)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-danger)_10%,var(--color-surface))] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-orbita-primary shadow-sm sm:self-center">
                    {strategicAlerts.length > 0 ? (
                      <>
                        <Zap
                          className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--color-accent-danger)_85%,var(--color-text-primary))]"
                          aria-hidden
                        />
                        {strategicAlerts.length} activas
                      </>
                    ) : (
                      <>
                        <CheckCircle2
                          className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--color-accent-health)_80%,var(--color-text-primary))]"
                          aria-hidden
                        />
                        Todo claro
                      </>
                    )}
                  </span>
                </div>
              </div>
              <div className="border-t border-[color-mix(in_srgb,var(--color-border)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-text-primary)_2%,var(--color-surface))] px-3 pb-3 pt-3 sm:px-4">
                <div className="overflow-x-auto rounded-xl border border-[color-mix(in_srgb,var(--color-border)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_96%,var(--color-surface-alt))] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_4%,transparent)]">
                  <table className="w-full min-w-[880px] border-collapse text-left text-[11px]">
                    <thead>
                      <tr className={alertMissionTableHeadRowClass}>
                        <th className="px-2 py-2 font-semibold sm:px-3">Tipo</th>
                        <th className="px-2 py-2 font-semibold sm:px-3">Qué es</th>
                        <th className="px-2 py-2 text-right font-semibold sm:px-3">Monto</th>
                        <th className="px-2 py-2 text-right font-semibold sm:px-3">% del total</th>
                        <th className="px-2 py-2 text-right font-semibold sm:px-3">Frec.</th>
                        <th className="px-2 py-2 text-right font-semibold sm:px-3">Tend.</th>
                        <th className="px-2 py-2 text-right font-semibold sm:px-3">Impacto / mes</th>
                        <th className="min-w-[10rem] px-2 py-2 font-semibold sm:px-3">Posible causa</th>
                      </tr>
                    </thead>
                    <tbody>
                      {strategicAlerts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-3 py-4 text-center text-orbita-secondary">
                            Por ahora no hay alertas con estos datos. Define topes en Presupuestos (vista Operativa) para ver
                            avisos de desvío.
                          </td>
                        </tr>
                      ) : (
                        strategicAlerts.slice(0, 24).map((a) => (
                          <tr key={a.id} className={`border-b border-orbita-border/40 ${alertSeverityRowClass(a.severity)}`}>
                            <td className="whitespace-nowrap px-2 py-1.5 text-orbita-secondary sm:px-3">
                              {alertKindLabel(a.kind)}
                            </td>
                            <td className="max-w-[16rem] px-2 py-1.5 sm:max-w-[20rem] sm:px-3">
                              <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
                                <span className="font-medium text-orbita-primary">{a.title}</span>
                                {a.subtitle ? (
                                  <span className="mt-0.5 block text-[10px] text-orbita-secondary">{a.subtitle}</span>
                                ) : null}
                                {a.ctaHref ? (
                                  <Link
                                    href={a.ctaHref}
                                    className="mt-1.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium normal-case tracking-normal text-orbita-secondary underline-offset-2 transition-colors hover:bg-orbita-surface-alt/80 hover:text-[var(--color-accent-finance)] hover:underline"
                                  >
                                    {a.ctaLabel ?? "Ver movimientos"}
                                  </Link>
                                ) : null}
                              </div>
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums sm:px-3">${formatCop(a.amountCop)}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-orbita-secondary sm:px-3">
                              {a.sharePct != null ? `${a.sharePct.toFixed(1)}%` : "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums text-orbita-secondary sm:px-3">
                              {a.frequency ?? "—"}
                            </td>
                            <td className="px-2 py-1.5 text-right text-orbita-secondary sm:px-3">{a.trend ?? "—"}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums font-medium text-orbita-primary sm:px-3">
                              ${formatCop(a.impactMonthlyCop)}
                            </td>
                            <td className="max-w-[14rem] px-2 py-1.5 text-orbita-secondary sm:px-3" title={a.operationalCause}>
                              <span className="line-clamp-3">{a.operationalCause}</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="border-t border-[color-mix(in_srgb,var(--color-border)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_14%,var(--color-surface))] px-3 pb-3 pt-3 sm:px-4">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold leading-snug text-orbita-primary">Mapa de impacto relativo</p>
                    <p className="mt-0.5 text-[10px] leading-snug text-orbita-secondary">
                      Tamaño ≈ monto asociado a cada tipo de alerta: prioriza donde ocupa más espacio.
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] bg-orbita-surface/90 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-orbita-secondary">
                    Treemap
                  </span>
                </div>
                <div className="-mx-1 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_94%,var(--color-surface-alt))] p-0 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] sm:mx-0 sm:p-1">
                  <div className="h-[min(22rem,52vh)] w-full min-h-[14rem] sm:h-64">
                    {alertTreemapData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <Treemap
                          data={alertTreemapData}
                          dataKey="size"
                          aspectRatio={16 / 9}
                          stroke="var(--color-border)"
                          isAnimationActive={false}
                        >
                          <Tooltip
                            contentStyle={rechartsTooltipContentStyle}
                            formatter={(value, _n, item) => {
                              const v = typeof value === "number" ? value : Number(value)
                              const payload = item && typeof item === "object" && "payload" in item ? item.payload : null
                              const k =
                                payload && typeof payload === "object" && payload !== null && "kind" in payload
                                  ? (payload as { kind?: StrategicAlertRow["kind"] }).kind
                                  : undefined
                              return [`$${formatCop(Number.isFinite(v) ? v : 0)}`, k ? alertKindLabel(k) : "Monto"]
                            }}
                          />
                        </Treemap>
                      </ResponsiveContainer>
                    ) : (
                      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[color-mix(in_srgb,var(--color-accent-danger)_22%,transparent)] bg-[color-mix(in_srgb,var(--color-text-primary)_3%,var(--color-surface))] px-4 text-center text-[11px] leading-relaxed text-orbita-secondary">
                        Todavía no hay datos para este mapa.
                      </div>
                    )}
                    {alertTreemapData.length > 0 ? (
                      <ul className="m-0 mt-2 list-none space-y-1 border-t border-[color-mix(in_srgb,var(--color-border)_38%,transparent)] px-2 pb-2 pt-2 text-[10px] leading-snug text-orbita-secondary sm:columns-2 sm:gap-x-4">
                        {alertTreemapData.slice(0, 10).map((d, i) => (
                          <li key={`${d.idx}-${i}`} className="break-inside-avoid">
                            <span className="font-semibold text-orbita-primary">{d.name}</span>
                            <span className="tabular-nums text-orbita-muted">
                              {" "}
                              · ${Math.round(d.size).toLocaleString("es-CO")}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>

            <Card
              hover
              className={cn(
                "overflow-hidden p-0",
                "ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_22%,transparent)]",
                "shadow-[var(--shadow-card)]",
              )}
            >
              <div
                className={cn(
                  "relative overflow-hidden border-b border-[color-mix(in_srgb,var(--color-border)_48%,transparent)]",
                  "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--color-accent-finance)_15%,var(--color-surface))_0%,var(--color-surface)_44%,color-mix(in_srgb,var(--color-accent-health)_14%,var(--color-surface))_100%)]",
                )}
              >
                <div
                  className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-health)_16%,transparent)_0%,transparent_70%)]"
                  aria-hidden
                />
                <div className="relative flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:px-5 sm:py-4">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-surface)_56%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_6%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_28%,transparent)]">
                      <Scale
                        className="h-[22px] w-[22px] text-[color-mix(in_srgb,var(--color-accent-finance)_82%,var(--color-text-primary))]"
                        strokeWidth={2}
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={financeCardMicroLabelClass}>Misión · balance salidas / entradas</p>
                      <h3 className="mt-0.5 text-[16px] font-bold leading-snug tracking-tight text-orbita-primary sm:text-[17px]">
                        Cómo se reparte el gasto y los ingresos
                      </h3>
                      <p
                        className={cn(
                          financeSectionIntroClass,
                          "mt-1 text-[11px] leading-snug text-orbita-secondary",
                          financeMissionHeroIntroMeasureClass,
                        )}
                      >
                        Porcentaje por categoría; en cada segmento verás una{" "}
                        <span className="font-medium text-orbita-primary">pista al pasar el mouse</span>. Salidas y entradas en
                        paralelo para ver el balance del mes.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[color-mix(in_srgb,var(--color-accent-health)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_11%,var(--color-surface))] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-orbita-primary shadow-sm sm:self-center">
                    <Sparkles
                      className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--color-accent-health)_75%,var(--color-text-primary))]"
                      aria-hidden
                    />
                    Doble vista
                  </span>
                </div>
              </div>
              <div className="border-t border-[color-mix(in_srgb,var(--color-border)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-text-primary)_2%,var(--color-surface))] px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
                <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_94%,var(--color-surface-alt))] p-2.5 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] sm:p-3">
                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6">
                    <div className="flex min-h-0 flex-col">
                      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-orbita-secondary">
                        <span className="inline-flex items-center justify-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent-danger)]" aria-hidden />
                          Salidas
                        </span>
                      </p>
                      <div className="h-52 min-h-[13rem] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieExpenseOp.slice(0, 10)}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={68}
                            >
                              {pieExpenseOp.slice(0, 10).map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]!} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={rechartsTooltipContentStyle}
                              formatter={(v, _n, props) => {
                                const p = props?.payload as { pct?: number; driverHint?: string; name?: string }
                                const hint = p?.driverHint ? ` — ${p.driverHint}` : ""
                                return [`$${formatCop(Number(v))} (${(p?.pct ?? 0).toFixed(1)}%)${hint}`, p?.name]
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="flex min-h-0 flex-col">
                      <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-orbita-secondary">
                        <span className="inline-flex items-center justify-center gap-2">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent-health)]" aria-hidden />
                          Entradas
                        </span>
                      </p>
                      <div className="h-52 min-h-[13rem] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieIncomeOp.slice(0, 10)}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={68}
                            >
                              {pieIncomeOp.slice(0, 10).map((_, i) => (
                                <Cell key={i} fill={PIE_COLORS[(i + 2) % PIE_COLORS.length]!} />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={rechartsTooltipContentStyle}
                              formatter={(v, _n, props) => {
                                const p = props?.payload as { pct?: number; driverHint?: string; name?: string }
                                const hint = p?.driverHint ? ` — ${p.driverHint}` : ""
                                return [`$${formatCop(Number(v))} (${(p?.pct ?? 0).toFixed(1)}%)${hint}`, p?.name]
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {enrichedInsights.length > 0 ? (
            <section
              className="min-w-0 border-t border-orbita-border/50 pt-7 sm:pt-9"
              aria-labelledby="finanzas-categorias-ideas-actuar"
            >
              <p id="finanzas-categorias-ideas-actuar" className={financeSectionEyebrowClass}>
                Ideas para actuar
              </p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {enrichedInsights.map((ins) => (
                  <InsightCard key={ins.id} insight={ins} />
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div className="min-w-0 space-y-6 sm:space-y-8 lg:space-y-9">
          <Card
            hover
            className={cn(
              "overflow-hidden p-0",
              "ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_24%,transparent)]",
              "shadow-[var(--shadow-card)]",
            )}
          >
            <div
              className={cn(
                "relative overflow-hidden border-b border-[color-mix(in_srgb,var(--color-border)_48%,transparent)]",
                "bg-[linear-gradient(130deg,color-mix(in_srgb,var(--color-accent-finance)_16%,var(--color-surface))_0%,var(--color-surface)_46%,color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface))_100%)]",
              )}
            >
              <div
                className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-finance)_20%,transparent)_0%,transparent_72%)]"
                aria-hidden
              />
              <div className="relative flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:px-5 sm:py-5">
                <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-surface)_56%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_6%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_30%,transparent)]">
                    <Sparkles
                      className="h-[22px] w-[22px] text-[color-mix(in_srgb,var(--color-accent-finance)_88%,var(--color-text-primary))]"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={financeCardMicroLabelClass}>Simulación · orden de magnitud</p>
                    <h3 className="mt-1 text-[16px] font-bold leading-snug tracking-tight text-orbita-primary sm:text-[17px]">
                      Lectura honesta del escenario
                    </h3>
                    <p
                      className={cn(
                        financeSectionIntroClass,
                        "mt-1.5 text-orbita-secondary",
                        financeMissionHeroIntroMeasureClass,
                      )}
                    >
                      La línea punteada del gráfico inferior muestra qué pasaría si aplicas un escenario sencillo: frenar lo que
                      más crece y reducir a la mitad el gasto hormiga.{" "}
                      <span className="font-medium text-orbita-primary">Es una guía, no una promesa</span> — sirve para decidir
                      por dónde empezar.
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[color-mix(in_srgb,var(--color-accent-health)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_11%,var(--color-surface))] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-orbita-primary shadow-sm sm:self-center">
                  <Activity className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--color-accent-health)_78%,var(--color-text-primary))]" aria-hidden />
                  Plan guía
                </span>
              </div>
            </div>
          </Card>

          <Card
            hover
            className={cn(
              "overflow-hidden p-0",
              "ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_22%,transparent)]",
              "shadow-[var(--shadow-card)]",
            )}
          >
            <div
              className={cn(
                "relative overflow-hidden border-b border-[color-mix(in_srgb,var(--color-border)_48%,transparent)]",
                "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--color-accent-finance)_14%,var(--color-surface))_0%,var(--color-surface)_44%,color-mix(in_srgb,var(--color-accent-health)_11%,var(--color-surface))_100%)]",
              )}
            >
              <div
                className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-health)_14%,transparent)_0%,transparent_70%)]"
                aria-hidden
              />
              <div className="relative flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:px-5 sm:py-4">
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-surface)_56%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_6%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_28%,transparent)]">
                    <TrendingUp
                      className="h-[22px] w-[22px] text-[color-mix(in_srgb,var(--color-accent-finance)_88%,var(--color-text-primary))]"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={financeCardMicroLabelClass}>Misión · trayectoria de flujo</p>
                    <h3 className="mt-0.5 text-[16px] font-bold leading-snug tracking-tight text-orbita-primary sm:text-[17px]">
                      Tu flujo: pasado reciente y una línea posible
                    </h3>
                    <p
                      className={cn(
                        financeSectionIntroClass,
                        "mt-1 text-[11px] leading-snug text-orbita-secondary",
                        financeMissionHeroIntroMeasureClass,
                      )}
                    >
                      La línea verde punteada usa el mismo horizonte pero suma el alivio del escenario. Todo lo que viene{" "}
                      <span className="font-medium text-orbita-primary">después del mes actual es proyección</span>.
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[color-mix(in_srgb,var(--color-accent-finance)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-finance)_11%,var(--color-surface))] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-orbita-primary shadow-sm sm:self-center">
                  <Target className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--color-accent-finance)_72%,var(--color-text-primary))]" aria-hidden />
                  Dos curvas
                </span>
              </div>
            </div>
            <div className="border-t border-[color-mix(in_srgb,var(--color-border)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-text-primary)_2%,var(--color-surface))] px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
              <div className="rounded-xl border border-[color-mix(in_srgb,var(--color-border)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_94%,var(--color-surface-alt))] p-2 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] sm:p-2.5">
                <div className="h-72 w-full sm:h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={netChartData} margin={{ top: 8, right: 12, left: 4, bottom: 4 }}>
                      <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" opacity={0.45} />
                      <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={Math.floor(netChartData.length / 8)} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCop(v)} width={52} />
                      <Tooltip
                        contentStyle={rechartsTooltipContentStyle}
                        formatter={(v, name) => [`$${formatCop(Number(v))}`, String(name)]}
                      />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <ReferenceLine y={0} stroke="var(--color-border)" />
                      <Line
                        type="monotone"
                        dataKey="net"
                        stroke="var(--color-accent-finance)"
                        strokeWidth={2}
                        dot={{ r: 2 }}
                        name="Flujo base"
                      />
                      <Line
                        type="monotone"
                        dataKey="netIfOriginFix"
                        stroke="var(--color-accent-health)"
                        strokeWidth={2}
                        strokeDasharray="5 4"
                        dot={false}
                        name="Con el plan sugerido (proyección)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </Card>

          <section
            className={cn(
              "overflow-hidden rounded-2xl",
              "border border-[color-mix(in_srgb,var(--color-border)_42%,transparent)]",
              "bg-[linear-gradient(165deg,color-mix(in_srgb,var(--color-accent-finance)_10%,var(--color-surface))_0%,var(--color-surface)_52%,color-mix(in_srgb,var(--color-accent-health)_9%,var(--color-surface))_100%)]",
              "p-3 shadow-[var(--shadow-card)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_18%,transparent)] sm:p-4",
            )}
            aria-labelledby="predictiva-palancas-label"
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
              <div className="min-w-0 flex-1">
                <p id="predictiva-palancas-label" className={financeCardMicroLabelClass}>
                  Tu poder de mejora · COP / mes
                </p>
                <p
                  className={cn(
                    "mt-1 text-[13px] font-semibold leading-snug text-orbita-primary sm:text-[14px]",
                    financeMissionHeroIntroMeasureClass,
                  )}
                >
                  Tres palancas del mismo escenario: suma mentalmente lo que puedes influir esta semana.
                </p>
                <p className={cn(financeSectionIntroClass, "mt-1.5 text-orbita-secondary")}>
                  Números redondeados como brújula; el impacto real depende de hábitos y calendario.
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] bg-orbita-surface/90 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-orbita-secondary shadow-sm">
                <Zap className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
                3 boosts
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Card
                hover
                className={cn(
                  financeKpiCardClass,
                  "group relative overflow-hidden border border-[color-mix(in_srgb,var(--color-accent-danger)_28%,transparent)] p-3 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 ease-out motion-safe:hover:-translate-y-0.5 sm:p-4",
                )}
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-danger)_18%,transparent)_0%,transparent_70%)] opacity-90"
                  aria-hidden
                />
                <div className="relative flex items-start justify-between gap-2">
                  <p className={financeCardMicroLabelClass}>Frenar lo que más sube</p>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-accent-danger)_12%,var(--color-surface-alt))] ring-1 ring-[color-mix(in_srgb,var(--color-accent-danger)_28%,transparent)]">
                    <Flame className="h-4 w-4 text-[color-mix(in_srgb,var(--color-accent-danger)_88%,var(--color-text-primary))]" aria-hidden />
                  </span>
                </div>
                <p className="relative mt-2 text-xl font-semibold tabular-nums text-orbita-primary">
                  +${formatCop(data.scenarioImpact.ifReduceFastGrowingByScenario)} / mes
                </p>
                <p className="relative mt-1 text-[11px] leading-snug text-orbita-secondary">
                  Prioriza categorías que están acelerando: ahí suele estar la mayor palanca.
                </p>
              </Card>
              <Card
                hover
                className={cn(
                  financeKpiCardClass,
                  "group relative overflow-hidden border border-[color-mix(in_srgb,var(--color-accent-health)_32%,transparent)] p-3 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 ease-out motion-safe:hover:-translate-y-0.5 sm:p-4",
                )}
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-health)_16%,transparent)_0%,transparent_70%)] opacity-90"
                  aria-hidden
                />
                <div className="relative flex items-start justify-between gap-2">
                  <p className={financeCardMicroLabelClass}>Recortar a la mitad el gasto hormiga</p>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface-alt))] ring-1 ring-[color-mix(in_srgb,var(--color-accent-health)_26%,transparent)]">
                    <Zap className="h-4 w-4 text-[color-mix(in_srgb,var(--color-accent-health)_88%,var(--color-text-primary))]" aria-hidden />
                  </span>
                </div>
                <p className="relative mt-2 text-xl font-semibold tabular-nums text-emerald-800 dark:text-emerald-400">
                  +${formatCop(data.scenarioImpact.ifTrimAntByHalf)} / mes
                </p>
                <p className="relative mt-1 text-[11px] leading-snug text-orbita-secondary">
                  Muchos gastos chicos: agrupar decisiones suele ahorrar tiempo y dinero.
                </p>
              </Card>
              <Card
                hover
                className={cn(
                  financeKpiCardClass,
                  "group relative overflow-hidden border border-[color-mix(in_srgb,var(--color-accent-finance)_30%,transparent)] p-3 shadow-[var(--shadow-card)] transition-[transform,box-shadow] duration-300 ease-out motion-safe:hover:-translate-y-0.5 sm:p-4",
                )}
              >
                <div
                  className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-finance)_14%,transparent)_0%,transparent_70%)] opacity-90"
                  aria-hidden
                />
                <div className="relative flex items-start justify-between gap-2">
                  <p className={financeCardMicroLabelClass}>Los dos a la vez (referencia)</p>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-accent-finance)_11%,var(--color-surface-alt))] ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_26%,transparent)]">
                    <Trophy className="h-4 w-4 text-[color-mix(in_srgb,var(--color-accent-finance)_82%,var(--color-text-primary))]" aria-hidden />
                  </span>
                </div>
                <p className="relative mt-2 text-xl font-semibold tabular-nums text-orbita-primary">
                  +${formatCop(originScenario?.monthlyCop ?? 0)} / mes
                </p>
                <p className="relative mt-1 text-[10px] tabular-nums text-orbita-secondary">
                  ≈ ${formatCop(originScenario?.annualCop ?? 0)} / año proyectado
                </p>
                <p className="relative mt-1 text-[11px] leading-snug text-orbita-secondary">{originScenario?.narrative}</p>
              </Card>
            </div>
          </section>

          <Card
            hover
            className={cn(
              "overflow-hidden p-0",
              "ring-1 ring-[color-mix(in_srgb,var(--color-accent-health)_26%,transparent)]",
              "shadow-[var(--shadow-card)]",
            )}
          >
            <div
              className={cn(
                "relative overflow-hidden border-b border-[color-mix(in_srgb,var(--color-border)_48%,transparent)]",
                "bg-[linear-gradient(125deg,color-mix(in_srgb,var(--color-accent-health)_14%,var(--color-surface))_0%,var(--color-surface)_42%,color-mix(in_srgb,var(--color-accent-finance)_10%,var(--color-surface))_100%)]",
              )}
            >
              <div
                className="pointer-events-none absolute -right-14 -top-20 h-48 w-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-health)_18%,transparent)_0%,transparent_70%)]"
                aria-hidden
              />
              <div className="relative flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:px-5 sm:py-4">
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-surface)_56%,transparent)] shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_6%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-health)_30%,transparent)]">
                    <Lightbulb
                      className="h-[22px] w-[22px] text-[color-mix(in_srgb,var(--color-accent-health)_88%,var(--color-text-primary))]"
                      strokeWidth={2}
                      aria-hidden
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={financeCardMicroLabelClass}>Misión · siguiente paso</p>
                    <h3 className="mt-0.5 text-[16px] font-bold leading-snug tracking-tight text-orbita-primary sm:text-[17px]">
                      Qué mirar primero
                    </h3>
                    <p
                      className={cn(
                        financeSectionIntroClass,
                        "mt-1 text-[11px] leading-snug text-orbita-secondary",
                        financeMissionHeroIntroMeasureClass,
                      )}
                    >
                      Orden sugerido por impacto: cada tarjeta enlaza el dato con una acción concreta (agenda o hábito).
                    </p>
                  </div>
                </div>
                <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-[color-mix(in_srgb,var(--color-accent-health)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_11%,var(--color-surface))] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-orbita-primary shadow-sm sm:self-center">
                  <Sparkles className="h-3.5 w-3.5 text-[color-mix(in_srgb,var(--color-accent-health)_75%,var(--color-text-primary))]" aria-hidden />
                  {enrichedInsights.length > 0
                    ? `Top ${Math.min(6, enrichedInsights.length)} focos`
                    : "Lista de focos"}
                </span>
              </div>
            </div>
            <div className="border-t border-[color-mix(in_srgb,var(--color-border)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-text-primary)_2%,var(--color-surface))] px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
              <div className="space-y-2.5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_36%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_96%,var(--color-surface-alt))] p-3 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_4%,transparent)] sm:space-y-3 sm:p-4">
                {enrichedInsights.slice(0, 6).map((ins) => (
                  <InsightCard key={`p-${ins.id}`} insight={ins} />
                ))}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
