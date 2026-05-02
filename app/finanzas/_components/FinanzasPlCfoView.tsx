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
import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  ArrowDown,
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Flame,
  Layers2,
  Lightbulb,
  Percent,
  Sparkles,
  Target,
  Trophy,
  TrendingUp,
  Zap,
} from "lucide-react"
import { motion, useReducedMotion } from "framer-motion"
import { Card } from "@/src/components/ui/Card"
import { useFinanceOrThrow } from "@/app/finanzas/FinanceContext"
import { rechartsTooltipContentStyle } from "@/lib/charts/rechartsShared"
import { isSupabaseEnabled } from "@/lib/checkins/flags"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import { buildPlCfoModel } from "@/lib/finanzas/plCfoModel"
import type { PlCfoCatalogAggregate } from "@/lib/finanzas/plCfoCatalogAggregate"
import type { PlCfoAction, PlCfoStrategicInsight } from "@/lib/finanzas/plCfoModel"
import type { PlOverviewMonthlyRow } from "@/lib/finanzas/plStrategicCenterFromCoherence"
import {
  financeBridgeMicroLabelClass,
  financeCardHintClass,
  financeCardMicroLabelClass,
  financeHeroChipBaseClass,
  financePlStackClass,
  financeSectionEyebrowClass,
  financeSectionIntroClass,
} from "@/app/finanzas/_components/financeChrome"
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

function plCfoActionPriorityMeta(priority: "alta" | "media") {
  if (priority === "alta") {
    return {
      short: "Alta",
      badgeTitle: "Prioridad alta — conviene actuar pronto",
      badgeClass:
        "border border-orbita-border/70 bg-orbita-surface-alt text-[10px] font-bold uppercase tracking-[0.07em] text-orbita-primary shadow-sm",
    }
  }
  return {
    short: "Media",
    badgeTitle: "Prioridad media — siguiente ventana razonable",
    badgeClass:
      "border border-orbita-border/55 bg-orbita-surface-alt/80 text-[10px] font-bold uppercase tracking-[0.07em] text-orbita-secondary shadow-sm",
  }
}

const PL_CFO_ACTION_CARD_SURFACE =
  "border-orbita-border/75 bg-[color-mix(in_srgb,var(--color-surface-alt)_48%,var(--color-surface))] dark:bg-[color-mix(in_srgb,var(--color-surface-alt)_22%,var(--color-surface))]"

function plCfoActionQuestIcon(id: string): LucideIcon {
  const map: Record<string, LucideIcon> = {
    gap: Zap,
    variable: Flame,
    categories: Layers2,
    catalog: Sparkles,
    overview: TrendingUp,
  }
  return map[id] ?? Target
}

/** Barra tipo “impulso”: usa % del texto si existe; si no, heurística por prioridad. */
function plCfoActionMomentumFill(impactLabel: string, priority: "alta" | "media"): number {
  const m = impactLabel.match(/(\d+(?:\.\d+)?)\s*%/)
  if (m) return Math.min(100, Math.max(12, parseFloat(m[1])))
  return priority === "alta" ? 72 : 42
}

function PlCfoActionMomentumBar({
  fill,
  reducedMotion,
}: {
  fill: number
  reducedMotion: boolean | null
}) {
  const w = Math.round(Math.min(100, Math.max(6, fill)))
  return (
    <div className="mt-3" aria-hidden>
      <div className={cn(financeBridgeMicroLabelClass, "mb-1 flex items-center justify-between")}>
        <span>Impulso</span>
        <span className="tabular-nums font-semibold text-orbita-secondary">{w}%</span>
      </div>
      <div className="relative h-2 overflow-hidden rounded-full bg-orbita-surface-alt/90 ring-1 ring-orbita-border/45">
        <motion.div
          className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent-finance),#34d399,#a78bfa)]"
          initial={reducedMotion ? { width: `${w}%` } : { width: "8%" }}
          animate={{ width: `${w}%` }}
          transition={
            reducedMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 260, damping: 28, delay: 0.12 }
          }
        />
        {!reducedMotion ? (
          <motion.span
            className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-70 dark:via-white/12 dark:opacity-50"
            initial={{ x: "-40%" }}
            animate={{ x: "280%" }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.8 }}
          />
        ) : null}
      </div>
    </div>
  )
}

function PlCfoSuggestedActionsList({ actions }: { actions: PlCfoAction[] }) {
  const reducedMotion = useReducedMotion()
  const containerVariants = useMemo(
    () => ({
      hidden: {},
      show: { transition: { staggerChildren: reducedMotion ? 0 : 0.09 } },
    }),
    [reducedMotion],
  )
  const itemVariants = useMemo(
    () => ({
      hidden: reducedMotion ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 18, scale: 0.96 },
      show: reducedMotion
        ? { opacity: 1, y: 0, scale: 1 }
        : {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: { type: "spring" as const, stiffness: 380, damping: 28 },
          },
    }),
    [reducedMotion],
  )

  return (
    <motion.ul
      className="mt-4 grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {actions.map((a) => {
        const pm = plCfoActionPriorityMeta(a.priority)
        const Icon = plCfoActionQuestIcon(a.id)
        const fill = plCfoActionMomentumFill(a.impactLabel, a.priority)
        return (
          <motion.li key={a.id} variants={itemVariants} className="min-w-0">
            <Link
              href={a.href}
              title={pm.badgeTitle}
              className={cn(
                "group relative flex min-h-[108px] min-w-0 flex-col overflow-hidden rounded-xl border p-4 shadow-sm transition-[border-color,box-shadow,transform,background-color] touch-manipulation",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orbita-border focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)]",
                "hover:-translate-y-0.5 hover:border-orbita-border hover:shadow-md active:scale-[0.99] motion-reduce:transform-none motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100 sm:min-h-[104px]",
                PL_CFO_ACTION_CARD_SURFACE,
              )}
            >
              {!reducedMotion ? (
                <motion.div
                  aria-hidden
                  className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-[color-mix(in_srgb,var(--color-accent-finance)_22%,transparent)] blur-3xl"
                  animate={{ opacity: [0.06, 0.14, 0.07], scale: [1, 1.06, 1] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
              ) : null}
              <div className="relative flex flex-1 flex-col">
                <div className="flex gap-3">
                  <motion.span
                    className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-accent-finance)_14%,var(--color-surface))] shadow-inner ring-1 ring-orbita-border/50"
                    whileHover={reducedMotion ? undefined : { scale: 1.06, rotate: -4 }}
                    transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  >
                    <Icon className="h-5 w-5 text-[color-mix(in_srgb,var(--color-accent-finance)_85%,var(--color-text-primary))]" aria-hidden />
                    {a.priority === "alta" && !reducedMotion ? (
                      <motion.span
                        className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-orbita-surface shadow ring-1 ring-orbita-border/60"
                        animate={{ scale: [1, 1.12, 1] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        aria-hidden
                      >
                        <Flame className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" />
                      </motion.span>
                    ) : null}
                  </motion.span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1", pm.badgeClass)}>
                        {a.priority === "alta" ? <Sparkles className="h-2.5 w-2.5 text-amber-600 dark:text-amber-400" aria-hidden /> : null}
                        {pm.short}
                      </span>
                      <ChevronRight
                        className="mt-0.5 h-4 w-4 shrink-0 text-orbita-muted transition-[transform,color] duration-200 group-hover:translate-x-1 group-hover:text-orbita-secondary"
                        aria-hidden
                      />
                    </div>
                    <p className="mt-2 text-sm font-semibold leading-snug text-orbita-primary">{a.title}</p>
                  </div>
                </div>
                <PlCfoActionMomentumBar fill={fill} reducedMotion={reducedMotion} />
                <p className="mt-2 text-[11px] leading-relaxed">
                  <span className="font-semibold text-orbita-secondary">Impacto:</span>{" "}
                  <span className="text-orbita-muted">{a.impactLabel}</span>
                </p>
              </div>
            </Link>
          </motion.li>
        )
      })}
    </motion.ul>
  )
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
      <div className={cn("animate-pulse space-y-9 sm:space-y-10", financePlStackClass)}>
        <div className="space-y-5">
          <div className="h-5 w-40 rounded-md bg-orbita-surface-alt/80" />
          <div className="flex flex-row items-start justify-between gap-3">
            <div className="h-24 min-w-0 flex-1 rounded-xl bg-orbita-surface-alt/70" />
            <div className="h-24 w-[40%] max-w-[9.5rem] shrink-0 rounded-xl bg-orbita-surface-alt/70" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="h-4 w-36 rounded-md bg-orbita-surface-alt/75" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="min-h-[220px] rounded-xl bg-orbita-surface-alt/70" />
            ))}
          </div>
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
    <div className={cn("space-y-9 sm:space-y-10", financePlStackClass)}>
      <section aria-label="P&L estratégico del mes seleccionado" className="space-y-5">
        <p className={financeSectionEyebrowClass}>P&amp;L estratégico</p>
        <div className="flex min-w-0 flex-row items-start justify-between gap-3 sm:gap-6">
          <div className="min-w-0 flex-1 pr-1">
            <h2 className="m-0 text-balance text-base font-bold capitalize text-orbita-primary sm:text-lg md:text-xl">
              {monthLabel}
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-2.5 sm:gap-2">
              <span
                className={cn(
                  financeHeroChipBaseClass,
                  "min-h-[24px] border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[9px] text-emerald-800 dark:text-emerald-200 sm:min-h-[26px] sm:text-[10px]",
                )}
              >
                <Sparkles className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden /> Nivel {healthTier}
              </span>
              <span
                className={cn(
                  financeHeroChipBaseClass,
                  "min-h-[24px] max-w-full border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[9px] text-violet-900 dark:text-violet-200 sm:min-h-[26px] sm:max-w-none sm:text-[10px]",
                )}
              >
                <Flame className="h-3 w-3 shrink-0 sm:h-3.5 sm:w-3.5" aria-hidden />{" "}
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {challengeCount} foco{challengeCount === 1 ? "" : "s"} alta prioridad
                </span>
              </span>
            </div>
          </div>
          <div className="w-[min(44%,11rem)] shrink-0 rounded-xl bg-orbita-surface-alt/35 px-2.5 py-2 sm:w-auto sm:max-w-[min(100%,280px)] sm:px-3 sm:py-2.5">
            <p className={cn(financeSectionEyebrowClass, "text-[9px] sm:text-[10px]")}>Score de salud</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums text-orbita-primary sm:text-3xl">{healthScore}</p>
            <div className="mt-1.5 h-1.5 rounded-full bg-orbita-surface-alt/80 sm:mt-2 sm:h-2">
              <div
                className="h-full rounded-full bg-[linear-gradient(90deg,var(--color-accent-finance),#10b981)] transition-all sm:h-2"
                style={{ width: `${scoreProgress}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] leading-snug text-orbita-muted sm:text-[11px]">Meta: {scoreToNext}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="pl-cfo-kpi-heading" className="space-y-3">
        <div className="flex min-w-0 flex-col gap-0">
          <h3 id="pl-cfo-kpi-heading" className={financeSectionEyebrowClass}>
            Métricas clave
          </h3>
          <p className={financeSectionIntroClass}>
            Tres pasos: bruto → operativo y resultado → márgenes sobre ingresos.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5 [&>*]:min-h-0">
          <KpiFlowCluster
            step={1}
            title="Capa bruta"
            hint="Lo que entra y el gasto total del mapa."
            bridgeLabel="Variación vs mes previo"
            rowA={{
              label: "Ingresos",
              value: metrics.income,
              deltaPct: metrics.incomeMomPct,
              tone: "income",
            }}
            rowB={{
              label: "Gastos (total)",
              value: metrics.expenseTotal,
              deltaPct: metrics.expenseMomPct,
              invertDelta: true,
              tone: "expense",
            }}
          />
          <KpiFlowCluster
            step={2}
            title="Operativo → resultado"
            hint="Catálogo KPI y cierre del mes en COP."
            bridgeLabel="Del gasto operativo al neto"
            rowA={{
              label: "Gasto operativo KPI",
              value: metrics.expenseOperativoKpi,
              tone: "expense",
            }}
            rowB={{
              label: "Resultado neto",
              value: metrics.net,
              deltaPct: metrics.netMomPct,
              tone: "net",
            }}
          />
          <KpiFlowCluster
            step={3}
            title="Rentabilidad"
            hint="Lectura en % sobre ingresos."
            bridgeLabel="Dos miradas de margen"
            rowA={{
              label: "Margen neto",
              value: metrics.netMarginPct,
              suffix: "%",
              isPercent: true,
              tone: "neutral",
            }}
            rowB={{
              label: "Margen operativo (aprox.)",
              value: metrics.operatingMarginPct,
              suffix: "%",
              isPercent: true,
              tone: "neutral",
            }}
          />
        </div>
      </section>

      <section aria-labelledby="pl-cfo-strategic-heading" className="min-w-0">
        <h2 id="pl-cfo-strategic-heading" className={financeSectionEyebrowClass}>
          Lectura estratégica
        </h2>
        <div className="mt-3 grid gap-3 sm:gap-4 md:grid-cols-3 md:items-stretch">
          {strategicInsights.map((ins, idx) => (
            <StrategicInsightCard key={ins.id} ins={ins} index={idx} />
          ))}
        </div>
      </section>

      {/* Salud financiera · sin duplicar el score (ya está arriba) */}
      <section className="grid w-full min-w-0 gap-4 min-[400px]:gap-5 lg:grid-cols-[minmax(0,min(100%,22rem))_1fr] lg:items-start">
        <Card className="min-w-0 w-full border-orbita-border/75 bg-[color-mix(in_srgb,var(--color-surface-alt)_38%,var(--color-surface))] p-4 sm:p-5">
          <p className={financeSectionEyebrowClass}>Estado del periodo</p>
          <p className="mt-2 text-pretty text-sm font-semibold leading-snug text-orbita-primary [overflow-wrap:anywhere]">{healthLabel}</p>
          <p className="mt-1 text-pretty text-[11px] leading-relaxed text-orbita-muted [overflow-wrap:anywhere]">
            Derivado del mismo score de salud del bloque superior.
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
      <section aria-labelledby="pl-cfo-trend-heading" className="min-w-0">
        <h2 id="pl-cfo-trend-heading" className={financeSectionEyebrowClass}>
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
      <section aria-labelledby="pl-cfo-actions-heading" className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h2 id="pl-cfo-actions-heading" className={cn(financeSectionEyebrowClass, "m-0")}>
            Acciones sugeridas
          </h2>
          <span
            className={cn(
              financeHeroChipBaseClass,
              "border-transparent bg-orbita-surface-alt/85 py-0.5 text-[9px] text-orbita-secondary ring-1 ring-orbita-border/50 sm:text-[10px]",
            )}
          >
            <Zap className="h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            Modo misión
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-orbita-muted sm:text-xs">
          Pasos con más retorno para ordenar el mes; la barra es una guía visual, no un puntaje contable.
        </p>
        <PlCfoSuggestedActionsList actions={actions} />
      </section>
    </div>
  )
}

function insightVisualMeta(ins: PlCfoStrategicInsight): {
  Icon: LucideIcon
  chip: string
  accentBorder: string
  iconTint: string
} {
  const byId: Record<string, LucideIcon> = {
    drivers: TrendingUp,
    margins: Percent,
    pressure: Layers2,
  }
  const Icon = byId[ins.id] ?? Lightbulb
  const chip =
    ins.variant === "positive" ? "Bonus" : ins.variant === "attention" ? "Alerta" : "Radar"
  const accentBorder =
    ins.variant === "positive"
      ? "border-l-emerald-500/65"
      : ins.variant === "attention"
        ? "border-l-amber-500/65"
        : "border-l-[color-mix(in_srgb,var(--color-accent-finance)_58%,var(--color-border))]"
  const iconTint =
    ins.variant === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : ins.variant === "attention"
        ? "text-amber-600 dark:text-amber-400"
        : "text-[var(--color-accent-finance)]"
  return { Icon, chip, accentBorder, iconTint }
}

function StrategicInsightCard({ ins, index }: { ins: PlCfoStrategicInsight; index: number }) {
  const { Icon, chip, accentBorder, iconTint } = insightVisualMeta(ins)
  const VariantIcon = ins.variant === "attention" ? AlertTriangle : ins.variant === "positive" ? Trophy : Sparkles

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className="min-w-0 h-full"
    >
      <Card
        hover
        className={cn(
          "flex h-full flex-col border border-l-[3px] p-3.5 sm:p-5",
          accentBorder,
          ins.variant === "attention" && "border-amber-200/70 bg-amber-50/28 dark:border-amber-900/35 dark:bg-amber-950/18",
          ins.variant === "positive" && "border-emerald-200/65 bg-emerald-50/25 dark:border-emerald-900/35 dark:bg-emerald-950/18",
          ins.variant === "neutral" && "border-orbita-border/70 bg-orbita-surface/35",
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              financeHeroChipBaseClass,
              "border-orbita-border/60 bg-orbita-surface/80 font-semibold text-orbita-secondary",
            )}
          >
            <Zap className="h-3 w-3 text-amber-500" aria-hidden />
            {chip}
          </span>
          <span className={cn(financeCardMicroLabelClass, "inline-flex items-center gap-1 normal-case text-orbita-muted")}>
            <VariantIcon className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
            Insight
          </span>
        </div>
        <p className={cn(financeCardMicroLabelClass, "mt-3 flex items-start gap-2")}>
          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0 opacity-90", iconTint)} strokeWidth={2} aria-hidden />
          <span className="min-w-0 leading-snug">{ins.title}</span>
        </p>
        <div className="mt-2 flex flex-1 flex-col gap-3 text-pretty text-[13px] leading-[1.45] text-orbita-primary sm:gap-3.5 sm:text-sm sm:leading-relaxed">
          {ins.body.map((block, i) => {
            const alertBlock = block.text.startsWith("Atención:")
            return (
              <div key={i} className="min-w-0 space-y-1">
                {block.label ? (
                  <p className={cn(financeCardMicroLabelClass, "m-0 text-orbita-secondary")}>{block.label}</p>
                ) : null}
                <p
                  className={cn(
                    "m-0",
                    alertBlock &&
                      "rounded-md border border-amber-500/35 bg-amber-500/[0.08] px-2 py-1.5 text-[12px] font-medium leading-snug text-amber-950 dark:border-amber-500/25 dark:bg-amber-950/25 dark:text-amber-100 sm:text-[13px]",
                  )}
                >
                  {block.text}
                </p>
              </div>
            )
          })}
        </div>
      </Card>
    </motion.div>
  )
}

type MetricRowProps = {
  label: string
  value: number
  deltaPct?: number | null
  invertDelta?: boolean
  suffix?: string
  isPercent?: boolean
  tone?: "income" | "expense" | "net" | "neutral"
}

function MetricRow({
  label,
  value,
  deltaPct,
  invertDelta,
  suffix = "",
  isPercent,
  tone = "neutral",
}: MetricRowProps) {
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
    <div
      className={cn(
        "rounded-lg border border-orbita-border/45 p-2 sm:p-3 max-sm:min-h-0",
        tone === "income" && "bg-[linear-gradient(160deg,rgba(16,185,129,0.09),transparent)]",
        tone === "expense" && "bg-[linear-gradient(160deg,rgba(244,63,94,0.08),transparent)]",
        tone === "net" && "bg-[linear-gradient(160deg,rgba(16,185,129,0.07),transparent)]",
        tone === "neutral" && "bg-orbita-surface/50",
      )}
    >
      <p className={cn(financeCardMicroLabelClass, "max-sm:text-[9px]")}>{label}</p>
      <p className={cn("mt-0.5 text-[13px] font-bold tabular-nums sm:text-base", toneCls)}>
        {isPercent ? `${value.toFixed(1)}${suffix}` : `$${formatCop(value)}${suffix}`}
      </p>
      <div className="mt-1 flex items-center gap-1 text-[10px] font-medium tabular-nums text-orbita-secondary sm:text-[11px]">
        {deltaPct != null && Number.isFinite(deltaPct) ? (
          good ? (
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden />
          )
        ) : (
          <Target className="h-3.5 w-3.5 shrink-0 text-orbita-muted" aria-hidden />
        )}
        <span>{deltaLabel}</span>
      </div>
    </div>
  )
}

function KpiFlowCluster({
  step,
  title,
  hint,
  bridgeLabel,
  rowA,
  rowB,
}: {
  step: number
  title: string
  hint: string
  bridgeLabel: string
  rowA: MetricRowProps
  rowB: MetricRowProps
}) {
  const bridge = (
    <div
      className={cn(
        financeBridgeMicroLabelClass,
        "flex shrink-0 items-center justify-center gap-1 border-y border-dashed border-orbita-border/35 py-1 text-[9px] sm:py-1.5 sm:text-[10px]",
      )}
    >
      <ArrowDown className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
      <span className="min-w-0 text-center [overflow-wrap:anywhere]">{bridgeLabel}</span>
    </div>
  )

  return (
    <Card
      hover
      className="flex h-full min-h-0 flex-col border-orbita-border/65 p-2.5 sm:p-4"
      style={{
        background: "color-mix(in srgb, var(--color-surface) 92%, var(--color-surface-alt))",
      }}
    >
      <div className="flex shrink-0 items-start gap-2 sm:gap-2.5">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--color-accent-finance)_14%,transparent)] text-[11px] font-bold tabular-nums text-orbita-primary ring-1 ring-[color-mix(in_srgb,var(--color-accent-finance)_22%,var(--color-border))] sm:h-8 sm:w-8 sm:text-[12px]"
          aria-hidden
        >
          {step}
        </span>
        <div className="min-w-0">
          <p className={financeCardMicroLabelClass}>{title}</p>
          <p className={cn(financeCardHintClass, "max-sm:text-[10px] max-sm:leading-snug")}>{hint}</p>
        </div>
      </div>
      <div className="mt-2.5 hidden min-h-0 flex-1 flex-col justify-between gap-2 sm:mt-3 sm:flex">
        <MetricRow {...rowA} />
        {bridge}
        <MetricRow {...rowB} />
      </div>
      <div className="mt-2.5 grid min-h-0 flex-1 grid-cols-2 gap-x-2 gap-y-2 sm:hidden">
        <MetricRow {...rowA} />
        <MetricRow {...rowB} />
        <div className="col-span-2">{bridge}</div>
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
      <p className="text-sm font-semibold leading-snug text-orbita-primary">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-orbita-muted">{subtitle}</p>
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
