"use client"

import type { CSSProperties } from "react"
import { CheckCircle2, Circle, Droplets, Flame, Loader2, Pencil, Sparkles, Target, Zap } from "lucide-react"
import type { HabitsToggleTodayResult } from "@/app/hooks/useHabits"
import { HabitTodayProgressBar } from "@/app/components/habits/HabitTodayProgressBar"
import type { StreakCelebrationPayload } from "@/lib/habits/streakMilestones"
import { superhabitStreakRewardMessage } from "@/lib/habits/streakMilestones"
import {
  habitShowsTodayProgressBar,
  habitTodayProgressUi,
} from "@/lib/habits/habitTodayProgressUi"
import {
  glassMlFromHabitMetadata,
  goalMlFromHabitMetadata,
  isWaterTrackingHabit,
} from "@/lib/habits/waterTrackingHelpers"
import type { HabitMetadata, HabitWithMetrics, OperationalDomain } from "@/lib/operational/types"
import type { HabitWeekDayMark } from "@/lib/habits/habitMetrics"
import { cn } from "@/lib/utils"
import { SuperHabitEmblem, type SuperHabitMark } from "@/app/habitos/SuperHabitEmblem"

const WEEK_DAYS = ["L", "M", "X", "J", "V", "S", "D"] as const

function weekMarksNormalized(habit: HabitWithMetrics): HabitWeekDayMark[] {
  const w = habit.metrics.week_marks
  if (Array.isArray(w) && w.length === 7) return w
  return Array.from({ length: 7 }, () => "off" as HabitWeekDayMark)
}

function MissionWeekStrip({
  habit,
  prominentMobile,
}: {
  habit: HabitWithMetrics
  /** Tarjeta mission-compact en móvil: columnas y puntos un poco más grandes, alineados a la derecha. */
  prominentMobile?: boolean
}) {
  const marks = weekMarksNormalized(habit)
  return (
    <div
      role="group"
      aria-label="Esta semana: L a D"
      className={cn(
        "grid w-max max-w-[min(100%,calc(100vw-8rem))] shrink-0 touch-manipulation gap-y-0.5 sm:max-w-full sm:gap-y-0.5",
        prominentMobile
          ? "[grid-template-columns:repeat(7,17px)] gap-x-1 sm:[grid-template-columns:repeat(7,18px)] sm:gap-x-1"
          : "[grid-template-columns:repeat(7,15px)] gap-x-0.5 sm:[grid-template-columns:repeat(7,18px)] sm:gap-x-1",
      )}
    >
      {WEEK_DAYS.map((day) => (
        <div
          key={`${habit.id}-wl-${day}`}
          className={cn(
            "select-none text-center font-semibold uppercase leading-none text-[color-mix(in_srgb,var(--color-text-secondary)_65%,var(--color-text-primary))] sm:text-[9px]",
            prominentMobile ? "text-[9px]" : "text-[8px]",
          )}
        >
          {day}
        </div>
      ))}
      {WEEK_DAYS.map((day, i) => {
        const mark = marks[i]
        const done = mark === "done"
        const missed = mark === "missed"
        const aria =
          mark === "done" ? `${day}: hecho` : mark === "missed" ? `${day}: pendiente` : `${day}: sin marca`
        return (
          <div
            key={`${habit.id}-wm-${day}`}
            className={cn(
              "flex w-full items-center justify-center",
              prominentMobile ? "h-[18px] sm:h-[18px]" : "h-4 sm:h-[18px]",
            )}
            aria-label={aria}
          >
            {done ? (
              <span
                className={cn(
                  "block shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-accent-health)_88%,#14532d)] shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent-health)_22%,transparent)]",
                  prominentMobile ? "h-[7px] w-[7px]" : "h-[6px] w-[6px]",
                )}
              />
            ) : missed ? (
              <span
                className={cn(
                  "block shrink-0 rounded-full border border-[color-mix(in_srgb,var(--color-text-secondary)_38%,transparent)] bg-transparent",
                  prominentMobile ? "h-[6px] w-[6px]" : "h-[5px] w-[5px]",
                )}
              />
            ) : (
              <span
                className={cn(
                  "block shrink-0 rounded-full bg-[color-mix(in_srgb,var(--color-border)_70%,transparent)]",
                  prominentMobile ? "h-[5px] w-[5px]" : "h-[4px] w-[4px]",
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

type StreakFlameTier = 0 | 1 | 2 | 3 | 4 | 5

/** Tier del token de llama: escala con días consecutivos; súper hábito suma +5 días “virtuales” al tier. */
function streakFlameTier(currentStreak: number, isSuperHabit: boolean): StreakFlameTier {
  const boosted = currentStreak + (isSuperHabit ? 5 : 0)
  if (boosted >= 60) return 5
  if (boosted >= 30) return 4
  if (boosted >= 14) return 3
  if (boosted >= 7) return 2
  if (boosted >= 1) return 1
  return 0
}

function streakFlameSlotClasses(tier: StreakFlameTier): { wrap: string; icon: string; motion: string } {
  const motion = tier >= 5 ? "orbita-streak-flame-legend" : tier >= 3 ? "orbita-streak-flame-ember" : ""

  const table: Record<StreakFlameTier, { wrap: string; icon: string }> = {
    0: {
      wrap: "bg-[color-mix(in_srgb,var(--color-text-secondary)_10%,var(--color-surface))] ring-1 ring-[color-mix(in_srgb,var(--color-border)_78%,transparent)]",
      icon: "text-[color-mix(in_srgb,var(--color-text-secondary)_88%,var(--color-text-primary))]",
    },
    1: {
      wrap: "bg-[color-mix(in_srgb,#a855f7_14%,transparent)] ring-1 ring-[color-mix(in_srgb,#a855f7_30%,transparent)]",
      icon: "text-violet-600 dark:text-violet-300",
    },
    2: {
      wrap: "bg-[color-mix(in_srgb,#fbbf24_14%,transparent)] ring-1 ring-[color-mix(in_srgb,#f59e0b_36%,transparent)]",
      icon: "text-amber-600 dark:text-amber-400",
    },
    3: {
      wrap: "bg-[color-mix(in_srgb,#f97316_18%,transparent)] ring-1 ring-[color-mix(in_srgb,#ea580c_34%,transparent)]",
      icon: "text-orange-600 dark:text-orange-400",
    },
    4: {
      wrap: "bg-[linear-gradient(145deg,color-mix(in_srgb,#a855f7_22%,transparent),color-mix(in_srgb,#fb923c_16%,transparent))] ring-1 ring-[color-mix(in_srgb,#a855f7_36%,transparent)]",
      icon: "text-violet-700 dark:text-orange-300",
    },
    5: {
      wrap: "bg-[linear-gradient(155deg,color-mix(in_srgb,#f4ead8_42%,var(--color-surface)),color-mix(in_srgb,#c9a962_26%,transparent),color-mix(in_srgb,#a855f7_10%,transparent))] ring-1 ring-[color-mix(in_srgb,#c9a962_46%,transparent)] dark:bg-[linear-gradient(155deg,color-mix(in_srgb,#3f3a33_92%,var(--color-surface)),color-mix(in_srgb,#8b7340_28%,transparent))]",
      icon: "text-[#92400e] dark:text-[#f4ead8]",
    },
  }

  const row = table[tier]
  return { wrap: row.wrap, icon: row.icon, motion }
}

export type MissionPresentationVariant = "mission-compact" | "mission-spacious"

export type FlexibleDayStackMissionPresentationProps = {
  variant: MissionPresentationVariant
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
  shellStyle: CSSProperties
  sectionRing: string
  superHero: boolean
  hasSuperHabit: boolean
  doneTodayCount: number
  single: boolean
  primary: HabitWithMetrics
  primaryDomain: string
  primaryIntention: string | undefined
  primaryFreq: string
  superHabitMark: SuperHabitMark
}

function waterVasosEnds(habit: HabitWithMetrics): { left: string; right: string } | null {
  if (!isWaterTrackingHabit(habit.metadata)) return null
  const goal = goalMlFromHabitMetadata(habit.metadata)
  const glass = glassMlFromHabitMetadata(habit.metadata)
  const today = habit.water_today_ml ?? 0
  const targetGlasses = Math.max(1, Math.ceil(goal / glass))
  const doneGlasses = Math.min(targetGlasses, Math.floor(today / glass))
  const rem = Math.max(0, targetGlasses - doneGlasses)
  const left = `${doneGlasses} de ${targetGlasses} vasos`
  const right = today >= goal ? "Completado" : `${rem} restantes`
  return { left, right }
}

function encouragementLine(primary: HabitWithMetrics): string {
  if (isWaterTrackingHabit(primary.metadata)) {
    const goal = goalMlFromHabitMetadata(primary.metadata)
    const glass = glassMlFromHabitMetadata(primary.metadata)
    const today = primary.water_today_ml ?? 0
    if (today >= goal) return "¡Excelente! Completaste tu meta de hidratación hoy."
    const targetGlasses = Math.max(1, Math.ceil(goal / glass))
    const doneGlasses = Math.min(targetGlasses, Math.floor(today / glass))
    const rem = Math.max(0, targetGlasses - doneGlasses)
    if (rem <= 0) return "¡Excelente! Completaste tu meta de hidratación hoy."
    return rem === 1
      ? "¡Vas muy bien! Solo falta 1 vaso para cerrar el día."
      : `¡Vas muy bien! Solo faltan ${rem} vasos para cerrar el día.`
  }
  const ui = habitTodayProgressUi(primary)
  if (ui.kind === "intraday") {
    const n = primary.metadata?.intraday_si_no_target_checks ?? 0
    return primary.metrics.completed_today
      ? "Completaste los chequeos marcados para hoy."
      : `Recordá tu meta de ${n} chequeos antes de cerrar el día.`
  }
  return primary.metrics.completed_today
    ? "Marcaste este hábito para hoy."
    : "Pendiente hoy: marcá hecho cuando cierres la rutina."
}

function progressRowEnds(habit: HabitWithMetrics): { left: string; right: string } {
  const w = waterVasosEnds(habit)
  if (w) return w
  const ui = habitTodayProgressUi(habit)
  if (ui.kind === "intraday" && ui.caption) {
    return {
      left: ui.caption,
      right: habit.metrics.completed_today ? "Completado" : "Pendiente",
    }
  }
  return {
    left: habit.metrics.completed_today ? "Hecho hoy" : "Pendiente",
    right: habit.metrics.completed_today ? "Listo" : "—",
  }
}

export function FlexibleDayStackMissionPresentation({
  variant,
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
  shellStyle,
  sectionRing,
  superHero,
  hasSuperHabit,
  doneTodayCount,
  single,
  primary,
  primaryDomain,
  primaryIntention,
  primaryFreq,
  superHabitMark: emblemMark,
}: FlexibleDayStackMissionPresentationProps) {
  const isCompact = variant === "mission-compact"
  const sectionRound = isCompact ? "rounded-[20px]" : "rounded-[24px] sm:rounded-[28px]"
  const sectionPad = isCompact ? "p-3 sm:p-4" : "p-4 sm:p-6"

  const renderToggle = (habit: HabitWithMetrics, opts?: { wide?: boolean }) => {
    const doneToday = habit.metrics.completed_today
    const toggleDisabled =
      (!persistenceEnabled && !mock) ||
      loading ||
      togglingId === habit.id ||
      backfillingId === habit.id ||
      backfillingAll
    const isSuper = Boolean(habit.metadata?.is_superhabit)
    const toggleClassName = cn(
      "inline-flex shrink-0 items-center justify-center border shadow-md transition-[transform,box-shadow,opacity] active:scale-[0.97] motion-safe:hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-45",
      opts?.wide
        ? "min-h-11 w-full gap-2 rounded-xl px-4 text-[13px] font-semibold sm:min-h-12 sm:text-sm"
        : "h-10 w-10 rounded-xl sm:h-11 sm:w-11",
      opts?.wide && doneToday
        ? "border-[color-mix(in_srgb,var(--color-accent-health)_45%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] text-[var(--color-accent-health)]"
        : opts?.wide
          ? "border-[color-mix(in_srgb,#7c3aed_38%,var(--color-border))] bg-[var(--color-accent-health)] text-white"
          : isSuper && doneToday
            ? "border-[color-mix(in_srgb,#c9a962_48%,var(--color-border))] bg-[linear-gradient(145deg,color-mix(in_srgb,#c9a962_14%,var(--color-surface)),var(--color-surface-alt))] shadow-[0_0_18px_color-mix(in_srgb,#8b7340_22%,transparent)]"
            : isSuper
              ? "border-[color-mix(in_srgb,#c9a962_34%,#a855f7)] bg-[color-mix(in_srgb,var(--color-surface-alt)_50%,var(--color-surface))] shadow-[0_4px_16px_color-mix(in_srgb,#7c3aed_12%,transparent)]"
              : "border-[color-mix(in_srgb,#a855f7_32%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface-alt)_55%,var(--color-surface))] shadow-sm",
    )

    return (
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
        {opts?.wide ? (
          togglingId === habit.id ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Actualizando…
            </>
          ) : doneToday ? (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
              Deshacer hoy
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0 opacity-95" strokeWidth={2} aria-hidden />
              Marcar hecho hoy
            </>
          )
        ) : togglingId === habit.id ? (
          <Loader2 className="h-[18px] w-[18px] animate-spin text-violet-600 dark:text-violet-400" aria-hidden />
        ) : doneToday ? (
          <CheckCircle2 className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400" strokeWidth={1.75} aria-hidden />
        ) : (
          <Circle className="h-[18px] w-[18px] text-[var(--color-text-secondary)]" strokeWidth={1.75} aria-hidden />
        )}
      </button>
    )
  }

  const headerIcon = (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[12px] ring-1",
        isCompact ? "h-9 w-9 sm:h-10 sm:w-10" : "h-11 w-11 sm:h-12 sm:w-12",
        superHero
          ? "bg-gradient-to-br from-[#f4ead8] via-[#d9c9a8] to-[#8b7340] shadow-[0_6px_20px_color-mix(in_srgb,#8b7340_22%,transparent)] ring-[color-mix(in_srgb,#c9a962_45%,transparent)] dark:from-[#3f3a33] dark:via-[#5c5346] dark:to-[#c9a962] dark:ring-[color-mix(in_srgb,#c9a962_35%,transparent)]"
          : "bg-[color-mix(in_srgb,#a855f7_22%,transparent)] ring-[color-mix(in_srgb,#a855f7_32%,transparent)]",
      )}
      aria-hidden
    >
      {superHero ? (
        <SuperHabitEmblem
          mark={emblemMark}
          size={isCompact && emblemMark !== "shield" ? "md" : isCompact ? "lg" : "lg"}
          withCrownFill={emblemMark === "crown"}
          className={cn(
            "text-[#3f2f1b] dark:text-[#f4ead8]",
            emblemMark === "shield" && isCompact && "-translate-y-px",
          )}
        />
      ) : isWaterTrackingHabit(primary.metadata) ? (
        <Droplets className={cn("text-violet-700 dark:text-violet-300", isCompact ? "h-[18px] w-[18px]" : "h-5 w-5")} strokeWidth={2} />
      ) : (
        <Zap className={cn("text-violet-700 dark:text-violet-300", isCompact ? "h-[18px] w-[18px]" : "h-5 w-5")} strokeWidth={2} />
      )}
    </div>
  )

  const headerStatusBadges = (compact: boolean) => {
    const countSpan = !single ? (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-[color-mix(in_srgb,#a855f7_12%,var(--color-surface))] font-semibold uppercase tracking-wide text-violet-800 ring-1 ring-[color-mix(in_srgb,#a855f7_28%,transparent)] dark:text-violet-200",
          compact ? "px-1.5 py-px text-[8px] tracking-wide" : "px-2.5 py-1 text-[10px]",
        )}
      >
        {doneTodayCount}/{habits.length} hoy
      </span>
    ) : null

    const hechoSpan =
      single && primary.metrics.completed_today ? (
        <span
          aria-label="Hecho hoy"
          className={cn(
            "inline-flex shrink-0 items-center rounded-full bg-[color-mix(in_srgb,var(--color-accent-health)_14%,var(--color-surface))] font-semibold uppercase tracking-wide text-[var(--color-accent-health)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-health)_25%,transparent)]",
            compact
              ? "gap-0 p-1.5 sm:gap-1 sm:px-2 sm:py-0.5 sm:text-[9px]"
              : "gap-1 px-2.5 py-1 text-[10px]",
          )}
          title="Hecho hoy"
        >
          <CheckCircle2 className={cn("shrink-0", compact ? "h-3.5 w-3.5 sm:h-2.5 sm:w-2.5" : "h-3 w-3")} strokeWidth={2} aria-hidden />
          <span className={compact ? "hidden sm:inline" : undefined}>Hecho hoy</span>
        </span>
      ) : null

    const superSpan = superHero ? (
      <span
        className={cn(
          "inline-flex max-w-full shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-gradient-to-r from-[#ebe4d4] via-[#c9a962] to-[#7a6239] font-black uppercase text-[#2a2418] shadow-sm ring-1 ring-[color-mix(in_srgb,#c9a962_48%,transparent)] dark:from-[#44403c] dark:via-[#8b7340] dark:to-[#c9a962] dark:text-[#faf8f5]",
          compact ? "px-2 py-1 text-[8px] tracking-[0.08em] sm:px-1.5 sm:py-px sm:text-[8px] sm:tracking-[0.12em]" : "px-2 py-0.5 text-[9px] tracking-[0.16em]",
        )}
        title="Súper hábito"
      >
        <span className="sm:hidden">Súper</span>
        <span className="hidden sm:inline">Súper hábito</span>
      </span>
    ) : null

    const streakFallback =
      single && !primary.metrics.completed_today && !superHero ? (
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,#a855f7_26%,transparent)] bg-[color-mix(in_srgb,#a855f7_8%,var(--color-surface))] font-semibold tabular-nums text-[var(--color-text-primary)] ring-1 ring-[color-mix(in_srgb,#a855f7_18%,transparent)]",
            compact ? "gap-0.5 px-1.5 py-0.5 text-[9px]" : "px-2 py-1 text-[10px]",
          )}
        >
          <Flame
            className={cn("shrink-0 text-violet-500 dark:text-violet-300", compact ? "h-2.5 w-2.5" : "h-3 w-3")}
            strokeWidth={2}
            aria-hidden
          />
          <span>{primary.metrics.current_streak}</span>
          <span className="font-medium normal-case text-[var(--color-text-secondary)]">días</span>
        </span>
      ) : null

    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-end",
          compact ? "flex-row flex-nowrap gap-1" : "flex-col items-end gap-1",
        )}
      >
        {countSpan}
        {hechoSpan}
        {superSpan}
        {streakFallback}
      </div>
    )
  }

  return (
    <section
      aria-labelledby="flex-stack-heading"
      className={cn(
        "relative isolate overflow-visible border-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]",
        sectionRound,
        sectionPad,
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

      <header
        className={cn(
          "relative border-b border-[color-mix(in_srgb,#a855f7_26%,var(--color-border))] pb-3",
          isCompact
            ? "grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 sm:gap-x-4"
            : "flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4",
        )}
      >
        {isCompact ? (
          <>
            {headerIcon}
            <div className="min-w-0 space-y-0.5 pt-0.5">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-text-secondary)_88%,#7c3aed)] dark:text-violet-200/90">
                Durante el día
              </p>
              <h2
                id="flex-stack-heading"
                className={cn(
                  "m-0 text-[15px] font-bold leading-tight tracking-[-0.02em] sm:text-[16px]",
                  "line-clamp-2 [overflow-wrap:anywhere] sm:line-clamp-none",
                  single && superHero
                    ? "bg-gradient-to-r from-violet-700 via-fuchsia-600 to-emerald-600 bg-clip-text text-transparent dark:from-violet-200 dark:via-fuchsia-300 dark:to-emerald-300"
                    : "text-[var(--color-text-primary)]",
                )}
              >
                {single ? primary.name : `Misión flexible · ${habits.length} hábitos`}
              </h2>
            </div>
            <div className="flex shrink-0 justify-self-end pt-0.5">{headerStatusBadges(true)}</div>
          </>
        ) : (
          <>
            <div className="flex w-full min-w-0 gap-3 sm:items-start">
              {headerIcon}
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[color-mix(in_srgb,var(--color-text-secondary)_88%,#7c3aed)] dark:text-violet-200/90">
                    Durante el día
                  </p>
                </div>
                <h2
                  id="flex-stack-heading"
                  className={cn(
                    "m-0 font-bold leading-tight tracking-[-0.02em] text-[var(--color-text-primary)]",
                    "text-[17px] sm:text-[19px]",
                    superHero &&
                      "bg-gradient-to-r from-violet-700 via-fuchsia-600 to-emerald-600 bg-clip-text text-transparent dark:from-violet-200 dark:via-fuchsia-300 dark:to-emerald-300",
                  )}
                >
                  {single ? primary.name : "Rutina de bienestar"}
                </h2>
                <p className="m-0 max-w-prose text-[12px] leading-relaxed text-[var(--color-text-secondary)] sm:text-[13px]">
                  {single
                    ? primaryIntention ||
                      `${primaryDomain} · ${primaryFreq}. Chequeos flexibles sin ancla horaria; marca hecho cuando cierres tu rutina del día en Órvita.`
                    : `Prioridad sobre el reloj del día: ${habits.length} hábitos agrupados. ${doneTodayCount} de ${habits.length} completados hoy.`}
                </p>
                <div
                  className="inline-flex max-w-full items-center gap-2 rounded-full border border-[color-mix(in_srgb,#a855f7_28%,transparent)] bg-[color-mix(in_srgb,#a855f7_8%,var(--color-surface))] px-3 py-1.5 text-[11px] font-semibold leading-snug text-[color-mix(in_srgb,var(--color-text-secondary)_90%,#5b21b6)] dark:text-violet-100/90"
                  role="status"
                >
                  <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
                  <span className="min-w-0">{encouragementLine(primary)}</span>
                </div>
              </div>
            </div>
            <div className="flex w-full shrink-0 flex-wrap items-center justify-between gap-2 sm:ml-auto sm:w-auto sm:flex-col sm:items-end">
              {headerStatusBadges(false)}
            </div>
          </>
        )}
      </header>

      {superHero && !isCompact ? (
        <div
          className="relative z-[1] mt-3 flex flex-col gap-1.5 rounded-xl border border-[color-mix(in_srgb,#c9a962_38%,transparent)] bg-[linear-gradient(100deg,color-mix(in_srgb,#f4f1ea_55%,transparent)_0%,color-mix(in_srgb,#a855f7_10%,transparent)_45%,color-mix(in_srgb,#bbf7d0_18%,transparent)_100%)] px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4"
          role="status"
        >
          <span className="inline-flex flex-wrap items-center gap-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#3f3428] dark:text-[#f4ead8]">
            <SuperHabitEmblem
              mark={emblemMark}
              size="sm"
              withCrownFill={emblemMark === "crown"}
              className="shrink-0 text-[#6b5a3a] dark:text-[#e8dcc8]"
            />
            Odisea oro · súper hábito
          </span>
          <span className="text-[10px] font-semibold text-[color-mix(in_srgb,var(--color-text-secondary)_88%,#5c4d3a)] dark:text-[color-mix(in_srgb,#e8dcc8_85%,transparent)]">
            Bonificación de racha prioritaria.
          </span>
        </div>
      ) : null}

      {isCompact ? (
        <div
          className="mt-2 flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,#a855f7_22%,transparent)] bg-[color-mix(in_srgb,#a855f7_6%,var(--color-surface))] px-2.5 py-2"
          role="status"
        >
          <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" aria-hidden />
          <p className="m-0 min-w-0 text-[10px] font-medium leading-snug text-[color-mix(in_srgb,var(--color-text-secondary)_92%,#5b21b6)] dark:text-violet-100/85">
            {encouragementLine(primary)}
          </p>
        </div>
      ) : null}

      <div className={cn(isCompact ? "mt-2 space-y-2" : "mt-4 space-y-4")}>
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
          const flameTier = streakFlameTier(streakDays, isSuper)
          const flameSlot = streakFlameSlotClasses(flameTier)
          const reward = isSuper ? superhabitStreakRewardMessage(streakDays) : null
          const domain = domainLabels[habit.domain] ?? habit.domain
          const showProgressBar = habitShowsTodayProgressBar(progressUi)
          const ends = progressRowEnds(habit)

          return (
            <div
              key={habit.id}
              className={cn(
                habitIndex > 0 && "border-t border-[color-mix(in_srgb,#a855f7_18%,var(--color-border))] pt-3",
                habitIndex === 0 && (isCompact ? "pt-2" : "pt-1"),
              )}
            >
              {!single ? (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <h3
                    className={cn(
                      "m-0 text-[14px] font-semibold sm:text-[15px]",
                      doneToday
                        ? "text-[var(--color-accent-health)] line-through decoration-[1.5px]"
                        : "text-[var(--color-text-primary)]",
                    )}
                  >
                    {habit.name}
                  </h3>
                  {isSuper ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,#c9a962_42%,transparent)] bg-[color-mix(in_srgb,#c9a962_10%,transparent)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#3d3428] dark:text-[#f4ead8]">
                      <SuperHabitEmblem mark={emblemMark} size="xs" className="text-[#3d3428] dark:text-[#f4ead8]" />
                      Súper
                    </span>
                  ) : null}
                  {intraday && checks != null ? (
                    <span className="inline-flex rounded-full bg-[color-mix(in_srgb,#22c55e_12%,var(--color-surface-alt))] px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:text-emerald-200">
                      Meta {checks}
                    </span>
                  ) : null}
                  {doneToday ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-accent-health)]">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      Listo
                    </span>
                  ) : null}
                </div>
              ) : null}

              {showProgressBar ? (
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-end justify-between gap-2 gap-y-1">
                    <p className="m-0 flex min-w-0 items-center gap-1.5 text-[12px] font-semibold text-[var(--color-text-primary)] sm:text-[13px]">
                      {isWaterTrackingHabit(habit.metadata) ? (
                        <Droplets className="h-4 w-4 shrink-0 text-violet-600 dark:text-violet-400" aria-hidden />
                      ) : (
                        <Target className="h-4 w-4 shrink-0 text-[var(--color-accent-health)]" aria-hidden />
                      )}
                      <span className="min-w-0 tabular-nums">{ends.left}</span>
                    </p>
                    <p
                      className={cn(
                        "m-0 shrink-0 text-[11px] font-semibold sm:text-xs",
                        doneToday ? "text-[var(--color-accent-health)]" : "text-[var(--color-text-secondary)]",
                      )}
                    >
                      {ends.right}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                    <div className="min-w-0 flex-1">
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
                    {!isCompact && !(single && showProgressBar) ? (
                      <div className="flex shrink-0 justify-end">{renderToggle(habit)}</div>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div
                className={cn(
                  "mt-2 flex min-w-0 items-end gap-x-2 sm:gap-x-3",
                  isCompact
                    ? "flex-nowrap justify-between gap-y-0"
                    : "flex-wrap gap-y-1.5 sm:gap-y-0",
                )}
              >
                <div
                  className={cn(
                    "order-1 flex min-w-0 items-end gap-2 sm:gap-3",
                    isCompact ? "min-w-0 flex-1" : "shrink-0",
                  )}
                >
                  <div
                    className={cn(
                      "relative z-0 flex h-9 w-9 shrink-0 items-center justify-center self-end overflow-hidden rounded-xl transition-[background-color,box-shadow,filter] duration-500 ease-out",
                      flameSlot.wrap,
                      flameSlot.motion,
                    )}
                    title={`Racha actual: ${streakDays} ${streakDays === 1 ? "día" : "días"} consecutivos`}
                  >
                    <Flame className={cn("relative z-[1] h-4 w-4", flameSlot.icon)} strokeWidth={2.25} aria-hidden />
                  </div>
                  <div
                    className={cn(
                      "flex min-w-0 flex-1 items-end gap-2.5 sm:gap-4",
                      isCompact && "flex-wrap content-end gap-y-2",
                    )}
                  >
                    <div className="flex min-w-0 flex-col items-start gap-0.5">
                      <p className="m-0 text-lg font-bold tabular-nums leading-none text-[var(--color-text-primary)] sm:text-xl">
                        {streakDays}
                      </p>
                      <p className="m-0 whitespace-normal text-[10px] font-medium leading-snug text-[var(--color-text-secondary)] sm:text-[11px] sm:leading-none">
                        días de racha
                      </p>
                    </div>
                    {single ? (
                      <div
                        className={cn(
                          "flex min-w-0 flex-col gap-0.5 border-l border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] pl-2.5 sm:min-w-0 sm:pl-4",
                          isCompact ? "items-start" : "items-end text-right",
                        )}
                      >
                        <p
                          className={cn(
                            "m-0 font-bold tabular-nums leading-none text-[color-mix(in_srgb,#7c3aed_90%,var(--color-text-primary))] dark:text-violet-300",
                            isCompact ? "text-base sm:text-lg" : "text-lg sm:text-[1.35rem]",
                          )}
                        >
                          {habit.metrics.best_streak} días
                        </p>
                        <p
                          className={cn(
                            "m-0 max-w-[11rem] font-semibold uppercase leading-snug text-[var(--color-text-secondary)] sm:max-w-none sm:leading-none sm:tracking-[0.12em]",
                            isCompact ? "text-[9px] tracking-[0.06em] sm:text-[10px] sm:tracking-[0.1em]" : "text-[10px] tracking-[0.1em]",
                          )}
                        >
                          <span className="sm:hidden">Mejor racha</span>
                          <span className="hidden sm:inline">Tu mejor racha</span>
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div
                  className={cn(
                    "order-2 flex shrink-0 items-end gap-1.5 sm:gap-2",
                    isCompact ? "justify-end" : "ml-auto sm:order-3 sm:ml-0",
                  )}
                >
                  <button
                    type="button"
                    disabled={!persistenceEnabled && !mock}
                    onClick={() => onEdit(habit)}
                    className={cn(
                      isCompact
                        ? "min-h-0 rounded-md border-0 bg-transparent px-1 py-0.5 text-left text-[11px] font-medium text-[var(--color-text-secondary)] transition hover:text-[var(--color-text-primary)] disabled:opacity-40"
                        : "rounded-full border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] p-2 text-[var(--color-text-secondary)] transition hover:border-[color-mix(in_srgb,var(--color-accent-health)_35%,transparent)] hover:text-[var(--color-accent-health)] disabled:opacity-40",
                    )}
                    aria-label="Editar hábito"
                    title="Editar"
                  >
                    {isCompact ? (
                      "Editar"
                    ) : (
                      <Pencil className="h-4 w-4 opacity-90" aria-hidden />
                    )}
                  </button>
                  {isCompact || !showProgressBar || !single ? renderToggle(habit) : null}
                </div>

                {!isCompact ? (
                  <div className="order-3 flex w-full basis-full justify-center pt-0.5 sm:order-2 sm:w-auto sm:basis-0 sm:flex-1 sm:justify-center sm:pt-0">
                    <MissionWeekStrip habit={habit} />
                  </div>
                ) : null}
              </div>

              {isCompact ? (
                <div
                  className={cn(
                    "mt-2 flex w-full min-w-0 items-end gap-2 border-t border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] pt-2",
                    !metricLine && "justify-end",
                  )}
                >
                  {metricLine ? (
                    <p className="m-0 flex min-w-0 flex-1 items-end gap-1 text-[10px] leading-snug text-[color-mix(in_srgb,var(--color-text-secondary)_95%,var(--color-text-primary))]">
                      <Target
                        className="mb-px h-3 w-3 shrink-0 text-[color-mix(in_srgb,var(--color-accent-health)_75%,var(--color-text-secondary))] sm:h-3.5 sm:w-3.5"
                        aria-hidden
                      />
                      <span className="min-w-0">{metricLine}</span>
                    </p>
                  ) : null}
                  <div className="shrink-0">
                    <MissionWeekStrip habit={habit} prominentMobile />
                  </div>
                </div>
              ) : null}

              {!isCompact && single && showProgressBar ? (
                <div className="mt-3">{renderToggle(habit, { wide: true })}</div>
              ) : null}

              {(intention && !single) || (metricLine && !isCompact) || (reward && !single) ? (
                <div
                  className={cn(
                    "space-y-0.5",
                    isCompact
                      ? "mt-2 text-[10px] leading-snug text-[color-mix(in_srgb,var(--color-text-secondary)_95%,var(--color-text-primary))] sm:mt-3.5"
                      : "mt-4 text-[10.5px] leading-snug text-[color-mix(in_srgb,var(--color-text-secondary)_92%,var(--color-text-primary))] sm:text-[11px]",
                  )}
                >
                  {intention && !single ? (
                    <p className="m-0 leading-snug text-[var(--color-text-secondary)]">{intention}</p>
                  ) : null}
                  {metricLine && !isCompact ? (
                    <p className="m-0 flex items-start gap-1 text-[inherit]">
                      <Target
                        className="mt-0.5 h-3 w-3 shrink-0 text-[color-mix(in_srgb,var(--color-accent-health)_75%,var(--color-text-secondary))] sm:h-3.5 sm:w-3.5"
                        aria-hidden
                      />
                      <span className="min-w-0">{metricLine}</span>
                    </p>
                  ) : null}
                  {reward && !single ? (
                    <p className="m-0 text-[inherit] text-[color-mix(in_srgb,var(--color-accent-health)_92%,var(--color-text-secondary))]">{reward}</p>
                  ) : null}
                </div>
              ) : null}

              {!single ? (
                <p className="m-0 mt-1 text-[10px] text-[var(--color-text-secondary)]">
                  {domain} · {freq}
                </p>
              ) : null}
            </div>
          )
        })}
      </div>

      {hasSuperHabit && !superHero ? (
        <p className="m-0 mt-3 text-center text-[10px] font-medium text-[color-mix(in_srgb,var(--color-text-secondary)_88%,#5c4d3a)] dark:text-[color-mix(in_srgb,#e8dcc8_75%,transparent)]">
          Incluye súper hábito: la racha recibe bonificación al cerrar en esta misión.
        </p>
      ) : null}
    </section>
  )
}
