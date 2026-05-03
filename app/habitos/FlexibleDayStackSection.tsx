"use client"

import type { CSSProperties } from "react"
import {
  Award,
  CheckCircle2,
  Circle,
  Crown,
  Flame,
  Loader2,
  Medal,
  Sparkles,
  Star,
  Target,
  Trophy,
  Zap,
} from "lucide-react"
import type { HabitsToggleTodayResult } from "@/app/hooks/useHabits"
import { HabitTodayProgressBar } from "@/app/components/habits/HabitTodayProgressBar"
import type { StreakCelebrationPayload } from "@/lib/habits/streakMilestones"
import { superhabitStreakRewardMessage } from "@/lib/habits/streakMilestones"
import {
  habitShowsTodayProgressBar,
  habitTodayProgressUi,
} from "@/lib/habits/habitTodayProgressUi"
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
  const primaryDomain = domainLabels[primary.domain] ?? primary.domain
  const primaryIntention = primary.metadata?.intention?.trim()
  const primaryFreq = primary.metadata?.frequency ?? "diario"
  const hasSuperHabit = habits.some((h) => h.metadata?.is_superhabit)
  const superHero = single && hasSuperHabit

  const baseShell: CSSProperties = {
    background:
      "linear-gradient(155deg, color-mix(in srgb, #7c3aed 20%, var(--color-surface)) 0%, var(--color-surface) 44%, color-mix(in srgb, #15803d 12%, var(--color-surface)) 100%)",
    borderColor: "color-mix(in srgb, #a855f7 42%, var(--color-border))",
    boxShadow:
      "0 1px 0 color-mix(in srgb, #a855f7 28%, transparent), 0 20px 50px color-mix(in srgb, #7c3aed 16%, transparent), 0 10px 30px color-mix(in srgb, #22c55e 8%, transparent), inset 0 1px 0 color-mix(in srgb, white 12%, transparent)",
  }

  const superShell: CSSProperties = {
    background:
      "linear-gradient(146deg, color-mix(in srgb, #fbbf24 13%, color-mix(in srgb, #7c3aed 16%, var(--color-surface))) 0%, var(--color-surface) 40%, color-mix(in srgb, #15803d 14%, color-mix(in srgb, #f59e0b 9%, var(--color-surface))) 100%)",
    borderColor: "color-mix(in srgb, #fbbf24 44%, #a855f7)",
    boxShadow:
      "0 0 0 1px color-mix(in srgb, #fbbf24 32%, transparent), 0 22px 56px color-mix(in srgb, #7c3aed 18%, transparent), 0 12px 36px color-mix(in srgb, #f59e0b 14%, transparent), inset 0 1px 0 color-mix(in srgb, white 14%, transparent)",
  }

  const shellStyle: CSSProperties = superHero
    ? superShell
    : hasSuperHabit
      ? {
          ...baseShell,
          borderColor: "color-mix(in srgb, #fbbf24 30%, #a855f7)",
          boxShadow: `${baseShell.boxShadow ?? ""}, 0 0 32px color-mix(in srgb, #f59e0b 11%, transparent)`,
        }
      : baseShell

  const sectionRing = cn(
    superHero &&
      "ring-2 ring-[color-mix(in_srgb,#fbbf24_42%,transparent)] motion-safe:transition-[box-shadow] motion-safe:duration-300",
    hasSuperHabit &&
      !superHero &&
      "ring-1 ring-[color-mix(in_srgb,#fbbf24_28%,transparent)]",
  )

  return (
    <section
      aria-labelledby="flex-stack-heading"
      className={cn(
        "relative isolate overflow-visible rounded-[18px] border-2 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] sm:p-5",
        "border-[color-mix(in_srgb,#a855f7_38%,var(--color-border))]",
        superHero &&
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:p-px before:opacity-[0.92] before:[background:linear-gradient(145deg,color-mix(in_srgb,#fbbf24_38%,transparent)_0%,transparent_38%,color-mix(in_srgb,#a855f7_24%,transparent)_62%,color-mix(in_srgb,#22c55e_22%,transparent)_100%)] before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[mask-composite:xor] before:[-webkit-mask-composite:xor]",
        sectionRing,
      )}
      style={shellStyle}
    >
      <div
        className="pointer-events-none absolute -right-10 -top-14 h-36 w-36 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,#a855f7_24%,transparent)_0%,transparent_72%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,#22c55e_16%,transparent)_0%,transparent_75%)]"
        aria-hidden
      />
      {superHero ? (
        <>
          <div
            className="orbita-flex-super-aura pointer-events-none absolute -right-6 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,#fbbf24_28%,transparent)_0%,transparent_68%)] blur-[2px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-[18%] top-3 h-2 w-2 rounded-full bg-amber-400/90 shadow-[0_0_12px_rgba(251,191,36,0.85)]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute right-[22%] top-8 h-1.5 w-1.5 rounded-full bg-violet-400/80 shadow-[0_0_10px_rgba(167,139,250,0.7)]"
            aria-hidden
          />
        </>
      ) : null}

      <header className="relative flex gap-2.5 border-b border-[color-mix(in_srgb,#a855f7_26%,var(--color-border))] pb-2.5 sm:gap-3 sm:pb-3">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] sm:h-11 sm:w-11",
            superHero
              ? "bg-gradient-to-br from-amber-300/95 via-amber-400 to-amber-600 shadow-[0_6px_18px_color-mix(in_srgb,#f59e0b_35%,transparent)] ring-2 ring-amber-200/70 dark:from-amber-400/90 dark:via-amber-500 dark:to-amber-700 dark:ring-amber-500/40"
              : "bg-[color-mix(in_srgb,#a855f7_22%,transparent)] ring-1 ring-[color-mix(in_srgb,#a855f7_32%,transparent)]",
          )}
          aria-hidden
        >
          {superHero ? (
            <Crown className="h-[20px] w-[20px] text-amber-950 sm:h-[22px] sm:w-[22px]" strokeWidth={2.25} fill="currentColor" fillOpacity={0.15} />
          ) : (
            <Zap className="h-[20px] w-[20px] text-violet-700 dark:text-violet-300 sm:h-[22px] sm:w-[22px]" strokeWidth={2} />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <div className="min-w-0 flex-1 space-y-1">
              {single ? (
                <>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                    {superHero ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.2em] text-amber-950 shadow-[0_2px_10px_rgba(245,158,11,0.45)] ring-1 ring-amber-200/80 dark:from-amber-500 dark:via-amber-600 dark:to-amber-700 dark:text-amber-50 dark:ring-amber-400/50">
                        <Crown className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
                        Super hábito
                      </span>
                    ) : null}
                    <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-text-secondary)_88%,#7c3aed)] dark:text-violet-200/90">
                      Durante el día
                    </p>
                  </div>
                  <h2
                    id="flex-stack-heading"
                    className="m-0 flex min-w-0 flex-wrap items-center gap-2 text-[15px] font-bold leading-tight tracking-[-0.02em] sm:gap-2.5 sm:text-[16px]"
                  >
                    <span
                      className={cn(
                        "min-w-0",
                        superHero &&
                          "bg-gradient-to-r from-violet-700 via-fuchsia-600 to-emerald-600 bg-clip-text text-[16px] text-transparent sm:text-[17px] dark:from-violet-200 dark:via-fuchsia-300 dark:to-emerald-300",
                        !superHero && "text-[var(--color-text-primary)]",
                      )}
                    >
                      {primary.name}
                    </span>
                    {superHero ? (
                      <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-500 drop-shadow-[0_0_8px_rgba(251,191,36,0.75)] sm:h-[18px] sm:w-[18px]" aria-hidden />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500 sm:h-4 sm:w-4" strokeWidth={2} aria-hidden />
                    )}
                  </h2>
                </>
              ) : (
                <p
                  id="flex-stack-heading"
                  className="m-0 flex min-w-0 flex-wrap items-center gap-2 text-[14px] font-semibold leading-tight tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-[15px]"
                >
                  Durante el día
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-amber-500 sm:h-4 sm:w-4" strokeWidth={2} aria-hidden />
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {single && primary.metrics.completed_today ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
                    superHero
                      ? "bg-gradient-to-r from-emerald-500/25 to-amber-400/20 text-emerald-800 ring-2 ring-amber-400/50 dark:from-emerald-500/20 dark:to-amber-500/15 dark:text-emerald-200"
                      : "bg-[color-mix(in_srgb,var(--color-accent-health)_14%,var(--color-surface))] text-[var(--color-accent-health)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-health)_25%,transparent)]",
                  )}
                >
                  <Trophy className="h-3 w-3" aria-hidden />
                  {superHero ? "Victoria hoy" : "Hecho hoy"}
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
            {single ? (
              <>
                {primaryIntention ||
                  `${primaryDomain} · ${primaryFreq}. Chequeos flexibles sin ancla horaria; marca hecho cuando cierres tu rutina del día en Órvita.`}
              </>
            ) : (
              <>
                Prioridad sobre el reloj del día: chequeos flex y supers sin hora fija.{" "}
                <span className="font-medium text-[var(--color-text-primary)]">{habits.length}</span> hábitos en esta
                misión.
              </>
            )}
          </p>
          {single ? (
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-[color-mix(in_srgb,#f97316_12%,color-mix(in_srgb,#a855f7_8%,transparent))] px-2.5 py-1 text-[11px] font-semibold tabular-nums text-[var(--color-text-primary)] ring-1 ring-[color-mix(in_srgb,#fb923c_35%,transparent)]">
                <Flame className="h-3.5 w-3.5 shrink-0 text-orange-500" strokeWidth={2.25} aria-hidden />
                Racha {primary.metrics.current_streak} {primary.metrics.current_streak === 1 ? "día" : "días"}
              </span>
              {Boolean(primary.metadata?.intraday_si_no_progress) &&
              primary.metadata?.intraday_si_no_target_checks != null ? (
                <span className="inline-flex items-center gap-1.5 rounded-[10px] bg-[color-mix(in_srgb,#22c55e_14%,transparent)] px-2.5 py-1 text-[11px] font-semibold text-emerald-900 ring-1 ring-[color-mix(in_srgb,#4ade80_40%,transparent)] dark:text-emerald-100">
                  <Target className="h-3.5 w-3.5 shrink-0" strokeWidth={2.25} aria-hidden />
                  Objetivo {primary.metadata.intraday_si_no_target_checks} chequeos
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-[color-mix(in_srgb,#a855f7_18%,transparent)] pt-1">
            <p className="m-0 min-w-0 flex-1 text-[11px] leading-snug text-[var(--color-text-secondary)] sm:text-[12px]">
              {single ? (
                <>
                  {primaryDomain} · {primaryFreq}
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

      {superHero ? (
        <div
          className="relative z-[1] mt-2 flex flex-col gap-1.5 rounded-xl border border-[color-mix(in_srgb,#fbbf24_42%,transparent)] bg-[linear-gradient(100deg,color-mix(in_srgb,#fef3c7_35%,transparent)_0%,color-mix(in_srgb,#a855f7_12%,transparent)_45%,color-mix(in_srgb,#bbf7d0_22%,transparent)_100%)] px-3 py-2.5 shadow-[0_8px_28px_-12px_color-mix(in_srgb,#f59e0b_35%,transparent)] sm:flex-row sm:items-center sm:justify-between sm:px-4"
          role="status"
          aria-label="Súper hábito activo con bonificación visual de progreso"
        >
          <span className="inline-flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-amber-950 dark:text-amber-50">
            <Medal className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" strokeWidth={2.25} aria-hidden />
            Odisea oro · súper hábito
            <Award className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-300" aria-hidden />
          </span>
          <span className="text-[10px] font-semibold leading-snug text-[color-mix(in_srgb,var(--color-text-secondary)_92%,#92400e)] dark:text-amber-100/85">
            Cada cierre del día refuerza tu racha con prioridad máxima en Órvita.
          </span>
        </div>
      ) : null}

      <div className="mt-0 flex flex-col gap-0">
        {habits.map((habit, habitIndex) => {
          const progressUi = habitTodayProgressUi(habit)
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
                    {!single ? (
                      <h3 className="m-0 text-[14px] font-semibold leading-snug text-[var(--color-text-primary)] sm:text-[15px]">
                        {habit.name}
                      </h3>
                    ) : null}
                    {isSuper ? (
                      <span className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[color-mix(in_srgb,#fbbf24_55%,transparent)] bg-gradient-to-br from-amber-200/95 via-amber-300/85 to-amber-500/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-amber-950 shadow-[0_3px_14px_rgba(245,158,11,0.42)] ring-1 ring-amber-100/90 dark:from-amber-500/35 dark:via-amber-600/30 dark:to-amber-800/40 dark:text-amber-50 dark:ring-amber-400/35">
                        <Crown className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
                        Super hábito
                      </span>
                    ) : null}
                    {intraday && checks != null ? (
                      <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,#22c55e_12%,var(--color-surface-alt))] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">
                        Meta {checks} chequeos
                      </span>
                    ) : null}
                  </div>
                  {!single ? (
                    <p className="m-0 text-[11px] text-[var(--color-text-secondary)] sm:text-[12px]">
                      {domain} · {freq} ·{" "}
                      <span className="font-medium text-[var(--color-text-primary)]">{streakDays}</span>{" "}
                      {streakDays === 1 ? "día de racha" : "días de racha"}
                    </p>
                  ) : null}
                  {intention && !single ? (
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
                  {habitShowsTodayProgressBar(progressUi) ? (
                    <div
                      className={cn(
                        "mt-2 min-w-0 w-full sm:max-w-lg",
                        isSuper &&
                          "rounded-xl border border-[color-mix(in_srgb,#fbbf24_38%,transparent)] bg-[color-mix(in_srgb,#fbbf24_7%,color-mix(in_srgb,#a855f7_5%,transparent))] p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[color-mix(in_srgb,var(--color-text-secondary)_85%,#7c3aed)] dark:text-violet-200/80">
                          {isSuper ? "Progreso con bonificación" : "Progreso del día"}
                        </span>
                        {isSuper ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-amber-400/90 to-amber-600 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-950 shadow-sm dark:from-amber-500 dark:to-amber-700 dark:text-amber-50">
                            <Star className="h-3 w-3 fill-current" aria-hidden />
                            Modo élite
                          </span>
                        ) : null}
                      </div>
                      <HabitTodayProgressBar
                        className="min-w-0 w-full"
                        pct={progressUi.pct}
                        kind={progressUi.kind}
                        ariaLabel={progressUi.ariaLabel}
                        caption={progressUi.caption}
                        visualVariant="orbitaFlex"
                        orbitaTone={isSuper ? "super" : "standard"}
                      />
                    </div>
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
                    className={cn(
                      "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-md transition-[transform,box-shadow,opacity] active:scale-[0.97] motion-safe:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45 sm:h-11 sm:w-11",
                      isSuper && doneToday
                        ? "border-[color-mix(in_srgb,#fbbf24_55%,var(--color-border))] bg-[linear-gradient(145deg,color-mix(in_srgb,#fbbf24_18%,var(--color-surface)),var(--color-surface-alt))] shadow-[0_0_20px_color-mix(in_srgb,#f59e0b_28%,transparent)]"
                        : isSuper
                          ? "border-[color-mix(in_srgb,#fbbf24_38%,#a855f7)] bg-[color-mix(in_srgb,var(--color-surface-alt)_50%,var(--color-surface))] shadow-[0_4px_16px_color-mix(in_srgb,#7c3aed_12%,transparent)]"
                          : "border-[color-mix(in_srgb,#a855f7_32%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface-alt)_55%,var(--color-surface))] shadow-sm",
                    )}
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
