"use client"

/**
 * Centro de control P&L estratégico (`PLStrategicCenter`).
 *
 * **Mapeo desde `orbita_finance_subcategory_catalog`**
 * - Agrega importes de transacciones enlazadas por subcategoría; usa `financial_impact` para tarjetas de
 *   presión y donut; `expense_type` para el bloque fijo/variable; `category`/`subcategory` para etiquetas
 *   y drill-down en callbacks.
 *
 * **Mapeo desde `finance_monthly_snapshots`**
 * - Clave `(year, month)` → `YYYY-MM` igual que el mes seleccionado en la app. Usa `total_income` /
 *   `total_expense` como KPI agregado o relleno cuando hay pocos movimientos (no sustituye desglose por
 *   impacto salvo mensaje explícito de “dato agregado”).
 */

import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Building2,
  GitBranch,
  Home,
  MoreHorizontal,
  SlidersHorizontal,
} from "lucide-react"
import {
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card } from "@/src/components/ui/Card"
import { rechartsTooltipContentStyle } from "@/lib/charts/rechartsShared"
import { cn } from "@/lib/utils"
import {
  ExpenseType,
  FinancialImpact,
  type PlStrategicCenterCallbacks,
  type PlStrategicCenterRuntimeData,
  type PlStrategicCenterSpec,
  type PlRuntimeBreakdownSlice,
  type PlRuntimeFlowMonthPoint,
  type PlRuntimePressureCardData,
  PlSemanticTone,
} from "@/src/types/finanzas/pl-strategic-center"

const FLOW_COLORS = {
  ingresos: "var(--color-accent-health)",
  gasto: "color-mix(in srgb, var(--color-accent-danger) 88%, transparent)",
  flujo: "var(--color-accent-finance)",
} as const

const PIE_COLORS = [
  "color-mix(in srgb, var(--color-accent-finance) 75%, var(--color-text-primary))",
  "color-mix(in srgb, var(--color-accent-health) 70%, transparent)",
  "color-mix(in srgb, var(--color-accent-danger) 55%, transparent)",
  "color-mix(in srgb, #6366f1 45%, transparent)",
  "color-mix(in srgb, var(--color-border) 90%, var(--color-text-primary))",
]

const IMPACT_ICONS: Record<FinancialImpact, LucideIcon> = {
  [FinancialImpact.Operativo]: Home,
  [FinancialImpact.Inversion]: GitBranch,
  [FinancialImpact.Ajuste]: SlidersHorizontal,
  [FinancialImpact.FinancieroEstructural]: Building2,
  [FinancialImpact.Otros]: MoreHorizontal,
}

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
    const n = parseFloat(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function incomeExpenseEmptyMessage(spec: PlStrategicCenterSpec): string {
  const c = spec.charts[0]
  return c && "empty" in c ? c.empty.message : "Sin datos"
}

function toneCardClass(tone: PlSemanticTone): string {
  switch (tone) {
    case PlSemanticTone.Pressure:
      return "border-rose-200/80 bg-rose-50/40 dark:border-rose-900/50 dark:bg-rose-950/25"
    case PlSemanticTone.Attention:
      return "border-amber-200/85 bg-amber-50/45 dark:border-amber-900/45 dark:bg-amber-950/25"
    case PlSemanticTone.Positive:
      return "border-emerald-200/75 bg-emerald-50/40 dark:border-emerald-900/45 dark:bg-emerald-950/25"
    default:
      return "border-orbita-border/70 bg-orbita-surface-alt/30"
  }
}

export type PLStrategicCenterProps = {
  spec: PlStrategicCenterSpec
  data: PlStrategicCenterRuntimeData
  callbacks?: PlStrategicCenterCallbacks
  className?: string
}

export function PLStrategicCenter({ spec, data, callbacks, className }: PLStrategicCenterProps) {
  const hero = data.hero
  const momPositive = hero.momDeltaCop >= 0
  const maxPressures = spec.pressuresSection.maxCards

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[min(100%,1200px)] space-y-10 sm:space-y-12 md:space-y-14",
        className,
      )}
    >
      <header className="space-y-3 sm:space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orbita-secondary">{spec.title}</p>
          <h1 className="text-balance text-2xl font-bold tracking-tight text-orbita-primary sm:text-3xl md:text-4xl">
            {spec.subtitle}
          </h1>
          <p className="text-sm text-orbita-muted">{data.meta.monthLabel}</p>
        </div>

        <Card className="border-orbita-border/75 p-6 sm:p-8 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="min-w-0 space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-orbita-secondary">
                {spec.header.primary.label}
              </p>
              <p
                className={cn(
                  "break-words text-4xl font-bold tabular-nums tracking-tight sm:text-5xl md:text-6xl",
                  hero.netCop >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300",
                )}
              >
                ${formatCop(hero.netCop)}
              </p>
            </div>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8 lg:flex-col lg:items-end">
              <div className="flex items-center gap-2 text-sm tabular-nums text-orbita-secondary">
                {momPositive ? (
                  <ArrowUpRight className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                ) : (
                  <ArrowDownRight className="h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden />
                )}
                <div>
                  <p className="text-[11px] uppercase tracking-wide">vs mes anterior</p>
                  <p className="font-semibold text-orbita-primary">
                    {momPositive ? "+" : "−"}${formatCop(Math.abs(hero.momDeltaCop))}
                    {hero.momDeltaPct != null && Number.isFinite(hero.momDeltaPct) ? (
                      <span className="ml-1.5 font-medium text-orbita-muted">
                        ({momPositive ? "+" : ""}
                        {hero.momDeltaPct.toFixed(1)}%)
                      </span>
                    ) : null}
                  </p>
                </div>
              </div>
              <div className="text-right text-sm tabular-nums">
                <p className="text-[11px] uppercase tracking-wide text-orbita-secondary">YTD</p>
                <p className="font-semibold text-orbita-primary">${formatCop(hero.ytdNetCop)}</p>
              </div>
            </div>
          </div>
          <p className="sr-only">{spec.header.accessibility.summaryLabel}</p>
        </Card>
      </header>

      {data.insightBanner?.visible ? (
        <InsightBanner spec={spec} data={data} />
      ) : null}

      <section className="space-y-4" aria-labelledby="pl-pressure-heading">
        <div className="space-y-1">
          <h2 id="pl-pressure-heading" className="text-lg font-semibold text-orbita-primary sm:text-xl">
            {spec.pressuresSection.title}
          </h2>
          <p className="max-w-prose text-sm text-orbita-secondary">{spec.pressuresSection.subtitle}</p>
        </div>
        <div
          className={cn(
            "grid gap-4",
            "sm:grid-cols-2",
            spec.pressuresSection.columns.lg >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-2",
          )}
        >
          {data.pressures.slice(0, maxPressures).map((card) => (
            <PressureCard key={card.impact} card={card} onCardClick={callbacks?.onPressureCardClick} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-orbita-primary sm:text-xl">{spec.charts[0]?.title ?? "Flujo"}</h2>
        <Card className="min-h-[220px] border-orbita-border/75 p-4 sm:p-6">
          {data.incomeExpenseSeries.length > 0 ? (
            <div className="h-[220px] w-full sm:h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={[...data.incomeExpenseSeries]}
                  margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
                  onClick={(state) => {
                    const active = (state as { activePayload?: { payload: PlRuntimeFlowMonthPoint }[] })
                      ?.activePayload?.[0]?.payload
                    if (active && callbacks?.onIncomeExpenseChartClick) {
                      callbacks.onIncomeExpenseChartClick({ monthYm: active.monthYm, point: active })
                    }
                    callbacks?.onChartClick?.({ chartId: "income-vs-expense", monthYm: active?.monthYm })
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.6} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--color-text-secondary)" }} />
                  <YAxis width={40} tick={{ fontSize: 9 }} tickFormatter={formatCompact} />
                  <Tooltip
                    contentStyle={rechartsTooltipContentStyle}
                    formatter={(value, name) => [formatCop(tooltipNumber(value)), String(name ?? "")]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="ingresos" name="Ingresos" stroke={FLOW_COLORS.ingresos} dot={false} strokeWidth={2} />
                  <Line
                    type="monotone"
                    dataKey="gasto_operativo"
                    name="Gasto op."
                    stroke={FLOW_COLORS.gasto}
                    dot={false}
                    strokeWidth={2}
                  />
                  <Line type="monotone" dataKey="flujo" name="Flujo neto" stroke={FLOW_COLORS.flujo} dot={false} strokeWidth={2.5} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-orbita-secondary">{incomeExpenseEmptyMessage(spec)}</p>
          )}
        </Card>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-orbita-primary">{spec.charts[1]?.title ?? "Composición"}</h2>
          <Card className="border-orbita-border/75 p-4 sm:p-6">
            <BreakdownDonut
              slices={data.breakdownByImpact}
              centerLabel={spec.charts[1]?.kind === "donut" ? spec.charts[1].centerLabel : "Gasto"}
              onSegmentClick={callbacks?.onBreakdownSegmentClick}
              onChartClick={callbacks?.onChartClick}
            />
          </Card>
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-orbita-primary">
            {(spec.charts[2] as { title?: string })?.title ?? "Fijo vs variable"}
          </h2>
          <Card className="border-orbita-border/75 p-4 sm:p-6">
            <FixedVariableBars
              fijo={data.fixedVsVariable.fijoCop}
              variable={data.fixedVsVariable.variableCop}
              annotation={
                (spec.charts[2] as { annotation?: string })?.annotation ??
                "Variable: palanca corta · Fijo: estructural"
              }
              onSelect={callbacks?.onFixedVariableClick}
            />
          </Card>
        </div>
      </section>

      {data.trendFlujo && data.trendFlujo.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-orbita-primary">Tendencia (flujo)</h2>
          <Card className="border-orbita-border/75 p-4 sm:p-6">
            <div className="h-[180px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data.trendFlujo.map((d) => ({ ...d }))}
                  margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                  onClick={(s) => {
                    const p = (s as { activePayload?: { payload: { label: string; flujo: number } }[] })?.activePayload?.[0]
                      ?.payload
                    if (p) callbacks?.onTrendChartClick?.(p)
                    callbacks?.onChartClick?.({ chartId: "monthly-trend" })
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis width={36} tickFormatter={formatCompact} tick={{ fontSize: 9 }} />
                  <Tooltip contentStyle={rechartsTooltipContentStyle} formatter={(v) => formatCop(tooltipNumber(v))} />
                  <Line type="monotone" dataKey="flujo" stroke={FLOW_COLORS.flujo} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </section>
      ) : null}

      <section className="grid gap-6 md:grid-cols-2">
        <Card className="border-orbita-border/75 p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-orbita-primary">{spec.projectionSection.left.title}</h3>
          <p className="mt-2 text-2xl font-bold tabular-nums text-orbita-primary">
            ${formatCop(data.cashMonthNetCop ?? hero.netCop)}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-orbita-muted">{spec.projectionSection.left.honestFallback}</p>
        </Card>
        <Card className="border-orbita-border/75 p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-orbita-primary">{spec.projectionSection.right.title}</h3>
          {data.projection && data.projection.series.length > 0 ? (
            <>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-orbita-muted">
                Confianza: {data.projection.confidence}
              </p>
              <div className="mt-3 h-[140px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={[...data.projection.series]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.45} vertical={false} />
                    <XAxis dataKey="label" hide />
                    <YAxis width={32} tickFormatter={formatCompact} />
                    <Tooltip contentStyle={rechartsTooltipContentStyle} />
                    <Line type="monotone" dataKey="value" stroke={FLOW_COLORS.flujo} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <p className="mt-3 text-sm text-orbita-muted">Sin proyección suficiente (añade compromisos o suscripciones).</p>
          )}
        </Card>
      </section>

      <section className="space-y-4" aria-labelledby="pl-actions-heading">
        <h2 id="pl-actions-heading" className="text-lg font-semibold text-orbita-primary">
          Siguiente movimiento
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.actions.slice(0, spec.actions.maxItems).map((action) => (
            <Link
              key={action.id}
              href={action.href}
              onClick={() => callbacks?.onActionClick?.({ action })}
              className="group flex min-h-[72px] items-center justify-between gap-3 rounded-2xl border border-orbita-border/70 bg-orbita-surface-alt/25 px-4 py-3 transition hover:border-[color-mix(in_srgb,var(--color-accent-finance)_35%,var(--color-border))] hover:bg-orbita-surface-alt/40"
            >
              <span className="text-sm font-semibold text-orbita-primary">{action.title}</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-orbita-muted transition group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ))}
        </div>
      </section>

      <footer className="flex flex-wrap gap-x-4 gap-y-2 border-t border-orbita-border/50 pt-8 text-sm">
        {spec.navigation.tertiaryLinks.map((l) => (
          <Link key={l.href} href={l.href} className="font-medium text-orbita-secondary underline-offset-4 hover:underline">
            {l.label}
          </Link>
        ))}
      </footer>

      {/*
        Próximos pasos (evolución a versión dinámica con API)
        - GET /api/orbita/finanzas/pl-strategic-center?month=YYYY-MM: devolver PlStrategicCenterRuntimeData + opcionalmente spec merge.
        - Cargar spec desde docs/finanzas/pl-strategic-center.json o CMS; validar con tipos PlStrategicCenterSpec.
        - Conectar agregaciones SQL/joins: catalog ↔ transactions; snapshots como fallback KPI.
        - Sustituir proyección 90d por modelo real (compromisos + suscripciones) cuando existan tablas.
        - Telemetría: onChartClick / onPressureCardClick → analytics.
        - Tests visual: Storybook o página dev-only que importe PLStrategicCenterExample.
      */}
    </div>
  )
}

function InsightBanner({
  spec,
  data,
}: {
  spec: PlStrategicCenterSpec
  data: PlStrategicCenterRuntimeData
}) {
  const b = data.insightBanner
  if (!b?.visible) return null
  return (
    <Card className="border-amber-200/70 bg-amber-50/35 p-4 dark:border-amber-900/45 dark:bg-amber-950/20 sm:p-5">
      <p className="text-sm font-semibold text-orbita-primary">{spec.insightBanner.title}</p>
      <p className="mt-1 tabular-nums text-sm text-orbita-secondary">
        Sin explicar: ${formatCop(b.primaryCop)} · Brecha estructura: ${formatCop(b.secondaryCop)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {spec.insightBanner.actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="rounded-full border border-orbita-border/80 bg-orbita-surface px-3 py-1.5 text-xs font-semibold text-orbita-primary hover:bg-orbita-surface-alt"
          >
            {a.label}
          </Link>
        ))}
      </div>
    </Card>
  )
}

function PressureCard({
  card,
  onCardClick,
}: {
  card: PlRuntimePressureCardData
  onCardClick?: PlStrategicCenterCallbacks["onPressureCardClick"]
}) {
  const Icon = IMPACT_ICONS[card.impact] ?? MoreHorizontal
  const sparkData = card.sparkline.map((v, i) => ({ i, v }))
  return (
    <button
      type="button"
      onClick={() => onCardClick?.({ impact: card.impact, card })}
      className={cn(
        "w-full rounded-2xl border p-5 text-left transition hover:shadow-md focus-visible:outline focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-accent-finance)_50%,transparent)]",
        toneCardClass(card.tone),
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 shrink-0 text-orbita-secondary" aria-hidden />
          <span className="text-sm font-semibold text-orbita-primary">{card.label}</span>
        </div>
        {card.momPct != null ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
              card.momPct > 0 ? "bg-rose-500/15 text-rose-800 dark:text-rose-200" : "bg-emerald-500/15 text-emerald-800 dark:text-emerald-200",
            )}
          >
            {card.momPct > 0 ? "+" : ""}
            {card.momPct.toFixed(0)}%
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums text-orbita-primary">${formatCop(card.amountCop)}</p>
      {sparkData.length > 1 ? (
        <div className="mt-3 h-8 w-full opacity-90">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line type="monotone" dataKey="v" stroke="var(--color-accent-finance)" strokeWidth={1.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : null}
    </button>
  )
}

function BreakdownDonut({
  slices,
  centerLabel,
  onSegmentClick,
  onChartClick,
}: {
  slices: readonly PlRuntimeBreakdownSlice[]
  centerLabel: string
  onSegmentClick?: PlStrategicCenterCallbacks["onBreakdownSegmentClick"]
  onChartClick?: PlStrategicCenterCallbacks["onChartClick"]
}) {
  const data = slices.map((s, i) => ({
    name: s.label,
    value: s.valueCop,
    impact: s.impact,
    slice: s,
    color: PIE_COLORS[i % PIE_COLORS.length]!,
  }))
  const total = data.reduce((a, d) => a + d.value, 0)
  if (total <= 0) {
    return <p className="py-8 text-center text-sm text-orbita-muted">Sin gasto por capa este mes</p>
  }
  return (
    <div className="relative mx-auto h-[220px] max-w-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={2}
            onClick={(_, index) => {
              const d = data[index]
              if (d) {
                onSegmentClick?.({ impact: d.impact, slice: d.slice })
                onChartClick?.({ chartId: "breakdown-impact" })
              }
            }}
          >
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} stroke="var(--color-surface)" strokeWidth={1} />
            ))}
          </Pie>
          <Tooltip contentStyle={rechartsTooltipContentStyle} formatter={(v) => formatCop(tooltipNumber(v))} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-orbita-muted">{centerLabel}</span>
        <span className="text-sm font-bold tabular-nums text-orbita-primary">${formatCop(total)}</span>
      </div>
    </div>
  )
}

function FixedVariableBars({
  fijo,
  variable,
  annotation,
  onSelect,
}: {
  fijo: number
  variable: number
  annotation: string
  onSelect?: PlStrategicCenterCallbacks["onFixedVariableClick"]
}) {
  const sum = fijo + variable
  const pf = sum > 0 ? (fijo / sum) * 100 : 50
  const pv = sum > 0 ? (variable / sum) * 100 : 50
  return (
    <div className="space-y-4">
      <p className="text-xs text-orbita-secondary">{annotation}</p>
      <div className="space-y-2">
        <button
          type="button"
          className="w-full text-left"
          onClick={() => onSelect?.({ expenseType: ExpenseType.Fijo })}
        >
          <div className="mb-1 flex justify-between text-xs font-medium text-orbita-secondary">
            <span>Fijo</span>
            <span className="tabular-nums">${formatCop(fijo)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-orbita-surface-alt">
            <div
              className="h-full rounded-full bg-[color-mix(in_srgb,var(--color-accent-finance)_55%,var(--color-border))]"
              style={{ width: `${pf}%` }}
            />
          </div>
        </button>
        <button
          type="button"
          className="w-full text-left"
          onClick={() => onSelect?.({ expenseType: ExpenseType.Variable })}
        >
          <div className="mb-1 flex justify-between text-xs font-medium text-orbita-secondary">
            <span>Variable</span>
            <span className="tabular-nums">${formatCop(variable)}</span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-orbita-surface-alt">
            <div
              className="h-full rounded-full bg-[color-mix(in_srgb,var(--color-accent-health)_45%,var(--color-border))]"
              style={{ width: `${pv}%` }}
            />
          </div>
        </button>
      </div>
    </div>
  )
}
