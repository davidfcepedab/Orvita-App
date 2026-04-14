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
import { ArrowDownRight, ArrowUpRight, ChevronRight } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import { useFinanceOrThrow } from "@/app/finanzas/FinanceContext"
import { rechartsTooltipContentStyle } from "@/lib/charts/rechartsShared"
import { isSupabaseEnabled } from "@/lib/checkins/flags"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import { buildPlCfoModel } from "@/lib/finanzas/plCfoModel"
import type { PlOverviewMonthlyRow } from "@/lib/finanzas/plStrategicCenterFromCoherence"
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

type OverviewPayload = {
  income?: number
  expense?: number
  net?: number
  savingsRate?: number
  runway?: number
  flowEvolution?: { rollingYear?: PlOverviewMonthlyRow[] }
  headline?: { liquidityIndex?: number; burnRunwayMonths?: number; netCashFlow?: number }
}

export function FinanzasPlCfoView() {
  const { month, financeMeta, financeMetaLoading, capitalDataEpoch } = useFinanceOrThrow()
  const c = financeMeta?.coherence
  const [overview, setOverview] = useState<OverviewPayload | null>(null)

  useEffect(() => {
    if (!isSupabaseEnabled() || !month) return
    let cancelled = false
    void (async () => {
      try {
        const res = await financeApiGet(`/api/orbita/finanzas/overview?month=${encodeURIComponent(month)}`)
        const json = (await res.json()) as { success?: boolean; data?: OverviewPayload | null }
        if (cancelled || !res.ok || !json.success) {
          setOverview(null)
          return
        }
        setOverview(json.data ?? null)
      } catch {
        if (!cancelled) setOverview(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [month, capitalDataEpoch])

  const monthLabel = useMemo(() => {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) return month ?? ""
    const [y, m] = month.split("-").map(Number)
    return new Date(y, m - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" })
  }, [month])

  const model = useMemo(() => {
    if (!c) return null
    const rolling = overview?.flowEvolution?.rollingYear ?? null
    const headline = overview
      ? {
          savingsRate:
            typeof overview.savingsRate === "number"
              ? overview.savingsRate
              : overview.headline?.liquidityIndex ?? 0,
          runway:
            typeof overview.runway === "number" ? overview.runway : overview.headline?.burnRunwayMonths ?? 0,
        }
      : null
    return buildPlCfoModel(c, rolling, headline)
  }, [c, overview])

  if (financeMetaLoading) {
    return (
      <div className="space-y-6 animate-pulse">
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

  const { metrics, strategicInsights, healthScore, healthLabel, incomeBreakdown, expenseBreakdown, actions, trendSix } =
    model
  const trendData = trendSix.length >= 2 ? trendSix : null

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* Lectura estratégica */}
      <section aria-labelledby="pl-cfo-strategic-heading">
        <h2 id="pl-cfo-strategic-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-orbita-secondary">
          Lectura estratégica
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {strategicInsights.map((ins) => (
            <Card
              key={ins.id}
              hover
              className={cn(
                "min-h-[140px] border p-5 sm:p-6",
                ins.variant === "attention" && "border-amber-200/80 bg-amber-50/35 dark:border-amber-900/40 dark:bg-amber-950/20",
                ins.variant === "positive" && "border-emerald-200/75 bg-emerald-50/30 dark:border-emerald-900/40 dark:bg-emerald-950/20",
                ins.variant === "neutral" && "border-orbita-border/75",
              )}
            >
              <p className="text-[11px] font-bold uppercase tracking-wide text-orbita-secondary">{ins.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-orbita-primary">{ins.body}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Métricas clave */}
      <section aria-labelledby="pl-cfo-kpi-heading">
        <h2 id="pl-cfo-kpi-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-orbita-secondary">
          Métricas clave
        </h2>
        <p className="mt-1 text-[11px] text-orbita-muted">Comparación mes vs mes anterior usa la ventana del Resumen (año móvil) cuando hay datos.</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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
      <section className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr] lg:items-start">
        <Card className="border-orbita-border/75 p-6">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-orbita-secondary">Salud financiera</p>
          <p className="mt-3 text-4xl font-bold tabular-nums text-orbita-primary">{healthScore}</p>
          <p className="mt-1 text-sm font-medium text-orbita-secondary">{healthLabel}</p>
          <p className="mt-3 text-[11px] leading-snug text-orbita-muted">
            Heurística: tasa de ahorro y cobertura (runway ~{metrics.runwayMonths.toFixed(1)}×). No es consejo de inversión.
          </p>
        </Card>
        <div className="grid min-w-0 gap-6 sm:grid-cols-2">
          <BreakdownCard title="Ingresos" subtitle="Sin split recurrente/único sin etiquetas en TX." rows={incomeBreakdown} />
          <BreakdownCard title="Gastos — drivers" subtitle="% sobre gasto total contable." rows={expenseBreakdown} />
        </div>
      </section>

      {/* Tendencia */}
      <section aria-labelledby="pl-cfo-trend-heading">
        <h2 id="pl-cfo-trend-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-orbita-secondary">
          Tendencia (rentabilidad)
        </h2>
        <p className="mt-1 text-[11px] text-orbita-muted">Últimos {trendData?.length ?? 0} meses del año móvil — flujo neto e ingresos.</p>
        <Card className="mt-4 border-orbita-border/75 p-4 sm:p-6">
          {trendData && trendData.length >= 2 ? (
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData.map((r) => ({ ...r }))} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.55} vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis width={44} tickFormatter={formatCompact} tick={{ fontSize: 10 }} />
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
        <h2 id="pl-cfo-actions-heading" className="text-xs font-semibold uppercase tracking-[0.18em] text-orbita-secondary">
          Acciones sugeridas
        </h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {actions.map((a) => (
            <li key={a.id}>
              <Link
                href={a.href}
                className={cn(
                  "flex min-h-[88px] flex-col justify-between rounded-2xl border p-4 transition hover:border-[color-mix(in_srgb,var(--color-accent-finance)_40%,var(--color-border))]",
                  a.priority === "alta"
                    ? "border-rose-200/70 bg-rose-50/25 dark:border-rose-900/45 dark:bg-rose-950/15"
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
                  <span className="font-medium tabular-nums text-orbita-secondary">{a.impactLabel}</span>
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
    <Card className="border-orbita-border/70 p-4">
      <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">{label}</p>
      <p className={cn("mt-1 text-lg font-bold tabular-nums sm:text-xl", toneCls)}>
        {isPercent ? `${value.toFixed(1)}${suffix}` : `$${formatCop(value)}${suffix}`}
      </p>
      {deltaPct != null && Number.isFinite(deltaPct) ? (
        <p className="mt-1 flex items-center gap-1 text-[11px] font-medium tabular-nums text-orbita-secondary">
          {good ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" aria-hidden />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-rose-600" aria-hidden />
          )}
          {deltaPct >= 0 ? "+" : ""}
          {deltaPct.toFixed(1)}% vs ant.
        </p>
      ) : (
        <p className="mt-1 text-[10px] text-orbita-muted">— vs ant.</p>
      )}
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
    <Card className="min-w-0 border-orbita-border/75 p-5">
      <p className="text-sm font-semibold text-orbita-primary">{title}</p>
      <p className="mt-0.5 text-[11px] text-orbita-muted">{subtitle}</p>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.label} className="flex items-baseline justify-between gap-3 border-b border-orbita-border/40 pb-2 last:border-0 last:pb-0">
            <span className="min-w-0 text-sm text-orbita-secondary">{r.label}</span>
            <span className="shrink-0 text-right">
              <span className="block text-sm font-semibold tabular-nums text-orbita-primary">${formatCop(r.amount)}</span>
              <span className="text-[11px] tabular-nums text-orbita-muted">{r.pctOfTotal.toFixed(0)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
