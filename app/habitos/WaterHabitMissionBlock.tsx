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
import { cn } from "@/lib/utils"

const DAY_LETTERS = ["L", "M", "X", "J", "V", "S", "D"] as const

/** Ancho mínimo por día + separación: evita que “D” quede pegado al borde (HIG: 44pt tap ≈ legible). */
const WEEK_COL_MIN = "minmax(2rem, 1fr)" as const

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
  const r = 38
  const c = 2 * Math.PI * r
  const dash = Math.min(1, Math.max(0, pct / 100)) * c
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[7.5rem] shrink-0">
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="55%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#0891b2" />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" stroke="color-mix(in srgb, var(--color-border) 45%, transparent)" strokeWidth="7" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-700 motion-reduce:transition-none"
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-secondary)]">Hoy</span>
        <span className="font-semibold tabular-nums leading-none text-[clamp(1.25rem,4vw,1.65rem)] text-[var(--color-text-primary)]">{pct}%</span>
        <span className="mt-0.5 text-[9px] font-medium tabular-nums text-[var(--color-text-secondary)]">objetivo</span>
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

  const shellStyle: CSSProperties = {
    boxShadow: "0 1px 0 color-mix(in srgb, var(--color-border) 80%, transparent), 0 8px 24px rgba(15, 23, 42, 0.06)",
  }

  return (
    <section
      aria-labelledby="water-mission-heading"
      className={cn(
        "overflow-visible rounded-[14px] border bg-[var(--color-surface)] p-4 sm:p-5",
        "border-[color-mix(in_srgb,var(--color-border)_92%,transparent)]",
      )}
      style={shellStyle}
    >
      <header className="flex gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] pb-4">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,#22d3ee_12%,var(--color-surface-alt))]"
          aria-hidden
        >
          <Droplets className="h-[22px] w-[22px] text-[#0891b2] dark:text-[#67e8f9]" strokeWidth={2} />
        </div>
        <div className="min-w-0 flex-1">
          <p
            id="water-mission-heading"
            className="m-0 flex flex-wrap items-center gap-2 text-[13px] font-semibold leading-tight tracking-[-0.01em] text-[var(--color-text-primary)]"
          >
            <span className="uppercase tracking-[0.06em] text-[11px] text-[var(--color-text-secondary)]">Hidratación</span>
            <Sparkles className="h-3.5 w-3.5 text-amber-500" strokeWidth={2} aria-hidden />
          </p>
          <p className="m-0 mt-1.5 max-w-prose text-[13px] leading-[1.45] text-[var(--color-text-secondary)]">
            Sumá mililitros durante el día. Esta misión no entra en Mañana / Tarde / Noche del stack.
          </p>
        </div>
      </header>

      <div className="mt-5 flex flex-col gap-0">
        {habits.map((habit, habitIndex) => {
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
            <div
              key={habit.id}
              className={cn(
                "overflow-visible pt-5",
                habitIndex > 0 && "mt-5 border-t border-[color-mix(in_srgb,var(--color-border)_55%,transparent)]",
              )}
            >
              {/* Título y estado en flujo (sin absolute → nada cortado) */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="m-0 text-[17px] font-semibold leading-snug tracking-[-0.02em] text-[var(--color-text-primary)]">
                      {habit.name}
                    </h3>
                    {doneToday ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--color-accent-health)_12%,transparent)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent-health)]">
                        <Trophy className="h-3 w-3" aria-hidden />
                        Meta
                      </span>
                    ) : null}
                    {atRisk ? (
                      <span className="inline-flex shrink-0 items-center rounded-full bg-[color-mix(in_srgb,var(--color-accent-danger)_10%,transparent)] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-accent-danger)]">
                        Riesgo ruptura
                      </span>
                    ) : null}
                  </div>
                  <p className="m-0 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
                    {domain} · diario ·{" "}
                    <span className="text-[var(--color-text-primary)]">{streakDays}</span>{" "}
                    {streakDays === 1 ? "día de racha" : "días de racha"}
                  </p>
                  {intention ? (
                    <p className="m-0 text-[13px] leading-[1.45] text-[var(--color-text-secondary)]">{intention}</p>
                  ) : null}
                </div>
              </div>

              {nudge ? (
                <p
                  className={cn(
                    "m-0 mt-4 border-l-[3px] pl-3 text-[13px] leading-[1.45] text-[var(--color-text-secondary)]",
                    nudge.tone === "urgent" ? "border-[var(--color-accent-danger)]" : "border-amber-500",
                  )}
                  role="status"
                >
                  <span className="font-medium text-[var(--color-text-primary)]">{nudge.title}.</span> {nudge.body}
                </p>
              ) : null}

              <div
                className="mt-4 flex flex-wrap gap-2"
                role="status"
                aria-label={`Progreso de agua: ${formatWaterMlEs(todayMl)} de ${formatWaterMlEs(goalMl)} mililitros, ${pct} por ciento, unas ${bottlesEqStr} botellitas de ${bottleMl} ml`}
              >
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-surface-alt)] px-3 py-1.5 text-[12px] font-medium tabular-nums text-[var(--color-text-primary)]">
                  <Droplets className="h-3.5 w-3.5 shrink-0 text-[var(--color-accent-health)]" aria-hidden />
                  {formatWaterMlEs(todayMl)} / {formatWaterMlEs(goalMl)} ml
                </span>
                <span className="inline-flex items-center rounded-full bg-[var(--color-surface-alt)] px-3 py-1.5 text-[12px] font-medium tabular-nums text-[var(--color-text-secondary)]">
                  ≈ {bottlesEqStr} bot. · {bottleMl} ml
                </span>
                <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--color-accent-health)_8%,var(--color-surface-alt))] px-3 py-1.5 text-[12px] font-semibold tabular-nums text-[var(--color-accent-health)]">
                  {pct}%
                </span>
              </div>

              {/* Bloque visual: anillo + semana con aire; scroll horizontal solo si hace falta */}
              <div className="mt-6 flex flex-col items-center gap-6 sm:mt-5 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
                <div className="shrink-0 pt-0.5">
                  <WaterRing pct={pct} gradId={`water-ring-grad-${habit.id.replace(/[^a-zA-Z0-9_-]/g, "")}`} />
                </div>

                <div className="min-w-0 flex-1 sm:pt-1">
                  <div className="-mx-1 overflow-x-auto overflow-y-visible px-1 pb-1 sm:mx-0 sm:overflow-visible sm:px-0">
                    <div
                      role="group"
                      aria-label="Semana actual"
                      className="mx-auto grid w-max touch-manipulation sm:mx-0 sm:ml-auto"
                      style={{
                        gridTemplateColumns: `repeat(7, ${WEEK_COL_MIN})`,
                        gap: "8px 10px",
                      }}
                    >
                      {DAY_LETTERS.map((day, dIdx) => {
                        const mark = weekMarks[dIdx]
                        const neutralDay = mark === "off" || mark === "upcoming"
                        const isMissed = mark === "missed"
                        const letterColor =
                          neutralDay && !isMissed
                            ? "color-mix(in srgb, var(--color-text-secondary) 55%, var(--color-text-primary))"
                            : "var(--color-text-primary)"
                        return (
                          <div
                            key={`${habit.id}-w-${day}-lbl`}
                            className="select-none text-center text-[11px] font-medium uppercase leading-none tracking-wide"
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
                          ? "color-mix(in srgb, color-mix(in srgb, var(--color-accent-health) 14%, var(--color-surface)) 85%, transparent)"
                          : isMissed
                            ? "color-mix(in srgb, var(--color-text-secondary) 6%, var(--color-surface-alt))"
                            : "var(--color-surface-alt)"
                        const chipBorder = isDone
                          ? "1px solid color-mix(in srgb, var(--color-accent-health) 28%, transparent)"
                          : "1px solid color-mix(in srgb, var(--color-border) 50%, transparent)"
                        const aria =
                          mark === "done"
                            ? `${day}: meta`
                            : mark === "missed"
                              ? `${day}: pendiente`
                              : `${day}: sin marca destacada`
                        return (
                          <div
                            key={`${habit.id}-w-${day}-cell`}
                            className="flex aspect-square w-full min-h-[44px] min-w-[2rem] max-w-[2.75rem] items-center justify-center rounded-lg transition-colors"
                            style={{
                              background: chipBg,
                              border: chipBorder,
                            }}
                            aria-label={aria}
                          >
                            {isDone ? (
                              <span
                                className="block h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{
                                  background: "color-mix(in srgb, var(--color-accent-health) 88%, #14532d)",
                                  boxShadow: "0 0 0 1px color-mix(in srgb, var(--color-accent-health) 22%, transparent)",
                                }}
                              />
                            ) : isMissed ? (
                              <span className="block h-1.5 w-1.5 shrink-0 rounded-full border border-[color-mix(in_srgb,var(--color-text-secondary)_35%,transparent)] bg-transparent" />
                            ) : null}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-col gap-3 sm:max-w-md">
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
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
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] bg-[linear-gradient(180deg,#22d3ee_0%,#0e9fbc_100%)] px-4 py-2.5 text-[15px] font-semibold text-white shadow-sm transition-opacity hover:opacity-95 active:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
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
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] border border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] bg-[var(--color-surface-alt)] px-4 py-2.5 text-[15px] font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_5%,var(--color-surface-alt))] disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {waterBusyId === habit.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-[var(--color-accent-health)]" aria-hidden />
                        ) : null}
                        + Vaso (+{formatWaterMlEs(glassMl)} ml)
                      </button>
                    </div>
                    <button
                      type="button"
                      disabled={!persistenceEnabled && !mock}
                      onClick={() => onEdit(habit)}
                      className="self-start rounded-md py-1 text-left text-[13px] font-medium text-[var(--color-accent-health)] underline-offset-2 hover:underline disabled:opacity-40"
                    >
                      Ajustar meta y tamaños…
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
