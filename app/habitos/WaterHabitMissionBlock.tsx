"use client"

import {
  CheckCircle2,
  Circle,
  Droplets,
  Flame,
  Loader2,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-react"
import type { HabitsToggleTodayResult } from "@/app/hooks/useHabits"
import type { HabitWeekDayMark } from "@/lib/habits/habitMetrics"
import {
  bottleMlFromHabitMetadata,
  equivalentBottlesDecimal,
  formatWaterMlEs,
  glassMlFromHabitMetadata,
  goalMlFromHabitMetadata,
} from "@/lib/habits/waterTrackingHelpers"
import type { HabitWithMetrics, OperationalDomain } from "@/lib/operational/types"
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
  togglingId: string | null
  backfillingId: string | null
  backfillingAll: boolean
  incrementWaterMl: (id: string, addMl: number) => Promise<{ ok: true } | { ok: false; error: string }>
  toggleCompleteToday: (id: string) => Promise<HabitsToggleTodayResult>
  onEdit: (habit: HabitWithMetrics) => void
  onToggleStreakCelebration: (r: HabitsToggleTodayResult) => void
}

function WaterRing({ pct, gradId }: { pct: number; gradId: string }) {
  const r = 42
  const c = 2 * Math.PI * r
  const dash = Math.min(1, Math.max(0, pct / 100)) * c
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[10.5rem] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 drop-shadow-[0_4px_14px_color-mix(in_srgb,#22d3ee_25%,transparent)]" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="55%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="color-mix(in srgb, var(--color-border) 55%, transparent)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-700 motion-reduce:transition-none"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
        <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[color-mix(in_srgb,#22d3ee_88%,var(--color-text-primary))]">
          Progreso
        </span>
        <span className="font-black tabular-nums leading-none text-[clamp(1.75rem,6vw,2.35rem)] text-[var(--color-text-primary)]">
          {pct}%
        </span>
        <span className="mt-0.5 text-[9px] font-medium tabular-nums text-[var(--color-text-secondary)]">del objetivo</span>
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
  togglingId,
  backfillingId,
  backfillingAll,
  incrementWaterMl,
  toggleCompleteToday,
  onEdit,
  onToggleStreakCelebration,
}: WaterHabitMissionBlockProps) {
  if (habits.length === 0) return null

  const globalBusy = (!persistenceEnabled && !mock) || loading || backfillingAll

  return (
    <section
      aria-labelledby="water-mission-heading"
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border-2 p-4 shadow-lg sm:p-5",
        "border-[color-mix(in_srgb,#22d3ee_42%,var(--color-border))]",
        "bg-[linear-gradient(155deg,color-mix(in_srgb,#0e7490_22%,var(--color-surface))_0%,var(--color-surface)_42%,color-mix(in_srgb,#0369a1_14%,var(--color-surface))_100%)]",
        "shadow-[0_12px_40px_color-mix(in_srgb,#0891b2_14%,transparent),inset_0_1px_0_color-mix(in_srgb,white_12%,transparent)]",
      )}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,#22d3ee_22%,transparent)_0%,transparent_70%)] motion-safe:animate-pulse motion-reduce:animate-none"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-16 -left-10 h-48 w-48 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,#06b6d4_18%,transparent)_0%,transparent_72%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(255,255,255,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:14px_14px]"
        aria-hidden
      />

      <div className="relative flex flex-wrap items-start justify-between gap-3 border-b border-[color-mix(in_srgb,#22d3ee_28%,var(--color-border))] pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,#22d3ee_22%,transparent)] ring-2 ring-[color-mix(in_srgb,#22d3ee_35%,transparent)]">
            <Droplets className="h-6 w-6 text-[#0891b2] dark:text-[#67e8f9]" strokeWidth={2.25} aria-hidden />
          </div>
          <div className="min-w-0 pt-0.5">
            <p
              id="water-mission-heading"
              className="m-0 inline-flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-[0.2em] text-[color-mix(in_srgb,#0e7490_95%,var(--color-text-primary))] dark:text-[#a5f3fc]"
            >
              Misión hidratación
              <Sparkles className="h-3.5 w-3.5 text-[#fbbf24]" strokeWidth={2.25} aria-hidden />
            </p>
            <p className="m-0 mt-1 text-[12px] leading-snug text-[var(--color-text-secondary)]">
              Sumá ml, cerrá el anillo y mantené la racha. Fuera del bloque Mañana/Tarde/Noche.
            </p>
          </div>
        </div>
      </div>

      <div className="relative mt-4 flex flex-col gap-5">
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

          return (
            <article
              key={habit.id}
              className={cn(
                "relative overflow-hidden rounded-xl border bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] p-4 backdrop-blur-sm sm:p-5",
                atRisk
                  ? "border-[color-mix(in_srgb,var(--color-accent-danger)_45%,#22d3ee)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-danger)_22%,transparent)]"
                  : "border-[color-mix(in_srgb,#22d3ee_25%,var(--color-border))]",
                doneToday && "ring-2 ring-[color-mix(in_srgb,#22d3ee_50%,transparent)]",
              )}
            >
              {doneToday ? (
                <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,#22d3ee_18%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0f766e] dark:text-[#5eead4]">
                  <Trophy className="h-3 w-3" aria-hidden />
                  Meta
                </div>
              ) : null}

              <div className="grid gap-5 md:grid-cols-[minmax(0,11rem)_1fr] md:items-center md:gap-6">
                <WaterRing pct={pct} gradId={`water-ring-grad-${habit.id.replace(/[^a-zA-Z0-9_-]/g, "")}`} />

                <div className="min-w-0 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="m-0 text-lg font-bold tracking-tight text-[var(--color-text-primary)] sm:text-xl">
                        {habit.name}
                      </h3>
                      <p className="m-0 mt-0.5 text-[11px] text-[var(--color-text-secondary)]">
                        {domain} · racha{" "}
                        <span className="font-semibold text-[var(--color-text-primary)]">{streakDays}</span>{" "}
                        {streakDays === 1 ? "día" : "días"}
                      </p>
                    </div>
                    {atRisk ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-accent-danger)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-danger)_10%,transparent)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[var(--color-accent-danger)] motion-safe:animate-pulse">
                        <Zap className="h-3 w-3" aria-hidden />
                        Riesgo
                      </span>
                    ) : null}
                  </div>

                  {intention ? (
                    <p className="m-0 line-clamp-2 text-[12px] leading-snug text-[var(--color-text-secondary)]">{intention}</p>
                  ) : null}

                  <div
                    className="rounded-xl border border-[color-mix(in_srgb,#22d3ee_22%,var(--color-border))] bg-[color-mix(in_srgb,#ecfeff_35%,var(--color-surface-alt))] p-3 dark:bg-[color-mix(in_srgb,#0c4a6e_18%,var(--color-surface-alt))]"
                    role="status"
                    aria-label={`Progreso de agua: ${formatWaterMlEs(todayMl)} mililitros de ${formatWaterMlEs(goalMl)}, ${pct} por ciento, equivalente a ${bottlesEqStr} botellitas de ${bottleMl} mililitros`}
                  >
                    <dl className="m-0 grid gap-2 text-[12px] sm:grid-cols-3 sm:gap-3">
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                          Hoy (ml)
                        </dt>
                        <dd className="m-0 mt-0.5 font-bold tabular-nums text-[var(--color-text-primary)] sm:text-[13px]">
                          <span className="text-[#0891b2] dark:text-[#67e8f9]">{formatWaterMlEs(todayMl)}</span>
                          <span className="font-normal text-[var(--color-text-secondary)]"> / </span>
                          <span>{formatWaterMlEs(goalMl)}</span>
                          <span className="ml-0.5 text-[11px] font-normal text-[var(--color-text-secondary)]">ml</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                          Botellitas
                        </dt>
                        <dd className="m-0 mt-0.5 tabular-nums text-[var(--color-text-primary)] sm:text-[13px]">
                          <span className="font-bold">≈ {bottlesEqStr}</span>
                          <span className="text-[11px] text-[var(--color-text-secondary)]"> de {bottleMl} ml</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                          Objetivo
                        </dt>
                        <dd className="m-0 mt-0.5 font-bold tabular-nums text-[var(--color-text-primary)] sm:text-[13px]">{pct}%</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      disabled={
                        globalBusy ||
                        waterBusyId === habit.id ||
                        togglingId === habit.id ||
                        backfillingId === habit.id
                      }
                      onClick={async () => {
                        setWaterBusyId(habit.id)
                        try {
                          const r = await incrementWaterMl(habit.id, bottleMl)
                          if (!r.ok) alert(r.error || "No se pudo registrar")
                        } finally {
                          setWaterBusyId(null)
                        }
                      }}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[linear-gradient(180deg,#22d3ee_0%,#0891b2_100%)] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_0_color-mix(in_srgb,#0e7490_90%,black),0_8px_20px_color-mix(in_srgb,#06b6d4_35%,transparent)] transition-transform active:translate-y-0.5 active:shadow-none disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none sm:min-w-[11rem]"
                    >
                      {waterBusyId === habit.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Droplets className="h-4 w-4 opacity-95" aria-hidden />
                      )}
                      +1 Botellita (+{formatWaterMlEs(bottleMl)} ml)
                    </button>
                    <button
                      type="button"
                      disabled={
                        globalBusy ||
                        waterBusyId === habit.id ||
                        togglingId === habit.id ||
                        backfillingId === habit.id
                      }
                      onClick={async () => {
                        setWaterBusyId(habit.id)
                        try {
                          const r = await incrementWaterMl(habit.id, glassMl)
                          if (!r.ok) alert(r.error || "No se pudo registrar")
                        } finally {
                          setWaterBusyId(null)
                        }
                      }}
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-[color-mix(in_srgb,#22d3ee_40%,var(--color-border))] bg-[color-mix(in_srgb,#ecfeff_40%,var(--color-surface))] px-4 py-2.5 text-sm font-semibold text-[var(--color-text-primary)] shadow-sm transition-colors hover:bg-[color-mix(in_srgb,#22d3ee_10%,var(--color-surface))] disabled:cursor-not-allowed disabled:opacity-45 dark:bg-[color-mix(in_srgb,#0c4a6e_25%,var(--color-surface))] sm:min-w-[10rem]"
                    >
                      {waterBusyId === habit.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent-health)]" aria-hidden />
                      ) : null}
                      + Vaso extra (+{formatWaterMlEs(glassMl)} ml)
                    </button>
                  </div>

                  <div className="flex flex-col gap-3 border-t border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] pt-3 sm:flex-row sm:items-center sm:justify-between">
                    <div
                      role="group"
                      aria-label="Semana actual"
                      className="grid w-max shrink-0 touch-manipulation [grid-template-columns:repeat(7,22px)] gap-x-1 gap-y-0.5 sm:[grid-template-columns:repeat(7,24px)]"
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
                          ? "color-mix(in srgb, #22d3ee 28%, var(--color-surface))"
                          : isMissed
                            ? "color-mix(in srgb, var(--color-text-secondary) 10%, var(--color-surface))"
                            : "color-mix(in srgb, var(--color-surface) 70%, transparent)"
                        const chipBorder = isDone
                          ? "1px solid color-mix(in srgb, #0891b2 45%, transparent)"
                          : "1px solid color-mix(in srgb, var(--color-border) 50%, transparent)"
                        return (
                          <div
                            key={`${habit.id}-w-${day}-cell`}
                            className="flex h-9 w-full items-center justify-center rounded-md sm:h-10"
                            style={{ background: chipBg, border: chipBorder }}
                            aria-label={isDone ? `${day}: meta` : isMissed ? `${day}: pendiente` : day}
                          >
                            {isDone ? (
                              <span
                                className="block h-1.5 w-1.5 rounded-full bg-[#0891b2]"
                                style={{ boxShadow: "0 0 0 1px color-mix(in srgb, #22d3ee 40%, transparent)" }}
                              />
                            ) : isMissed ? (
                              <span className="block h-1.5 w-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-text-secondary)_45%,transparent)]" />
                            ) : null}
                          </div>
                        )
                      })}
                    </div>

                    <div className="flex flex-row items-center justify-end gap-2 sm:flex-col sm:items-stretch">
                      <button
                        type="button"
                        disabled={!persistenceEnabled && !mock}
                        onClick={() => onEdit(habit)}
                        className="min-h-9 rounded-lg px-2 text-xs font-medium text-[var(--color-text-secondary)] underline-offset-2 hover:text-[var(--color-text-primary)] hover:underline"
                      >
                        Editar misión
                      </button>
                      <button
                        type="button"
                        disabled={
                          (!persistenceEnabled && !mock) ||
                          loading ||
                          togglingId === habit.id ||
                          backfillingId === habit.id ||
                          backfillingAll
                        }
                        aria-label={doneToday ? "Deshacer meta de hoy" : "Marcar meta cumplida hoy"}
                        title={doneToday ? "Deshacer hoy" : "Meta hoy"}
                        onClick={async () => {
                          const r = await toggleCompleteToday(habit.id)
                          if (!r.ok) alert(r.error || "No se pudo actualizar")
                          else onToggleStreakCelebration(r)
                        }}
                        className="inline-flex h-11 w-11 items-center justify-center rounded-xl border-2 border-[color-mix(in_srgb,#22d3ee_35%,var(--color-border))] bg-[var(--color-surface)] shadow-inner transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        {togglingId === habit.id ? (
                          <Loader2 className="h-5 w-5 animate-spin text-[#0891b2]" aria-hidden />
                        ) : doneToday ? (
                          <CheckCircle2 className="h-5 w-5 text-[#0891b2]" strokeWidth={2} aria-hidden />
                        ) : (
                          <Circle className="h-5 w-5 text-[var(--color-text-secondary)]" strokeWidth={2} aria-hidden />
                        )}
                      </button>
                    </div>
                  </div>

                  <p className="m-0 flex items-center gap-1.5 text-[11px] text-[var(--color-text-secondary)]">
                    <Flame className="h-3.5 w-3.5 shrink-0 text-orange-500" aria-hidden />
                    Cada día con la meta de ml cuenta para tu racha y consistencia.
                  </p>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
