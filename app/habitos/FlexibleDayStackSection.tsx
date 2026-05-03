"use client"

import type { CSSProperties } from "react"
import { CheckCircle2, Circle, Flame, Loader2, Sparkles, Target, Zap } from "lucide-react"
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
import { FlexibleDayStackMissionPresentation } from "@/app/habitos/flexibleDayStackMissionPresentation"
import { SuperHabitEmblem, type SuperHabitMark } from "@/app/habitos/SuperHabitEmblem"
import {
  SUPER_LUXURY_HEX,
  superHeroRingClass,
  superHeroShellStyle,
  superRingClass,
} from "@/lib/habits/superHabitLuxuryTheme"

/** `orbita` = tarjeta actual. Las otras dos son prototipos tipo Figma (ver laboratorio `?flexLab=1`). */
export type FlexibleMissionCardVariant = "orbita" | "mission-compact" | "mission-spacious"

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
  missionCardVariant?: FlexibleMissionCardVariant
  /** Marca visual del súper hábito (por defecto corona). */
  superHabitMark?: SuperHabitMark
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
  missionCardVariant = "orbita",
  superHabitMark,
}: Props) {
  if (habits.length === 0) return null

  const emblemMark: SuperHabitMark = superHabitMark ?? "crown"
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

  const shellStyle: CSSProperties = superHero
    ? superHeroShellStyle()
    : hasSuperHabit
      ? {
          ...baseShell,
          borderColor: `color-mix(in srgb, ${SUPER_LUXURY_HEX.gold} 26%, #a855f7)`,
          boxShadow: `${baseShell.boxShadow ?? ""}, 0 0 28px color-mix(in srgb, ${SUPER_LUXURY_HEX.goldDeep} 9%, transparent)`,
        }
      : baseShell

  const sectionRing = cn(superHero && superHeroRingClass, hasSuperHabit && !superHero && superRingClass)

  if (missionCardVariant === "mission-compact" || missionCardVariant === "mission-spacious") {
    return (
      <FlexibleDayStackMissionPresentation
        variant={missionCardVariant}
        habits={habits}
        domainLabels={domainLabels}
        persistenceEnabled={persistenceEnabled}
        mock={mock}
        loading={loading}
        togglingId={togglingId}
        backfillingId={backfillingId}
        backfillingAll={backfillingAll}
        formatMetricLine={formatMetricLine}
        onEdit={onEdit}
        onToggle={onToggle}
        onStreakCelebration={onStreakCelebration}
        shellStyle={shellStyle}
        sectionRing={sectionRing}
        superHero={superHero}
        hasSuperHabit={hasSuperHabit}
        doneTodayCount={doneTodayCount}
        single={single}
        primary={primary}
        primaryDomain={primaryDomain}
        primaryIntention={primaryIntention}
        primaryFreq={primaryFreq}
        superHabitMark={emblemMark}
      />
    )
  }

  return (
    <section
      aria-labelledby="flex-stack-heading"
      className={cn(
        "relative isolate overflow-visible rounded-[18px] border-2 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] sm:p-5",
        "border-[color-mix(in_srgb,#a855f7_38%,var(--color-border))]",
        superHero &&
          "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:p-px before:opacity-[0.88] before:[background:linear-gradient(145deg,color-mix(in_srgb,#c9a962_30%,transparent)_0%,transparent_38%,color-mix(in_srgb,#a855f7_22%,transparent)_62%,color-mix(in_srgb,#22c55e_18%,transparent)_100%)] before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[mask-composite:xor] before:[-webkit-mask-composite:xor]",
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
            className="orbita-flex-super-aura pointer-events-none absolute -right-6 top-1/2 h-44 w-44 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,#c9a962_22%,transparent)_0%,transparent_68%)] blur-[2px]"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute left-[18%] top-3 h-2 w-2 rounded-full bg-[color-mix(in_srgb,#c9a962_75%,#78716c)] shadow-[0_0_10px_color-mix(in_srgb,#c9a962_45%,transparent)]"
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
              ? "bg-gradient-to-br from-[#f4ead8] via-[#d9c9a8] to-[#8b7340] shadow-[0_6px_20px_color-mix(in_srgb,#8b7340_22%,transparent)] ring-2 ring-[color-mix(in_srgb,#c9a962_45%,transparent)] dark:from-[#3f3a33] dark:via-[#5c5346] dark:to-[#c9a962] dark:ring-[color-mix(in_srgb,#c9a962_35%,transparent)]"
              : "bg-[color-mix(in_srgb,#a855f7_22%,transparent)] ring-1 ring-[color-mix(in_srgb,#a855f7_32%,transparent)]",
          )}
          aria-hidden
        >
          {superHero ? (
            <SuperHabitEmblem
              mark={emblemMark}
              size="hero"
              withCrownFill={emblemMark === "crown"}
              className="text-[#3f2f1b] dark:text-[#f4ead8]"
            />
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
                      <span className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-[#ebe4d4] via-[#c9a962] to-[#7a6239] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#2a2418] shadow-[0_2px_12px_color-mix(in_srgb,#8b7340_28%,transparent)] ring-1 ring-[color-mix(in_srgb,#c9a962_50%,transparent)] dark:from-[#44403c] dark:via-[#8b7340] dark:to-[#c9a962] dark:text-[#faf8f5] dark:ring-[color-mix(in_srgb,#c9a962_40%,transparent)]">
                        <SuperHabitEmblem mark={emblemMark} size="xs" className="shrink-0 text-[#2a2418] dark:text-[#faf8f5]" />
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
                      <SuperHabitEmblem
                        mark={emblemMark}
                        size="md"
                        withCrownFill={emblemMark === "crown"}
                        className="shrink-0 text-[#8b6914] drop-shadow-[0_0_8px_color-mix(in_srgb,#c9a962_40%,transparent)] dark:text-[#e8dcc8]"
                      />
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
                      ? "bg-gradient-to-r from-emerald-500/22 to-[color-mix(in_srgb,#c9a962_22%,transparent)] text-emerald-900 ring-2 ring-[color-mix(in_srgb,#c9a962_38%,transparent)] dark:from-emerald-500/18 dark:to-[color-mix(in_srgb,#c9a962_14%,transparent)] dark:text-emerald-100"
                      : "bg-[color-mix(in_srgb,var(--color-accent-health)_14%,var(--color-surface))] text-[var(--color-accent-health)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-health)_25%,transparent)]",
                  )}
                >
                  {superHero ? (
                    <SuperHabitEmblem mark={emblemMark} size="xs" className="shrink-0 text-emerald-900 dark:text-emerald-100" />
                  ) : (
                    <CheckCircle2 className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden />
                  )}
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
          className="relative z-[1] mt-2 flex flex-col gap-1.5 rounded-xl border border-[color-mix(in_srgb,#c9a962_38%,transparent)] bg-[linear-gradient(100deg,color-mix(in_srgb,#f4f1ea_55%,transparent)_0%,color-mix(in_srgb,#a855f7_10%,transparent)_45%,color-mix(in_srgb,#bbf7d0_18%,transparent)_100%)] px-3 py-2.5 shadow-[0_8px_26px_-12px_color-mix(in_srgb,#8b7340_22%,transparent)] sm:flex-row sm:items-center sm:justify-between sm:px-4"
          role="status"
          aria-label="Súper hábito activo con bonificación visual de progreso"
        >
          <span className="inline-flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#3f3428] dark:text-[#f4ead8]">
            <SuperHabitEmblem
              mark={emblemMark}
              size="sm"
              withCrownFill={emblemMark === "crown"}
              className="shrink-0 text-[#6b5a3a] dark:text-[#e8dcc8]"
            />
            Odisea oro · súper hábito
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-300" strokeWidth={2.25} aria-hidden />
          </span>
          <span className="text-[10px] font-semibold leading-snug text-[color-mix(in_srgb,var(--color-text-secondary)_88%,#5c4d3a)] dark:text-[color-mix(in_srgb,#e8dcc8_85%,transparent)]">
            Cada cierre aquí prioriza tu racha al máximo.
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
          const showProgressBar = habitShowsTodayProgressBar(progressUi)
          const toggleDisabled =
            (!persistenceEnabled && !mock) ||
            loading ||
            togglingId === habit.id ||
            backfillingId === habit.id ||
            backfillingAll
          const toggleClassName = cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border shadow-md transition-[transform,box-shadow,opacity] active:scale-[0.97] motion-safe:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45 sm:h-11 sm:w-11",
            isSuper && doneToday
              ? "border-[color-mix(in_srgb,#c9a962_48%,var(--color-border))] bg-[linear-gradient(145deg,color-mix(in_srgb,#c9a962_14%,var(--color-surface)),var(--color-surface-alt))] shadow-[0_0_18px_color-mix(in_srgb,#8b7340_22%,transparent)]"
              : isSuper
                ? "border-[color-mix(in_srgb,#c9a962_34%,#a855f7)] bg-[color-mix(in_srgb,var(--color-surface-alt)_50%,var(--color-surface))] shadow-[0_4px_16px_color-mix(in_srgb,#7c3aed_12%,transparent)]"
                : "border-[color-mix(in_srgb,#a855f7_32%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface-alt)_55%,var(--color-surface))] shadow-sm",
          )
          const markTodayButton = (
            <button
              type="button"
              disabled={toggleDisabled}
              aria-label={doneToday ? "Deshacer completado de hoy" : "Marcar hecho hoy"}
              title={doneToday ? "Deshacer hoy" : "Hecho hoy"}
              onClick={async () => {
                const r = await onToggle(habit.id)
                if (!r.ok) alert(r.error || "No se pudo actualizar")
                else if (r.streakCelebration) onStreakCelebration(r.streakCelebration)
              }}
              className={toggleClassName}
            >
              {togglingId === habit.id ? (
                <Loader2 className="h-[18px] w-[18px] animate-spin text-violet-600 dark:text-violet-400" aria-hidden />
              ) : doneToday ? (
                <CheckCircle2 className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} aria-hidden />
              ) : (
                <Circle className="h-[18px] w-[18px] text-[var(--color-text-secondary)]" strokeWidth={1.75} aria-hidden />
              )}
            </button>
          )

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
                  {!single ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="m-0 text-[14px] font-semibold leading-snug text-[var(--color-text-primary)] sm:text-[15px]">
                        {habit.name}
                      </h3>
                      {isSuper ? (
                        <span className="inline-flex items-center gap-1.5 rounded-[10px] border-2 border-[color-mix(in_srgb,#c9a962_48%,transparent)] bg-gradient-to-br from-[#f0ebe3] via-[#d4c4a8] to-[#7a6239] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#2a2418] shadow-[0_3px_14px_color-mix(in_srgb,#8b7340_26%,transparent)] ring-1 ring-[color-mix(in_srgb,#c9a962_45%,transparent)] dark:from-[#3a3632] dark:via-[#6b5a3a] dark:to-[#c9a962] dark:text-[#faf8f5] dark:ring-[color-mix(in_srgb,#c9a962_35%,transparent)]">
                          <SuperHabitEmblem mark={emblemMark} size="sm" className="shrink-0 text-[#2a2418] dark:text-[#faf8f5]" />
                          Super hábito
                        </span>
                      ) : null}
                      {intraday && checks != null ? (
                        <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,#22c55e_12%,var(--color-surface-alt))] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-emerald-800 dark:text-emerald-200">
                          Meta {checks} chequeos
                        </span>
                      ) : null}
                    </div>
                  ) : null}
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
                  {!showProgressBar ? markTodayButton : null}
                </div>
              </div>

              {showProgressBar ? (
                <div className="mt-2 grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                  <div className="min-w-0 flex items-center">
                    <HabitTodayProgressBar
                      className="min-w-0 w-full"
                      pct={progressUi.pct}
                      kind={progressUi.kind}
                      ariaLabel={progressUi.ariaLabel}
                      caption={progressUi.caption}
                      omitCaption
                      visualVariant="orbitaFlex"
                      orbitaTone={isSuper ? "super" : "standard"}
                    />
                  </div>
                  <div className="flex shrink-0 items-center justify-center">{markTodayButton}</div>
                  {progressUi.caption ? (
                    <p
                      className={cn(
                        "col-span-2 m-0 min-w-0 truncate leading-tight text-[var(--color-text-secondary)]",
                        "text-[10px] font-semibold tabular-nums tracking-tight",
                        isSuper
                          ? "bg-gradient-to-r from-[#5c4d32] via-violet-700/90 to-emerald-700/90 bg-clip-text text-transparent dark:from-[#e8dcc8] dark:via-violet-200/90 dark:to-emerald-200/90"
                          : "text-[color-mix(in_srgb,var(--color-text-secondary)_88%,#7c3aed)] dark:text-violet-200/90",
                      )}
                    >
                      {progressUi.caption}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </section>
  )
}
