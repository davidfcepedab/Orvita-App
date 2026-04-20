"use client"

import type { CSSProperties } from "react"
import { Droplets, Loader2, Sparkles, Trophy } from "lucide-react"
import type { HabitWeekDayMark } from "@/lib/habits/habitMetrics"
import { buildWaterPacingNudge } from "@/lib/habits/waterPacingNudge"
import {
  bottleMlFromHabitMetadata,
  equivalentBottlesDecimal,
  formatWaterMlEs,
  glassMlFromHabitMetadata,
  goalMlFromHabitMetadata,
} from "@/lib/habits/waterTrackingHelpers"
import type { HabitWithMetrics, OperationalDomain } from "@/lib/operational/types"
import { Card } from "@/src/components/ui/Card"
import { cn } from "@/lib/utils"

const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"] as const

function weekMarksForHabit(habit: HabitWithMetrics): HabitWeekDayMark[] {
  const w = habit.metrics.week_marks
  if (Array.isArray(w) && w.length === 7) return w
  return DAY_LETTERS.map(() => "off" as HabitWeekDayMark)
}

export type WaterHabitMissionBlockProps = {
  habits: HabitWithMetrics[]
  domainLabels: Record<OperationalDomain, string>
  persistenceEnabled: boolean
  mock: boolean
  loading: boolean
  waterBusyId: string | null
  setWaterBusyId: (id: string | null) => void
  backfillingId: string | null
  backfillingAll: boolean
  incrementWaterMl: (id: string, addMl: number) => Promise<{ ok: true } | { ok: false; error: string }>
  onEdit: (habit: HabitWithMetrics) => void
}

function WaterRing({ pct, gradId }: { pct: number; gradId: string }) {
  const r = 40
  const c = 2 * Math.PI * r
  const dash = Math.min(1, Math.max(0, pct / 100)) * c
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[8.25rem] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="55%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="color-mix(in srgb, var(--color-border) 50%, transparent)" strokeWidth="8" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-700 motion-reduce:transition-none"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
        <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">Hoy</span>
        <span className="font-black tabular-nums leading-none text-[clamp(1.35rem,4.5vw,1.85rem)] text-[var(--color-text-primary)]">{pct}%</span>
        <span className="mt-0.5 text-[8px] font-medium tabular-nums text-[var(--color-text-secondary)]">objetivo</span>
      </div>
    </div>
  )
}

export function WaterHabitMissionBlock({
  habits,
  domainLabels,
  persistenceEnabled,
  mock,
  loading,
  waterBusyId,
  setWaterBusyId,
  backfillingId,
  backfillingAll,
  incrementWaterMl,
  onEdit,
}: WaterHabitMissionBlockProps) {
  if (habits.length === 0) return null

  const globalBusy = (!persistenceEnabled && !mock) || loading || backfillingAll

  const sectionSurface: CSSProperties = {
    display: "grid",
    gap: "var(--spacing-sm)",
    background: "color-mix(in srgb, #22d3ee 9%, var(--color-surface))",
    borderColor: "color-mix(in srgb, #0891b2 22%, var(--color-border))",
  }

  return (
    <section
      aria-labelledby="water-mission-heading"
      className="rounded-[12px] border p-3 sm:p-4"
      style={sectionSurface}
    >
      <div className="flex flex-wrap items-start gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] pb-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,#22d3ee_16%,transparent)]"
          aria-hidden
        >
          <Droplets className="h-5 w-5 text-[#0891b2] dark:text-[#67e8f9]" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p
            id="water-mission-heading"
            className="m-0 inline-flex flex-wrap items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-primary)]"
          >
            Hidratación
            <Sparkles className="h-3.5 w-3.5 text-amber-500" strokeWidth={2} aria-hidden />
          </p>
          <p className="m-0 mt-0.5 text-[12px] leading-snug text-[var(--color-text-secondary)]">
            Misión del sistema: sumá ml durante el día; no usa Mañana / Tarde / Noche del stack.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-[var(--spacing-sm)]">
        {habits.map((habit) => {
          const goalMl = goalMlFromHabitMetadata(habit.metadata)
          const bottleMl = bottleMlFromHabitMetadata(habit.metadata)
          const glassMl = glassMlFromHabitMetadata(habit.metadata)
          const todayMl = habit.water_today_ml ?? 0
          const pct = goalMl > 0 ? Math.min(100, Math.round((todayMl / goalMl) * 100)) : 0
          const bottlesEq = equivalentBottlesDecimal(todayMl, bottleMl)
          const bottlesEqStr = bottlesEq.toLocaleString("es-ES", { maximumFractionDigits: 1 })
          const doneToday = habit.metrics.completed_today
          const streakDays = habit.metrics.current_streak
          const weekMarks = weekMarksForHabit(habit)
          const intention = habit.metadata?.intention?.trim()
          const domain = domainLabels[habit.domain] ?? habit.domain
          const atRisk = habit.metrics.at_risk

          const nudge = buildWaterPacingNudge(todayMl, goalMl)

          return (
            <Card
              key={habit.id}
              hover
              className={cn(
                "relative group/habit motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both motion-safe:duration-500 hover:-translate-y-0.5",
                doneToday && "ring-1 ring-[color-mix(in_srgb,var(--color-accent-health)_35%,transparent)]",
              )}
              style={{
                background: "var(--color-surface)",
                borderColor: atRisk
                  ? "color-mix(in srgb, var(--color-accent-danger) 40%, var(--color-border))"
                  : "var(--color-border)",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.07)",
              }}
            >
              {doneToday ? (
                <div className="pointer-events-none absolute right-2.5 top-2.5 flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-accent-health)_14%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent-health)]">
                  <Trophy className="h-3 w-3" aria-hidden />
                  Meta
                </div>
              ) : null}

              <div className="relative flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 sm:px-3 sm:py-2.5">
                <div className="min-w-0 flex-1 space-y-2 px-3 pt-3 sm:max-w-[min(100%,22rem)] sm:flex-none sm:px-0 sm:pt-0">
                  <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:items-center sm:gap-2">
                    <p
                      className="m-0 min-w-0 max-w-full font-semibold text-[var(--color-text-primary)] sm:min-w-0 sm:flex-1 sm:truncate"
                      style={{ fontSize: "15px", lineHeight: 1.35 }}
                      title={habit.name}
                    >
                      {habit.name}
                    </p>
                    {atRisk ? (
                      <span
                        className="shrink-0 motion-safe:animate-pulse"
                        style={{
                          fontSize: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                          padding: "2px 8px",
                          borderRadius: "999px",
                          background: "color-mix(in srgb, var(--color-accent-danger) 12%, transparent)",
                          color: "var(--color-accent-danger)",
                        }}
                      >
                        Riesgo ruptura
                      </span>
                    ) : null}
                  </div>
                  <div
                    className="flex flex-wrap gap-1.5 text-[10px] text-[var(--color-text-secondary)]"
                    title="La racha cuenta días en los que alcanzás la meta de ml."
                  >
                    <span>{domain}</span>
                    <span>•</span>
                    <span>diario</span>
                    <span>•</span>
                    <span>
                      {streakDays} {streakDays === 1 ? "día de racha" : "días de racha"}
                    </span>
                  </div>
                  {intention ? (
                    <p className="m-0 line-clamp-2 text-[11px] leading-snug text-[var(--color-text-secondary)] transition-colors group-hover/habit:text-[var(--color-text-primary)]">
                      {intention}
                    </p>
                  ) : null}

                  {nudge ? (
                    <div
                      className={cn(
                        "m-0 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface-alt)] py-2 pl-3 pr-2.5 text-[11px] leading-snug text-[var(--color-text-secondary)]",
                        nudge.tone === "urgent"
                          ? "border-l-[3px] border-l-[var(--color-accent-danger)]"
                          : "border-l-[3px] border-l-amber-500",
                      )}
                      role="status"
                    >
                      <span className="font-semibold text-[var(--color-text-primary)]">{nudge.title}</span>
                      <span className="text-[var(--color-text-secondary)]"> — </span>
                      <span>{nudge.body}</span>
                    </div>
                  ) : null}

                  <div
                    className="flex flex-wrap items-center gap-1.5"
                    role="status"
                    aria-label={`Progreso de agua: ${formatWaterMlEs(todayMl)} de ${formatWaterMlEs(goalMl)} mililitros, ${pct} por ciento, unas ${bottlesEqStr} botellitas de ${bottleMl} ml`}
                  >
                    <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface-alt)] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[var(--color-text-primary)]">
                      <Droplets className="h-3 w-3 shrink-0 text-[var(--color-accent-health)]" aria-hidden />
                      {formatWaterMlEs(todayMl)} / {formatWaterMlEs(goalMl)} ml
                    </span>
                    <span className="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[var(--color-surface-alt)] px-2 py-0.5 text-[10px] font-medium tabular-nums text-[var(--color-text-secondary)]">
                      ≈ {bottlesEqStr} bot. ({bottleMl} ml)
                    </span>
                    <span className="inline-flex items-center rounded-full border border-[color-mix(in_srgb,var(--color-accent-health)_22%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_6%,var(--color-surface-alt))] px-2 py-0.5 text-[10px] font-bold tabular-nums text-[var(--color-accent-health)]">
                      Nivel {pct}%
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      disabled={globalBusy || waterBusyId === habit.id || backfillingId === habit.id}
                      onClick={async () => {
                        setWaterBusyId(habit.id)
                        try {
                          const r = await incrementWaterMl(habit.id, bottleMl)
                          if (!r.ok) alert(r.error || "No se pudo registrar")
                        } finally {
                          setWaterBusyId(null)
                        }
                      }}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-[linear-gradient(180deg,color-mix(in_srgb,#22d3ee_92%,white)_0%,#0891b2_100%)] px-3 py-2 text-xs font-bold text-white shadow-[0_2px_0_color-mix(in_srgb,#0e7490_85%,#000)] transition-transform active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none sm:min-w-[10.5rem]"
                    >
                      {waterBusyId === habit.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Droplets className="h-4 w-4 opacity-95" aria-hidden />
                      )}
                      +1 botellita (+{formatWaterMlEs(bottleMl)} ml)
                    </button>
                    <button
                      type="button"
                      disabled={globalBusy || waterBusyId === habit.id || backfillingId === habit.id}
                      onClick={async () => {
                        setWaterBusyId(habit.id)
                        try {
                          const r = await incrementWaterMl(habit.id, glassMl)
                          if (!r.ok) alert(r.error || "No se pudo registrar")
                        } finally {
                          setWaterBusyId(null)
                        }
                      }}
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[var(--color-surface-alt)] px-3 py-2 text-xs font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_6%,var(--color-surface-alt))] disabled:cursor-not-allowed disabled:opacity-45 sm:min-w-[9.5rem]"
                    >
                      {waterBusyId === habit.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent-health)]" aria-hidden />
                      ) : null}
                      + Vaso (+{formatWaterMlEs(glassMl)} ml)
                    </button>
                  </div>
                </div>

                <div className="mx-3 h-px shrink-0 bg-[var(--color-border)] sm:hidden" aria-hidden />

                <div className="flex w-full flex-col items-center gap-4 px-3 pb-3 sm:ml-auto sm:w-auto sm:shrink-0 sm:flex-row sm:items-center sm:justify-end sm:gap-2.5 sm:px-0 sm:pb-0">
                  <WaterRing pct={pct} gradId={`water-ring-grad-${habit.id.replace(/[^a-zA-Z0-9_-]/g, "")}`} />

                  <div className="hidden h-[52px] w-px shrink-0 bg-[var(--color-border)] sm:block" aria-hidden />

                  <div
                    role="group"
                    aria-label="Semana actual"
                    className="grid w-max shrink-0 touch-manipulation [grid-template-columns:repeat(7,22px)] gap-x-1 gap-y-0.5 sm:[grid-template-columns:repeat(7,24px)] sm:gap-x-1 sm:gap-y-1"
                  >
                    {DAY_LETTERS.map((day, dIdx) => {
                      const mark = weekMarks[dIdx]
                      const neutralDay = mark === "off" || mark === "upcoming"
                      const isMissed = mark === "missed"
                      const letterColor =
                        neutralDay && !isMissed
                          ? "color-mix(in srgb, var(--color-text-secondary) 50%, var(--color-text-primary))"
                          : "var(--color-text-primary)"
                      return (
                        <div
                          key={`${habit.id}-w-${day}-lbl`}
                          className="select-none text-center text-[10px] font-semibold uppercase leading-none sm:text-[11px]"
                          style={{ color: letterColor }}
                        >
                          {day}
                        </div>
                      )
                    })}
                    {DAY_LETTERS.map((day, dIdx) => {
                      const mark = weekMarks[dIdx]
                      const isDone = mark === "done"
                      const isMissed = mark === "missed"
                      const chipBg = isDone
                        ? "color-mix(in srgb, color-mix(in srgb, var(--color-accent-health) 16%, var(--color-surface)) 72%, transparent)"
                        : isMissed
                          ? "color-mix(in srgb, color-mix(in srgb, var(--color-text-secondary) 8%, var(--color-surface)) 65%, transparent)"
                          : "color-mix(in srgb, var(--color-surface) 58%, transparent)"
                      const chipBorder = isDone
                        ? "1px solid color-mix(in srgb, var(--color-accent-health) 32%, transparent)"
                        : "1px solid color-mix(in srgb, var(--color-border) 45%, transparent)"
                      const aria =
                        mark === "done"
                          ? `${day}: meta`
                          : mark === "missed"
                            ? `${day}: pendiente`
                            : `${day}: sin marca destacada`
                      return (
                        <div
                          key={`${habit.id}-w-${day}-cell`}
                          className="flex h-[44px] w-full items-center justify-center rounded-[5px] transition-all duration-200 motion-safe:group-hover/habit:scale-[1.02] sm:h-[48px]"
                          style={{
                            background: chipBg,
                            border: chipBorder,
                            boxShadow: isDone
                              ? "0 1px 0 color-mix(in srgb, var(--color-accent-health) 14%, transparent)"
                              : "none",
                            transitionDelay: `${dIdx * 14}ms`,
                          }}
                          aria-label={aria}
                        >
                          {isDone ? (
                            <span
                              className="motion-safe:animate-in motion-safe:zoom-in-50 motion-safe:duration-200 block h-[5px] w-[5px] shrink-0 rounded-full"
                              style={{
                                background: "color-mix(in srgb, var(--color-accent-health) 88%, #14532d)",
                                boxShadow: "0 0 0 1px color-mix(in srgb, var(--color-accent-health) 25%, transparent)",
                              }}
                            />
                          ) : isMissed ? (
                            <span className="block h-[5px] w-[5px] shrink-0 rounded-full border border-[color-mix(in_srgb,var(--color-text-secondary)_40%,transparent)] bg-transparent" />
                          ) : null}
                        </div>
                      )
                    })}
                  </div>

                  <div className="hidden h-[52px] w-px shrink-0 bg-[var(--color-border)] sm:block" aria-hidden />

                  <div className="flex shrink-0 flex-col items-center gap-1 sm:items-stretch">
                    <button
                      type="button"
                      disabled={!persistenceEnabled && !mock}
                      onClick={() => onEdit(habit)}
                      className="min-h-[36px] min-w-[52px] rounded-md text-xs font-medium sm:min-h-0 sm:w-full sm:py-0.5 sm:text-left"
                      style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: "11px" }}
                    >
                      Meta y vasos…
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
