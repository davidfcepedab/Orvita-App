"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Loader2 } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
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

/** Plantilla solo cuando no hay calendario conectado o aún no hay eventos (etiquetada en UI). */
const TIMELINE_FALLBACK_EXAMPLE = [
  { time: "08:00", label: "Bloque de Trabajo Profundo" },
  { time: "10:30", label: "Sincronización Equipo" },
  { time: "13:00", label: "Recuperación (Pausa)" },
  { time: "14:30", label: "Trabajo Reactivo" },
] as const

type OperationalTimelineRow = {
  key: string
  time: string
  label: string
  sub?: string
  /** Evento de calendario en curso (hora local). */
  highlighted?: boolean
}

const reminders = [
  "Enviar update diario a finanzas",
  "Confirmar agenda con partner",
]

const supplements = [
  "Creatine 5g",
  "Vitamina D3 + K2",
  "Omega-3",
]

// ← V3 RECONSTRUIDO: fiel a captura + navegación preservada
function formatEventTime(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
}

function eventDurationLabel(start: string | null, end: string | null) {
  if (!start || !end) return "—"
  const ms = Date.parse(end) - Date.parse(start)
  if (!Number.isFinite(ms) || ms <= 0) return "—"
  return `${Math.round(ms / 60000)}m`
}

function stackRowKey(prefix: string, label: string) {
  return `${prefix}:${label}`
}

export default function HoyPage() {
  const { data } = useOperationalContext()
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
        /* Calendario: sync a BD. Tareas: sin auto-sync (cuota diaria); GET lee Supabase; import manual en Agenda. */
        await refreshCal()
        await refreshTasks()
      } catch {
        /* sync es best-effort; los hooks ya muestran error si falla la lectura */
      }
    }
    void pull()
    return () => {
      cancelled = true
    }
  }, [refreshCal, refreshTasks])

  const [stackChecked, setStackChecked] = useState<Record<string, boolean>>({})
  const toggleStack = useCallback((key: string) => {
    setStackChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  const googleTasksToday = useMemo(() => {
    const todayKey = formatLocalDateKey(new Date())
    return googleTasks
      .filter((t) => {
        if (isGoogleTaskDone(t.status)) return false
        return localDateKeyFromIso(t.due) === todayKey
      })
      .slice(0, 8)
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

  const [timelineNow, setTimelineNow] = useState(() => Date.now())
  useEffect(() => {
    const id = window.setInterval(() => setTimelineNow(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

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
    rows: OperationalTimelineRow[]
    source: "calendar" | "example" | "loading" | "empty" | "error"
  } => {
    if (calLoading) {
      return { rows: [], source: "loading" }
    }

    if (calError) {
      const block = data?.current_block?.trim()
      const prefix: OperationalTimelineRow[] = block
        ? [{ key: "ctx-block", time: "Ahora", label: "Bloque operativo", sub: block }]
        : []
      return { rows: prefix, source: "error" }
    }

    const block = data?.current_block?.trim()
    const prefix: OperationalTimelineRow[] = block
      ? [{ key: "ctx-block", time: "Ahora", label: "Bloque operativo", sub: block }]
      : []

    if (meetings.length > 0) {
      const fromCal: OperationalTimelineRow[] = meetings.map((m, idx) => ({
        key: m.key,
        time: m.time,
        label: m.label,
        sub: m.duration !== "—" ? m.duration : undefined,
        highlighted: idx === activeMeetingIndex,
      }))
      return { rows: [...prefix, ...fromCal], source: "calendar" }
    }

    if (calConnected) {
      if (prefix.length > 0) {
        return { rows: prefix, source: "empty" }
      }
      return { rows: [], source: "empty" }
    }

    const exampleRows: OperationalTimelineRow[] = TIMELINE_FALLBACK_EXAMPLE.map((row, i) => ({
      key: `example-${i}`,
      time: row.time,
      label: row.label,
    }))
    return { rows: [...prefix, ...exampleRows], source: "example" }
  }, [activeMeetingIndex, calLoading, calError, calConnected, data?.current_block, meetings])

  const refreshGoogleFeeds = useCallback(() => {
    void Promise.all([refreshCal(), refreshTasks()])
  }, [refreshCal, refreshTasks])

  const focusTask = data?.next_action ?? "Completar propuesta para cliente"
  const focusTime = data?.next_time_required ?? "120 min"
  const tasks = data?.today_tasks ?? []
  const habits = data?.habits ?? []

  return (
    <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 500 }}>Ejecución: Hoy</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
            {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="/checkin"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-sm transition active:opacity-90 sm:min-h-0 sm:w-auto sm:px-4 sm:py-2.5"
            style={{
              background: "var(--color-accent-health)",
              textDecoration: "none",
            }}
          >
            Check-in diario
          </Link>
          <div className="text-center sm:text-right">
            <p style={{ margin: 0, fontSize: "24px", fontWeight: 600, color: "var(--color-text-primary)" }}>0/3</p>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--color-text-secondary)",
              }}
            >
              Impacto completado
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[var(--layout-gap)] lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="p-5">
          <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                Timeline Operativo
              </p>
              <button
                type="button"
                disabled={calLoading || tasksLoading}
                onClick={() => void refreshGoogleFeeds()}
                className="shrink-0 text-[10px] font-medium uppercase tracking-[0.12em] text-[var(--color-accent-primary)] underline-offset-2 hover:underline disabled:opacity-50"
              >
                {calLoading || tasksLoading ? "Sincronizando…" : "Actualizar"}
              </button>
            </div>
            {operationalTimeline.source === "loading" && (
              <p className="m-0 text-xs text-[var(--color-text-secondary)]">Cargando eventos del día…</p>
            )}
            {operationalTimeline.source === "error" && calError && (
              <div className="grid gap-2 rounded-lg border border-[color-mix(in_srgb,var(--color-accent-danger)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-danger)_6%,transparent)] px-3 py-2 text-xs">
                <p className="m-0 font-medium text-[var(--color-accent-danger)]">No se pudo cargar Google Calendar</p>
                <p className="m-0 text-[var(--color-text-secondary)]">{calError}</p>
                <Link
                  href="/configuracion"
                  className="font-medium text-[var(--color-accent-primary)] underline-offset-2 hover:underline"
                >
                  Revisar conexión en Configuración
                </Link>
              </div>
            )}
            {operationalTimeline.source === "empty" && operationalTimeline.rows.length === 0 && (
              <div className="grid gap-2 text-xs text-[var(--color-text-secondary)]">
                <p className="m-0">Sin eventos de calendario para hoy.</p>
                <Link href="/configuracion" className="font-medium text-[var(--color-text-primary)] underline-offset-2 hover:underline">
                  Conectar Google Calendar
                </Link>
              </div>
            )}
            {operationalTimeline.source === "example" && (
              <p className="m-0 text-[10px] leading-snug text-[var(--color-text-secondary)]">
                Ejemplo ilustrativo.{" "}
                <Link href="/configuracion" className="font-medium text-[var(--color-accent-primary)] underline-offset-2 hover:underline">
                  Conecta Google
                </Link>{" "}
                para ver tu línea de tiempo real.
              </p>
            )}
            <div style={{ display: "grid", gap: "12px" }}>
              {operationalTimeline.rows.map((item, index) => {
                const last = index === operationalTimeline.rows.length - 1
                return (
                  <div key={item.key} style={{ display: "flex", gap: "10px" }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                      <span
                        style={{
                          width: "8px",
                          height: "8px",
                          borderRadius: "999px",
                          background: item.highlighted ? "var(--color-accent-primary)" : "var(--color-border)",
                        }}
                      />
                      {!last && <span style={{ width: "1px", height: "24px", background: "var(--color-border)" }} />}
                    </div>
                    <div className="min-w-0">
                      <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>{item.time}</p>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 500 }}>{item.label}</p>
                      {item.sub ? (
                        <p className="m-0 mt-0.5 text-[11px] text-[var(--color-text-secondary)]">{item.sub}</p>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Card>

        <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
          <Card className="p-5">
            <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                Plan Ejecutable
              </p>
              <div style={{ border: "0.5px solid var(--color-border)", borderRadius: "14px", padding: "16px" }}>
                <p style={{ margin: 0, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--color-accent-primary)" }}>
                  Foco actual inmediato
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 600 }}>{focusTask}</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  <span>{focusTime}</span>
                  <span style={{ padding: "2px 8px", borderRadius: "999px", border: "0.5px solid var(--color-border)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                    Crítica
                  </span>
                </div>
                <button
                  style={{
                    marginTop: "12px",
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "none",
                    background: "#1F2937",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Marcar como completado
                </button>
              </div>
            </div>
          </Card>

          <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
            {tasks.slice(0, 2).map((task) => (
              <Card key={task.id} hover className="p-4">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "14px", height: "14px", borderRadius: "999px", border: "0.5px solid var(--color-border)" }} />
                    <div>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 500 }}>{task.title}</p>
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>45m</p>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>45m</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-[var(--layout-gap)] sm:grid-cols-2 lg:grid-cols-3">
        <Card
          hover
          className="min-w-0 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-both sm:p-5"
          style={{ animationDelay: "0ms" }}
        >
          <div className="grid gap-2 sm:gap-2.5">
            <div className="flex flex-wrap items-start justify-between gap-2 sm:items-center">
              <p className="m-0 min-w-0 text-[10px] font-medium uppercase leading-snug tracking-[0.14em] text-[var(--color-text-secondary)] sm:text-[11px]">
                Google Calendar (hoy)
              </p>
              <button
                type="button"
                disabled={calLoading || tasksLoading}
                onClick={() => void refreshGoogleFeeds()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-1 text-[10px] font-medium transition-opacity hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_6%,var(--color-surface-alt))] active:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {calLoading || tasksLoading ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
                Actualizar
              </button>
            </div>
            {calError && (
              <p className="m-0 text-[11px] leading-snug text-[var(--color-accent-danger)]">{calError}</p>
            )}
            {calNotice && !calError && (
              <p style={{ margin: 0, fontSize: "10px", color: "var(--color-text-secondary)" }}>{calNotice}</p>
            )}
            {!calConnected && !calLoading && !calNotice && !calError && (
              <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>
                Conecta Google en{" "}
                <Link href="/configuracion" className="font-medium text-[var(--color-text-primary)] underline-offset-2 hover:underline">
                  Configuración
                </Link>{" "}
                para ver eventos reales.
              </p>
            )}
            {calLoading ? (
              <p className="m-0 text-xs text-[var(--color-text-secondary)]">Cargando calendario…</p>
            ) : calError ? null : meetings.length === 0 ? (
              <p className="m-0 text-xs text-[var(--color-text-secondary)] sm:text-[12px]">
                Sin eventos hoy en el rango sincronizado.
              </p>
            ) : (
              <ul className="m-0 grid list-none gap-2 p-0">
                {meetings.map((meeting) => (
                  <li
                    key={meeting.key}
                    className="flex min-w-0 flex-col gap-0.5 rounded-lg border border-transparent px-0 py-0.5 text-xs transition-colors motion-safe:duration-200 sm:flex-row sm:items-center sm:justify-between sm:gap-2 sm:text-[12px] motion-safe:hover:border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] motion-safe:hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_4%,transparent)] sm:px-1 sm:py-1"
                  >
                    <span className="min-w-0 font-medium leading-snug text-[var(--color-text-primary)]">{meeting.label}</span>
                    <span className="shrink-0 tabular-nums text-[var(--color-text-secondary)]">
                      {meeting.time} · {meeting.duration}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
        <Card
          hover
          className="min-w-0 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-both sm:p-5"
          style={{ animationDelay: "45ms" }}
        >
          <div className="grid gap-2 sm:gap-2.5">
            <p className="m-0 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-secondary)] sm:text-[11px]">
              Hábitos clave
            </p>
            {habits.slice(0, 3).map((habit) => (
              <div
                key={habit.id}
                role="group"
                aria-label={`${habit.name}: ${habit.completed ? "hecho" : "pendiente"}`}
                className="flex min-w-0 items-center gap-2.5 text-xs transition-colors motion-safe:duration-200 sm:gap-3 sm:text-[12px] motion-safe:hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_4%,transparent)] sm:rounded-lg sm:px-1 sm:py-1.5"
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border sm:h-8 sm:w-8"
                  style={
                    habit.completed
                      ? {
                          background: "var(--color-accent-health)",
                          borderColor: "transparent",
                          boxShadow: "0 1px 2px color-mix(in srgb, var(--color-accent-health) 30%, transparent)",
                        }
                      : {
                          background: "transparent",
                          borderColor: "color-mix(in srgb, var(--color-border) 85%, transparent)",
                        }
                  }
                  aria-hidden
                >
                  {habit.completed ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.75} /> : null}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
                  <span className="min-w-0 font-medium leading-snug text-[var(--color-text-primary)]">{habit.name}</span>
                  <span
                    className="shrink-0 text-[11px] font-medium sm:text-xs"
                    style={{ color: habit.completed ? "var(--color-accent-health)" : "var(--color-text-secondary)" }}
                  >
                    {habit.completed ? "Hecho" : "Pendiente"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card
          hover
          className="min-w-0 p-4 motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-500 motion-safe:fill-mode-both sm:col-span-2 sm:p-5 lg:col-span-1"
          style={{ animationDelay: "90ms" }}
        >
          <div className="grid gap-2 sm:gap-2.5">
            <p className="m-0 text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--color-text-secondary)] sm:text-[11px]">
              Stack / Recordatorios
            </p>
            <div className="mb-2 grid gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)]/80 px-2.5 py-2 sm:px-3">
              <div className="grid gap-0.5">
                <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">
                  Google Tasks (hoy)
                </p>
                <p className="m-0 text-[10px] leading-snug text-[var(--color-text-secondary)]/90">
                  Solo tareas con vencimiento hoy (zona de la agenda).
                </p>
              </div>
              {tasksLoading && !tasksError ? (
                <p className="m-0 text-[11px] text-[var(--color-text-secondary)]">Cargando tareas…</p>
              ) : tasksError ? (
                <p className="m-0 text-[11px] leading-snug text-[var(--color-accent-danger)]">{tasksError}</p>
              ) : !tasksConnected ? (
                <p className="m-0 text-[11px] text-[var(--color-text-secondary)]">
                  {tasksNotice ?? "Conecta Google en Configuración para ver recordatorios con fecha."}{" "}
                  <Link href="/configuracion" className="font-medium text-[var(--color-accent-primary)] underline-offset-2 hover:underline">
                    Conectar
                  </Link>
                </p>
              ) : googleTasksToday.length === 0 ? (
                <p className="m-0 text-[11px] text-[var(--color-text-secondary)]">
                  Sin tareas con vencimiento hoy en Google Tasks.
                </p>
              ) : (
                <ul className="m-0 list-disc space-y-1 pl-4 marker:text-[var(--color-text-secondary)]">
                  {googleTasksToday.map((gt) => (
                    <li
                      key={gt.id}
                      className="min-w-0 break-words text-[11px] leading-snug text-[var(--color-text-primary)] sm:text-[12px]"
                    >
                      {gt.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="grid gap-1 sm:gap-1.5">
              {supplements.map((item) => {
                const key = stackRowKey("sup", item)
                const done = Boolean(stackChecked[key])
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleStack(key)}
                    className="flex min-h-[44px] w-full min-w-0 items-center gap-2.5 rounded-lg border border-transparent text-left text-xs transition-colors motion-safe:duration-200 sm:min-h-0 sm:gap-3 sm:text-[12px] motion-safe:hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_4%,transparent)] sm:px-1 sm:py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-health)] focus-visible:ring-offset-2"
                    aria-pressed={done}
                    aria-label={`${item}, ${done ? "marcado" : "sin marcar"}. Toca para alternar.`}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border sm:h-8 sm:w-8"
                      style={
                        done
                          ? {
                              background: "var(--color-accent-health)",
                              borderColor: "transparent",
                              boxShadow: "0 1px 2px color-mix(in srgb, var(--color-accent-health) 30%, transparent)",
                            }
                          : {
                              background: "transparent",
                              borderColor: "color-mix(in srgb, var(--color-border) 85%, transparent)",
                            }
                      }
                      aria-hidden
                    >
                      {done ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.75} /> : null}
                    </span>
                    <span className={`min-w-0 leading-snug ${done ? "text-[var(--color-text-secondary)] line-through opacity-80" : "text-[var(--color-text-secondary)]"}`}>
                      {item}
                    </span>
                  </button>
                )
              })}
              {reminders.map((item) => {
                const key = stackRowKey("rem", item)
                const done = Boolean(stackChecked[key])
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => toggleStack(key)}
                    className="flex min-h-[44px] w-full min-w-0 items-center gap-2.5 rounded-lg border border-transparent text-left text-xs transition-colors motion-safe:duration-200 sm:min-h-0 sm:gap-3 sm:text-[12px] motion-safe:hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_4%,transparent)] sm:px-1 sm:py-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-health)] focus-visible:ring-offset-2"
                    aria-pressed={done}
                    aria-label={`${item}, ${done ? "marcado" : "sin marcar"}. Toca para alternar.`}
                  >
                    <span
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border sm:h-8 sm:w-8"
                      style={
                        done
                          ? {
                              background: "var(--color-accent-health)",
                              borderColor: "transparent",
                              boxShadow: "0 1px 2px color-mix(in srgb, var(--color-accent-health) 30%, transparent)",
                            }
                          : {
                              background: "transparent",
                              borderColor: "color-mix(in srgb, var(--color-border) 85%, transparent)",
                            }
                      }
                      aria-hidden
                    >
                      {done ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={2.75} /> : null}
                    </span>
                    <span className={`min-w-0 font-medium leading-snug text-[var(--color-text-primary)] ${done ? "line-through opacity-70" : ""}`}>
                      {item}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div style={{ display: "grid", gap: "8px", maxWidth: "320px" }}>
          <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
            Check-in de foco
          </p>
          <div style={{ display: "flex", gap: "6px" }}>
            {[1, 2, 3, 4, 5].map((score) => (
              <div
                key={score}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  border: "0.5px solid var(--color-border)",
                  background: "var(--color-surface-alt)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                {score}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

