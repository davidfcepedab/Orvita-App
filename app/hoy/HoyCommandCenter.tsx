"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  ArrowRight,
  Calendar,
  Check,
  ChevronRight,
  Loader2,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import { useFinanceMonthSummary } from "@/app/hooks/useFinanceMonthSummary"
import { useGoogleCalendar } from "@/app/hooks/useGoogleCalendar"
import { useGoogleTasks } from "@/app/hooks/useGoogleTasks"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import {
  canRunGoogleCalendarSyncNow,
  markGoogleCalendarSyncRan,
} from "@/lib/google/googleCalendarSyncThrottle"
import { formatLocalDateKey, localDateKeyFromIso } from "@/lib/agenda/localDateKey"
import { isGoogleTaskDone } from "@/lib/agenda/googleTasksUpcoming"
import {
  bandColor,
  derivePrimaryCommand,
  domainAccentVar,
  energyPressureFromCheckin,
  moneyPressureFromMonth,
  sortTasksByDomainPriority,
  timePressureFromMeetings,
  totalMeetingMinutes,
  type PressureBand,
} from "@/lib/hoy/commandDerivation"
import type { OperationalHabit, OperationalTask } from "@/lib/operational/types"

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
}: {
  label: string
  band: PressureBand
  fillPct: number
  hint: string
  icon: React.ReactNode
}) {
  const color = bandColor(band)
  return (
    <div
      className="group flex min-w-0 flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3.5 transition-[box-shadow,transform] duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[var(--shadow-hover)] sm:p-4"
      role="group"
      aria-label={`${label}: presión ${band}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2 text-[var(--color-text-primary)]">
          <span className="text-[var(--color-text-secondary)] opacity-80 motion-safe:transition-transform motion-safe:duration-300 group-hover:scale-105">
            {icon}
          </span>
          <span className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
            {label}
          </span>
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color }}>
          {band}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-alt)]"
        aria-hidden
      >
        <div
          className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
          style={{ width: `${fillPct}%`, background: color }}
        />
      </div>
      <p className="m-0 text-[11px] leading-snug text-[var(--color-text-secondary)]">{hint}</p>
    </div>
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
  useEffect(() => {
    const id = window.setInterval(() => setTimelineNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const googleTasksToday = useMemo(() => {
    const todayKey = formatLocalDateKey(new Date())
    return googleTasks
      .filter((t) => {
        if (isGoogleTaskDone(t.status)) return false
        return localDateKeyFromIso(t.due) === todayKey
      })
      .slice(0, 12)
  }, [googleTasks])

  const meetings = useMemo(() => {
    const todayKey = formatLocalDateKey(new Date())
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

  const primary = useMemo(() => derivePrimaryCommand(ctx), [ctx])

  const timeP = useMemo(() => timePressureFromMeetings(meetingMinutes), [meetingMinutes])
  const energyP = useMemo(() => energyPressureFromCheckin(ctx?.score_global ?? 0), [ctx?.score_global])
  const moneyP = useMemo(() => {
    if (!finance) {
      return {
        band: "moderado" as PressureBand,
        fillPct: 25,
        hint: "Conecta capital para ver presión financiera del mes.",
      }
    }
    return moneyPressureFromMonth(finance.total_income_current, finance.total_expense_current)
  }, [finance])

  const queueTasks = useMemo(() => sortTasksByDomainPriority(ctx?.today_tasks ?? []).slice(0, 6), [ctx?.today_tasks])

  const habits: OperationalHabit[] = ctx?.habits ?? []
  const habitsDone = habits.filter((h) => h.completed).length
  const habitsLabel = habits.length ? `${habitsDone}/${habits.length}` : "—"

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

  const dateLine = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <div className="flex w-full min-w-0 flex-col gap-[var(--layout-gap)]">
      {/* —— Cabecera —— */}
      <header className="flex flex-col gap-4 border-b border-[var(--color-border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-2 w-2 shrink-0 rounded-full motion-safe:animate-pulse"
              style={{ background: "var(--color-accent-primary)" }}
              aria-hidden
            />
            <SectionLabel>Órbita · Centro del día</SectionLabel>
          </div>
          <h1 className="m-0 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[1.75rem]">
            Hoy
          </h1>
          <p className="m-0 flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
            <Calendar className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
            <span className="capitalize">{dateLine}</span>
          </p>
          {ctxError ? (
            <p className="m-0 text-xs text-[var(--color-accent-danger)]">{ctxError}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/checkin"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[var(--radius-button)] px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white motion-safe:transition-opacity motion-safe:hover:opacity-90"
              style={{ background: "var(--color-accent-health)", textDecoration: "none" }}
            >
              Check-in
            </Link>
            <div
              className="flex items-baseline gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2"
              aria-live="polite"
            >
              <span className="text-xl font-semibold tabular-nums text-[var(--color-text-primary)]">
                {ctxLoading ? "…" : habitsLabel}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                hábitos · hoy
              </span>
            </div>
            <div
              className="flex items-baseline gap-1.5 rounded-[var(--radius-button)] border border-[var(--color-border)] px-3 py-2"
              style={{
                borderColor: "color-mix(in srgb, var(--color-accent-agenda) 35%, var(--color-border))",
              }}
            >
              <span className="text-lg font-semibold tabular-nums text-[var(--color-text-primary)]">
                {ctxLoading ? "…" : openTasks}
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                tareas abiertas
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* —— Presión operativa —— */}
      <section aria-labelledby="hoy-pressure-heading" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 id="hoy-pressure-heading" className="m-0 text-sm font-medium text-[var(--color-text-primary)]">
            Presión operativa
          </h2>
          <p className="m-0 max-w-md text-[11px] leading-snug text-[var(--color-text-secondary)]">
            Qué está reclamando tu tiempo, energía y dinero <em className="not-italic">ahora</em> — no tu lista
            eterna.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PressureCell
            label="Tiempo"
            band={timeP.band}
            fillPct={timeP.fillPct}
            hint={timeP.hint}
            icon={<Calendar className="h-4 w-4" aria-hidden />}
          />
          <PressureCell
            label="Energía"
            band={energyP.band}
            fillPct={energyP.fillPct}
            hint={energyP.hint}
            icon={<Zap className="h-4 w-4" aria-hidden />}
          />
          <PressureCell
            label="Dinero (mes)"
            band={moneyP.band}
            fillPct={moneyP.fillPct}
            hint={finError ? "Capital: sin lectura aún." : moneyP.hint}
            icon={<TrendingDown className="h-4 w-4" aria-hidden />}
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
            <div
              className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.07] motion-safe:transition-transform motion-safe:duration-700 motion-safe:group-hover:scale-110"
              style={{ background: primary.domain ? domainAccentVar(primary.domain) : "var(--color-accent-primary)" }}
              aria-hidden
            />
            <div className="relative grid gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Sparkles className="h-4 w-4 text-[var(--color-accent-primary)]" aria-hidden />
                <SectionLabel>Próximo movimiento de alto impacto</SectionLabel>
              </div>
              <div>
                <h3 className="m-0 text-xl font-semibold leading-snug text-[var(--color-text-primary)] sm:text-2xl">
                  {ctxLoading ? "Sincronizando contexto…" : primary.title}
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
                        className="h-2 w-2 rounded-full motion-safe:transition-transform motion-safe:duration-300"
                        style={{
                          background: item.highlighted
                            ? "var(--color-accent-primary)"
                            : "var(--color-border)",
                          transform: item.highlighted ? "scale(1.35)" : undefined,
                          boxShadow: item.highlighted
                            ? "0 0 0 4px color-mix(in srgb, var(--color-accent-primary) 22%, transparent)"
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

        <aside className="flex min-w-0 flex-col gap-[var(--layout-gap)]">
          <div className="space-y-2">
            <SectionLabel>Acciones de alto impacto</SectionLabel>
            <p className="m-0 text-[11px] text-[var(--color-text-secondary)]">
              Tres palancas. Una mirada.
            </p>
            <div className="grid gap-2">
              {IMPACT_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="group flex min-h-[52px] items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-3 motion-safe:transition-[box-shadow,transform] motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[var(--shadow-hover)]"
                  style={{ textDecoration: "none" }}
                >
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                    <p className="m-0 text-[11px] text-[var(--color-text-secondary)]">{item.desc}</p>
                  </div>
                  <ChevronRight
                    className="h-4 w-4 shrink-0 opacity-40 motion-safe:transition-transform motion-safe:duration-300 group-hover:translate-x-0.5"
                    style={{ color: item.accent }}
                    aria-hidden
                  />
                </Link>
              ))}
            </div>
          </div>

          <Card hover className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <Target className="h-4 w-4 text-[var(--color-accent-health)]" aria-hidden />
              <SectionLabel>Hábitos clave</SectionLabel>
            </div>
            <ul className="m-0 grid list-none gap-2 p-0">
              {habits.slice(0, 5).map((habit) => (
                <li key={habit.id}>
                  <Link
                    href="/habitos"
                    className="flex items-center gap-3 rounded-lg border border-transparent px-1 py-1.5 motion-safe:hover:border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] motion-safe:hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_4%,transparent)]"
                    style={{ textDecoration: "none" }}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border"
                      style={
                        habit.completed
                          ? {
                              background: "var(--color-accent-health)",
                              borderColor: "transparent",
                            }
                          : { borderColor: "var(--color-border)" }
                      }
                      aria-hidden
                    >
                      {habit.completed ? (
                        <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.75} />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-[var(--color-text-primary)]">
                      {habit.name}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-text-secondary)]">
                      {habit.completed ? "Hecho" : "Registrar"}
                    </span>
                  </Link>
                </li>
              ))}
              {habits.length === 0 ? (
                <li className="text-xs text-[var(--color-text-secondary)]">
                  Sin hábitos en contexto.{" "}
                  <Link href="/habitos" className="font-medium text-[var(--color-accent-primary)] underline">
                    Configurar
                  </Link>
                </li>
              ) : null}
            </ul>
          </Card>

          <Card className="p-4">
            <SectionLabel>Cola operativa</SectionLabel>
            <p className="mb-3 mt-1 text-[10px] leading-snug text-[var(--color-text-secondary)]">
              Prioridad: profesional → agenda → salud → cuerpo. (Datos desde tu contexto Supabase.)
            </p>
            <ul className="m-0 grid list-none gap-2 p-0">
              {queueTasks.map((task: OperationalTask) => (
                <li
                  key={task.id}
                  className="flex items-start gap-2 rounded-lg border border-[var(--color-border)]/80 bg-[var(--color-surface-alt)]/50 px-2.5 py-2"
                >
                  <span
                    className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ background: domainAccentVar(task.domain) }}
                    aria-hidden
                  />
                  <div className="min-w-0">
                    <p className="m-0 text-sm font-medium text-[var(--color-text-primary)]">{task.title}</p>
                    <p className="m-0 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                      {task.completed ? "Hecha" : "Pendiente"} · {task.domain}
                    </p>
                  </div>
                </li>
              ))}
              {queueTasks.length === 0 && !ctxLoading ? (
                <li className="text-xs text-[var(--color-text-secondary)]">Cola vacía. Buen momento para cerrar ciclos.</li>
              ) : null}
            </ul>
          </Card>

          <Card className="p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <SectionLabel>Google Tasks · vence hoy</SectionLabel>
              <button
                type="button"
                disabled={calLoading || tasksLoading}
                onClick={() => void refreshGoogleFeeds()}
                className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--color-accent-primary)] underline-offset-2 hover:underline disabled:opacity-50"
              >
                Actualizar
              </button>
            </div>
            {tasksLoading && !tasksError ? (
              <p className="m-0 text-xs text-[var(--color-text-secondary)]">Cargando…</p>
            ) : tasksError ? (
              <p className="m-0 text-xs text-[var(--color-accent-danger)]">{tasksError}</p>
            ) : !tasksConnected ? (
              <p className="m-0 text-xs text-[var(--color-text-secondary)]">
                {tasksNotice ?? "Conecta Google Tasks."}{" "}
                <Link href="/configuracion" className="font-medium text-[var(--color-accent-primary)] underline">
                  Configuración
                </Link>
              </p>
            ) : googleTasksToday.length === 0 ? (
              <p className="m-0 text-xs text-[var(--color-text-secondary)]">Nada con vencimiento hoy.</p>
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
          </Card>

          <Link
            href="/checkin"
            className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-dashed border-[color-mix(in_srgb,var(--color-accent-health)_45%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-health)_6%,transparent)] px-4 py-3 text-left motion-safe:transition-colors motion-safe:hover:bg-[color-mix(in_srgb,var(--color-accent-health)_10%,transparent)]"
            style={{ textDecoration: "none" }}
          >
            <div>
              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
                Calibrar el día
              </p>
              <p className="m-0 mt-0.5 text-sm font-medium text-[var(--color-text-primary)]">
                Check-in de foco y energía
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-[var(--color-accent-health)]" aria-hidden />
          </Link>
        </aside>
      </div>
    </div>
  )
}
