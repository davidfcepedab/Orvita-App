"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronDown,
  ChevronRight,
  Loader2,
  Moon,
  Sparkles,
  Sun,
  Sunrise,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
} from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import { useHabits } from "@/app/hooks/useHabits"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import { useStreakCelebrationQueue } from "@/app/hooks/useStreakCelebrationQueue"
import { StreakCelebrationOverlay } from "@/app/habitos/StreakCelebrationOverlay"
import { useFinanceMonthSummary } from "@/app/hooks/useFinanceMonthSummary"
import { useGoogleCalendar } from "@/app/hooks/useGoogleCalendar"
import { useGoogleTasks } from "@/app/hooks/useGoogleTasks"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import {
  canRunGoogleCalendarSyncNow,
  markGoogleCalendarSyncRan,
} from "@/lib/google/googleCalendarSyncThrottle"
import { getAgendaDisplayTimeZone } from "@/lib/agenda/agendaTimeZone"
import { agendaTodayYmd, localDateKeyFromIso } from "@/lib/agenda/localDateKey"
import { isGoogleTaskDone } from "@/lib/agenda/googleTasksUpcoming"
import {
  bandColor,
  domainAccentVar,
  energyPressureFromOperationalContext,
  moneyPressureFromMonth,
  sortTasksByDomainPriority,
  timePressureFromMeetings,
  totalMeetingMinutes,
  type PressureBand,
} from "@/lib/hoy/commandDerivation"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"
import { isScheduledOnUtcDay } from "@/lib/habits/habitMetrics"
import { StrategicDayHero } from "@/app/components/orbita-v3/strategic/StrategicDayCapitalHero"
import type { OperationalCommandDomain, OperationalDomain, OperationalTask } from "@/lib/operational/types"

function operationalDomainLabelEs(domain: OperationalDomain): string {
  switch (domain) {
    case "profesional":
      return "Trabajo"
    case "agenda":
      return "Agenda"
    case "salud":
      return "Salud"
    case "fisico":
      return "Cuerpo"
    default:
      return domain
  }
}

const TIMELINE_FALLBACK_EXAMPLE = [
  { time: "08:00", label: "Bloque de trabajo profundo" },
  { time: "10:30", label: "Sincronización con equipo" },
  { time: "13:00", label: "Recuperación (pausa)" },
  { time: "14:30", label: "Trabajo reactivo" },
] as const

type TimelineRow = {
  key: string
  time: string
  label: string
  sub?: string
  highlighted?: boolean
}

function formatEventTime(iso: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
}

function eventDurationLabel(start: string | null, end: string | null) {
  if (!start || !end) return "—"
  const ms = Date.parse(end) - Date.parse(start)
  if (!Number.isFinite(ms) || ms <= 0) return "—"
  return `${Math.round(ms / 60000)} min`
}

function formatCop(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n)
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-secondary)]">
      {children}
    </p>
  )
}

function PressureCell({
  label,
  band,
  fillPct,
  hint,
  icon,
  index = 0,
}: {
  label: string
  band: PressureBand
  fillPct: number
  hint: string
  icon: React.ReactNode
  index?: number
}) {
  const color = bandColor(band)
  const isWin = band === "bajo"
  const barGlow =
    band === "alto"
      ? "0 0 24px -4px color-mix(in srgb, var(--color-accent-danger) 22%, transparent)"
      : band === "moderado"
        ? "0 0 20px -4px color-mix(in srgb, var(--color-accent-warning) 18%, transparent)"
        : "0 0 22px -4px color-mix(in srgb, var(--color-accent-health) 20%, transparent)"

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className={[
        "group relative flex min-w-0 flex-col gap-2.5 overflow-hidden rounded-[var(--radius-card)] border bg-[var(--color-surface)] p-3.5 motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 sm:p-4",
        isWin
          ? "border-[color-mix(in_srgb,var(--color-accent-health)_32%,var(--color-border))] shadow-[0_8px_28px_-14px_color-mix(in_srgb,var(--color-accent-health)_30%,transparent)] motion-safe:hover:shadow-[0_12px_32px_-12px_color-mix(in_srgb,var(--color-accent-health)_36%,transparent)]"
          : "border-[color-mix(in_srgb,var(--color-border)_90%,transparent)] shadow-sm motion-safe:hover:shadow-[var(--shadow-hover)]",
      ].join(" ")}
      role="group"
      aria-label={`${label}: presión ${band}`}
    >
      <div className="relative flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[var(--color-text-primary)]">
          <span className="shrink-0 text-[var(--color-text-secondary)] opacity-85 motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-110">
            {icon}
          </span>
          <span className="min-w-0 text-pretty text-[11px] font-semibold uppercase leading-tight tracking-[0.1em] text-[var(--color-text-secondary)] sm:tracking-[0.12em]">
            {label}
          </span>
        </div>
        <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-bold uppercase tracking-[0.12em]" style={{ color }}>
          {isWin ? <Trophy className="h-3 w-3" style={{ color }} aria-hidden /> : null}
          {band}
        </span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-md bg-[var(--color-surface-alt)] shadow-inner" aria-hidden>
        <motion.div
          className="h-full rounded-md"
          initial={{ width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={{ duration: 0.85, delay: 0.12 + index * 0.06, ease: [0.22, 1, 0.36, 1] }}
          style={{
            background: color,
            boxShadow: barGlow,
          }}
        />
      </div>
      <p className="relative m-0 text-[11px] leading-snug text-[var(--color-text-secondary)] [text-wrap:pretty]">{hint}</p>
    </motion.div>
  )
}

const IMPACT_LINKS = [
  {
    href: "/agenda",
    title: "Agenda",
    desc: "Alinear tiempo con prioridades",
    accent: "var(--color-accent-agenda)",
  },
  {
    href: "/finanzas/overview",
    title: "Capital",
    desc: "Entradas, salidas y compromisos",
    accent: "var(--color-accent-finance)",
  },
  {
    href: "/decision",
    title: "Decisión",
    desc: "Criterios antes de ejecutar",
    accent: "var(--color-accent-warning)",
  },
] as const

const CHECKIN_DAY_SEGMENTS = [
  { href: "/checkin#checkin-manana", label: "Mañana", hint: "Sueño · energía", Icon: Sunrise },
  { href: "/checkin#checkin-dia", label: "Día", hint: "Foco · cuerpo · vínculos", Icon: Sun },
  { href: "/checkin#checkin-noche", label: "Noche", hint: "Cierre · medidas", Icon: Moon },
] as const

const checkinSegmentContainer = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.07, delayChildren: 0.08 },
  },
}

const checkinSegmentItem = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0 },
}

export default function HoyCommandCenter() {
  const { data: ctx, loading: ctxLoading, error: ctxError, refetch: refetchCtx } = useOperationalContext()
  const { data: finance, loading: finLoading, error: finError, month: financeMonth } = useFinanceMonthSummary()
  const {
    events: calendarEvents,
    loading: calLoading,
    notice: calNotice,
    connected: calConnected,
    refresh: refreshCal,
    error: calError,
  } = useGoogleCalendar()
  const {
    tasks: googleTasks,
    loading: tasksLoading,
    notice: tasksNotice,
    connected: tasksConnected,
    refresh: refreshTasks,
    error: tasksError,
  } = useGoogleTasks()

  const { habits: habitHookList, togglingId, toggleCompleteToday, persistenceEnabled, mock } = useHabits()
  const { activeStreak, streakOpen, enqueueStreakCelebrations, dismissFront } = useStreakCelebrationQueue()

  useEffect(() => {
    if (isAppMockMode() || !isSupabaseEnabled()) return
    let cancelled = false
    const pull = async () => {
      try {
        const headers = await browserBearerHeaders(true)
        const doCalSync = canRunGoogleCalendarSyncNow()
        const calRes = doCalSync
          ? await fetch("/api/integrations/google/calendar/sync", { method: "POST", headers })
          : null
        if (calRes?.ok) markGoogleCalendarSyncRan()
        if (cancelled) return
        await refreshCal()
        await refreshTasks()
      } catch {
        /* best-effort */
      }
    }
    void pull()
    return () => {
      cancelled = true
    }
  }, [refreshCal, refreshTasks])

  const [timelineNow, setTimelineNow] = useState(() => Date.now())
  const [googleTasksAsideOpen, setGoogleTasksAsideOpen] = useState(false)
  useEffect(() => {
    const id = window.setInterval(() => setTimelineNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const googleTasksToday = useMemo(() => {
    const todayKey = agendaTodayYmd()
    return googleTasks
      .filter((t) => {
        if (isGoogleTaskDone(t.status)) return false
        return localDateKeyFromIso(t.due) === todayKey
      })
      .slice(0, 12)
  }, [googleTasks])

  const meetings = useMemo(() => {
    const todayKey = agendaTodayYmd()
    return calendarEvents
      .filter((e) => localDateKeyFromIso(e.startAt) === todayKey)
      .map((e) => ({
        key: e.id,
        startAt: e.startAt,
        endAt: e.endAt,
        time: formatEventTime(e.startAt),
        label: e.summary,
        duration: eventDurationLabel(e.startAt, e.endAt),
      }))
      .sort((a, b) => {
        const ta = a.startAt ? Date.parse(a.startAt) : 0
        const tb = b.startAt ? Date.parse(b.startAt) : 0
        return ta - tb
      })
  }, [calendarEvents])

  const meetingMinutes = useMemo(() => totalMeetingMinutes(meetings), [meetings])

  const activeMeetingIndex = useMemo(() => {
    const now = timelineNow
    for (let i = 0; i < meetings.length; i++) {
      const m = meetings[i]
      if (!m.startAt) continue
      const t0 = Date.parse(m.startAt)
      if (!Number.isFinite(t0)) continue
      const t1 = m.endAt ? Date.parse(m.endAt) : t0 + 60 * 60 * 1000
      if (Number.isFinite(t1) && now >= t0 && now < t1) return i
    }
    return -1
  }, [meetings, timelineNow])

  const operationalTimeline = useMemo((): {
    rows: TimelineRow[]
    source: "calendar" | "example" | "loading" | "empty" | "error"
  } => {
    if (calLoading) return { rows: [], source: "loading" }

    if (calError) {
      const block = ctx?.current_block?.trim()
      const prefix: TimelineRow[] = block
        ? [{ key: "ctx-block", time: "Ahora", label: "Bloque operativo", sub: block }]
        : []
      return { rows: prefix, source: "error" }
    }

    const block = ctx?.current_block?.trim()
    const prefix: TimelineRow[] = block
      ? [{ key: "ctx-block", time: "Ahora", label: "Bloque operativo", sub: block }]
      : []

    if (meetings.length > 0) {
      const fromCal: TimelineRow[] = meetings.map((m, idx) => ({
        key: m.key,
        time: m.time,
        label: m.label,
        sub: m.duration !== "—" ? m.duration : undefined,
        highlighted: idx === activeMeetingIndex,
      }))
      return { rows: [...prefix, ...fromCal], source: "calendar" }
    }

    if (calConnected) {
      return { rows: prefix, source: prefix.length ? "empty" : "empty" }
    }

    const exampleRows: TimelineRow[] = TIMELINE_FALLBACK_EXAMPLE.map((row, i) => ({
      key: `example-${i}`,
      time: row.time,
      label: row.label,
    }))
    return { rows: [...prefix, ...exampleRows], source: "example" }
  }, [activeMeetingIndex, calLoading, calError, calConnected, ctx?.current_block, meetings])

  const refreshGoogleFeeds = useCallback(() => {
    void Promise.all([refreshCal(), refreshTasks()])
  }, [refreshCal, refreshTasks])

  const primary = useMemo(() => {
    if (!ctx) {
      return {
        title: "",
        subtitle: undefined as string | undefined,
        timeHint: undefined as string | undefined,
        taskId: undefined as string | undefined,
        domain: undefined as OperationalCommandDomain | undefined,
      }
    }
    return {
      title: ctx.next_action ?? "",
      subtitle: ctx.next_impact,
      timeHint: ctx.next_time_required,
      taskId: ctx.next_task_id,
      domain: ctx.command_focus_domain,
    }
  }, [ctx])

  const timeP = useMemo(() => timePressureFromMeetings(meetingMinutes), [meetingMinutes])
  const energyP = useMemo(() => energyPressureFromOperationalContext(ctx), [ctx])
  const moneyP = useMemo(() => {
    if (!finance) {
      return {
        band: "moderado" as PressureBand,
        fillPct: 25,
        hint: "Cuando Finanzas esté activo en tu hogar, verás la presión del mes aquí.",
      }
    }
    return moneyPressureFromMonth(finance.total_income_current, finance.total_expense_current)
  }, [finance])

  const queueTasks = useMemo(
    () =>
      sortTasksByDomainPriority((ctx?.today_tasks ?? []).filter((t) => !t.completed)).slice(0, 6),
    [ctx?.today_tasks],
  )

  const todayYmd = agendaTodayYmd()
  const habitsDueToday = useMemo(
    () => habitHookList.filter((h) => isScheduledOnUtcDay(h.metadata, todayYmd)),
    [habitHookList, todayYmd],
  )
  const habitsShown = useMemo(() => habitsDueToday.slice(0, 5), [habitsDueToday])
  const habitsDoneDue = habitsDueToday.filter((h) => h.completed).length
  const habitsLabel = habitsDueToday.length ? `${habitsDoneDue}/${habitsDueToday.length}` : "—"

  const openTasks = (ctx?.today_tasks ?? []).filter((t) => !t.completed).length
  const [completing, setCompleting] = useState(false)
  const [completeError, setCompleteError] = useState<string | null>(null)

  const completePrimaryTask = useCallback(async () => {
    if (!primary.taskId) return
    setCompleting(true)
    setCompleteError(null)
    try {
      const h = new Headers(await browserBearerHeaders(true))
      h.set("Content-Type", "application/json")
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: h,
        body: JSON.stringify({ id: primary.taskId, completed: true }),
      })
      const payload = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? "No se pudo actualizar")
      }
      refetchCtx()
    } catch (e) {
      setCompleteError(e instanceof Error ? e.message : "Error")
    } finally {
      setCompleting(false)
    }
  }, [primary.taskId, refetchCtx])

  const dateLine = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CO", {
        timeZone: getAgendaDisplayTimeZone(),
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [],
  )

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-[var(--layout-gap)] overflow-x-hidden">
      {/* —— Cabecera —— */}
      <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <SectionLabel>Centro del día</SectionLabel>
          </div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[1.75rem]">
            Hoy
          </h1>
          <p className="m-0 hidden items-center gap-2 text-sm text-[var(--color-text-secondary)] sm:flex">
            <Calendar className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            <span className="capitalize">{dateLine}</span>
          </p>
          {ctxError ? (
            <p className="m-0 text-xs text-[var(--color-accent-danger)]">{ctxError}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex flex-wrap items-end gap-8 sm:gap-10">
            <div className="flex flex-col gap-1" aria-live="polite">
              <span className="text-[2.5rem] font-semibold leading-[0.95] tabular-nums tracking-tight text-[var(--color-text-primary)] sm:text-[2.85rem]">
                {ctxLoading ? "…" : habitsLabel}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
                hábitos programados hoy
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span
                className="text-[2.5rem] font-semibold leading-[0.95] tabular-nums tracking-tight sm:text-[2.85rem]"
                style={{
                  color: "color-mix(in srgb, var(--color-accent-agenda) 78%, var(--color-text-primary))",
                }}
              >
                {ctxLoading ? "…" : openTasks}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
                tareas abiertas
              </span>
            </div>
          </div>
        </div>
      </header>

      <nav aria-label="Check-in por momento del día" className="min-w-0">
        <Card className="overflow-hidden border border-[color-mix(in_srgb,var(--color-border)_88%,transparent)] p-0 shadow-sm">
          <div className="border-b border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_5%,var(--color-surface))] px-4 py-3 sm:px-5 sm:py-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <Sunrise className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-health)]" aria-hidden />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <SectionLabel>Check-in del día</SectionLabel>
                    <span className="rounded border border-[color-mix(in_srgb,var(--color-accent-health)_35%,var(--color-border))] bg-[var(--color-surface)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--color-accent-health)]">
                      Ruta en 3
                    </span>
                  </div>
                  <p className="m-0 mt-1 text-xs leading-snug text-[var(--color-text-secondary)] [text-wrap:pretty]">
                    Completa <strong className="font-medium text-[var(--color-text-primary)]">Mañana → Día → Noche</strong> y al final{" "}
                    <Link href="/checkin" className="font-medium text-[var(--color-accent-health)] underline-offset-2 hover:underline">
                      guarda el check-in completo
                    </Link>
                    .
                  </p>
                </div>
              </div>
              <div
                className="flex shrink-0 items-center gap-0.5 rounded-md border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface)] px-2 py-1.5 text-[var(--color-text-secondary)]"
                aria-hidden
              >
                <span className="flex h-6 w-6 items-center justify-center rounded bg-[color-mix(in_srgb,var(--color-accent-health)_14%,transparent)] text-[11px] font-bold text-[var(--color-text-primary)]">
                  1
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
                <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--color-surface-alt)] text-[11px] font-bold text-[var(--color-text-primary)]">
                  2
                </span>
                <ArrowRight className="h-3.5 w-3.5 shrink-0 opacity-40" />
                <span className="flex h-6 w-6 items-center justify-center rounded bg-[var(--color-surface-alt)] text-[11px] font-bold text-[var(--color-text-primary)]">
                  3
                </span>
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-4">
            <div className="rounded-lg bg-[var(--color-surface-alt)] p-1">
              <motion.div
                className="grid grid-cols-3 gap-1"
                variants={checkinSegmentContainer}
                initial="hidden"
                animate="show"
              >
                {CHECKIN_DAY_SEGMENTS.map(({ href, label, hint, Icon }) => (
                  <motion.div
                    key={href}
                    variants={checkinSegmentItem}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="min-w-0"
                  >
                    <Link
                      href={href}
                      className="group flex min-h-[56px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-md border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[var(--color-surface)] px-1.5 py-2 text-center motion-safe:transition-[border-color,transform,box-shadow] motion-safe:active:scale-[0.99] motion-safe:hover:border-[color-mix(in_srgb,var(--color-accent-health)_40%,var(--color-border))] motion-safe:hover:shadow-md sm:min-h-[60px] sm:px-2.5 sm:py-2.5"
                      style={{ textDecoration: "none" }}
                    >
                      <Icon className="h-4 w-4 shrink-0 text-[var(--color-accent-health)] motion-safe:transition-transform motion-safe:duration-200 motion-safe:group-hover:scale-105" aria-hidden />
                      <span className="text-[11px] font-semibold leading-tight text-[var(--color-text-primary)]">{label}</span>
                      <span className="line-clamp-2 text-[9px] leading-tight text-[var(--color-text-secondary)] sm:text-[10px]">{hint}</span>
                    </Link>
                  </motion.div>
                ))}
              </motion.div>
            </div>
            <Link
              href="/checkin"
              className="mt-3 flex min-h-11 w-full items-center justify-center rounded-md border border-[color-mix(in_srgb,var(--color-accent-health)_32%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-health)_8%,transparent)] px-4 py-2.5 text-center text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-primary)] motion-safe:transition-[background-color,border-color] motion-safe:hover:bg-[color-mix(in_srgb,var(--color-accent-health)_14%,transparent)]"
              style={{ textDecoration: "none" }}
              title="Abrir el check-in completo en una sola vista"
            >
              Abrir formulario completo
            </Link>
          </div>
        </Card>
      </nav>

      <StrategicDayHero capital={ctx?.capital} health={ctx?.apple_health} showCapital={false} />

      {/* —— Presión operativa —— */}
      <section aria-labelledby="hoy-pressure-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <h2 id="hoy-pressure-heading" className="m-0 flex items-center gap-1.5 text-sm font-semibold text-[var(--color-text-primary)]">
              Presión operativa
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-[color-mix(in_srgb,var(--color-accent-warning)_75%,var(--color-text-secondary))]" aria-hidden />
            </h2>
          </div>
          <p className="m-0 max-w-md text-[11px] leading-snug text-[var(--color-text-secondary)] [text-wrap:pretty]">
            Qué está reclamando tu tiempo, energía y dinero <em className="not-italic">ahora</em> — no tu lista
            eterna.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PressureCell
            index={0}
            label="Tiempo"
            band={timeP.band}
            fillPct={timeP.fillPct}
            hint={timeP.hint}
            icon={<Calendar className="h-4 w-4" aria-hidden />}
          />
          <PressureCell
            index={1}
            label="Energía"
            band={energyP.band}
            fillPct={energyP.fillPct}
            hint={energyP.hint}
            icon={<Zap className="h-4 w-4" aria-hidden />}
          />
          <PressureCell
            index={2}
            label="Dinero (mes)"
            band={moneyP.band}
            fillPct={moneyP.fillPct}
            hint={finError ? "Capital: sin lectura aún." : moneyP.hint}
            icon={
              moneyP.band === "bajo" ? (
                <TrendingUp className="h-4 w-4 text-[var(--color-accent-health)]" aria-hidden />
              ) : (
                <TrendingDown className="h-4 w-4" aria-hidden />
              )
            }
          />
        </div>
      </section>

      {/* —— Flujo de capital (mes en curso) —— */}
      <section aria-labelledby="hoy-flow-heading">
        <Card className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <SectionLabel>Flujo de capital</SectionLabel>
              <h2 id="hoy-flow-heading" className="m-0 mt-1 text-sm font-semibold text-[var(--color-text-primary)]">
                Entradas y salidas · {financeMonth}
              </h2>
            </div>
            <Link
              href="/finanzas/overview"
              className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-finance)] motion-safe:transition-opacity motion-safe:hover:opacity-80"
            >
              Ver detalle
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </div>
          {finLoading ? (
            <p className="m-0 text-xs text-[var(--color-text-secondary)]">Cargando resumen…</p>
          ) : finError || !finance ? (
            <p className="m-0 text-xs text-[var(--color-text-secondary)]">
              {finError ?? "Sin datos de hogar o permisos. Revisa Capital en el menú cuando esté disponible."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                {
                  k: "in",
                  label: "Ingresos",
                  value: formatCop(finance.total_income_current),
                  delta: finance.delta_income,
                  up: true,
                },
                {
                  k: "out",
                  label: "Gastos",
                  value: formatCop(finance.total_expense_current),
                  delta: finance.delta_expense,
                  up: false,
                },
                {
                  k: "bal",
                  label: "Balance mes",
                  value: formatCop(finance.balance_current),
                  delta: finance.delta_balance,
                  up: finance.delta_balance >= 0,
                },
              ].map((row) => (
                <div
                  key={row.k}
                  className="rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-alt)]/60 p-3 motion-safe:transition-colors motion-safe:hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_5%,var(--color-surface-alt))]"
                >
                  <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
                    {row.label}
                  </p>
                  <p className="m-0 mt-1 text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">
                    {row.value}
                  </p>
                  <p
                    className="m-0 mt-1 flex items-center gap-1 text-[11px] font-medium tabular-nums"
                    style={{
                      color: row.delta >= 0 ? "var(--color-accent-health)" : "var(--color-accent-danger)",
                    }}
                  >
                    {row.delta >= 0 ? (
                      <TrendingUp className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5" aria-hidden />
                    )}
                    vs mes anterior · {formatCop(Math.abs(row.delta))}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* —— Comando + layout principal —— */}
      <div className="grid grid-cols-1 gap-[var(--layout-gap)] lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="flex min-w-0 flex-col gap-[var(--layout-gap)]">
          <Card className="group relative overflow-hidden p-5 sm:p-6">
            <div className="relative grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--color-accent-primary)]" aria-hidden />
                <SectionLabel>Próximo movimiento de alto impacto</SectionLabel>
              </div>
              <div>
                <h3 className="m-0 text-xl font-semibold leading-snug text-[var(--color-text-primary)] sm:text-2xl">
                  {ctxLoading ? "Cargando tu prioridad…" : primary.title}
                </h3>
                {primary.subtitle ? (
                  <p
                    className="m-0 mt-2 text-sm font-medium"
                    style={{ color: primary.domain ? domainAccentVar(primary.domain) : "var(--color-text-secondary)" }}
                  >
                    {primary.subtitle}
                  </p>
                ) : null}
                {primary.timeHint ? (
                  <p className="m-0 mt-2 text-xs text-[var(--color-text-secondary)]">{primary.timeHint}</p>
                ) : null}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                {primary.taskId ? (
                  <button
                    type="button"
                    disabled={completing || ctxLoading}
                    onClick={() => void completePrimaryTask()}
                    className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-button)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition active:scale-[0.99] disabled:opacity-50"
                    style={{ background: "var(--color-text-primary)" }}
                  >
                    {completing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                        Guardando…
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" aria-hidden />
                        Marcar hecho
                      </>
                    )}
                  </button>
                ) : primary.domain === "capital" ? (
                  <Link
                    href="/finanzas/overview"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-button)] border border-[color-mix(in_srgb,var(--color-accent-finance)_38%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-finance)_10%,var(--color-surface-alt))] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)] motion-safe:hover:bg-[color-mix(in_srgb,var(--color-accent-finance)_16%,var(--color-surface-alt))]"
                    style={{ textDecoration: "none" }}
                  >
                    Ir a Capital
                  </Link>
                ) : (
                  <Link
                    href="/agenda"
                    className="inline-flex min-h-[44px] items-center justify-center rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-text-primary)] motion-safe:hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_6%,var(--color-surface-alt))]"
                    style={{ textDecoration: "none" }}
                  >
                    Ir a agenda
                  </Link>
                )}
                {completeError ? (
                  <span className="text-xs text-[var(--color-accent-danger)]">{completeError}</span>
                ) : null}
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div>
                <SectionLabel>Línea de tiempo del día</SectionLabel>
                <p className="m-0 mt-1 text-sm font-medium text-[var(--color-text-primary)]">
                  Calendario · hoy
                </p>
              </div>
              <button
                type="button"
                disabled={calLoading || tasksLoading}
                onClick={() => void refreshGoogleFeeds()}
                className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent-primary)] underline-offset-2 motion-safe:hover:underline disabled:opacity-50"
              >
                {calLoading || tasksLoading ? "Sincronizando…" : "Actualizar"}
              </button>
            </div>
            {operationalTimeline.source === "loading" && (
              <p className="m-0 text-xs text-[var(--color-text-secondary)]">Cargando eventos…</p>
            )}
            {operationalTimeline.source === "error" && calError && (
              <div className="mb-3 grid gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-accent-danger)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-danger)_6%,transparent)] px-3 py-2 text-xs">
                <p className="m-0 font-medium text-[var(--color-accent-danger)]">Google Calendar</p>
                <p className="m-0 text-[var(--color-text-secondary)]">{calError}</p>
                <Link
                  href="/configuracion"
                  className="font-medium text-[var(--color-accent-primary)] underline-offset-2 hover:underline"
                >
                  Configuración
                </Link>
              </div>
            )}
            {operationalTimeline.source === "example" && (
              <p className="mb-3 text-[10px] text-[var(--color-text-secondary)]">
                Ejemplo ilustrativo.{" "}
                <Link href="/configuracion" className="font-medium text-[var(--color-accent-primary)] underline">
                  Conecta Google
                </Link>{" "}
                para tu línea real.
              </p>
            )}
            {operationalTimeline.source === "empty" && operationalTimeline.rows.length === 0 && (
              <p className="mb-3 text-xs text-[var(--color-text-secondary)]">
                Sin eventos hoy.{" "}
                <Link href="/configuracion" className="font-medium text-[var(--color-accent-primary)] underline">
                  Conectar calendario
                </Link>
              </p>
            )}
            <div className="grid gap-3">
              {operationalTimeline.rows.map((item, index) => {
                const last = index === operationalTimeline.rows.length - 1
                return (
                  <div key={item.key} className="flex gap-3">
                    <div className="flex flex-col items-center gap-1 pt-0.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-sm motion-safe:transition-transform motion-safe:duration-300"
                        style={{
                          background: item.highlighted
                            ? "var(--color-accent-primary)"
                            : "var(--color-border)",
                          transform: item.highlighted ? "scale(1.15)" : undefined,
                          boxShadow: item.highlighted
                            ? "0 0 0 2px color-mix(in srgb, var(--color-accent-primary) 25%, transparent)"
                            : undefined,
                        }}
                      />
                      {!last ? (
                        <span className="w-px grow min-h-[20px] bg-[var(--color-border)]" />
                      ) : null}
                    </div>
                    <div className="min-w-0 pb-1">
                      <p className="m-0 text-[11px] tabular-nums text-[var(--color-text-secondary)]">
                        {item.time}
                      </p>
                      <p className="m-0 text-sm font-medium text-[var(--color-text-primary)]">{item.label}</p>
                      {item.sub ? (
                        <p className="m-0 text-[11px] text-[var(--color-text-secondary)]">{item.sub}</p>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>

        <aside className="flex min-w-0 flex-col gap-5 lg:gap-6">
          <Card className="p-4">
            <div className="mb-3 flex items-start gap-2 border-b border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] pb-3">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-primary)]" aria-hidden />
              <div className="min-w-0">
                <SectionLabel>Acciones de alto impacto</SectionLabel>
                <p className="m-0 mt-1.5 text-[11px] leading-snug text-[var(--color-text-secondary)]">
                  Tres palancas. Una mirada.
                </p>
              </div>
            </div>
            <div className="grid gap-2">
              {IMPACT_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex min-h-[52px] items-center justify-between gap-3 rounded-[var(--radius-card)] border px-3 py-3 motion-safe:transition-[box-shadow,transform,background-color,border-color] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[var(--shadow-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--color-accent-primary)_38%,transparent)]"
                  style={{
                    textDecoration: "none",
                    background: `color-mix(in srgb, ${item.accent} 14%, var(--color-surface))`,
                    borderColor: `color-mix(in srgb, ${item.accent} 38%, var(--color-border))`,
                  }}
                >
                  <span className="min-w-0">
                    <span className="m-0 block text-sm font-semibold text-[var(--color-text-primary)]">{item.title}</span>
                    <span className="m-0 block text-[11px] text-[var(--color-text-secondary)]">{item.desc}</span>
                  </span>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 opacity-45 motion-safe:transition-transform motion-safe:duration-300 group-hover:translate-x-0.5"
                    style={{ color: item.accent }}
                    aria-hidden
                  />
                </Link>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-[var(--color-accent-health)]" aria-hidden />
              <SectionLabel>Hábitos clave</SectionLabel>
            </div>
            <ul className="m-0 grid list-none gap-2 p-0">
              {habitsDueToday.length === 0 && habitHookList.length > 0 ? (
                <li className="text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  Ningún hábito toca hoy según tu calendario.{" "}
                  <Link href="/habitos" className="font-medium text-[var(--color-accent-primary)] underline">
                    Ver todos
                  </Link>
                </li>
              ) : null}
              {habitsShown.map((habit) => (
                <li key={habit.id}>
                  <div
                    className={`flex min-w-0 items-center justify-between gap-2 rounded-lg border px-2 py-2 ${
                      habit.completed
                        ? "border-[color-mix(in_srgb,var(--color-accent-health)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_10%,var(--color-surface-alt))]"
                        : "border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] bg-[var(--color-surface-alt)]"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-text-primary)]">
                      {habit.name}
                    </span>
                    <button
                      type="button"
                      disabled={
                        (!persistenceEnabled && !mock) || togglingId === habit.id
                      }
                      onClick={async () => {
                        const r = await toggleCompleteToday(habit.id)
                        if (!r.ok) return
                        if (r.streakCelebration) enqueueStreakCelebrations([r.streakCelebration])
                        void refetchCtx()
                      }}
                      className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] disabled:opacity-45"
                      style={{
                        borderColor: habit.completed
                          ? "color-mix(in srgb, var(--color-accent-health) 45%, transparent)"
                          : "var(--color-border)",
                        background: habit.completed
                          ? "color-mix(in srgb, var(--color-accent-health) 12%, transparent)"
                          : "var(--color-surface)",
                        color: habit.completed ? "var(--color-accent-health)" : "var(--color-text-secondary)",
                      }}
                    >
                      {togglingId === habit.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                      ) : (
                        <Check className="h-3 w-3" strokeWidth={2.5} aria-hidden />
                      )}
                      {habit.completed ? "Quitar" : "Hecho"}
                    </button>
                  </div>
                </li>
              ))}
              {habitHookList.length === 0 ? (
                <li className="text-xs text-[var(--color-text-secondary)]">
                  Sin hábitos cargados.{" "}
                  <Link href="/habitos" className="font-medium text-[var(--color-accent-primary)] underline">
                    Configurar
                  </Link>
                </li>
              ) : null}
            </ul>
            {habitHookList.length > 0 ? (
              <p className="m-0 mt-2 text-center text-[10px] text-[var(--color-text-secondary)]">
                <Link href="/habitos" className="font-medium text-[var(--color-accent-primary)] underline">
                  Ver todos en Hábitos
                </Link>
              </p>
            ) : null}
          </Card>

          <Card className="p-4">
            <SectionLabel>Tu orden del día</SectionLabel>
            <p className="mb-3 mt-1 text-[10px] leading-snug text-[var(--color-text-secondary)]">
              Primero trabajo y citas; después bienestar y movimiento. Así te ayudamos a enfocarte sin abrumarte.
            </p>
            <ul className="m-0 grid list-none gap-2 p-0">
              {queueTasks.map((task: OperationalTask) => (
                <li
                  key={task.id}
                  className="flex items-start gap-2 rounded-lg border border-[var(--color-border)]/80 bg-[var(--color-surface-alt)]/50 px-2.5 py-2"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-sm"
                    style={{ background: domainAccentVar(task.domain) }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-medium text-[var(--color-text-primary)]">{task.title}</p>
                    <p className="m-0 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                      {task.completed ? "Hecha" : "Pendiente"} · {operationalDomainLabelEs(task.domain)}
                    </p>
                  </div>
                </li>
              ))}
              {queueTasks.length === 0 && !ctxLoading ? (
                <li className="text-xs text-[var(--color-text-secondary)]">
                  Nada pendiente en esta lista. Buen momento para cerrar cosas o descansar.
                </li>
              ) : null}
            </ul>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                id="hoy-google-tasks-toggle"
                aria-expanded={googleTasksAsideOpen}
                aria-controls="hoy-google-tasks-panel"
                onClick={() => setGoogleTasksAsideOpen((o) => !o)}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border-0 bg-transparent p-0 text-left motion-safe:transition-opacity hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--color-accent-primary)_35%,transparent)]"
              >
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-[var(--color-text-secondary)] motion-safe:transition-transform motion-safe:duration-200 ${googleTasksAsideOpen ? "" : "-rotate-90"}`}
                  aria-hidden
                />
                <span className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--color-text-secondary)]">
                  Tareas para hoy
                </span>
                {!googleTasksAsideOpen && tasksConnected && googleTasksToday.length > 0 ? (
                  <span className="text-[10px] tabular-nums text-[var(--color-text-secondary)]">
                    ({googleTasksToday.length})
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                disabled={calLoading || tasksLoading}
                onClick={() => void refreshGoogleFeeds()}
                className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-accent-primary)] underline-offset-2 hover:underline disabled:opacity-50"
              >
                Sincronizar
              </button>
            </div>
            <div
              id="hoy-google-tasks-panel"
              role="region"
              aria-labelledby="hoy-google-tasks-toggle"
              hidden={!googleTasksAsideOpen}
            >
              {tasksLoading && !tasksError ? (
                <p className="m-0 text-xs text-[var(--color-text-secondary)]">Cargando…</p>
              ) : tasksError ? (
                <p className="m-0 text-xs text-[var(--color-accent-danger)]">{tasksError}</p>
              ) : !tasksConnected ? (
                <p className="m-0 text-xs text-[var(--color-text-secondary)]">
                  {tasksNotice ??
                    "Conecta tu cuenta de Google para ver aquí las tareas que vencen hoy."}{" "}
                  <Link href="/configuracion" className="font-medium text-[var(--color-accent-primary)] underline">
                    Ir a ajustes
                  </Link>
                </p>
              ) : googleTasksToday.length === 0 ? (
                <p className="m-0 text-xs text-[var(--color-text-secondary)]">
                  No tienes tareas con fecha de hoy.
                </p>
              ) : (
                <ul className="m-0 list-none space-y-1.5 p-0">
                  {googleTasksToday.map((gt) => (
                    <li
                      key={gt.id}
                      className="text-xs leading-snug text-[var(--color-text-primary)] motion-safe:transition-colors motion-safe:hover:text-[var(--color-accent-agenda)]"
                    >
                      · {gt.title}
                    </li>
                  ))}
                </ul>
              )}
              {calNotice ? (
                <p className="mt-2 m-0 text-[10px] text-[var(--color-text-secondary)]">{calNotice}</p>
              ) : null}
            </div>
          </Card>
        </aside>
      </div>

      <StreakCelebrationOverlay open={streakOpen} payload={activeStreak} onDismiss={dismissFront} />
    </div>
  )
}
