"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { ArrowDownRight, ArrowUpRight, ChevronRight, Flame, Sparkles, Target, Trophy } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import { useFinanceOrThrow } from "@/app/finanzas/FinanceContext"
import { rechartsTooltipContentStyle } from "@/lib/charts/rechartsShared"
import { isSupabaseEnabled } from "@/lib/checkins/flags"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import { buildPlCfoModel } from "@/lib/finanzas/plCfoModel"
import type { PlCfoCatalogAggregate } from "@/lib/finanzas/plCfoCatalogAggregate"
import type { PlOverviewMonthlyRow } from "@/lib/finanzas/plStrategicCenterFromCoherence"
import { financePlStackClass } from "@/app/finanzas/_components/financeChrome"
import { formatYmLongMonthYearEsCo } from "@/lib/agenda/localDateKey"
import { cn } from "@/lib/utils"

function formatCop(n: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(n))
}

function formatCompact(n: number) {
  const v = Math.abs(n)
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1000) return `${Math.round(v / 1000)}k`
  return String(Math.round(v))
}

function tooltipNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (Array.isArray(value)) return tooltipNumber(value[0])
  if (typeof value === "string") {
    const x = parseFloat(value)
    return Number.isFinite(x) ? x : 0
  }
  return 0
}

type PlCfoPayload = {
  catalog?: PlCfoCatalogAggregate
  flowEvolution?: { rollingYear?: PlOverviewMonthlyRow[] }
  headline?: { savingsRate?: number; runway?: number; net?: number }
}

export function FinanzasPlCfoView() {
  const { month, financeMeta, financeMetaLoading, capitalDataEpoch } = useFinanceOrThrow()
  const c = financeMeta?.coherence
  const [plCfo, setPlCfo] = useState<PlCfoPayload | null>(null)

  useEffect(() => {
    if (!isSupabaseEnabled() || !month) return
    let cancelled = false
    void (async () => {
      try {
        const res = await financeApiGet(`/api/orbita/finanzas/pl-cfo?month=${encodeURIComponent(month)}`)
        const json = (await res.json()) as { success?: boolean; data?: PlCfoPayload | null }
        if (cancelled || !res.ok || !json.success) {
          setPlCfo(null)
          return
        }
        setPlCfo(json.data ?? null)
      } catch {
        if (!cancelled) setPlCfo(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [month, capitalDataEpoch])

  const monthLabel = useMemo(() => {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return month ?? ""
    return formatYmLongMonthYearEsCo(month)
  }, [month])

  const model = useMemo(() => {
    if (!c) return null
    const rolling = plCfo?.flowEvolution?.rollingYear ?? null
    const h = plCfo?.headline
    const headline =
      h && typeof h.savingsRate === "number" && typeof h.runway === "number"
        ? { savingsRate: h.savingsRate, runway: h.runway }
        : null
    return buildPlCfoModel(c, rolling, headline, plCfo?.catalog ?? null)
  }, [c, plCfo])

  if (financeMetaLoading) {
    return (
      <div className={cn("space-y-6 animate-pulse", financePlStackClass)}>
        <div className="h-48 rounded-2xl bg-orbita-surface-alt/80" />
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-orbita-surface-alt/70" />
          ))}
        </div>
      </div>
    )
  }

  if (!model) {
    return (
      <p className="rounded-2xl border border-dashed border-orbita-border bg-orbita-surface-alt/20 px-4 py-5 text-sm text-orbita-secondary">
        Sin datos de coherencia para armar la vista CFO. Revisa movimientos o el resumen del mes.
      </p>
    )
  }

  const {
    metrics,
    strategicInsights,
    healthScore,
    healthLabel,
    incomeBreakdown,
    expenseBreakdown,
    topExpenseCategories,
    actions,
    trendSix,
  } = model
  const trendData = trendSix.length >= 2 ? trendSix : null
  const usesCatalogExpenseDrivers = !expenseBreakdown.some((r) => r.label === "Operativo (KPI)")
  const usesCatalogIncomeSplit = incomeBreakdown.length > 1
  const healthTier = healthScore >= 80 ? "élite" : healthScore >= 65 ? "fuerte" : healthScore >= 45 ? "estable" : "en riesgo"
  const scoreToNext = healthScore >= 80 ? 100 : healthScore >= 65 ? 80 : healthScore >= 45 ? 65 : 45
  const scoreProgress = Math.max(0, Math.min(100, (healthScore / scoreToNext) * 100))
  const challengeCount = actions.filter((a) => a.priority === "alta").length

  return (
    <div className={cn("space-y-7 sm:space-y-8", financePlStackClass)}>
      <section className="relative overflow-hidden rounded-2xl border border-orbita-border/70 bg-[radial-gradient(130%_120%_at_0%_0%,color-mix(in_srgb,var(--color-accent-finance)_26%,transparent),transparent_52%),radial-gradient(120%_120%_at_100%_0%,rgba(16,185,129,0.18),transparent_58%),var(--color-surface)] p-4 sm:p-5">
        <div className="flex flex-col gap-4 min-[400px]:flex-row min-[400px]:flex-wrap min-[400px]:items-start min-[400px]:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">P&L estratégico</p>
            <h2 className="mt-1 text-balance text-lg font-bold capitalize text-orbita-primary min-[400px]:text-xl sm:text-xl">
              {monthLabel}
            </h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200">
                <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden /> Nivel {healthTier}
              </span>
              <span className="inline-flex min-h-[32px] items-center gap-1 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-900 dark:text-violet-200">
                <Flame className="h-3.5 w-3.5 shrink-0" aria-hidden /> {challengeCount} foco{challengeCount === 1 ? "" : "s"} alta prioridad
              </span>
            </div>
          </div>
          <div className="w-full min-w-0 rounded-xl border border-orbita-border/70 bg-orbita-surface/70 px-3 py-2.5 min-[400px]:w-auto min-[400px]:max-w-[min(100%,280px)] min-[400px]:shrink-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-orbita-secondary">Score de salud</p>
            <p className="mt-0.5 text-3xl font-bold tabular-nums text-orbita-primary">{healthScore}</p>
            <div className="mt-2 h-2 rounded-full bg-orbita-surface-alt/80">
              <div
                className="h-2 rounded-full bg-[linear-gradient(90deg,var(--color-accent-finance),#10b981)] transition-all"
                style={{ width: `${scoreProgress}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-orbita-muted">Meta siguiente: {scoreToNext}</p>
          </div>
        </div>
      </section>

      {/* Lectura estratégica */}
      <section aria-labelledby="pl-cfo-strategic-heading">
        <h2 id="pl-cfo-strategic-heading" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orbita-secondary">
          Lectura estratégica
        </h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {strategicInsights.map((ins) => (
            <Card
              key={ins.id}
              hover
              className={cn(
                "min-h-[120px] border p-4 sm:p-5",
                ins.variant === "attention" && "border-amber-200/80 bg-amber-50/35 dark:border-amber-900/40 dark:bg-amber-950/20",
                ins.variant === "positive" && "border-emerald-200/75 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20",
                ins.variant === "neutral" && "border-orbita-border/75",
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-orbita-secondary">{ins.title}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-orbita-primary">{ins.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Métricas clave */}
      <section aria-labelledby="pl-cfo-kpi-heading">
        <h2 id="pl-cfo-kpi-heading" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orbita-secondary">
          Métricas clave
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2.5 min-[400px]:gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricTile
            label="Ingresos"
            value={metrics.income}
            deltaPct={metrics.incomeMomPct}
            tone="income"
          />
          <MetricTile
            label="Gastos (total)"
            value={metrics.expenseTotal}
            deltaPct={metrics.expenseMomPct}
            invertDelta
            tone="expense"
          />
          <MetricTile label="Gasto operativo KPI" value={metrics.expenseOperativoKpi} tone="neutral" />
          <MetricTile label="Resultado neto" value={metrics.net} deltaPct={metrics.netMomPct} tone="net" />
          <MetricTile label="Margen neto" value={metrics.netMarginPct} suffix="%" isPercent />
          <MetricTile label="Margen operativo (aprox.)" value={metrics.operatingMarginPct} suffix="%" isPercent />
        </div>
      </section>

      {/* Salud financiera */}
      <section className="grid gap-4 min-[400px]:gap-5 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start">
        <Card className="border-orbita-border/75 bg-[linear-gradient(165deg,color-mix(in_srgb,var(--color-accent-finance)_14%,transparent),transparent)] p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-orbita-secondary">Estado del juego financiero</p>
          <p className="mt-2 flex items-end gap-2">
            <span className="text-4xl font-bold tabular-nums text-orbita-primary">{healthScore}</span>
            <span className="mb-1 text-xs font-semibold text-orbita-secondary">{healthLabel}</span>
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg border border-orbita-border/60 bg-orbita-surface/70 p-2">
              <p className="text-orbita-muted">Ahorro</p>
              <p className="font-bold tabular-nums text-emerald-700 dark:text-emerald-300">{metrics.savingsRatePct.toFixed(1)}%</p>
            </div>
            <div className="rounded-lg border border-orbita-border/60 bg-orbita-surface/70 p-2">
              <p className="text-orbita-muted">Runway</p>
              <p className="font-bold tabular-nums text-violet-700 dark:text-violet-300">{metrics.runwayMonths.toFixed(1)}x</p>
            </div>
          </div>
        </Card>
        <div className="min-w-0 space-y-4">
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <BreakdownCard
              title="Ingresos"
              subtitle={
                usesCatalogIncomeSplit
                  ? "Proxy con mes previo."
                  : "Sin split por etiquetas."
              }
              rows={incomeBreakdown}
            />
            <BreakdownCard
              title="Gastos — drivers"
              subtitle={
                usesCatalogExpenseDrivers
                  ? "% sobre gasto operativo del mes."
                  : "% sobre gasto total."
              }
              rows={expenseBreakdown}
            />
          </div>
          {topExpenseCategories && topExpenseCategories.length > 0 ? (
            <BreakdownCard
              title="Categorías con más gasto"
              subtitle="Campo categoría del movimiento; % sobre total de gastos operativos del mes."
              rows={topExpenseCategories}
            />
          ) : null}
        </div>
      </section>

      {/* Tendencia */}
      <section aria-labelledby="pl-cfo-trend-heading">
        <h2 id="pl-cfo-trend-heading" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orbita-secondary">
          Tendencia (rentabilidad)
        </h2>
        <Card className="mt-3 border-orbita-border/75 p-3 sm:p-4">
          {trendData && trendData.length >= 2 ? (
            <div className="h-[220px] w-full min-w-0 min-[400px]:h-[248px] sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={trendData.map((r) => ({ ...r }))}
                  margin={{ top: 8, right: 4, left: 0, bottom: 8 }}
                  className="min-w-0"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.55} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis width={42} tickFormatter={formatCompact} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={rechartsTooltipContentStyle}
                    formatter={(v) => formatCop(tooltipNumber(v))}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="flujo" name="Flujo neto" stroke="var(--color-accent-finance)" strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke="var(--color-accent-health)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-orbita-secondary">
              Necesitas al menos dos meses en la serie del Resumen para ver tendencia.
            </p>
          )}
        </Card>
      </section>

      {/* Acciones */}
      <section aria-labelledby="pl-cfo-actions-heading">
        <h2 id="pl-cfo-actions-heading" className="text-[11px] font-semibold uppercase tracking-[0.16em] text-orbita-secondary">
          Acciones sugeridas
        </h2>
        <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {actions.map((a) => (
            <li key={a.id}>
              <Link
                href={a.href}
                className={cn(
                  "flex min-h-[88px] min-w-0 flex-col justify-between rounded-xl border p-3.5 transition active:scale-[0.99] motion-reduce:active:scale-100 sm:min-h-[84px] sm:active:scale-100",
                  "hover:border-[color-mix(in_srgb,var(--color-accent-finance)_40%,var(--color-border))] touch-manipulation",
                  a.priority === "alta"
                    ? "border-rose-200/70 bg-[linear-gradient(150deg,rgba(251,113,133,0.16),rgba(251,113,133,0.04))] dark:border-rose-900/45 dark:bg-rose-950/15"
                    : "border-orbita-border/70 bg-orbita-surface-alt/20",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm font-semibold text-orbita-primary">{a.title}</span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-orbita-muted" aria-hidden />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 font-bold uppercase tracking-wide",
                      a.priority === "alta" ? "bg-rose-500/15 text-rose-800 dark:text-rose-200" : "bg-orbita-surface-alt text-orbita-secondary",
                    )}
                  >
                    {a.priority}
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium tabular-nums text-orbita-secondary">
                    <Trophy className="h-3.5 w-3.5 text-amber-500" /> {a.impactLabel}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[10px] text-orbita-muted">
        Mes: <span className="font-medium capitalize text-orbita-secondary">{monthLabel}</span> · Fuente KPI:{" "}
        {financeMeta?.kpiSource === "transactions"
          ? "movimientos"
          : financeMeta?.kpiSource === "snapshot"
            ? "snapshot"
            : "—"}
      </p>
    </div>
  )
}

function MetricTile({
  label,
  value,
  deltaPct,
  invertDelta,
  suffix = "",
  isPercent,
  tone = "neutral",
}: {
  label: string
  value: number
  deltaPct?: number | null
  invertDelta?: boolean
  suffix?: string
  isPercent?: boolean
  tone?: "income" | "expense" | "net" | "neutral"
}) {
  const good = invertDelta ? (deltaPct ?? 0) <= 0 : (deltaPct ?? 0) >= 0
  const deltaLabel =
    deltaPct != null && Number.isFinite(deltaPct) ? `${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%` : "—"
  const toneCls =
    tone === "income"
      ? "text-emerald-700 dark:text-emerald-300"
      : tone === "expense"
        ? "text-rose-700 dark:text-rose-300"
        : tone === "net"
          ? value >= 0
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-rose-700 dark:text-rose-300"
          : "text-orbita-primary"
  return (
    <Card
      className={cn(
        "border-orbita-border/70 p-3",
        tone === "income" && "bg-[linear-gradient(160deg,rgba(16,185,129,0.09),transparent)]",
        tone === "expense" && "bg-[linear-gradient(160deg,rgba(244,63,94,0.08),transparent)]",
        tone === "net" && "bg-[linear-gradient(160deg,rgba(16,185,129,0.07),transparent)]",
      )}
    >
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">{label}</p>
      <p className={cn("mt-1 text-base font-bold tabular-nums sm:text-lg", toneCls)}>
        {isPercent ? `${value.toFixed(1)}${suffix}` : `$${formatCop(value)}${suffix}`}
      </p>
      <div className="mt-1 flex items-center gap-1 text-[10px] font-medium tabular-nums text-orbita-secondary">
        {deltaPct != null && Number.isFinite(deltaPct) ? (
          good ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" aria-hidden />
          )
        ) : (
          <Target className="h-3.5 w-3.5 text-orbita-muted" aria-hidden />
        )}
        <span>{deltaLabel}</span>
      </div>
    </Card>
  )
}

function BreakdownCard({
  title,
  subtitle,
  rows,
}: {
  title: string
  subtitle: string
  rows: { label: string; amount: number; pctOfTotal: number }[]
}) {
  return (
    <Card className="min-w-0 border-orbita-border/75 p-4">
      <p className="text-sm font-semibold text-orbita-primary">{title}</p>
      <p className="mt-0.5 text-[11px] text-orbita-muted">{subtitle}</p>
      <ul className="mt-3 space-y-2.5">
        {rows.map((r) => (
          <li key={r.label} className="border-b border-orbita-border/40 pb-2 last:border-0 last:pb-0">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 text-sm text-orbita-secondary">{r.label}</span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold tabular-nums text-orbita-primary">${formatCop(r.amount)}</span>
                <span className="text-[11px] tabular-nums text-orbita-muted">{r.pctOfTotal.toFixed(0)}%</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-orbita-surface-alt/80">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent-finance),#34d399)]"
                style={{ width: `${Math.max(3, Math.min(100, r.pctOfTotal))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
