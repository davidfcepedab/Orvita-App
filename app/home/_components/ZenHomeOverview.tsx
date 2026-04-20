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

function ZenKpiPill({
  label,
  pct,
  tone,
}: {
  label: string
  pct: number
  tone: "sky" | "amber" | "rose"
}) {
  const bar =
    tone === "sky"
      ? "from-sky-500/85 to-sky-400/45"
      : tone === "amber"
        ? "from-amber-500/80 to-amber-400/45"
        : "from-rose-500/75 to-rose-400/40"
  return (
    <div className="min-w-0 flex-1 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] px-3 py-2.5 text-center shadow-[var(--shadow-card)] sm:px-4 sm:py-3">
      <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">{label}</p>
      <p className="m-0 mt-1 text-xl font-semibold tabular-nums text-orbita-primary sm:text-2xl">{pct}%</p>
      <div className="mx-auto mt-2 h-1 max-w-[4.5rem] overflow-hidden rounded-full bg-orbita-surface-alt">
        <div className={`h-full rounded-full bg-gradient-to-r ${bar}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
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
    <div className="min-w-0 space-y-8 pb-6 sm:space-y-10">
      <section className="mx-auto max-w-6xl px-4" aria-label="Modo Zen — vista principal">
        <Card
          className={[
            "relative overflow-hidden border p-5 sm:p-7",
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

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
            <div className="min-w-0 flex-1 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="m-0 text-sm font-semibold tracking-tight text-orbita-primary">
                    {greeting}, {model.user.firstName}
                  </p>
                  <p className="mt-0.5 text-xs text-orbita-secondary capitalize">{parts.day}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void onGenerateAi()}
                  disabled={isGenerating}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-orbita-border/60 bg-orbita-surface-alt/80 px-3 py-2 text-[11px] font-semibold text-orbita-primary transition hover:bg-orbita-surface-alt disabled:opacity-60"
                >
                  <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent-health)]" aria-hidden />
                  {isGenerating ? "IA…" : "Análisis IA"}
                </button>
              </div>

              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
                <div className="flex flex-col items-center gap-2">
                  <div
                    className={["shrink-0 rounded-full p-1 shadow-[var(--shadow-card)]", tone.ring].join(" ")}
                    style={{ background: "color-mix(in srgb, var(--color-surface-alt) 55%, transparent)" }}
                  >
                    <div className="h-[104px] w-[104px] sm:h-[118px] sm:w-[118px]">
                      <CircularProgressbar
                        value={model.flow.score}
                        text={`${model.flow.score}`}
                        styles={buildStyles({
                          textColor: "var(--color-text-primary)",
                          pathColor: flowPathColor(model.flow.color),
                          trailColor: "color-mix(in srgb, var(--color-border) 55%, transparent)",
                          textSize: "30px",
                        })}
                      />
                    </div>
                  </div>
                  <div className="text-center sm:text-left">
                    <span
                      className={[
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]",
                        tone.chip,
                      ].join(" ")}
                    >
                      Flujo operativo · {model.flow.label}
                    </span>
                    <p className="mt-2 max-w-md text-center text-xs leading-snug text-orbita-secondary sm:text-left sm:text-[13px]">
                      {model.flow.microcopy}
                    </p>
                  </div>
                </div>

                <div className="grid w-full min-w-0 max-w-xl grid-cols-3 gap-2 sm:gap-3">
                  <ZenKpiPill label="Tiempo" pct={timePct} tone="sky" />
                  <ZenKpiPill label="Energía" pct={energyPct} tone="amber" />
                  <ZenKpiPill label="Dinero" pct={moneyPct} tone="rose" />
                </div>
              </div>
            </div>
          </div>

          <div className="relative mt-6 border-t border-orbita-border/50 pt-6">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Palanca #1 hoy</p>
            <h2 className="mt-1 text-lg font-semibold leading-snug text-orbita-primary sm:text-xl [text-wrap:pretty]">
              {palancaTitle}
            </h2>
            <p className="mt-1.5 text-xs text-orbita-secondary [text-wrap:pretty]">{palancaHint}</p>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              {primaryCta ? (
                <button
                  type="button"
                  disabled={primaryCta.disabled}
                  onClick={primaryCta.onClick}
                  className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl px-5 text-sm font-semibold text-white shadow-[var(--shadow-card)] transition active:scale-[0.99] disabled:opacity-55 sm:max-w-xs"
                  style={{ background: "var(--color-text-primary)" }}
                >
                  {primaryCta.pending ? "Aplicando…" : primaryCta.label}
                </button>
              ) : (
                <Link
                  href="/hoy"
                  className="inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl px-5 text-sm font-semibold text-white shadow-[var(--shadow-card)] sm:max-w-xs"
                  style={{ background: "var(--color-text-primary)", textDecoration: "none" }}
                >
                  Ir a Hoy
                </Link>
              )}
              <Link
                href="/agenda"
                className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-orbita-border/70 bg-orbita-surface-alt/50 px-4 text-xs font-semibold text-orbita-primary transition hover:bg-orbita-surface-alt sm:w-auto"
                style={{ textDecoration: "none" }}
              >
                Agenda
                <ArrowRight className="h-4 w-4 opacity-70" aria-hidden />
              </Link>
            </div>
          </div>
        </Card>
      </section>

      <div className="mx-auto max-w-6xl px-4">
        <div
          className="flex min-w-0 gap-1 overflow-x-auto rounded-2xl border border-orbita-border/60 bg-orbita-surface-alt/40 p-1 [scrollbar-width:thin]"
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
                  "min-h-[44px] shrink-0 rounded-xl px-3 py-2 text-center text-[11px] font-semibold transition sm:px-4 sm:text-xs",
                  active ? "bg-orbita-surface text-orbita-primary shadow-sm" : "text-orbita-secondary hover:text-orbita-primary",
                ].join(" ")}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <div className="mt-5 min-w-0" role="tabpanel">
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
