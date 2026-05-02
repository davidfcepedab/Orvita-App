"use client"

import type { LucideIcon } from "lucide-react"
import Link from "next/link"
import {
  ArrowRight,
  BarChart3,
  Brain,
  FileSearch,
  Landmark,
  Layers,
  ListTodo,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import { cn } from "@/lib/utils"

export type CapitalGameSnapshot = {
  kpiHasSignal: boolean
  income: number
  expense: number
  net: number
  savingsRate: number
  deltaNet: number | null
  runway: number
  pressurePct: number | null
}

type Props = {
  monthDisplay: string
  snapshot: CapitalGameSnapshot
  formatMoney: (value: number) => string
  strategicInsights: string[]
}

function pressureTone(pct: number): string {
  if (pct >= 92) return "var(--color-accent-danger)"
  if (pct >= 78) return "var(--color-accent-warning)"
  return "var(--color-accent-finance)"
}

export function CapitalOverviewStrategicDeck({ monthDisplay, snapshot, formatMoney, strategicInsights }: Props) {
  const { kpiHasSignal, income, expense, net, savingsRate, deltaNet, runway, pressurePct } = snapshot

  const netPositive = net > 0.5
  const netDeficit = net < -0.5
  const gameLabel = !kpiHasSignal ? "Sin lectura" : netDeficit ? "Déficit" : netPositive ? "Superávit" : "Equilibrio"
  const gameBadgeClass = !kpiHasSignal
    ? "border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_50%,transparent)] text-[var(--color-text-secondary)]"
    : netDeficit
      ? "border-[color-mix(in_srgb,var(--color-accent-danger)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-danger)_10%,var(--color-surface))] text-[var(--color-accent-danger)]"
      : netPositive
        ? "border-[color-mix(in_srgb,var(--color-accent-health)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface))] text-[var(--color-accent-health)]"
        : "border-[color-mix(in_srgb,var(--color-accent-finance)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-finance)_10%,var(--color-surface))] text-[var(--color-accent-finance)]"

  const runwayLabel =
    !kpiHasSignal ? "—" : runway > 0 && net > 0 ? `${runway.toFixed(1)} meses` : net <= 0 ? "En déficit" : "—"

  const barPct = pressurePct != null ? Math.max(4, Math.min(100, pressurePct)) : 0

  const gameStatusBadge = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em]",
        gameBadgeClass,
      )}
    >
      {netDeficit ? <TrendingDown className="h-3 w-3" aria-hidden /> : null}
      {netPositive ? <TrendingUp className="h-3 w-3" aria-hidden /> : null}
      {!netDeficit && !netPositive && kpiHasSignal ? <Shield className="h-3 w-3 opacity-80" aria-hidden /> : null}
      {gameLabel}
    </span>
  )

  return (
    <div className="min-w-0 space-y-4 sm:space-y-5 lg:space-y-6">
      {/* 1 · Estado del juego financiero */}
      <section
        className={cn(
          "relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)]",
          "bg-[linear-gradient(148deg,color-mix(in_srgb,var(--color-accent-finance)_22%,var(--color-surface))_0%,color-mix(in_srgb,var(--color-surface-alt)_64%,var(--color-surface))_48%,var(--color-surface)_100%)]",
          "p-4 shadow-[var(--shadow-card)]",
          "dark:border-[color-mix(in_srgb,var(--color-border)_42%,transparent)]",
          "dark:bg-[linear-gradient(148deg,color-mix(in_srgb,var(--color-accent-finance)_12%,var(--color-surface))_0%,color-mix(in_srgb,var(--color-surface-alt)_45%,var(--color-surface))_55%,var(--color-surface)_100%)]",
          "sm:rounded-[22px] sm:p-5 lg:p-6",
        )}
        aria-labelledby="capital-game-state-title"
      >
        <div
          className="pointer-events-none absolute -right-12 -top-16 h-44 w-44 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-finance)_26%,transparent)_0%,transparent_70%)] dark:bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-finance)_18%,transparent)_0%,transparent_72%)]"
          aria-hidden
        />
        <div className="relative grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-8 lg:items-center">
          <div className="min-w-0 space-y-3">
            <div className="flex min-w-0 items-start justify-between gap-2">
              <p className="m-0 min-w-0 flex-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-secondary)] sm:text-[10px]">
                Estado del juego ·{" "}
                <span className="tabular-nums text-[var(--color-text-primary)]">{monthDisplay}</span>
              </p>
              <span className="shrink-0 pt-px sm:hidden">{gameStatusBadge}</span>
            </div>
            <div className="flex flex-wrap items-end gap-2 gap-y-2">
              <h2
                id="capital-game-state-title"
                className="m-0 text-[clamp(1.45rem,3.5vw,2rem)] font-bold leading-[1.06] tracking-tight text-[var(--color-text-primary)]"
              >
                {kpiHasSignal ? (
                  <>
                    <span className="block text-[13px] font-medium text-[var(--color-text-secondary)] sm:text-sm">Flujo neto del mes</span>
                    <span
                      className={cn(
                        "mt-0.5 block tabular-nums",
                        netDeficit ? "text-[var(--color-accent-danger)]" : netPositive ? "text-[var(--color-accent-finance)]" : "text-[var(--color-text-primary)]",
                      )}
                    >
                      {net >= 0 ? "+" : "−"}
                      {formatMoney(Math.abs(net))}{" "}
                      <span className="text-[0.52em] font-semibold text-[var(--color-text-secondary)]">COP</span>
                    </span>
                  </>
                ) : (
                  <span className="block max-w-[22ch] text-sm text-[var(--color-text-secondary)]">
                    Sin ingreso/gasto operativo suficiente para el tablero del mes.
                  </span>
                )}
              </h2>
              <span className="hidden sm:contents">{gameStatusBadge}</span>
            </div>
            {kpiHasSignal ? (
              <div className="flex max-sm:-mx-0.5 min-w-0 flex-nowrap items-center gap-x-2 overflow-x-auto overscroll-x-contain pb-0.5 text-[10px] [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] max-sm:tabular-nums sm:mx-0 sm:flex-wrap sm:gap-x-4 sm:gap-y-1 sm:overflow-visible sm:pb-0 sm:text-xs">
                <p className="m-0 shrink-0">
                  <span className="font-medium text-[var(--color-text-primary)]">Ahorro</span>{" "}
                  <span className="font-semibold text-[var(--color-accent-health)]">{formatMoney(savingsRate)}%</span>
                </p>
                <span className="shrink-0 text-[color-mix(in_srgb,var(--color-border)_65%,transparent)] max-sm:px-px sm:hidden" aria-hidden>
                  ·
                </span>
                <p
                  className="m-0 shrink-0 whitespace-nowrap"
                  {...(deltaNet != null && Number.isFinite(deltaNet)
                    ? {
                        "aria-label": `Cambio de flujo respecto al mes anterior: ${deltaNet >= 0 ? "más" : "menos"} ${Math.abs(deltaNet).toFixed(1)} por ciento`,
                      }
                    : {})}
                >
                  <span className="hidden font-medium text-[var(--color-text-primary)] sm:inline">Cambio flujo</span>
                  <span className="font-medium text-[var(--color-text-primary)] sm:hidden">Δ flujo</span>
                  {" · "}
                  {deltaNet != null && Number.isFinite(deltaNet) ? (
                    <>
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          deltaNet >= 0 ? "text-[var(--color-accent-health)]" : "text-[var(--color-accent-danger)]",
                        )}
                      >
                        {deltaNet >= 0 ? "+" : "−"}
                        {Math.abs(deltaNet).toFixed(1)}%
                      </span>
                      <span className="text-[var(--color-text-secondary)] max-sm:hidden"> vs mes anterior</span>
                      <span className="text-[var(--color-text-secondary)] sm:hidden"> vs m-1</span>
                    </>
                  ) : (
                    <>
                      <span className="text-[var(--color-text-secondary)] max-sm:hidden">
                        Sin comparación con el mes previo
                      </span>
                      <span className="text-[var(--color-text-secondary)] sm:hidden">Sin vs m-1</span>
                    </>
                  )}
                </p>
                <span className="shrink-0 text-[color-mix(in_srgb,var(--color-border)_65%,transparent)] max-sm:px-px sm:hidden" aria-hidden>
                  ·
                </span>
                <p className="m-0 shrink-0 whitespace-nowrap">
                  <span className="font-medium text-[var(--color-text-primary)]">Cobertura</span> ·{" "}
                  <span className="tabular-nums">{runwayLabel}</span>
                </p>
              </div>
            ) : null}
          </div>

          <div className="min-w-0 space-y-3 rounded-xl border-2 border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_76%,var(--color-surface-alt))] p-3.5 shadow-[inset_0_1px_0_0_color-mix(in_srgb,var(--color-text-primary)_6%,transparent)] sm:p-4 dark:bg-[color-mix(in_srgb,var(--color-surface)_55%,transparent)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
                  Presión gasto / ingreso
                </p>
                <p className="m-0 mt-0.5 text-[11px] leading-snug text-[var(--color-text-secondary)]">
                  Gasto operativo sobre ingreso del mes.
                </p>
              </div>
              {pressurePct != null ? (
                <span
                  className="shrink-0 tabular-nums text-lg font-bold"
                  style={{ color: pressureTone(pressurePct) }}
                >
                  {pressurePct}%
                </span>
              ) : (
                <span className="shrink-0 text-xs text-[var(--color-text-secondary)]">—</span>
              )}
            </div>
            <div
              className="h-2.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-border)_50%,transparent)]"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pressurePct ?? 0}
              aria-label="Presión de gasto sobre ingresos"
            >
              <div
                className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500"
                style={{
                  width: `${barPct}%`,
                  background: pressurePct != null ? pressureTone(pressurePct) : "transparent",
                }}
              />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] tabular-nums text-[var(--color-text-secondary)] sm:text-[11px]">
              <span>
                Ingresos <span className="font-semibold text-[var(--color-accent-health)]">{formatMoney(income)}</span>
              </span>
              <span>
                Gasto op. <span className="font-semibold text-[var(--color-accent-danger)]">{formatMoney(expense)}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      <div className="grid min-w-0 gap-4 lg:grid-cols-2 lg:items-stretch lg:gap-5">
        {/* Lectura estratégica */}
        <Card className="flex h-full min-h-0 min-w-0 flex-col border border-[color-mix(in_srgb,var(--color-border)_52%,transparent)] p-4 shadow-[var(--shadow-card)] sm:p-5 lg:min-h-[300px]">
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-accent-finance)_12%,var(--color-surface))] text-[var(--color-accent-finance)]">
                <Sparkles className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
                  Lectura estratégica
                </p>
                <p className="m-0 mt-0.5 text-base font-semibold leading-tight text-[var(--color-text-primary)] sm:text-[1.05rem]">
                  Tu mes en pocas frases
                </p>
              </div>
            </div>
            <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-2 p-0">
              {strategicInsights.map((line, i) => (
                <li key={i} className="flex gap-2 text-[11px] leading-snug text-[var(--color-text-secondary)] sm:text-xs">
                  <span
                    className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-accent-finance)_50%,var(--color-border))]"
                    aria-hidden
                  />
                  <span className="min-w-0">{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>

        {/* Atajos tácticos */}
        <Card className="flex h-full min-h-0 min-w-0 flex-col border border-[color-mix(in_srgb,var(--color-border)_52%,transparent)] p-4 shadow-[var(--shadow-card)] sm:p-5 lg:min-h-[300px]">
          <div className="flex min-h-0 flex-1 flex-col gap-3">
            <div className="flex items-start gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface))] text-[var(--color-accent-health)]">
                <ListTodo className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
                  Ir al detalle
                </p>
                <p className="m-0 mt-0.5 text-base font-semibold leading-tight text-[var(--color-text-primary)] sm:text-[1.05rem]">
                  Atajos del mismo mes
                </p>
              </div>
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-2.5 sm:grid-cols-2">
              <DetailMoveCard
                href="/finanzas/transactions"
                icon={Wallet}
                title="Movimientos"
                desc="Libro del periodo y altas rápidas."
              />
              <DetailMoveCard
                href="/finanzas/categories"
                icon={Layers}
                title="Categorías"
                desc="Forecast, presupuesto y análisis."
              />
              <DetailMoveCard href="/finanzas/pl" icon={BarChart3} title="P&L" desc="Vista CFO y conciliación." />
              <DetailMoveCard
                href="/finanzas/cuentas"
                icon={Landmark}
                title="Cuentas"
                desc="Liquidez, suscripciones y simulador."
              />
              <DetailMoveCard
                href="/finanzas/insights"
                icon={Brain}
                title="Perspectivas"
                desc="Patrones e insights automáticos."
              />
              <DetailMoveCard href="/finanzas/audit" icon={FileSearch} title="Auditoría" desc="Trazas y revisiones." />
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

function DetailMoveCard({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string
  icon: LucideIcon
  title: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="group flex min-h-[4.25rem] min-w-0 gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_48%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_28%,var(--color-surface))] p-3 transition-[border-color,box-shadow,transform] duration-200 hover:border-[color-mix(in_srgb,var(--color-accent-finance)_34%,var(--color-border))] hover:shadow-[var(--shadow-hover)] motion-safe:hover:-translate-y-0.5 motion-safe:active:scale-[0.99]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--color-accent-finance)_10%,var(--color-surface))] text-[var(--color-accent-finance)] transition-colors group-hover:bg-[color-mix(in_srgb,var(--color-accent-finance)_14%,var(--color-surface))]">
        <Icon className="h-4 w-4" strokeWidth={2} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="text-sm font-semibold leading-tight text-[var(--color-text-primary)]">{title}</span>
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-text-secondary)] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" aria-hidden />
        </span>
        <span className="mt-1 block text-[11px] leading-snug text-[var(--color-text-secondary)]">{desc}</span>
      </span>
    </Link>
  )
}
