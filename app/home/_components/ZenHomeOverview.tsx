"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { CircularProgressbar, buildStyles } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"

import { CriticalAlerts } from "@/app/home/_components/CriticalAlerts"
import { CapitalOperativoPanel } from "@/app/home/_components/CapitalOperativoPanel"
import { OperationalTodayWidget } from "@/app/home/_components/OperationalTodayWidget"
import { PredictiveStrategic } from "@/app/home/_components/PredictiveStrategic"
import { SmartActionsSection } from "@/app/home/_components/SmartActionsSection"
import { MiniWidgets } from "@/app/home/_components/MiniWidgets"
import { flowToneClasses, formatBogotaDateParts, greetingForWeekday } from "@/app/home/_lib/orbita-home-format"
import type { OrbitaHomeModel, SmartAction } from "@/app/home/_lib/orbita-home-types"
import { Card } from "@/src/components/ui/Card"

type ZenTab = "sistema" | "capital" | "hoy" | "habitos"

const TABS: { id: ZenTab; label: string }[] = [
  { id: "sistema", label: "Ver todo el sistema" },
  { id: "capital", label: "Capital detallado" },
  { id: "hoy", label: "Hoy" },
  { id: "habitos", label: "Hábitos" },
]

type ZenHomeOverviewProps = {
  model: OrbitaHomeModel
  formatCOP: (n: number) => string
  onGenerateAi: () => Promise<void> | void
  isGenerating?: boolean
  onOneClickAction: (id: string) => Promise<void> | void
  onResolveWithAi: (id: string) => Promise<void> | void
  pendingAlertId?: string | null
  onSmartAction: (id: string, action: SmartAction["primaryAction"]) => Promise<void> | void
  pendingSmartActionId?: string | null
}

function flowPathColor(color: OrbitaHomeModel["flow"]["color"]) {
  if (color === "green") return "rgb(52 211 153)"
  if (color === "yellow") return "rgb(251 191 36)"
  return "rgb(251 113 133)"
}

/** KPIs sin tarjeta: chips ligeros “flotantes” sobre el fondo. */
function ZenKpiFloat({
  label,
  pct,
  tone,
}: {
  label: string
  pct: number
  tone: "sky" | "amber" | "rose"
}) {
  const fill =
    tone === "sky"
      ? "rgb(56 189 248)"
      : tone === "amber"
        ? "rgb(251 191 36)"
        : "rgb(251 113 133)"
  const w = Math.min(100, Math.max(0, pct))
  return (
    <div
      className="flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2.5 py-1.5 sm:px-3 sm:py-2"
      style={{
        background: "color-mix(in srgb, var(--color-surface-alt) 42%, transparent)",
        boxShadow: "0 1px 0 color-mix(in srgb, var(--color-text-primary) 6%, transparent)",
      }}
    >
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-orbita-primary sm:text-base">{pct}%</span>
      <div className="h-0.5 w-12 overflow-hidden rounded-full bg-orbita-border/50 sm:w-14">
        <div className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500" style={{ width: `${w}%`, background: fill }} />
      </div>
    </div>
  )
}

export function ZenHomeOverview({
  model,
  formatCOP,
  onGenerateAi,
  isGenerating,
  onOneClickAction,
  onResolveWithAi,
  pendingAlertId,
  onSmartAction,
  pendingSmartActionId,
}: ZenHomeOverviewProps) {
  const [tab, setTab] = useState<ZenTab>("sistema")
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const parts = useMemo(() => formatBogotaDateParts(now, model.user.tz), [now, model.user.tz])
  const greeting = useMemo(() => greetingForWeekday(parts.weekday.toLowerCase()), [parts.weekday])
  const tone = flowToneClasses(model.flow.color)

  const { time, energy, money } = model.capital
  const dayCapacityH = Math.max(0.25, time.availableHours)
  const timePct = Math.min(100, Math.round((time.consumedHours / dayCapacityH) * 100))
  const energyPct = Math.round(energy.currentLevelPct)
  const moneyPct = Math.min(100, Math.round(money.financialPressurePct))

  const decision = model.widgets.decisions[0]
  const smart = model.smartActions[0]
  const palancaTitle = decision?.title ?? smart?.title ?? "Elige un cierre claro para hoy"
  const palancaHint =
    decision?.pressure === "alta"
      ? "Prioridad alta"
      : decision
        ? "En radar"
        : smart
          ? smart.roi.replace(/^ROI estratégico:\s*/i, "").slice(0, 72)
          : "Abre Hoy y marca el primer movimiento."

  const primaryCta = smart
    ? {
        label: smart.primaryAction,
        onClick: () => void onSmartAction(smart.id, smart.primaryAction),
        disabled: Boolean(pendingSmartActionId),
        pending: pendingSmartActionId === smart.id,
      }
    : null

  return (
    <div className="min-w-0 space-y-6 pb-6 sm:space-y-8">
      <section className="mx-auto max-w-6xl px-4" aria-label="Modo Zen — vista principal">
        <Card
          className={[
            "relative overflow-hidden border p-4 sm:p-5",
            "border-[color-mix(in_srgb,var(--color-border)_72%,transparent)]",
            tone.glow,
          ].join(" ")}
          style={{ background: "var(--color-surface)" }}
        >
          <div
            className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full opacity-[0.12] blur-3xl"
            aria-hidden
            style={{ background: flowPathColor(model.flow.color) }}
          />

          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
            <div className="min-w-0 flex-1 space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="m-0 text-[13px] font-semibold leading-tight tracking-tight text-orbita-primary sm:text-sm">
                    {greeting}, {model.user.firstName}
                  </p>
                  <p className="mt-0.5 text-[11px] text-orbita-secondary capitalize sm:text-xs">{parts.day}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void onGenerateAi()}
                  disabled={isGenerating}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-orbita-border/50 bg-transparent px-2 py-1.5 text-[10px] font-medium text-orbita-secondary transition hover:border-orbita-border hover:text-orbita-primary disabled:opacity-50 sm:text-[11px]"
                >
                  <Sparkles className="h-3 w-3 text-[var(--color-accent-health)]" aria-hidden />
                  {isGenerating ? "IA…" : "Análisis IA"}
                </button>
              </div>

              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:gap-6">
                <div className="flex flex-col items-center gap-1.5 sm:items-start">
                  <div
                    className={["shrink-0 rounded-full p-0.5", tone.ring].join(" ")}
                    style={{ background: "color-mix(in srgb, var(--color-surface-alt) 55%, transparent)" }}
                  >
                    <div className="h-[88px] w-[88px] sm:h-[96px] sm:w-[96px]">
                      <CircularProgressbar
                        value={model.flow.score}
                        text={`${model.flow.score}`}
                        styles={buildStyles({
                          textColor: "var(--color-text-primary)",
                          pathColor: flowPathColor(model.flow.color),
                          trailColor: "color-mix(in srgb, var(--color-border) 55%, transparent)",
                          textSize: "26px",
                        })}
                      />
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <span
                      className={[
                        "inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em]",
                        tone.chip,
                      ].join(" ")}
                    >
                      Flujo · {model.flow.label}
                    </span>
                    <p className="mt-1.5 max-w-md text-center text-[11px] leading-snug text-orbita-secondary sm:text-left sm:text-xs">
                      {model.flow.microcopy}
                    </p>
                  </div>
                </div>

                <div
                  className="flex w-full min-w-0 flex-wrap items-center justify-center gap-3 sm:flex-1 sm:justify-start sm:gap-4"
                  aria-label="Capital operativo: tiempo, energía, dinero"
                >
                  <ZenKpiFloat label="Tiempo" pct={timePct} tone="sky" />
                  <ZenKpiFloat label="Energía" pct={energyPct} tone="amber" />
                  <ZenKpiFloat label="Dinero" pct={moneyPct} tone="rose" />
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-4 border-t border-orbita-border/40 pt-4">
            <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">Palanca #1 hoy</p>
            <h2 className="mt-0.5 text-base font-semibold leading-snug text-orbita-primary sm:text-lg [text-wrap:pretty]">
              {palancaTitle}
            </h2>
            <p className="mt-1 text-[11px] leading-snug text-orbita-secondary [text-wrap:pretty] sm:text-xs">{palancaHint}</p>
            <div className="mt-3 flex flex-wrap items-center gap-2 sm:gap-3">
              {primaryCta ? (
                <button
                  type="button"
                  disabled={primaryCta.disabled}
                  onClick={primaryCta.onClick}
                  className="inline-flex min-h-9 items-center justify-center rounded-lg px-3.5 py-2 text-xs font-medium transition hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
                  style={{ background: "var(--color-text-primary)", color: "var(--color-surface)" }}
                >
                  {primaryCta.pending ? "…" : primaryCta.label}
                </button>
              ) : (
                <Link
                  href="/hoy"
                  className="inline-flex min-h-9 items-center justify-center rounded-lg px-3.5 py-2 text-xs font-medium hover:opacity-90"
                  style={{ background: "var(--color-text-primary)", color: "var(--color-surface)", textDecoration: "none" }}
                >
                  Ir a Hoy
                </Link>
              )}
              <Link
                href="/agenda"
                className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium text-orbita-secondary transition hover:bg-orbita-surface-alt/60 hover:text-orbita-primary"
                style={{ textDecoration: "none" }}
              >
                Agenda
                <ArrowRight className="h-3 w-3 opacity-60" aria-hidden />
              </Link>
            </div>
          </div>
        </Card>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <div
          className="flex min-w-0 gap-0 overflow-x-auto border-b border-orbita-border/35 [scrollbar-width:thin]"
          role="tablist"
          aria-label="Más profundidad"
        >
          {TABS.map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={[
                  "-mb-px shrink-0 whitespace-nowrap border-b-2 px-2.5 py-2 text-left text-[10px] font-medium transition sm:px-3 sm:text-[11px]",
                  active
                    ? "border-orbita-primary text-orbita-primary"
                    : "border-transparent text-orbita-secondary hover:text-orbita-primary",
                ].join(" ")}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="mt-4 min-w-0" role="tabpanel">
          {tab === "sistema" ? (
            <div className="space-y-8">
              <CriticalAlerts
                alerts={model.alerts}
                onOneClickAction={onOneClickAction}
                onResolveWithAi={onResolveWithAi}
                pendingAlertId={pendingAlertId}
              />
              <PredictiveStrategic
                points={model.predictive.points30d}
                insights={model.predictive.insights}
                onRequestAiRefresh={onGenerateAi}
                isRefreshing={isGenerating}
              />
              <SmartActionsSection
                actions={model.smartActions}
                onAction={onSmartAction}
                pendingActionId={pendingSmartActionId}
              />
              <MiniWidgets
                decisions={model.widgets.decisions}
                agendaToday={model.widgets.agendaToday}
                habits={model.widgets.habits}
              />
            </div>
          ) : null}

          {tab === "capital" ? <CapitalOperativoPanel model={model} formatCOP={formatCOP} /> : null}

          {tab === "hoy" ? <OperationalTodayWidget /> : null}

          {tab === "habitos" ? (
            <div className="space-y-4">
              <MiniWidgets variant="habitsOnly" decisions={[]} agendaToday={[]} habits={model.widgets.habits} />
              <Link
                href="/habitos"
                className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-orbita-border/70 px-4 text-xs font-semibold text-orbita-primary"
                style={{ textDecoration: "none" }}
              >
                Abrir módulo Hábitos
              </Link>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
