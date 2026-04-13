"use client"

import Link from "next/link"
import { useCallback, useMemo, useState } from "react"
import { Check, Loader2, Moon, Sun, Sunrise } from "lucide-react"

import { useGoogleCalendar } from "@/app/hooks/useGoogleCalendar"
import { useGoogleTasks } from "@/app/hooks/useGoogleTasks"
import { useHabits } from "@/app/hooks/useHabits"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import { Card } from "@/src/components/ui/Card"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { agendaTodayYmd, localDateKeyFromIso } from "@/lib/agenda/localDateKey"
import { isGoogleTaskDone } from "@/lib/agenda/googleTasksUpcoming"

type TimelineItem = {
  id: string
  type: "evento" | "task"
  title: string
  hint: string
  sortTime: number
}

function toTimeLabel(iso: string | null) {
  if (!iso) return "Todo el día"
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
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

  const timeline = useMemo(() => {
    const eventRows: TimelineItem[] = events
      .filter((event) => localDateKeyFromIso(event.startAt) === todayKey)
      .map((event) => ({
        id: `event:${event.id}`,
        type: "evento",
        title: event.summary || "Evento sin título",
        hint: toTimeLabel(event.startAt),
        sortTime: event.startAt ? Date.parse(event.startAt) : Number.MAX_SAFE_INTEGER - 1,
      }))

    const taskRows: TimelineItem[] = googleTasks
      .filter((task) => !isGoogleTaskDone(task.status) && localDateKeyFromIso(task.due) === todayKey)
      .map((task) => ({
        id: `task:${task.id}`,
        type: "task",
        title: task.title || "Task sin título",
        hint: "Google Tasks · hoy",
        sortTime: Number.MAX_SAFE_INTEGER,
      }))

    return [...eventRows, ...taskRows].sort((a, b) => a.sortTime - b.sortTime).slice(0, 8)
  }, [events, googleTasks, todayKey])

  const operationalTasks = useMemo(() => {
    return (operationalContext?.today_tasks ?? []).filter((task) => !task.completed).slice(0, 5)
  }, [operationalContext?.today_tasks])

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
                <li key={item.id} className="rounded-xl border border-white/10 bg-black/10 px-2.5 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="m-0 truncate text-sm font-medium text-orbita-primary">{item.title}</p>
                    <span className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-orbita-secondary">
                      {item.type}
                    </span>
                  </div>
                  <p className="m-0 mt-1 text-[11px] text-orbita-secondary">{item.hint}</p>
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
              {operationalTasks.map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/10 px-2.5 py-2">
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
              {operationalTasks.length === 0 ? (
                <li className="text-xs text-orbita-secondary">No hay tareas operativas pendientes.</li>
              ) : null}
            </ul>

            <p className="m-0 mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
              Google Tasks de hoy
            </p>
            <ul className="m-0 mt-2 list-none space-y-2 p-0">
              {googleTasks
                .filter((task) => !isGoogleTaskDone(task.status) && localDateKeyFromIso(task.due) === todayKey)
                .slice(0, 3)
                .map((task) => (
                  <li key={task.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/10 px-2.5 py-2">
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
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
              Hábitos de hoy
            </p>
            <ul className="m-0 mt-2 list-none space-y-2 p-0">
              {visibleHabits.map((habit) => (
                <li key={habit.id} className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-black/10 px-2.5 py-2">
                  <p className="m-0 min-w-0 flex-1 truncate text-sm text-orbita-primary">{habit.name}</p>
                  <button
                    type="button"
                    onClick={() => void toggleCompleteToday(habit.id)}
                    disabled={togglingId === habit.id}
                    className="inline-flex min-h-[32px] items-center gap-1 rounded-[var(--radius-button)] border border-white/15 px-2 text-[11px] font-semibold text-white disabled:opacity-50"
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

