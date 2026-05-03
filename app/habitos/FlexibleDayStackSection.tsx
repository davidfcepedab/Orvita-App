"use client"

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
import { Card } from "@/src/components/ui/Card"
import type { HabitMetadata, HabitWithMetrics, OperationalDomain } from "@/lib/operational/types"

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

  return (
    <section
      aria-labelledby="flex-stack-heading"
      className="relative isolate overflow-hidden rounded-[14px] border-2 border-[color-mix(in_srgb,#a855f7_42%,var(--color-border))] p-3 sm:p-4"
      style={{
        background:
          "linear-gradient(135deg, color-mix(in srgb, #7c3aed 14%, var(--color-surface)) 0%, var(--color-surface) 42%, color-mix(in srgb, #22c55e 9%, var(--color-surface)) 100%)",
        boxShadow:
          "0 1px 0 color-mix(in srgb, #a855f7 28%, transparent), 0 14px 40px color-mix(in srgb, #7c3aed 12%, transparent)",
      }}
    >
      <div
        className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,#a855f7_22%,transparent)_0%,transparent_70%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,#22c55e_14%,transparent)_0%,transparent_75%)]"
        aria-hidden
      />

      <header className="relative mb-3 flex flex-wrap items-start gap-2.5 border-b border-[color-mix(in_srgb,#a855f7_25%,var(--color-border))] pb-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,#a855f7_20%,transparent)] ring-1 ring-[color-mix(in_srgb,#a855f7_35%,transparent)]">
          <Zap className="h-[18px] w-[18px] text-violet-600 dark:text-violet-300" strokeWidth={2.2} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p
            id="flex-stack-heading"
            className="m-0 flex flex-wrap items-center gap-2 text-[13px] font-semibold leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-[14px]"
          >
            Durante el día
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500" aria-hidden />
          </p>
          <p className="m-0 mt-0.5 text-[11px] leading-snug text-[var(--color-text-secondary)] sm:text-[12px]">
            Chequeos flexibles y superhábitos sin hora fija: van aquí con prioridad (no quedan abajo en «sin hora»).
          </p>
        </div>
      </header>

      <div className="relative space-y-2.5">
        {habits.map((habit, idx) => {
          const isSuper = Boolean(habit.metadata?.is_superhabit)
          const intraday = Boolean(habit.metadata?.intraday_si_no_progress)
          const checks = habit.metadata?.intraday_si_no_target_checks
          const doneToday = habit.metrics.completed_today
          const metricLine = formatMetricLine(habit.metadata)
          const intention = habit.metadata?.intention?.trim()
          const freq = habit.metadata?.frequency ?? "diario"
          const streakDays = habit.metrics.current_streak
          const reward = isSuper ? superhabitStreakRewardMessage(streakDays) : null

          return (
            <Card
              key={habit.id}
              hover
              className="group/flex overflow-hidden border-[color-mix(in_srgb,#a855f7_28%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] shadow-sm transition-transform motion-safe:hover:-translate-y-0.5"
              style={{
                animationDelay: `${Math.min(idx, 12) * 40}ms`,
              }}
            >
              <div className="flex flex-col gap-2.5 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:p-3.5">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 text-[14px] font-semibold leading-snug text-[var(--color-text-primary)]">
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
                  <p className="m-0 text-[10px] text-[var(--color-text-secondary)] sm:text-[11px]">
                    {domainLabels[habit.domain] ?? habit.domain} · {freq} ·{" "}
                    <span className="font-medium text-[var(--color-text-primary)]">{streakDays}</span>{" "}
                    {streakDays === 1 ? "día de racha" : "días de racha"}
                  </p>
                  {intention ? (
                    <p className="m-0 line-clamp-2 text-[11px] leading-snug text-[var(--color-text-secondary)]">{intention}</p>
                  ) : null}
                  {metricLine ? (
                    <p className="m-0 flex items-start gap-1 text-[10px] leading-snug text-[var(--color-text-secondary)]">
                      <Target className="mt-0.5 h-3 w-3 shrink-0 text-[var(--color-accent-health)] opacity-85" aria-hidden />
                      <span>{metricLine}</span>
                    </p>
                  ) : null}
                  {reward ? <p className="m-0 text-[10px] text-[var(--color-accent-health)]">{reward}</p> : null}
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                  <button
                    type="button"
                    disabled={!persistenceEnabled && !mock}
                    onClick={() => onEdit(habit)}
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-40"
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
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,#a855f7_35%,var(--color-border))] bg-[color-mix(in_srgb,#faf5ff_40%,var(--color-surface))] transition-transform active:scale-[0.97] motion-safe:hover:scale-[1.03] disabled:cursor-not-allowed disabled:opacity-45 dark:bg-[color-mix(in_srgb,#4c1d95_18%,var(--color-surface))]"
                  >
                    {togglingId === habit.id ? (
                      <Loader2 className="h-[18px] w-[18px] animate-spin text-violet-600" aria-hidden />
                    ) : doneToday ? (
                      <CheckCircle2 className="h-[18px] w-[18px] text-emerald-600" strokeWidth={1.75} aria-hidden />
                    ) : (
                      <Circle className="h-[18px] w-[18px] text-[var(--color-text-secondary)]" strokeWidth={1.75} aria-hidden />
                    )}
                  </button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </section>
  )
}
