"use client"

import Link from "next/link"
import clsx from "clsx"
import { useCallback, useEffect, useMemo, useState } from "react"
import { Check, Loader2, Moon, Sun, Sunrise } from "lucide-react"

import { useGoogleCalendar } from "@/app/hooks/useGoogleCalendar"
import { useGoogleTasks } from "@/app/hooks/useGoogleTasks"
import { useHabits } from "@/app/hooks/useHabits"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import { Card } from "@/src/components/ui/Card"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { agendaTodayYmd, localDateKeyFromIso } from "@/lib/agenda/localDateKey"
import { isGoogleTaskDone } from "@/lib/agenda/googleTasksUpcoming"
import type { GoogleCalendarEventDTO } from "@/lib/google/types"

type TimelineItem = {
  id: string
  type: "evento" | "task"
  title: string
  hint: string
  sortTime: number
  /** Task completada en Google, o evento con hora de fin ya pasada. */
  done: boolean
}

function eventIsPast(ev: GoogleCalendarEventDTO, nowMs: number): boolean {
  if (!ev.endAt) return false
  const end = Date.parse(ev.endAt)
  if (!Number.isFinite(end)) return false
  return end < nowMs
}

function rowSurfaceClass(done: boolean) {
  return done
    ? "border-[color-mix(in_srgb,var(--color-accent-health)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-background))]"
    : "border-white/10 bg-black/10"
}

function toTimeLabel(iso: string | null) {
  if (!iso) return "Todo el día"
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
}

function taskDueSortMs(due: string | null): number {
  if (!due) return Number.MAX_SAFE_INTEGER - 1000
  const t = Date.parse(due)
  return Number.isFinite(t) ? t : Number.MAX_SAFE_INTEGER - 1000
}

export function OperationalTodayWidget() {
  const todayKey = agendaTodayYmd()
  const { events, loading: calendarLoading, connected: calendarConnected, notice: calendarNotice } = useGoogleCalendar()
  const {
    tasks: googleTasks,
    loading: tasksLoading,
    connected: tasksConnected,
    notice: tasksNotice,
    patchTask,
  } = useGoogleTasks()
  const { habits, togglingId, toggleCompleteToday } = useHabits()
  const { data: operationalContext, refetch: refetchOperationalContext } = useOperationalContext()

  const [taskPendingId, setTaskPendingId] = useState<string | null>(null)
  const [googleTaskPendingId, setGoogleTaskPendingId] = useState<string | null>(null)
  const [inlineError, setInlineError] = useState<string | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  const timeline = useMemo(() => {
    const eventRows: TimelineItem[] = events
      .filter((event) => localDateKeyFromIso(event.startAt) === todayKey)
      .map((event) => {
        const done = eventIsPast(event, nowMs)
        return {
          id: `event:${event.id}`,
          type: "evento" as const,
          title: event.summary || "Evento sin título",
          hint: done ? `${toTimeLabel(event.startAt)} · Listo` : toTimeLabel(event.startAt),
          sortTime: event.startAt ? Date.parse(event.startAt) : Number.MAX_SAFE_INTEGER - 1,
          done,
        }
      })

    const taskRows: TimelineItem[] = googleTasks
      .filter((task) => localDateKeyFromIso(task.due) === todayKey)
      .map((task) => {
        const done = isGoogleTaskDone(task.status)
        return {
          id: `task:${task.id}`,
          type: "task" as const,
          title: task.title || "Task sin título",
          hint: done ? "Google Tasks · hecha" : "Google Tasks · hoy",
          sortTime: taskDueSortMs(task.due),
          done,
        }
      })

    return [...eventRows, ...taskRows]
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1
        return a.sortTime - b.sortTime
      })
      .slice(0, 8)
  }, [events, googleTasks, todayKey, nowMs])

  const operationalSplit = useMemo(() => {
    const all = operationalContext?.today_tasks ?? []
    const pending = all.filter((t) => !t.completed)
    const completed = all.filter((t) => t.completed)
    return { pending: pending.slice(0, 5), completed: completed.slice(0, 5) }
  }, [operationalContext?.today_tasks])

  const googleTasksTodaySplit = useMemo(() => {
    const today = googleTasks.filter((t) => localDateKeyFromIso(t.due) === todayKey)
    const pending = today.filter((t) => !isGoogleTaskDone(t.status))
    const completed = today.filter((t) => isGoogleTaskDone(t.status))
    return { pending: pending.slice(0, 5), completed: completed.slice(0, 5) }
  }, [googleTasks, todayKey])

  const visibleHabits = useMemo(() => habits.slice(0, 5), [habits])

  const completeOperationalTask = useCallback(
    async (id: string) => {
      setTaskPendingId(id)
      setInlineError(null)
      try {
        const headers = await browserBearerHeaders(true)
        const res = await fetch("/api/tasks", {
          method: "PATCH",
          headers,
          body: JSON.stringify({ id, completed: true }),
        })
        const payload = (await res.json()) as { success?: boolean; error?: string }
        if (!res.ok || !payload.success) {
          throw new Error(payload.error ?? "No se pudo completar la tarea")
        }
        await refetchOperationalContext()
      } catch (error) {
        setInlineError(error instanceof Error ? error.message : "Error actualizando tarea")
      } finally {
        setTaskPendingId(null)
      }
    },
    [refetchOperationalContext],
  )

  const completeGoogleTask = useCallback(async (id: string) => {
    setGoogleTaskPendingId(id)
    setInlineError(null)
    try {
      const updated = await patchTask(id, { status: "completed" })
      if (!updated) {
        throw new Error("No se pudo actualizar Google Task")
      }
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : "Error actualizando Google Task")
    } finally {
      setGoogleTaskPendingId(null)
    }
  }, [patchTask])

  return (
    <section
      id="inicio-operacion"
      className="mx-auto max-w-6xl px-4"
      aria-label="Timeline de hoy, tareas operativas y hábitos"
    >
      <Card className="border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] p-4 shadow-[var(--shadow-card)] sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="m-0 text-[11px] uppercase tracking-[0.14em] text-orbita-secondary">Operación rápida</p>
            <h2 className="m-0 mt-1 text-lg font-semibold text-orbita-primary">Timeline de hoy + checks</h2>
            <p className="m-0 mt-1 text-sm text-orbita-secondary">
              Revisa eventos, completa tasks y marca hábitos sin salir de Inicio.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { href: "/checkin#checkin-manana", label: "Mañana", Icon: Sunrise },
              { href: "/checkin#checkin-dia", label: "Día", Icon: Sun },
              { href: "/checkin#checkin-noche", label: "Noche", Icon: Moon },
            ].map(({ href, label, Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex min-h-[42px] items-center gap-1 rounded-[var(--radius-button)] border border-[var(--color-border)] px-3 text-xs font-semibold text-orbita-primary motion-safe:hover:bg-white/5"
                style={{ textDecoration: "none" }}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
              Timeline operativo
            </p>
            <ul className="m-0 mt-2 list-none space-y-2 p-0">
              {timeline.map((item) => (
                <li
                  key={item.id}
                  className={clsx("rounded-xl border px-2.5 py-2", rowSurfaceClass(item.done))}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={clsx(
                        "m-0 truncate text-sm font-medium",
                        item.done ? "text-[var(--color-accent-health)]" : "text-orbita-primary",
                      )}
                    >
                      {item.title}
                    </p>
                    <span
                      className={clsx(
                        "shrink-0 text-[10px] uppercase tracking-[0.1em]",
                        item.done ? "text-[var(--color-accent-health)]" : "text-orbita-secondary",
                      )}
                    >
                      {item.done ? "Listo" : item.type}
                    </span>
                  </div>
                  <p
                    className={clsx(
                      "m-0 mt-1 text-[11px]",
                      item.done ? "text-[color-mix(in_srgb,var(--color-accent-health)_88%,var(--color-text-secondary))]" : "text-orbita-secondary",
                    )}
                  >
                    {item.hint}
                  </p>
                </li>
              ))}
              {timeline.length === 0 ? (
                <li className="text-xs text-orbita-secondary">
                  {calendarLoading || tasksLoading
                    ? "Sincronizando eventos y tasks..."
                    : "No hay eventos ni tasks para hoy."}
                </li>
              ) : null}
            </ul>
            {!calendarConnected || !tasksConnected ? (
              <p className="m-0 mt-2 text-[11px] text-orbita-secondary">
                {(calendarNotice || tasksNotice || "Conecta Google para más contexto diario.") + " "}
                <Link href="/configuracion" className="text-[var(--color-accent-primary)] underline">
                  Configurar
                </Link>
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
              Tasks para cerrar
            </p>
            <ul className="m-0 mt-2 list-none space-y-2 p-0">
              {operationalSplit.pending.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/10 px-2.5 py-2"
                >
                  <p className="m-0 min-w-0 flex-1 truncate text-sm text-orbita-primary">{task.title}</p>
                  <button
                    type="button"
                    onClick={() => void completeOperationalTask(task.id)}
                    disabled={taskPendingId === task.id}
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-[var(--radius-button)] border border-white/15 px-2 text-[11px] font-semibold text-white disabled:opacity-50"
                  >
                    {taskPendingId === task.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
                    Hecha
                  </button>
                </li>
              ))}
              {operationalSplit.completed.map((task) => (
                <li
                  key={task.id}
                  className={clsx(
                    "flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2",
                    rowSurfaceClass(true),
                  )}
                >
                  <p className="m-0 min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-accent-health)]">
                    {task.title}
                  </p>
                  <span className="inline-flex min-h-[32px] items-center gap-1 rounded-[var(--radius-button)] border border-[color-mix(in_srgb,var(--color-accent-health)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_10%,transparent)] px-2 text-[11px] font-semibold text-[var(--color-accent-health)]">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Hecha
                  </span>
                </li>
              ))}
              {operationalSplit.pending.length === 0 && operationalSplit.completed.length === 0 ? (
                <li className="text-xs text-orbita-secondary">No hay tareas operativas para hoy.</li>
              ) : null}
            </ul>

            <p className="m-0 mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
              Google Tasks de hoy
            </p>
            <ul className="m-0 mt-2 list-none space-y-2 p-0">
              {googleTasksTodaySplit.pending.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/10 px-2.5 py-2"
                >
                  <p className="m-0 min-w-0 flex-1 truncate text-sm text-orbita-primary">{task.title}</p>
                  <button
                    type="button"
                    onClick={() => void completeGoogleTask(task.id)}
                    disabled={googleTaskPendingId === task.id}
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-[var(--radius-button)] border border-white/15 px-2 text-[11px] font-semibold text-white disabled:opacity-50"
                  >
                    {googleTaskPendingId === task.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    )}
                    Hecha
                  </button>
                </li>
              ))}
              {googleTasksTodaySplit.completed.map((task) => (
                <li
                  key={task.id}
                  className={clsx(
                    "flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2",
                    rowSurfaceClass(true),
                  )}
                >
                  <p className="m-0 min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-accent-health)]">
                    {task.title}
                  </p>
                  <span className="inline-flex min-h-[32px] items-center gap-1 rounded-[var(--radius-button)] border border-[color-mix(in_srgb,var(--color-accent-health)_35%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_10%,transparent)] px-2 text-[11px] font-semibold text-[var(--color-accent-health)]">
                    <Check className="h-3.5 w-3.5" aria-hidden />
                    Listo
                  </span>
                </li>
              ))}
              {googleTasksTodaySplit.pending.length === 0 && googleTasksTodaySplit.completed.length === 0 ? (
                <li className="text-xs text-orbita-secondary">No hay Google Tasks con vencimiento hoy.</li>
              ) : null}
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
              Hábitos de hoy
            </p>
            <ul className="m-0 mt-2 list-none space-y-2 p-0">
              {visibleHabits.map((habit) => (
                <li
                  key={habit.id}
                  className={clsx(
                    "flex items-center justify-between gap-2 rounded-xl border px-2.5 py-2",
                    rowSurfaceClass(Boolean(habit.completed)),
                  )}
                >
                  <p
                    className={clsx(
                      "m-0 min-w-0 flex-1 truncate text-sm",
                      habit.completed ? "font-medium text-[var(--color-accent-health)]" : "text-orbita-primary",
                    )}
                  >
                    {habit.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => void toggleCompleteToday(habit.id)}
                    disabled={togglingId === habit.id}
                    className={clsx(
                      "inline-flex min-h-[32px] items-center gap-1 rounded-[var(--radius-button)] border px-2 text-[11px] font-semibold disabled:opacity-50",
                      habit.completed
                        ? "border-[color-mix(in_srgb,var(--color-accent-health)_40%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_8%,transparent)] text-[var(--color-accent-health)]"
                        : "border-white/15 text-white",
                    )}
                  >
                    {togglingId === habit.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                    ) : (
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    )}
                    {habit.completed ? "Desmarcar" : "Marcar"}
                  </button>
                </li>
              ))}
              {visibleHabits.length === 0 ? (
                <li className="text-xs text-orbita-secondary">No hay hábitos cargados todavía.</li>
              ) : null}
            </ul>
          </div>
        </div>

        {inlineError ? <p className="m-0 mt-3 text-xs text-[var(--color-accent-danger)]">{inlineError}</p> : null}
      </Card>
    </section>
  )
}

