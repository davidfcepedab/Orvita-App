"use client"

import { useMemo, useState, type CSSProperties, type FormEvent } from "react"
import { addDaysIso, HABIT_BACKFILL_MAX_DAYS_PAST, utcTodayIso } from "@/lib/habits/habitMetrics"
import { Card } from "@/src/components/ui/Card"
import {
  Activity,
  CalendarPlus,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Loader2,
  Moon,
  Plus,
  Sun,
  Sunset,
  Target,
  TrendingDown,
  Zap,
} from "lucide-react"
import { UI_HABITS_MUTATIONS_OFF, UI_HABITS_SAVE_OFF } from "@/lib/checkins/flags"
import { groupHabitsByDaypart, orderedDaypartBlocks, type HabitTimeBlockId } from "@/lib/habits/habitStackGroups"
import { lettersToWeekdays } from "@/lib/habits/habitMetrics"
import { useHabits } from "@/app/hooks/useHabits"
import type { HabitWeekDayMark } from "@/lib/habits/habitMetrics"
import type {
  HabitMetadata,
  HabitSuccessMetricType,
  HabitWithMetrics,
  OperationalDomain,
} from "@/lib/operational/types"
import { emptyHabitModalForm, habitToModalValues, HabitFormModal } from "@/app/habitos/HabitFormModal"

const days = ["L", "M", "X", "J", "V", "S", "D"]

const DOMAIN_LABELS: Record<OperationalDomain, string> = {
  salud: "Salud",
  fisico: "Energía",
  profesional: "Capital",
  agenda: "Agenda",
}

const METRIC_LABELS: Record<HabitSuccessMetricType, string> = {
  duracion: "Duración",
  repeticiones: "Repeticiones",
  cantidad: "Cantidad",
  si_no: "Sí / no",
}

const STACK_BLOCK_META: Record<
  HabitTimeBlockId,
  { title: string; subtitle: string; Icon: typeof Sun }
> = {
  manana: { title: "Mañana", subtitle: "Antes de 12:00", Icon: Sun },
  tarde: { title: "Tarde", subtitle: "12:00 – 17:59", Icon: Sunset },
  noche: { title: "Noche", subtitle: "A partir de 18:00", Icon: Moon },
  sin_hora: { title: "Sin hora definida", subtitle: "Añade trigger u hora para ordenar el bloque", Icon: Clock },
}

/** Fondos suaves alusivos al momento del día (compatibles con tema claro/oscuro). */
const STACK_BLOCK_SURFACE: Record<
  HabitTimeBlockId,
  { section: CSSProperties; iconWrap: string; iconClass: string }
> = {
  manana: {
    section: {
      background: "color-mix(in srgb, #FBBF24 12%, var(--color-surface))",
      borderColor: "color-mix(in srgb, #F59E0B 30%, var(--color-border))",
    },
    iconWrap: "bg-[color-mix(in_srgb,#F59E0B_18%,transparent)]",
    iconClass: "text-amber-600 dark:text-amber-400",
  },
  tarde: {
    section: {
      background: "color-mix(in srgb, var(--color-accent-warning) 11%, var(--color-surface))",
      borderColor: "color-mix(in srgb, var(--color-accent-warning) 28%, var(--color-border))",
    },
    iconWrap: "bg-[color-mix(in_srgb,var(--color-accent-warning)_18%,transparent)]",
    iconClass: "text-orange-600 dark:text-orange-400",
  },
  noche: {
    section: {
      background: "color-mix(in srgb, #7c3aed 12%, var(--color-surface))",
      borderColor: "color-mix(in srgb, #7c3aed 26%, var(--color-border))",
    },
    iconWrap: "bg-[color-mix(in_srgb,#7c3aed_18%,transparent)]",
    iconClass: "text-violet-600 dark:text-violet-300",
  },
  sin_hora: {
    section: {
      background: "color-mix(in srgb, var(--color-text-secondary) 7%, var(--color-surface))",
      borderColor: "color-mix(in srgb, var(--color-text-secondary) 20%, var(--color-border))",
    },
    iconWrap: "bg-[color-mix(in_srgb,var(--color-text-secondary)_12%,transparent)]",
    iconClass: "text-[var(--color-text-secondary)]",
  },
}

function habitMetricLine(meta: HabitMetadata | undefined): string | null {
  const type = meta?.success_metric_type ?? "duracion"
  const target = meta?.success_metric_target?.trim()
  if (type === "si_no") {
    if (target) return `${METRIC_LABELS.si_no} · ${target}`
    return "Éxito: marcar hecho en el día"
  }
  const base = METRIC_LABELS[type]
  return target ? `${base} · ${target}` : base
}

function weekMarksForHabit(habit: HabitWithMetrics): HabitWeekDayMark[] {
  const w = habit.metrics.week_marks
  if (Array.isArray(w) && w.length === 7) return w
  return days.map(() => "off" as HabitWeekDayMark)
}

function rewardMessage(days: number) {
  if (days >= 120) return "Hito 120 días: consistencia de élite"
  if (days >= 90) return "Hito 90 días: sistema consolidado"
  if (days >= 60) return "Hito 60 días: constancia estratégica"
  if (days >= 45) return "Hito 45 días: momentum estable"
  if (days >= 30) return "Hito 30 días: disciplina consolidada"
  if (days >= 15) return "Hito 15 días: progreso consistente"
  if (days >= 7) return "Hito 7 días: primer bloque completado"
  return null
}

export default function HabitosPage() {
  const {
    habits,
    summary,
    loading,
    error,
    togglingId,
    backfillingId,
    backfillingAll,
    persistenceEnabled,
    mock,
    toggleCompleteToday,
    completeAllOnDay,
    createHabit,
    updateHabit,
    deleteHabit,
  } = useHabits()

  const [formOpen, setFormOpen] = useState(false)
  const [backfillOpen, setBackfillOpen] = useState(false)
  const [backfillDate, setBackfillDate] = useState(() => addDaysIso(utcTodayIso(), -1))
  const [editing, setEditing] = useState<HabitWithMetrics | null>(null)
  const [form, setForm] = useState(() => emptyHabitModalForm())

  const superhabitCount = useMemo(
    () => habits.filter((h) => h.metadata?.is_superhabit).length,
    [habits]
  )

  const habitsByDaypart = useMemo(() => groupHabitsByDaypart(habits), [habits])

  const stackBlocksWithOffsets = useMemo(() => {
    const out: { blockId: HabitTimeBlockId; habits: HabitWithMetrics[]; animStart: number }[] = []
    let animStart = 0
    for (const blockId of orderedDaypartBlocks()) {
      const list = habitsByDaypart.get(blockId) ?? []
      out.push({ blockId, habits: list, animStart })
      animStart += list.length
    }
    return out
  }, [habitsByDaypart])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return
    if (form.superhabit && !editing && superhabitCount >= 2) return

    if (!persistenceEnabled && !mock) {
      alert(UI_HABITS_SAVE_OFF)
      return
    }

    const sessionMins = Math.max(0, Math.min(24 * 60, parseInt(form.sessionDurationMinutes, 10) || 0))
    const metadata: HabitMetadata = {
      frequency: form.frequency,
      weekdays: lettersToWeekdays(form.days),
      display_days: form.days,
      is_superhabit: form.superhabit,
      success_metric_type: form.successMetricType,
    }
    const intention = form.intention.trim()
    if (intention) metadata.intention = intention
    const target = form.successMetricTarget.trim()
    if (target && form.successMetricType !== "si_no") metadata.success_metric_target = target
    if (form.successMetricType === "si_no" && target) metadata.success_metric_target = target
    if (sessionMins > 0) metadata.estimated_session_minutes = sessionMins
    const trigger = form.triggerOrTime.trim()
    if (trigger) metadata.trigger_or_time = trigger

    if (editing) {
      const r = await updateHabit(editing.id, {
        name: form.name.trim(),
        domain: form.domainKey,
        metadata,
      })
      if (!r.ok) {
        alert(r.error || "No se pudo guardar")
        return
      }
    } else {
      const r = await createHabit({
        name: form.name.trim(),
        domain: form.domainKey,
        metadata,
      })
      if (!r.ok) {
        alert(r.error || "No se pudo crear")
        return
      }
    }

    setFormOpen(false)
    setEditing(null)
    setForm(emptyHabitModalForm())
  }

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Buenos días"
    if (hour < 18) return "Buenas tardes"
    return "Buenas noches"
  })()

  const todayYmd = useMemo(() => utcTodayIso(), [])
  const minBackfillYmd = useMemo(() => addDaysIso(todayYmd, -HABIT_BACKFILL_MAX_DAYS_PAST), [todayYmd])

  const openGlobalBackfill = () => {
    setBackfillOpen((prev) => {
      const next = !prev
      if (next) setBackfillDate(addDaysIso(utcTodayIso(), -1))
      return next
    })
  }

  return (
    <div className="orbita-page-stack">
      {!persistenceEnabled && !mock && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: "12px",
            border: "0.5px solid var(--color-border)",
            background: "color-mix(in srgb, var(--color-accent-danger) 8%, var(--color-surface))",
            fontSize: "13px",
            color: "var(--color-text-primary)",
          }}
        >
          {UI_HABITS_MUTATIONS_OFF}
        </p>
      )}

      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: "12px",
            border: "0.5px solid var(--color-border)",
            background: "var(--color-surface-alt)",
            fontSize: "13px",
            color: "var(--color-text-secondary)",
          }}
        >
          {error}
        </p>
      )}

      {loading && (
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary)" }}>Cargando hábitos…</p>
      )}

      <header className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1 space-y-1.5 sm:space-y-2 sm:pr-2">
          <h1 className="m-0 text-[1.375rem] font-medium leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-[28px]">
            Sistema de Hábitos
          </h1>
          <p className="m-0 max-w-prose text-[13px] leading-snug text-[var(--color-text-secondary)]">
            Consistencia, tendencias y riesgo de ruptura. «Otro día» aplica la misma fecha a todos los hábitos del
            stack (viaje u olvido).
          </p>
          <p className="m-0 max-w-prose text-[12px] leading-snug text-[var(--color-text-secondary)]">
            {greeting}. Tu mayor racha actual en el stack es de {summary.current_streak_max} días.
          </p>
        </div>
        <button
          type="button"
          disabled={!persistenceEnabled && !mock}
          onClick={() => {
            setEditing(null)
            setForm(emptyHabitModalForm())
            setFormOpen(true)
          }}
          className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] bg-[var(--color-accent-health)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-opacity sm:h-auto sm:w-auto sm:justify-center sm:self-start sm:px-3.5 sm:py-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} className="shrink-0" aria-hidden />
          Nuevo hábito
        </button>
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-[var(--layout-gap)] sm:grid-cols-2 md:grid-cols-3">
        <Card hover className="min-w-0">
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
            <p className="text-[10px] sm:text-[11px]" style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Activity size={12} className="shrink-0" />
              <span className="min-w-0 leading-snug">Consistencia 30D</span>
            </p>
            <p className="text-2xl font-semibold tabular-nums sm:text-[28px]" style={{ margin: 0 }}>
              {summary.consistency_30d}%
            </p>
          </div>
        </Card>
        <Card hover className="min-w-0">
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
            <p className="text-[10px] sm:text-[11px]" style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Flame size={12} className="shrink-0" />
              <span className="min-w-0 leading-snug">Mejor Streak</span>
            </p>
            <p className="text-2xl font-semibold tabular-nums sm:text-[28px]" style={{ margin: 0 }}>
              {summary.best_streak}
            </p>
          </div>
        </Card>
        <Card hover className="min-w-0 sm:col-span-2 md:col-span-1">
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
            <p className="text-[10px] sm:text-[11px]" style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <TrendingDown size={12} className="shrink-0" />
              <span className="min-w-0 leading-snug">En riesgo hoy</span>
            </p>
            <p className="text-2xl font-semibold tabular-nums sm:text-[28px]" style={{ margin: 0 }}>
              {summary.at_risk}
            </p>
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <p className="m-0 shrink-0 text-[12px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            Stack actual
          </p>
          <button
            type="button"
            disabled={(!persistenceEnabled && !mock) || loading || habits.length === 0}
            onClick={openGlobalBackfill}
            title="Registrar el mismo día para todos los hábitos (viaje, olvido)"
            aria-expanded={backfillOpen}
            aria-label="Registrar completado en otro día para todos los hábitos"
            className="inline-flex min-h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[var(--color-surface-alt)] px-3 py-2 text-left text-xs font-medium text-[var(--color-text-secondary)] transition-opacity sm:w-auto sm:justify-center disabled:cursor-not-allowed disabled:opacity-45"
          >
            <CalendarPlus className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
            Otro día (todos)
          </button>
        </div>

        {backfillOpen ? (
          <div
            className="flex flex-col gap-2 rounded-[12px] border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface-alt)] p-3 sm:flex-row sm:flex-wrap sm:items-end sm:gap-3 sm:p-4"
            role="region"
            aria-label="Registrar día pasado para todos los hábitos"
          >
            <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] text-[var(--color-text-secondary)]">
              <span className="font-medium text-[var(--color-text-primary)]">Día completado (todos los hábitos)</span>
              <input
                type="date"
                value={backfillDate}
                min={minBackfillYmd}
                max={todayYmd}
                onChange={(e) => setBackfillDate(e.target.value)}
                className="min-h-9 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5 text-[13px] text-[var(--color-text-primary)]"
              />
            </label>
            <p className="m-0 w-full text-[10px] leading-snug text-[var(--color-text-secondary)] sm:order-last sm:w-full">
              Alterna el completado de ese día en cada hábito (si ya estaba marcado, se quita). Máximo{" "}
              {HABIT_BACKFILL_MAX_DAYS_PAST} días atrás (fechas en UTC).
            </p>
            <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:shrink-0">
              <button
                type="button"
                disabled={
                  (!persistenceEnabled && !mock) || backfillingAll || habits.length === 0
                }
                onClick={async () => {
                  const ids = habits.map((h) => h.id)
                  const r = await completeAllOnDay(ids, backfillDate)
                  if (!r.ok) {
                    alert(r.error || "No se pudo guardar")
                    return
                  }
                  setBackfillOpen(false)
                }}
                className="inline-flex min-h-9 flex-1 items-center justify-center rounded-lg bg-[var(--color-accent-health)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white sm:flex-none disabled:opacity-50"
              >
                {backfillingAll ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  "Aplicar a todos"
                )}
              </button>
              <button
                type="button"
                disabled={backfillingAll}
                onClick={() => setBackfillOpen(false)}
                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-[11px] font-medium text-[var(--color-text-secondary)]"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : null}

        {stackBlocksWithOffsets
          .filter(({ blockId, habits }) => blockId !== "sin_hora" || habits.length > 0)
          .map(({ blockId, habits: blockHabits, animStart }) => {
            const meta = STACK_BLOCK_META[blockId]
            const surface = STACK_BLOCK_SURFACE[blockId]
            const Icon = meta.Icon
            return (
              <section
                key={blockId}
                className="rounded-[12px] border p-3 sm:p-4"
                style={{
                  display: "grid",
                  gap: "var(--spacing-sm)",
                  ...surface.section,
                }}
                aria-labelledby={`stack-block-${blockId}`}
              >
                <div className="flex flex-wrap items-start gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] pb-3">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${surface.iconWrap}`}
                    aria-hidden
                  >
                    <Icon className={`h-5 w-5 ${surface.iconClass}`} />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <p id={`stack-block-${blockId}`} className="m-0 text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-primary)]">
                      {meta.title}
                    </p>
                    <p className="m-0 mt-0.5 text-[12px] leading-snug text-[var(--color-text-secondary)]">{meta.subtitle}</p>
                  </div>
                </div>
                <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
                  {blockHabits.length === 0 ? (
                    <p
                      className="m-0 rounded-[10px] border border-dashed border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-[12px] leading-snug text-[var(--color-text-secondary)]"
                      role="status"
                    >
                      {blockId === "sin_hora"
                        ? "Ningún hábito sin hora: todos tienen una hora reconocible en «Trigger / hora», o aún no hay hábitos en el stack."
                        : "Ningún hábito en este tramo. Al editar el hábito, escribe una hora en «Trigger / hora» (por ejemplo 08:00 o las 19) para que aparezca aquí."}
                    </p>
                  ) : null}
                  {blockHabits.map((habit, habitIdx) => {
                    const idx = animStart + habitIdx
                    const isSuperhabit = Boolean(habit.metadata?.is_superhabit)
                    const freq = habit.metadata?.frequency ?? "diario"
                    const streakDays = habit.metrics.current_streak
                    const doneToday = habit.metrics.completed_today
                    const reward = isSuperhabit ? rewardMessage(streakDays) : null
                    const weekMarks = weekMarksForHabit(habit)
                    const intention = habit.metadata?.intention?.trim()
                    const triggerOrTime = habit.metadata?.trigger_or_time?.trim()
                    const sessionMins = habit.metadata?.estimated_session_minutes
                    const metricLine = habitMetricLine(habit.metadata)

                    return (
                      <Card
                        key={habit.id}
                        hover
                        className={`group/habit motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both motion-safe:duration-500 hover:-translate-y-0.5 ${
                          isSuperhabit
                            ? "relative overflow-hidden ring-1 ring-[color-mix(in_srgb,var(--color-accent-warning)_42%,transparent)] motion-safe:hover:ring-[color-mix(in_srgb,var(--color-accent-warning)_55%,transparent)]"
                            : ""
                        }`}
                        style={{
                          animationDelay: `${Math.min(idx, 14) * 42}ms`,
                          background: isSuperhabit
                            ? "linear-gradient(165deg, color-mix(in srgb, var(--color-accent-warning) 16%, var(--color-surface)) 0%, color-mix(in srgb, #F59E0B 7%, var(--color-surface)) 48%, var(--color-surface) 100%)"
                            : "var(--color-surface)",
                          borderColor: habit.metrics.at_risk
                            ? "color-mix(in srgb, var(--color-accent-danger) 40%, var(--color-border))"
                            : isSuperhabit
                              ? "color-mix(in srgb, var(--color-accent-warning) 38%, var(--color-border))"
                              : "var(--color-border)",
                          borderWidth: isSuperhabit ? "1px 1px 1px 4px" : "1px",
                          borderStyle: "solid",
                          borderLeftColor: isSuperhabit
                            ? "color-mix(in srgb, var(--color-accent-warning) 72%, #c2410c)"
                            : undefined,
                          boxShadow: isSuperhabit
                            ? "0 6px 22px color-mix(in srgb, var(--color-accent-warning) 14%, transparent), 0 1px 0 color-mix(in srgb, var(--color-accent-warning) 22%, transparent) inset"
                            : "0 4px 14px rgba(15, 23, 42, 0.07)",
                        }}
                      >
                        <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 sm:px-3 sm:py-2.5">
                          <div className="min-w-0 space-y-1 px-3 pt-3 sm:max-w-[min(100%,22rem)] sm:flex-none sm:px-0 sm:pt-0">
                            {isSuperhabit && (
                              <span
                                className="inline-flex items-center gap-1.5 shadow-sm"
                                style={{
                                  fontSize: "11px",
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.14em",
                                  padding: "5px 12px",
                                  borderRadius: "999px",
                                  background: "color-mix(in srgb, var(--color-accent-warning) 22%, var(--color-surface))",
                                  color: "color-mix(in srgb, var(--color-accent-warning) 92%, #7c2d12)",
                                  border: "1px solid color-mix(in srgb, var(--color-accent-warning) 45%, transparent)",
                                  boxShadow:
                                    "0 0 0 1px color-mix(in srgb, var(--color-accent-warning) 12%, transparent), 0 2px 8px color-mix(in srgb, var(--color-accent-warning) 10%, transparent)",
                                }}
                              >
                                <Zap className="h-3.5 w-3.5 shrink-0 fill-[color-mix(in_srgb,var(--color-accent-warning)_35%,transparent)]" strokeWidth={2.25} aria-hidden />
                                Superhábito
                              </span>
                            )}
                            <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:items-center sm:gap-2">
                              <p
                                className="min-w-0 max-w-full sm:min-w-0 sm:flex-1 sm:truncate"
                                style={{
                                  margin: 0,
                                  fontWeight: isSuperhabit ? 700 : 600,
                                  fontSize: isSuperhabit ? "17px" : "15px",
                                  color: "var(--color-text-primary)",
                                  lineHeight: 1.35,
                                  letterSpacing: isSuperhabit ? "-0.02em" : undefined,
                                }}
                                title={habit.name}
                              >
                                {habit.name}
                              </p>
                              {habit.metrics.at_risk && (
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
                              )}
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "10px", color: "var(--color-text-secondary)" }}>
                              <span>{DOMAIN_LABELS[habit.domain] ?? habit.domain}</span>
                              <span>• {freq}</span>
                              <span>• {streakDays} días continuos</span>
                              {freq === "semanal" && (
                                <span style={{ padding: "2px 6px", borderRadius: "999px", background: "var(--color-surface-alt)" }}>
                                  Frecuencia específica
                                </span>
                              )}
                            </div>
                            {intention ? (
                              <p
                                className="line-clamp-1 text-[11px] leading-snug text-[var(--color-text-secondary)] transition-colors duration-200 group-hover/habit:text-[var(--color-text-primary)]"
                                style={{ margin: 0 }}
                              >
                                {intention}
                              </p>
                            ) : null}
                            {metricLine ? (
                              <p className="flex items-start gap-1 text-[10px] leading-snug text-[var(--color-text-secondary)]" style={{ margin: 0 }}>
                                <Target className="mt-0.5 h-3 w-3 shrink-0 text-[var(--color-accent-health)] opacity-80" aria-hidden />
                                <span>{metricLine}</span>
                              </p>
                            ) : null}
                            <div className="flex flex-wrap gap-1">
                              {typeof sessionMins === "number" && sessionMins > 0 ? (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded-full border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface-alt)] px-1.5 py-px text-[9px] font-medium leading-tight text-[var(--color-text-secondary)] transition-transform duration-200 group-hover/habit:scale-[1.02]"
                                  title="Duración estimada por sesión"
                                >
                                  <Clock className="h-2.5 w-2.5 text-[var(--color-accent-health)]" aria-hidden />
                                  ~{sessionMins} min/sesión
                                </span>
                              ) : null}
                              {triggerOrTime ? (
                                <span
                                  className="inline-flex max-w-full items-center gap-0.5 rounded-full border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_5%,var(--color-surface-alt))] px-1.5 py-px text-[9px] font-medium leading-tight text-[var(--color-text-secondary)] transition-transform duration-200 group-hover/habit:scale-[1.02]"
                                  title="Disparador u hora"
                                >
                                  <span className="truncate">{triggerOrTime}</span>
                                </span>
                              ) : null}
                            </div>
                            {reward && (
                              <p style={{ margin: 0, fontSize: "10px", color: "var(--color-accent-health)" }}>{reward}</p>
                            )}
                          </div>

                          <div className="mx-3 h-px shrink-0 bg-[var(--color-border)] sm:hidden" aria-hidden />

                          <div className="flex w-full flex-row items-center justify-between gap-3 px-3 pb-3 sm:ml-auto sm:w-auto sm:shrink-0 sm:justify-end sm:gap-2.5 sm:px-0 sm:pb-0">
                            <div
                              role="group"
                              aria-label="Estado de la semana: letras L a D y marcas debajo"
                              className="grid w-max shrink-0 touch-manipulation [grid-template-columns:repeat(7,22px)] gap-x-1 gap-y-0.5 sm:[grid-template-columns:repeat(7,24px)] sm:gap-x-1 sm:gap-y-1"
                            >
                              {days.map((day, dIdx) => {
                                const mark = weekMarks[dIdx]
                                const neutralDay = mark === "off" || mark === "upcoming"
                                const isMissed = mark === "missed"
                                const letterColor =
                                  neutralDay && !isMissed
                                    ? "color-mix(in srgb, var(--color-text-secondary) 50%, var(--color-text-primary))"
                                    : "var(--color-text-primary)"
                                return (
                                  <div
                                    key={`${habit.id}-dlabel-${day}`}
                                    className="select-none text-center text-[10px] font-semibold uppercase tracking-wide leading-none sm:text-[11px]"
                                    style={{ color: letterColor }}
                                  >
                                    {day}
                                  </div>
                                )
                              })}
                              {days.map((day, dIdx) => {
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
                                    ? `${day}: completado`
                                    : mark === "missed"
                                      ? `${day}: pendiente`
                                      : `${day}: sin marca destacada`

                                return (
                                  <div
                                    key={`${habit.id}-dcell-${day}`}
                                    className="flex h-[44px] w-full items-center justify-center rounded-[5px] transition-all duration-200 motion-safe:group-hover/habit:scale-[1.02] sm:h-[48px]"
                                    style={{
                                      background: chipBg,
                                      border: chipBorder,
                                      boxShadow: isDone ? "0 1px 0 color-mix(in srgb, var(--color-accent-health) 14%, transparent)" : "none",
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

                            <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-stretch sm:justify-center sm:gap-1.5">
                              <button
                                type="button"
                                disabled={!persistenceEnabled && !mock}
                                onClick={() => {
                                  setEditing(habit)
                                  setForm(habitToModalValues(habit))
                                  setFormOpen(true)
                                }}
                                className="min-h-[36px] min-w-[52px] rounded-md text-xs font-medium sm:min-h-0 sm:w-full sm:py-0.5 sm:text-left"
                                style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: "11px" }}
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
                                  const r = await toggleCompleteToday(habit.id)
                                  if (!r.ok) alert(r.error || "No se pudo actualizar")
                                }}
                                className="h-10 w-10 shrink-0 transition-[transform,opacity,box-shadow] duration-200 active:scale-[0.97] motion-safe:hover:scale-[1.02]"
                                style={{
                                  border: "0.5px solid var(--color-border)",
                                  borderRadius: "8px",
                                  background: doneToday
                                    ? "color-mix(in srgb, var(--color-accent-health) 11%, var(--color-surface))"
                                    : "color-mix(in srgb, var(--color-text-secondary) 5%, var(--color-surface))",
                                  cursor:
                                    (!persistenceEnabled && !mock) ||
                                    togglingId === habit.id ||
                                    backfillingId === habit.id ||
                                    backfillingAll
                                      ? "not-allowed"
                                      : "pointer",
                                  opacity:
                                    !persistenceEnabled && !mock ? 0.45 : backfillingAll ? 0.55 : 1,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {togglingId === habit.id ? (
                                  <Loader2 className="h-[18px] w-[18px] animate-spin text-[var(--color-accent-health)]" strokeWidth={2} aria-hidden />
                                ) : doneToday ? (
                                  <CheckCircle2 className="h-[18px] w-[18px] text-[var(--color-accent-health)]" strokeWidth={1.75} aria-hidden />
                                ) : (
                                  <Circle className="h-[18px] w-[18px] text-[var(--color-text-secondary)]" strokeWidth={1.75} aria-hidden />
                                )}
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
          })}
      </div>

      <HabitFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        editing={editing}
        form={form}
        setForm={setForm}
        onSubmit={handleSubmit}
        onDeleteHabit={deleteHabit}
        superhabitCount={superhabitCount}
        persistenceEnabled={persistenceEnabled}
        mock={mock}
        domainLabels={DOMAIN_LABELS}
      />
    </div>
  )
}


