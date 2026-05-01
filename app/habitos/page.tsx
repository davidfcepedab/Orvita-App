"use client"

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react"
import {
  addDaysIso,
  HABIT_BACKFILL_MAX_DAYS_PAST,
  isScheduledOnUtcDay,
  lettersToWeekdays,
  utcTodayIso,
} from "@/lib/habits/habitMetrics"
import { Card } from "@/src/components/ui/Card"
import {
  Activity,
  BarChart2,
  CalendarPlus,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  LayoutGrid,
  List,
  Loader2,
  Moon,
  Plus,
  Sparkles,
  Sun,
  Sunset,
  Target,
  TrendingDown,
  Trophy,
  Zap,
} from "lucide-react"
import { UI_HABITS_MUTATIONS_OFF, UI_HABITS_SAVE_OFF } from "@/lib/checkins/flags"
import { groupHabitsByDaypart, orderedDaypartBlocks, type HabitTimeBlockId } from "@/lib/habits/habitStackGroups"
import {
  DEFAULT_WATER_BOTTLE_ML,
  DEFAULT_WATER_GLASS_ML,
  DEFAULT_WATER_GOAL_ML,
  WATER_SYSTEM_TRIGGER_OR_TIME,
} from "@/lib/habits/waterTrackingHelpers"
import { useHabits } from "@/app/hooks/useHabits"
import { useStreakCelebrationQueue } from "@/app/hooks/useStreakCelebrationQueue"
import type { HabitWeekDayMark } from "@/lib/habits/habitMetrics"
import type {
  HabitMetadata,
  HabitSuccessMetricType,
  HabitWithMetrics,
  OperationalDomain,
} from "@/lib/operational/types"
import { emptyHabitModalForm, habitToModalValues, HabitFormModal } from "@/app/habitos/HabitFormModal"
import { WaterHabitMissionBlock } from "@/app/habitos/WaterHabitMissionBlock"
import { HabitSparkline14 } from "@/app/habitos/HabitSparkline14"
import { StreakCelebrationOverlay } from "@/app/habitos/StreakCelebrationOverlay"
import { superhabitStreakRewardMessage } from "@/lib/habits/streakMilestones"
import {
  buildHabitConsistencyInsight,
  type HabitConsistencyTier,
} from "@/lib/habits/habitConsistencyInterpretation"

const days = ["L", "M", "X", "J", "V", "S", "D"]

const CONSISTENCY_INSIGHT_STEP_ICONS = [Activity, Clock, BarChart2] as const

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

type HabitsShellView = "resumen" | "stack"

const HABITOS_SHELL_KEY = "orbita-habitos-shell-view"
const HABITOS_LAST_STACK_MS_KEY = "orbita-habitos-last-stack-at-ms"
/** Días sin abrir la pestaña Stack antes de mostrar recordatorio (con hábitos en riesgo). */
const STACK_REMINDER_AFTER_DAYS = 3

function daysSinceMs(ms: number | null): number {
  if (ms == null || !Number.isFinite(ms)) return Number.POSITIVE_INFINITY
  return (Date.now() - ms) / 86_400_000
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

/** Estilo gamificado por banda de adherencia (barra, halo, badge). */
const HABIT_CONSISTENCY_TIER_PRESENTATION: Record<
  HabitConsistencyTier,
  {
    badge: string
    barFrom: string
    barTo: string
    glow: string
    orb: string
    badgeWrapClass: string
  }
> = {
  empty: {
    badge: "Sin clasificar",
    barFrom: "#94a3b8",
    barTo: "#cbd5e1",
    glow: "rgba(148, 163, 184, 0.45)",
    orb: "color-mix(in srgb, var(--color-accent-health) 14%, transparent)",
    badgeWrapClass:
      "border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_95%,transparent)] text-[var(--color-text-secondary)]",
  },
  very_low: {
    badge: "Rango I · Semilla",
    barFrom: "#ea580c",
    barTo: "#fb923c",
    glow: "rgba(251, 146, 60, 0.55)",
    orb: "rgba(234, 88, 12, 0.14)",
    badgeWrapClass:
      "border-[color-mix(in_srgb,#ea580c_38%,transparent)] bg-[color-mix(in_srgb,#ea580c_12%,transparent)] text-[#9a3412] dark:text-[#fdba74]",
  },
  low: {
    badge: "Rango II · Brote",
    barFrom: "#0d9488",
    barTo: "#2dd4bf",
    glow: "rgba(45, 212, 191, 0.45)",
    orb: "rgba(13, 148, 136, 0.12)",
    badgeWrapClass:
      "border-[color-mix(in_srgb,#0d9488_35%,transparent)] bg-[color-mix(in_srgb,#0d9488_11%,transparent)] text-[#115e59] dark:text-[#5eead4]",
  },
  mid: {
    badge: "Rango III · Sistema",
    barFrom: "#16a34a",
    barTo: "#4ade80",
    glow: "rgba(74, 222, 128, 0.4)",
    orb: "rgba(22, 163, 74, 0.11)",
    badgeWrapClass:
      "border-[color-mix(in_srgb,#16a34a_32%,transparent)] bg-[color-mix(in_srgb,#16a34a_10%,transparent)] text-[#166534] dark:text-[#86efac]",
  },
  high: {
    badge: "Rango IV · Ritmo",
    barFrom: "#7c3aed",
    barTo: "#a78bfa",
    glow: "rgba(167, 139, 250, 0.45)",
    orb: "rgba(124, 58, 237, 0.12)",
    badgeWrapClass:
      "border-[color-mix(in_srgb,#7c3aed_32%,transparent)] bg-[color-mix(in_srgb,#7c3aed_10%,transparent)] text-[#5b21b6] dark:text-[#c4b5fd]",
  },
  elite: {
    badge: "Rango V · Leyenda",
    barFrom: "#ca8a04",
    barTo: "#fde047",
    glow: "rgba(253, 224, 71, 0.55)",
    orb: "rgba(202, 138, 4, 0.14)",
    badgeWrapClass:
      "border-[color-mix(in_srgb,#ca8a04_40%,transparent)] bg-[color-mix(in_srgb,#ca8a04_12%,transparent)] text-[#854d0e] dark:text-[#fde047]",
  },
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
    completeAllScheduledToday,
    createHabit,
    updateHabit,
    deleteHabit,
    incrementWaterMl,
  } = useHabits()

  const [shellView, setShellView] = useState<HabitsShellView>("stack")
  const [lastStackVisitMs, setLastStackVisitMs] = useState<number | null>(null)
  const [prefsHydrated, setPrefsHydrated] = useState(false)
  const resumenPanelRef = useRef<HTMLDivElement>(null)
  const stackPanelRef = useRef<HTMLDivElement>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [backfillOpen, setBackfillOpen] = useState(false)
  const [backfillDate, setBackfillDate] = useState(() => addDaysIso(utcTodayIso(), -1))
  const [editing, setEditing] = useState<HabitWithMetrics | null>(null)
  const [form, setForm] = useState(() => emptyHabitModalForm())
  const [waterBusyId, setWaterBusyId] = useState<string | null>(null)
  const { activeStreak, streakOpen, enqueueStreakCelebrations, dismissFront } = useStreakCelebrationQueue()

  useEffect(() => {
    try {
      const v = sessionStorage.getItem(HABITOS_SHELL_KEY)
      if (v === "resumen" || v === "stack") setShellView(v)
      const raw = sessionStorage.getItem(HABITOS_LAST_STACK_MS_KEY)
      if (raw != null) {
        const n = Number.parseInt(raw, 10)
        if (Number.isFinite(n)) setLastStackVisitMs(n)
      }
    } catch {
      /* private mode / SSR */
    }
    setPrefsHydrated(true)
  }, [])

  useEffect(() => {
    if (!prefsHydrated) return
    try {
      sessionStorage.setItem(HABITOS_SHELL_KEY, shellView)
    } catch {
      /* */
    }
  }, [shellView, prefsHydrated])

  useEffect(() => {
    if (shellView !== "stack") return
    const n = Date.now()
    try {
      sessionStorage.setItem(HABITOS_LAST_STACK_MS_KEY, String(n))
    } catch {
      /* */
    }
    setLastStackVisitMs(n)
  }, [shellView])

  useEffect(() => {
    const el = shellView === "resumen" ? resumenPanelRef.current : stackPanelRef.current
    window.requestAnimationFrame(() => {
      el?.focus()
    })
  }, [shellView])

  const superhabitCount = useMemo(
    () => habits.filter((h) => h.metadata?.is_superhabit).length,
    [habits]
  )

  const habitsForDaypartStack = useMemo(
    () => habits.filter((h) => h.metadata?.habit_type !== "water-tracking"),
    [habits],
  )
  const waterHabitsForMission = useMemo(
    () => habits.filter((h) => h.metadata?.habit_type === "water-tracking"),
    [habits],
  )
  const habitsByDaypart = useMemo(() => groupHabitsByDaypart(habitsForDaypartStack), [habitsForDaypartStack])

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

  const consistencyInsight = useMemo(
    () => buildHabitConsistencyInsight(habits, summary),
    [habits, summary],
  )

  /** Roster para resumen: primero los que más necesitan atención (menor % 30d). */
  const rosterByAdherence = useMemo(() => {
    return [...habits].sort(
      (a, b) =>
        a.metrics.completion_rate_30d - b.metrics.completion_rate_30d || a.name.localeCompare(b.name, "es"),
    )
  }, [habits])
  const consistencyTierUi = HABIT_CONSISTENCY_TIER_PRESENTATION[consistencyInsight.tier]
  const consistencyMomentumPct =
    habits.length === 0 ? 0 : Math.min(100, Math.max(0, summary.consistency_30d))

  const todayYmd = useMemo(() => utcTodayIso(), [])
  const pendingScheduledTodayIds = useMemo(() => {
    return habits
      .filter((h) => !h.metrics.completed_today && isScheduledOnUtcDay(h.metadata ?? null, todayYmd))
      .map((h) => h.id)
  }, [habits, todayYmd])

  const showStackReminder = useMemo(() => {
    if (summary.at_risk <= 0 || shellView !== "resumen") return false
    return daysSinceMs(lastStackVisitMs) >= STACK_REMINDER_AFTER_DAYS
  }, [summary.at_risk, shellView, lastStackVisitMs])

  const stackReminderDaysLabel = useMemo(() => {
    if (lastStackVisitMs == null || !Number.isFinite(lastStackVisitMs)) return null
    const d = Math.floor((Date.now() - lastStackVisitMs) / 86_400_000)
    return d < 1 ? "menos de 1 día" : `${d} día${d === 1 ? "" : "s"}`
  }, [lastStackVisitMs])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (editing?.metadata?.habit_type !== "water-tracking" && !form.name.trim()) return
    if (form.superhabit && !editing && superhabitCount >= 2) return

    if (!persistenceEnabled && !mock) {
      alert(UI_HABITS_SAVE_OFF)
      return
    }

    const sessionMins = Math.max(0, Math.min(24 * 60, parseInt(form.sessionDurationMinutes, 10) || 0))

    if (editing?.metadata?.habit_type === "water-tracking") {
      const prev: HabitMetadata = { ...(editing.metadata ?? {}) }
      delete prev.success_metric_type
      delete prev.success_metric_target
      delete prev.estimated_session_minutes

      const goalParsed = Math.round(parseInt(form.waterGoalMl, 10) || 0)
      const goalMl = Math.max(500, Math.min(8000, goalParsed || DEFAULT_WATER_GOAL_ML))
      const bottleParsed = Math.round(parseInt(form.waterBottleMl, 10) || 0)
      const bottleMl = Math.max(100, Math.min(5000, bottleParsed || DEFAULT_WATER_BOTTLE_ML))
      const glassParsed = Math.round(parseInt(form.waterGlassMl, 10) || 0)
      const glassMl = Math.max(50, Math.min(1000, glassParsed || DEFAULT_WATER_GLASS_ML))

      const allWeekdays = [0, 1, 2, 3, 4, 5, 6]
      const allDisplayDays = ["L", "M", "X", "J", "V", "S", "D"]

      const metadata: HabitMetadata = {
        ...prev,
        habit_type: "water-tracking",
        frequency: "diario",
        weekdays: allWeekdays,
        display_days: allDisplayDays,
        is_superhabit: false,
        trigger_or_time: WATER_SYSTEM_TRIGGER_OR_TIME,
        water_goal_ml: goalMl,
        water_bottle_ml: bottleMl,
        water_glass_ml: glassMl,
      }
      const intentionLocked = (editing.metadata?.intention ?? "").trim()
      if (intentionLocked) metadata.intention = intentionLocked
      else delete metadata.intention

      const bw = form.bodyWeightKg.trim().replace(",", ".")
      const weightNum = parseFloat(bw)
      if (Number.isFinite(weightNum) && weightNum >= 30 && weightNum <= 250) {
        metadata.body_weight_kg = Math.round(weightNum * 10) / 10
      } else {
        delete metadata.body_weight_kg
      }

      const r = await updateHabit(editing.id, {
        name: editing.name.trim(),
        domain: "salud",
        metadata,
      })
      if (!r.ok) {
        alert(r.error || "No se pudo guardar")
        return
      }
      setFormOpen(false)
      setEditing(null)
      setForm(emptyHabitModalForm())
      return
    }

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

  const minBackfillYmd = useMemo(() => addDaysIso(todayYmd, -HABIT_BACKFILL_MAX_DAYS_PAST), [todayYmd])

  const openGlobalBackfill = () => {
    setBackfillOpen((prev) => {
      const next = !prev
      if (next) setBackfillDate(addDaysIso(utcTodayIso(), -1))
      return next
    })
  }

  return (
    <div className="orbita-page-stack mx-auto w-full max-w-[min(72rem,calc(100vw-1.5rem))]">
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

      <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_78%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_35%,var(--color-surface))] p-3 sm:gap-3.5 sm:p-4">
        <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 space-y-1 sm:space-y-1.5">
            <h1 className="m-0 text-[1.25rem] font-semibold leading-tight tracking-tight text-[var(--color-text-primary)] sm:text-[1.35rem]">
              Sistema de Hábitos
            </h1>
            <p className="m-0 max-w-[52ch] text-[11px] leading-snug text-[var(--color-text-secondary)] sm:text-[12px]">
              Consistencia y riesgo de ruptura. «Otro día» registra la misma fecha para todo el stack.
            </p>
            <p className="m-0 text-[10px] leading-snug text-[var(--color-text-secondary)] sm:text-[11px]">
              <span className="text-[var(--color-text-primary)]">{greeting}</span>
              <span aria-hidden className="mx-1.5 text-[var(--color-border)]">
                ·
              </span>
              Racha máx. <span className="tabular-nums font-medium text-[var(--color-text-primary)]">{summary.current_streak_max}</span> d
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
            className="inline-flex h-10 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-accent-health)_35%,transparent)] bg-[var(--color-accent-health)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-white transition-opacity sm:h-9 sm:w-auto sm:self-start sm:px-3 sm:py-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={14} className="shrink-0" aria-hidden />
            Nuevo hábito
          </button>
        </div>

        <div
          className="flex min-w-0 flex-col gap-2 border-t border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] pt-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4"
          role="tablist"
          aria-label="Vista de hábitos: resumen o stack"
        >
          <div className="grid min-w-0 grid-cols-2 gap-1 sm:flex sm:gap-1 lg:flex-initial lg:shrink-0">
            <button
              type="button"
              role="tab"
              aria-selected={shellView === "resumen"}
              title="Métricas y briefing de consistencia"
              onClick={() => setShellView("resumen")}
              className={`orbita-focus-ring inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors sm:flex-1 sm:px-3 sm:text-[11px] lg:min-w-[7rem] lg:flex-initial ${
                shellView === "resumen"
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-border)_65%,transparent)]"
                  : "bg-transparent text-[var(--color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--color-surface)_55%,transparent)]"
              }`}
            >
              <List className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              Resumen
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={shellView === "stack"}
              title="Marcar y ordenar por mañana, tarde o noche"
              onClick={() => setShellView("stack")}
              className={`orbita-focus-ring inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[10px] font-semibold uppercase tracking-[0.1em] transition-colors sm:flex-1 sm:px-3 sm:text-[11px] lg:min-w-[7rem] lg:flex-initial ${
                shellView === "stack"
                  ? "bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--color-border)_65%,transparent)]"
                  : "bg-transparent text-[var(--color-text-secondary)] hover:bg-[color-mix(in_srgb,var(--color-surface)_55%,transparent)]"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              Stack
            </button>
          </div>

          {shellView === "stack" ? (
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3 lg:min-w-0 lg:flex-1 lg:flex-row lg:items-center lg:justify-end lg:gap-4">
              <p className="m-0 shrink-0 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-secondary)] lg:text-right">
                Stack actual
              </p>
              <button
                type="button"
                disabled={(!persistenceEnabled && !mock) || loading || habits.length === 0}
                onClick={openGlobalBackfill}
                title="Registrar el mismo día para todos los hábitos (viaje, olvido)"
                aria-expanded={backfillOpen}
                aria-label="Registrar completado en otro día para todos los hábitos"
                className="inline-flex min-h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-primary)] transition-opacity sm:w-auto sm:justify-center lg:w-auto disabled:cursor-not-allowed disabled:opacity-45"
              >
                <CalendarPlus className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden />
                Otro día (todos)
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {showStackReminder ? (
        <div
          role="status"
          className="rounded-xl border border-[color-mix(in_srgb,var(--color-accent-warning)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-warning)_10%,var(--color-surface))] px-3 py-2.5 sm:px-4 sm:py-3"
        >
          <p className="m-0 text-[12px] font-semibold leading-snug text-[var(--color-text-primary)] sm:text-[13px]">
            {stackReminderDaysLabel
              ? `Hace ${stackReminderDaysLabel} que no abres la vista Stack y tienes hábitos en riesgo hoy.`
              : `No hay registro reciente de Stack en este navegador; con hábitos en riesgo hoy conviene abrirla para marcar el día.`}
          </p>
          <p className="m-0 mt-1 text-[11px] leading-snug text-[var(--color-text-secondary)] sm:text-[12px]">
            Abre Stack para marcar «hecho hoy» o revisar el orden por momento del día.
          </p>
          <button
            type="button"
            onClick={() => setShellView("stack")}
            className="orbita-focus-ring mt-2 inline-flex min-h-9 items-center justify-center rounded-lg bg-[var(--color-accent-health)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white focus-visible:outline-none"
          >
            Ir a Stack
          </button>
        </div>
      ) : null}

      {shellView === "resumen" ? (
        <div
          ref={resumenPanelRef}
          tabIndex={-1}
          className="grid min-w-0 gap-[var(--layout-gap)] outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-accent-health)_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
        >
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

      <Card
        hover
        className="relative min-w-0 overflow-hidden p-0 shadow-[0_12px_40px_-12px_color-mix(in_srgb,var(--color-accent-health)_22%,transparent)]"
        style={{
          background:
            "linear-gradient(165deg, color-mix(in srgb, var(--color-accent-health) 7%, var(--color-surface)) 0%, var(--color-surface) 42%, var(--color-surface) 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 h-64 w-64 rounded-full blur-3xl sm:h-72 sm:w-72"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${consistencyTierUi.orb} 0%, transparent 68%)`,
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[color-mix(in_srgb,var(--color-accent-health)_45%,transparent)] to-transparent" />
        <div className="relative px-4 pb-5 pt-4 sm:px-6 sm:pb-6 sm:pt-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
            <div className="flex min-w-0 gap-3">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--color-accent-health)_16%,transparent)] shadow-[inset_0_1px_0_color-mix(in_srgb,white_22%,transparent),0_8px_24px_-8px_color-mix(in_srgb,var(--color-accent-health)_35%,transparent)] ring-2 ring-[color-mix(in_srgb,var(--color-accent-health)_38%,transparent)]">
                <Sparkles className="h-6 w-6 text-[var(--color-accent-health)]" aria-hidden />
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--color-surface)] text-[9px] shadow-sm ring-1 ring-[color-mix(in_srgb,var(--color-border)_70%,transparent)]">
                  <Zap className="h-2.5 w-2.5 text-amber-500" aria-hidden />
                </span>
              </div>
              <div className="min-w-0 space-y-0.5 pt-0.5">
                <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">
                  Briefing de consistencia
                </p>
                <p className="m-0 max-w-[26rem] text-[12px] leading-snug text-[var(--color-text-secondary)] sm:max-w-[34rem] lg:max-w-[40rem]">
                  Informe gamificado según tu adherencia media (30d), rachas y alertas de hoy.
                </p>
              </div>
            </div>
            <span
              className={`inline-flex w-fit shrink-0 items-center gap-2 self-start rounded-full border px-3.5 py-1.5 text-[11px] font-semibold leading-none tracking-tight shadow-sm ${consistencyTierUi.badgeWrapClass}`}
            >
              <Trophy className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
              {consistencyTierUi.badge}
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-7 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(15.5rem,17.5rem)] lg:items-start lg:gap-x-10 lg:gap-y-0">
            <div className="flex min-w-0 flex-col gap-5 lg:order-2 lg:sticky lg:top-4 lg:self-start">
              <div>
                <div className="mb-2 flex flex-wrap items-end justify-between gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                    Momentum 30d
                  </span>
                  <span className="text-2xl font-bold tabular-nums leading-none tracking-tight text-[var(--color-text-primary)] sm:text-[26px]">
                    {habits.length === 0 ? "—" : `${summary.consistency_30d}%`}
                  </span>
                </div>
                <div
                  className="relative h-3.5 w-full overflow-hidden rounded-full p-[3px] ring-1 ring-[color-mix(in_srgb,var(--color-border)_75%,transparent)]"
                  style={{
                    background:
                      "color-mix(in srgb, var(--color-text-secondary) 9%, var(--color-surface-alt))",
                  }}
                >
                  <div
                    className="h-full min-w-0 rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none"
                    style={{
                      width: `${consistencyMomentumPct}%`,
                      background: `linear-gradient(90deg, ${consistencyTierUi.barFrom}, ${consistencyTierUi.barTo})`,
                      boxShadow: `0 0 22px ${consistencyTierUi.glow}, inset 0 1px 0 rgba(255,255,255,0.35)`,
                    }}
                  />
                </div>
                <p className="m-0 mt-1.5 text-[10px] leading-snug text-[var(--color-text-secondary)]">
                  Promedio del stack en días programados · sube cerrando días pendientes sin castigarte.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-primary)] shadow-sm">
                  <Flame className="h-3.5 w-3.5 text-orange-500" aria-hidden />
                  <span className="tabular-nums">{summary.current_streak_max}</span>
                  <span className="text-[var(--color-text-secondary)]">racha máx. hoy</span>
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--color-text-primary)] shadow-sm">
                  <Trophy className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" aria-hidden />
                  <span className="tabular-nums">{summary.best_streak}</span>
                  <span className="text-[var(--color-text-secondary)]">mejor histórico</span>
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-[11px] font-medium shadow-sm ${
                    summary.at_risk > 0
                      ? "border-[color-mix(in_srgb,var(--color-accent-warning)_45%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-warning)_10%,transparent)] text-[var(--color-text-primary)]"
                      : "border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_8%,transparent)] text-[var(--color-text-primary)]"
                  }`}
                >
                  <Target
                    className={`h-3.5 w-3.5 ${summary.at_risk > 0 ? "text-[var(--color-accent-warning)]" : "text-[var(--color-accent-health)]"}`}
                    aria-hidden
                  />
                  <span className="tabular-nums">{summary.at_risk}</span>
                  <span className="text-[var(--color-text-secondary)]">en alerta hoy</span>
                </span>
              </div>
            </div>

            <div className="min-w-0 lg:order-1 lg:max-w-[min(40rem,100%)] lg:pr-1">
              <h2
                id="habitos-consistency-insight-headline"
                className="m-0 text-lg font-semibold tracking-tight text-[var(--color-text-primary)] text-balance sm:text-xl"
              >
                {consistencyInsight.headline}
              </h2>
              <ol
                aria-labelledby="habitos-consistency-insight-headline"
                className="m-0 mt-4 list-none space-y-2.5 p-0 sm:mt-5 sm:space-y-3"
              >
                {consistencyInsight.lines.map((line, idx) => {
                  const StepIcon = CONSISTENCY_INSIGHT_STEP_ICONS[idx] ?? Sparkles
                  return (
                    <li
                      key={`consistency-insight-${idx}`}
                      className="flex gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_58%,var(--color-surface))] p-3 shadow-[inset_0_1px_0_color-mix(in_srgb,white_10%,transparent)] transition-[border-color,box-shadow] duration-200 sm:gap-3.5 sm:p-3.5 motion-reduce:transition-none lg:hover:border-[color-mix(in_srgb,var(--color-accent-health)_28%,transparent)] lg:hover:shadow-[0_10px_28px_-18px_color-mix(in_srgb,var(--color-accent-health)_35%,transparent)]"
                    >
                      <div className="flex shrink-0 items-center gap-2 pt-0.5">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--color-accent-health)_14%,transparent)] text-[11px] font-bold tabular-nums text-[var(--color-accent-health)] ring-1 ring-[color-mix(in_srgb,var(--color-accent-health)_22%,transparent)] sm:h-9 sm:w-9 sm:text-xs"
                          aria-hidden
                        >
                          {idx + 1}
                        </span>
                        <StepIcon
                          className="hidden h-4 w-4 shrink-0 text-[var(--color-text-secondary)] opacity-85 sm:block"
                          strokeWidth={2}
                          aria-hidden
                        />
                      </div>
                      <p className="m-0 min-w-0 flex-1 text-pretty text-[13px] leading-[1.55] tracking-[-0.01em] text-[var(--color-text-secondary)] sm:text-[14px] sm:leading-[1.52]">
                        {line}
                      </p>
                    </li>
                  )
                })}
              </ol>
            </div>
          </div>
        </div>
      </Card>

      <Card hover className="min-w-0 overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 sm:px-5 sm:py-3.5">
          <div className="min-w-0">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              Roster · adherencia 30d
            </p>
            <p className="m-0 mt-1 max-w-prose text-[12px] leading-snug text-[var(--color-text-secondary)] sm:text-[13px]">
              Del más débil al más fuerte en la ventana de 30 días. Cada fila resume ritmo reciente, racha y el cierre de hoy; marca en Stack.
            </p>
          </div>
          {pendingScheduledTodayIds.length > 0 && (persistenceEnabled || mock) ? (
            <button
              type="button"
              disabled={loading || backfillingAll}
              onClick={async () => {
                const r = await completeAllScheduledToday(pendingScheduledTodayIds)
                if (!r.ok) alert(r.error || "No se pudo completar")
                else enqueueStreakCelebrations(r.streakCelebrations ?? [])
              }}
              className="inline-flex min-h-9 w-full shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[var(--color-accent-health)] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-white transition-opacity sm:w-auto disabled:opacity-50"
            >
              {backfillingAll ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden />
              )}
              Marcar todos OK hoy ({pendingScheduledTodayIds.length})
            </button>
          ) : null}
        </div>
        <div className="px-3 pb-5 pt-2 sm:px-5 sm:pb-6 sm:pt-3">
          {rosterByAdherence.length === 0 ? (
            <p className="m-0 py-6 text-center text-[12px] text-[var(--color-text-secondary)] sm:px-2">
              Aún no hay hábitos. Crea el primero con «Nuevo hábito» y vuelve a este resumen.
            </p>
          ) : (
            <ul
              className="m-0 flex list-none flex-col gap-2.5 p-0 sm:gap-3"
              aria-label="Hábitos del roster, ordenados por adherencia a 30 días"
            >
              {rosterByAdherence.map((h) => {
                const pct = h.metrics.completion_rate_30d
                const streak = h.metrics.current_streak
                return (
                  <li
                    key={h.id}
                    className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_62%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_42%,var(--color-surface))] p-3.5 shadow-[inset_0_1px_0_color-mix(in_srgb,white_7%,transparent)] sm:p-4"
                  >
                    <div className="min-w-0 space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="m-0 text-[15px] font-semibold leading-snug tracking-[-0.02em] text-[var(--color-text-primary)] sm:text-base">
                              {h.name}
                            </p>
                            <span className="mt-1.5 inline-flex max-w-full items-center rounded-full border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_65%,transparent)] px-2 py-0.5 text-[10px] font-medium text-[var(--color-text-secondary)]">
                              {DOMAIN_LABELS[h.domain] ?? h.domain}
                            </span>
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-2">
                            {h.metrics.at_risk ? (
                              <span className="inline-flex rounded-full border border-[color-mix(in_srgb,var(--color-accent-danger)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-danger)_10%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-accent-danger)]">
                                Riesgo
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)]">
                                En ritmo
                              </span>
                            )}
                            {h.metrics.completed_today ? (
                              <CheckCircle2
                                className="h-5 w-5 shrink-0 text-[var(--color-accent-health)]"
                                aria-label="Hecho hoy"
                              />
                            ) : (
                              <Circle
                                className="h-5 w-5 shrink-0 text-[var(--color-text-secondary)]"
                                aria-label="Pendiente hoy"
                              />
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-stretch gap-4 sm:gap-5">
                          <div className="flex min-w-0 flex-1 flex-col gap-2">
                            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                              Últimos 14 días
                            </span>
                            <div className="flex min-w-0 items-center rounded-xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_55%,var(--color-surface-alt))] px-3 py-2.5 sm:px-3.5 sm:py-3">
                              <HabitSparkline14 values={h.metrics.sparkline14 ?? []} />
                            </div>
                          </div>
                          <div className="w-full min-w-[9rem] shrink-0 sm:w-36">
                            <div className="mb-1 flex items-baseline justify-between gap-2">
                              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                                30 días
                              </span>
                              <span className="text-lg font-bold tabular-nums leading-none tracking-tight text-[var(--color-text-primary)]">
                                {pct}%
                              </span>
                            </div>
                            <div
                              className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-text-secondary)_11%,var(--color-surface-alt))] ring-1 ring-[color-mix(in_srgb,var(--color-border)_58%,transparent)]"
                              aria-hidden
                            >
                              <div
                                className="h-full rounded-full bg-[var(--color-accent-health)] transition-[width] duration-500 ease-out motion-reduce:transition-none"
                                style={{
                                  width: `${Math.min(100, Math.max(0, pct))}%`,
                                  boxShadow: "inset 0 1px 0 color-mix(in srgb, white 38%, transparent)",
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-[color-mix(in_srgb,var(--color-border)_48%,transparent)] pt-2.5 text-[11px] text-[var(--color-text-secondary)] sm:text-[12px]">
                          <span
                            className="inline-flex items-center gap-1.5"
                            title="Racha = días programados para este hábito seguidos cumplidos; no cuenta días en que el hábito no aplica."
                          >
                            <Flame className="h-3.5 w-3.5 shrink-0 text-orange-500" aria-hidden />
                            <span className="tabular-nums font-semibold text-[var(--color-text-primary)]">{streak}</span>
                            {streak === 1 ? "día de racha" : "días de racha"}
                          </span>
                        </div>
                      </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </Card>
        </div>
      ) : null}

      {shellView === "stack" ? (
      <div
        ref={stackPanelRef}
        tabIndex={-1}
        style={{ display: "grid", gap: "var(--spacing-md)" }}
        className="outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-accent-health)_45%,transparent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)]"
      >
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

        <WaterHabitMissionBlock
          habits={waterHabitsForMission}
          domainLabels={DOMAIN_LABELS}
          persistenceEnabled={persistenceEnabled}
          mock={mock}
          loading={loading}
          waterBusyId={waterBusyId}
          setWaterBusyId={setWaterBusyId}
          backfillingId={backfillingId}
          backfillingAll={backfillingAll}
          incrementWaterMl={incrementWaterMl}
          onEdit={(habit) => {
            setEditing(habit)
            setForm(habitToModalValues(habit))
            setFormOpen(true)
          }}
        />

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
                    const reward = isSuperhabit ? superhabitStreakRewardMessage(streakDays) : null
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
                          borderWidth: isSuperhabit ? "4px 1px 1px 1px" : "1px",
                          borderStyle: "solid",
                          borderTopColor: isSuperhabit
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
                            <div
                              style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "10px", color: "var(--color-text-secondary)" }}
                              title="La racha cuenta solo días en que este hábito aplica (según frecuencia y días elegidos)."
                            >
                              <span>{DOMAIN_LABELS[habit.domain] ?? habit.domain}</span>
                              <span>• {freq}</span>
                              <span>
                                • {streakDays} {streakDays === 1 ? "día de racha" : "días de racha"}
                              </span>
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
                                  else if (r.streakCelebration)
                                    enqueueStreakCelebrations([r.streakCelebration])
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
      ) : null}

      <StreakCelebrationOverlay open={streakOpen} payload={activeStreak} onDismiss={dismissFront} />

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


