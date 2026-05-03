"use client"

import { useCallback, useEffect, useState } from "react"
import { FlexibleDayStackSection } from "@/app/habitos/FlexibleDayStackSection"
import { MOCK_FLEX_LAB_INTRADAY_DAILY, MOCK_FLEX_LAB_INTRADAY_SUPER } from "@/app/habitos/flexibleMissionCardLabMocks"
import { SUPER_HABIT_MARK_OPTIONS, type SuperHabitMark } from "@/app/habitos/SuperHabitEmblem"
import type { HabitMetadata, HabitWithMetrics, OperationalDomain } from "@/lib/operational/types"

type Props = {
  domainLabels: Record<OperationalDomain, string>
  formatMetricLine: (meta: HabitMetadata | undefined) => string | null
}

function toggleHabitToday(list: HabitWithMetrics[], id: string): HabitWithMetrics[] {
  return list.map((h) => {
    if (h.id !== id) return h
    const nextDone = !h.metrics.completed_today
    return {
      ...h,
      completed: nextDone,
      metrics: { ...h.metrics, completed_today: nextDone },
    }
  })
}

function withSuperFlag(h: HabitWithMetrics, isSuper: boolean): HabitWithMetrics {
  return {
    ...h,
    metadata: { ...h.metadata, is_superhabit: isSuper },
  }
}

/**
 * Comparación lado a lado: intradía compacta vs intradía espaciosa (súper).
 * Controles: marca súper por columna + emblema (4 opciones).
 *
 * Las 4 opciones de icono: **Corona** (clásica), **Gema** (joya), **Galardón** (mérito), **Escudo** (compromiso).
 * Rutina multi para `/hoy`: `app/hoy/wellnessRoutinePreviewMock.ts`.
 */
export function FlexibleMissionVariantsLab({ domainLabels, formatMetricLine }: Props) {
  const [emblem, setEmblem] = useState<SuperHabitMark>("gem")
  const [colASuper, setColASuper] = useState(false)
  const [colBSuper, setColBSuper] = useState(true)

  const [dailyList, setDailyList] = useState<HabitWithMetrics[]>(() => [MOCK_FLEX_LAB_INTRADAY_DAILY])
  const [superColList, setSuperColList] = useState<HabitWithMetrics[]>(() => [MOCK_FLEX_LAB_INTRADAY_SUPER])

  useEffect(() => {
    setDailyList((prev) => prev.map((h) => withSuperFlag(h, colASuper)))
  }, [colASuper])

  useEffect(() => {
    setSuperColList((prev) => prev.map((h) => withSuperFlag(h, colBSuper)))
  }, [colBSuper])

  const onToggleDaily = useCallback(async (habitId: string) => {
    setDailyList((prev) => toggleHabitToday(prev, habitId))
    return { ok: true as const }
  }, [])

  const onToggleSuperCol = useCallback(async (habitId: string) => {
    setSuperColList((prev) => toggleHabitToday(prev, habitId))
    return { ok: true as const }
  }, [])

  const noopCelebration = useCallback(() => {}, [])

  return (
    <section
      className="rounded-2xl border border-[color-mix(in_srgb,var(--color-accent-health)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-health)_6%,var(--color-surface))] p-4 shadow-sm sm:p-5"
      aria-labelledby="flex-mission-lab-heading"
    >
      <h2
        id="flex-mission-lab-heading"
        className="m-0 text-[13px] font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-sm"
      >
        Laboratorio · misión flexible (chequeos en el día)
      </h2>
      <p className="m-0 mt-1 max-w-[72ch] text-[11px] leading-snug text-[var(--color-text-secondary)] sm:text-[12px]">
        Cuatro emblemas posibles para sustituir la corona (elige uno y lo fijamos en producto). Activa o desactiva{" "}
        <span className="font-medium text-[var(--color-text-primary)]">Súper hábito</span> en cada columna para ver
        shell, Odisea oro y CTAs. Rutina multi reservada para Hoy:{" "}
        <span className="whitespace-nowrap">WELLNESS_ROUTINE_PREVIEW_HABITS_FOR_HOY</span>.
      </p>

      <div className="mt-3 flex flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_40%,var(--color-surface))] p-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 sm:p-3.5">
        <fieldset className="m-0 min-w-0 flex-1 border-0 p-0">
          <legend className="sr-only">Súper hábito por columna</legend>
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            Súper hábito
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-4">
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent-health)]"
                checked={colASuper}
                onChange={(e) => setColASuper(e.target.checked)}
              />
              Columna A (compacta)
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-[12px] text-[var(--color-text-primary)]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--color-border)] accent-[var(--color-accent-health)]"
                checked={colBSuper}
                onChange={(e) => setColBSuper(e.target.checked)}
              />
              Columna B (espaciosa)
            </label>
          </div>
        </fieldset>

        <div
          className="min-w-0 flex-1 border-t border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0"
          role="radiogroup"
          aria-label="Emblema visual del súper hábito"
        >
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            Emblema (4 opciones)
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUPER_HABIT_MARK_OPTIONS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={emblem === o.id}
                title={o.hint}
                onClick={() => setEmblem(o.id)}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition sm:px-3 ${
                  emblem === o.id
                    ? "border-[color-mix(in_srgb,#c9a962_55%,var(--color-border))] bg-[color-mix(in_srgb,#c9a962_14%,var(--color-surface))] text-[var(--color-text-primary)] shadow-sm"
                    : "border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] text-[var(--color-text-secondary)] hover:border-[color-mix(in_srgb,var(--color-accent-health)_35%,transparent)]"
                }`}
              >
                <span className="font-medium">{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-5 lg:grid-cols-2 lg:gap-6">
        <div className="min-w-0 space-y-2">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            A · Compacta · intradía
          </p>
          <FlexibleDayStackSection
            habits={dailyList}
            domainLabels={domainLabels}
            persistenceEnabled
            mock
            loading={false}
            togglingId={null}
            backfillingId={null}
            backfillingAll={false}
            formatMetricLine={formatMetricLine}
            onEdit={() => {}}
            onToggle={onToggleDaily}
            onStreakCelebration={noopCelebration}
            missionCardVariant="mission-compact"
            superHabitMark={emblem}
          />
        </div>
        <div className="min-w-0 space-y-2">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            B · Espaciosa · intradía
          </p>
          <FlexibleDayStackSection
            habits={superColList}
            domainLabels={domainLabels}
            persistenceEnabled
            mock
            loading={false}
            togglingId={null}
            backfillingId={null}
            backfillingAll={false}
            formatMetricLine={formatMetricLine}
            onEdit={() => {}}
            onToggle={onToggleSuperCol}
            onStreakCelebration={noopCelebration}
            missionCardVariant="mission-spacious"
            superHabitMark={emblem}
          />
        </div>
      </div>
    </section>
  )
}
