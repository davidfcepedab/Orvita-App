"use client"

import type { CSSProperties } from "react"
import {
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react"
import type { HabitsToggleTodayResult } from "@/app/hooks/useHabits"
import type { StreakCelebrationPayload } from "@/lib/habits/streakMilestones"
import { superhabitStreakRewardMessage } from "@/lib/habits/streakMilestones"
import type { HabitMetadata, HabitWithMetrics, OperationalDomain } from "@/lib/operational/types"
import { cn } from "@/lib/utils"

type Props = {
  habits: HabitWithMetrics[]
  domainLabels: Record<OperationalDomain, string>
  persistenceEnabled: boolean
  mock: boolean
  loading: boolean
  togglingId: string | null
  backfillingId: string | null
  backfillingAll: boolean
  formatMetricLine: (meta: HabitMetadata | undefined) => string | null
  onEdit: (habit: HabitWithMetrics) => void
  onToggle: (habitId: string) => Promise<HabitsToggleTodayResult>
  onStreakCelebration: (payload: StreakCelebrationPayload) => void
}

export function FlexibleDayStackSection({
  habits,
  domainLabels,
  persistenceEnabled,
  mock,
  loading,
  togglingId,
  backfillingId,
  backfillingAll,
  formatMetricLine,
  onEdit,
  onToggle,
  onStreakCelebration,
}: Props) {
  if (habits.length === 0) return null

  const doneTodayCount = habits.filter((h) => h.metrics.completed_today).length
  const single = habits.length === 1
  const primary = habits[0]!

  const shellStyle: CSSProperties = {
    background:
      "linear-gradient(155deg, color-mix(in srgb, #7c3aed 17%, var(--color-surface)) 0%, var(--color-surface) 46%, color-mix(in srgb, #15803d 10%, var(--color-surface)) 100%)",
    borderColor: "color-mix(in srgb, #a855f7 38%, var(--color-border))",
    boxShadow:
      "0 1px 0 color-mix(in srgb, #a855f7 24%, transparent), 0 12px 36px color-mix(in srgb, #7c3aed 13%, transparent), inset 0 1px 0 color-mix(in srgb, white 10%, transparent)",
  }

  return (
    <section
      aria-labelledby="flex-stack-heading"
      className={cn(
        "relative isolate overflow-visible rounded-[14px] border-2 p-3 sm:p-4",
        "border-[color-mix(in_srgb,#a855f7_38%,var(--color-border))]",
      )}
      style={shellStyle}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,#a855f7_20%,transparent)_0%,transparent_72%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,#22c55e_13%,transparent)_0%,transparent_75%)]"
        aria-hidden
      />

      <header className="relative flex gap-2.5 border-b border-[color-mix(in_srgb,#a855f7_28%,var(--color-border))] pb-2.5 sm:gap-3 sm:pb-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,#a855f7_22%,transparent)] ring-1 ring-[color-mix(in_srgb,#a855f7_32%,transparent)] sm:h-10 sm:w-10"
          aria-hidden
        >
          <Zap className="h-[20px] w-[20px] text-violet-700 dark:text-violet-300 sm:h-[22px] sm:w-[22px]" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <p
              id="flex-stack-heading"
              className="m-0 flex min-w-0 flex-wrap items-center gap-2 text-[14px] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[15px]"
            >
              Durante el día
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500 sm:h-4 sm:w-4" strokeWidth={2} aria-hidden />
            </p>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {single && primary.metrics.completed_today ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-accent-health)_14%,var(--color-surface))] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent-health)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-health)_25%,transparent)]">
                  <Trophy className="h-3 w-3" aria-hidden />
                  Hecho hoy
                </span>
              ) : null}
              {!single ? (
                <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,#a855f7_12%,var(--color-surface))] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-800 ring-1 ring-[color-mix(in_srgb,#a855f7_28%,transparent)] dark:text-violet-200">
                  {doneTodayCount}/{habits.length} hoy
                </span>
              ) : null}
            </div>
          </div>
          <p className="m-0 max-w-prose text-[12px] leading-[1.4] text-[color-mix(in_srgb,var(--color-text-secondary)_92%,#5b21b6)] dark:text-violet-100/85 sm:text-[13px] sm:leading-[1.45]">
            Una mega tarjeta como hidratación: prioridad sobre el reloj del día (chequeos flex · supers sin hora fija).
          </p>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[color-mix(in_srgb,#a855f7_18%,transparent)] pt-1">
            <p className="m-0 min-w-0 flex-1 text-[11px] leading-snug text-[var(--color-text-secondary)] sm:text-[12px]">
              {single ? (
                <>
                  {domainLabels[primary.domain] ?? primary.domain} · {primary.metadata?.frequency ?? "diario"} ·{" "}
                  <span className="font-medium text-[var(--color-text-primary)]">{primary.metrics.current_streak}</span>{" "}
                  {primary.metrics.current_streak === 1 ? "día de racha" : "días de racha"}
                </>
              ) : (
                <>
                  <span className="font-medium text-[var(--color-text-primary)]">{habits.length}</span> hábitos en esta
                  misión prioritaria
                </>
              )}
            </p>
          </div>
        </div>
      </header>

      <div className="mt-0 flex flex-col gap-0">
        {habits.map((habit, habitIndex) => {
          const isSuper = Boolean(habit.metadata?.is_superhabit)
          const intraday = Boolean(habit.metadata?.intraday_si_no_progress)
          const checks = habit.metadata?.intraday_si_no_target_checks
          const doneToday = habit.metrics.completed_today
          const metricLine = formatMetricLine(habit.metadata)
          const intention = habit.metadata?.intention?.trim()
          const freq = habit.metadata?.frequency ?? "diario"
          const streakDays = habit.metrics.current_streak
          const reward = isSuper ? superhabitStreakRewardMessage(streakDays) : null
          const domain = domainLabels[habit.domain] ?? habit.domain

          return (
            <div
              key={habit.id}
              className={cn(
                "overflow-visible",
                habitIndex > 0 && "mt-3 border-t border-[color-mix(in_srgb,#a855f7_22%,var(--color-border))] pt-3",
                habitIndex === 0 && "pt-2",
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 text-[14px] font-semibold leading-snug text-[var(--color-text-primary)] sm:text-[15px]">
                      {habit.name}
                    </h3>
                    {isSuper ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-accent-warning)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-warning)_12%,var(--color-surface))] px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-[color-mix(in_srgb,var(--color-accent-warning)_95%,#713f12)]">
                        <Trophy className="h-3 w-3" aria-hidden />
                        Super
                      </span>
                    ) : null}
                    {intraday && checks != null ? (
                      <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,#22c55e_12%,var(--color-surface-alt))] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">
                        Meta {checks} chequeos
                      </span>
                    ) : null}
                  </div>
                  <p className="m-0 text-[11px] text-[var(--color-text-secondary)] sm:text-[12px]">
                    {domain} · {freq} ·{" "}
                    <span className="font-medium text-[var(--color-text-primary)]">{streakDays}</span>{" "}
                    {streakDays === 1 ? "día de racha" : "días de racha"}
                  </p>
                  {intention ? (
                    <p className="m-0 line-clamp-2 text-[11px] leading-snug text-[var(--color-text-secondary)] sm:text-[12px]">
                      {intention}
                    </p>
                  ) : null}
                  {metricLine ? (
                    <p className="m-0 flex items-start gap-1.5 text-[11px] leading-snug text-[var(--color-text-secondary)]">
                      <Target className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--color-accent-health)] opacity-90" aria-hidden />
                      <span>{metricLine}</span>
                    </p>
                  ) : null}
                  {reward ? (
                    <p className="m-0 text-[11px] text-[var(--color-accent-health)] sm:text-[12px]">{reward}</p>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end sm:pt-0.5">
                  <button
                    type="button"
                    disabled={!persistenceEnabled && !mock}
                    onClick={() => onEdit(habit)}
                    className="rounded-md py-1 text-right text-[13px] font-medium text-[var(--color-accent-health)] underline-offset-2 hover:underline disabled:opacity-40"
                  >
                    Editar
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
                    aria-label={doneToday ? "Deshacer completado de hoy" : "Marcar hecho hoy"}
                    title={doneToday ? "Deshacer hoy" : "Hecho hoy"}
                    onClick={async () => {
                      const r = await onToggle(habit.id)
                      if (!r.ok) alert(r.error || "No se pudo actualizar")
                      else if (r.streakCelebration) onStreakCelebration(r.streakCelebration)
                    }}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,#a855f7_32%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface-alt)_55%,var(--color-surface))] shadow-sm transition-[transform,opacity] active:scale-[0.97] motion-safe:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    {togglingId === habit.id ? (
                      <Loader2 className="h-[18px] w-[18px] animate-spin text-violet-600 dark:text-violet-400" aria-hidden />
                    ) : doneToday ? (
                      <CheckCircle2 className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} aria-hidden />
                    ) : (
                      <Circle className="h-[18px] w-[18px] text-[var(--color-text-secondary)]" strokeWidth={1.75} aria-hidden />
                    )}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
