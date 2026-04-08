"use client"

import { useMemo, useState } from "react"
import { Bell, Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"
import type { GoogleCalendarFeedState } from "@/app/hooks/useGoogleCalendar"
import type { GoogleCalendarEventDTO, GoogleTaskDTO } from "@/lib/google/types"
import type { GoogleTasksFeedState } from "@/app/hooks/useGoogleTasks"
import {
  calendarEventLocalDayKey,
  formatLocalDateKey,
  localDateKeyFromIso,
} from "@/lib/agenda/localDateKey"
import { GOOGLE_CALENDAR_WEB_APP, GOOGLE_TASKS_WEB_APP } from "@/lib/agenda/googleEditUrls"
import { googleTasksForTimelineMerge } from "@/lib/agenda/googleTasksUpcoming"
import type { GoogleDayBucket } from "@/lib/agenda/googleAgendaByDay"
import { countGoogleDayItems } from "@/lib/agenda/googleAgendaByDay"
import {
  agendaMetaRowClass,
  agendaOverlineClass,
  agendaSectionStackClass,
  agendaSectionTitleClass,
  agendaViewStackClass,
  agendaCardPadClass,
  agendaColumnHeadingClass,
  agendaKanbanColumnClass,
  agendaKanbanGridClass,
} from "@/app/agenda/agendaUiTokens"
import { AgendaOrvitaMiniCard } from "@/app/agenda/AgendaOrvitaMiniCard"
import { AgendaOrvitaTaskCard } from "@/app/agenda/AgendaOrvitaTaskCard"
import { GoogleTaskDueSetter } from "@/app/agenda/GoogleTaskDueSetter"
import { AgendaReadonlyUnifiedCard } from "@/app/agenda/AgendaReadonlyUnifiedCard"
import {
  calendarEventFuenteLabel,
  calendarEventUnifiedTimeline,
  reminderFuenteLabel,
  venceLine,
} from "@/app/agenda/taskCardFormat"
import { AGENDA_COLOR, taskTypeAccentVar } from "@/app/agenda/taskTypeVisual"

function taskDueSortMs(due: string): number {
  if (!due || due.length < 10) return Number.MAX_SAFE_INTEGER - 10_000
  const y = Number(due.slice(0, 4))
  const m = Number(due.slice(5, 7)) - 1
  const d = Number(due.slice(8, 10))
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return Number.MAX_SAFE_INTEGER - 10_000
  return new Date(y, m, d).getTime()
}

function eventStartSortMs(ev: GoogleCalendarEventDTO): number {
  if (!ev.startAt) return Number.MAX_SAFE_INTEGER - 5000
  if (ev.allDay && ev.startAt.length >= 10) {
    return taskDueSortMs(ev.startAt.slice(0, 10))
  }
  const t = Date.parse(ev.startAt)
  return Number.isNaN(t) ? Number.MAX_SAFE_INTEGER - 5000 : t
}

type MergedRow =
  | { kind: "task"; task: UiAgendaTask; sortMs: number }
  | { kind: "reminder"; reminder: GoogleTaskDTO; sortMs: number }
  | { kind: "event"; event: GoogleCalendarEventDTO; sortMs: number }

function mergedRowDayKey(row: MergedRow): string | null {
  if (row.kind === "task") {
    const d = row.task.due
    return d && d.length >= 10 ? d.slice(0, 10) : null
  }
  if (row.kind === "reminder") return localDateKeyFromIso(row.reminder.due)
  return calendarEventLocalDayKey(row.event)
}

function mergedKindOrder(kind: MergedRow["kind"]) {
  if (kind === "task") return 0
  if (kind === "reminder") return 1
  return 2
}

function mergedRowLabel(row: MergedRow): string {
  if (row.kind === "task") return row.task.title
  if (row.kind === "reminder") return row.reminder.title
  return row.event.summary || ""
}

function linkedGoogleTaskIdsFromOrvita(tasks: UiAgendaTask[]): Set<string> {
  const ids = new Set<string>()
  for (const t of tasks) {
    const gid = t.googleTaskId?.trim()
    if (gid) ids.add(gid)
  }
  return ids
}

function buildMergedTimeline(
  tasks: UiAgendaTask[],
  calendarFeed?: Pick<GoogleCalendarFeedState, "events" | "connected">,
  googleReminders?: GoogleTaskDTO[],
  googleTasksConnected?: boolean,
  hideBeforeToday = true,
  /** Tareas Órvita en otras columnas (p. ej. Kanban pasa `[]` como tasks pero enlaces aquí). */
  extraOrvitaTasksForGoogleDedupe: UiAgendaTask[] = []
): MergedRow[] {
  const skipGoogleIds = linkedGoogleTaskIdsFromOrvita(tasks)
  for (const t of extraOrvitaTasksForGoogleDedupe) {
    const gid = t.googleTaskId?.trim()
    if (gid) skipGoogleIds.add(gid)
  }
  const rows: MergedRow[] = tasks.map((task) => ({ kind: "task", task, sortMs: taskDueSortMs(task.due) }))
  if (googleTasksConnected && googleReminders?.length) {
    for (const reminder of googleReminders) {
      if (skipGoogleIds.has(reminder.id)) continue
      const dueDay = localDateKeyFromIso(reminder.due) ?? ""
      rows.push({ kind: "reminder", reminder, sortMs: taskDueSortMs(dueDay) })
    }
  }
  if (calendarFeed?.connected) {
    for (const event of calendarFeed.events) {
      rows.push({ kind: "event", event, sortMs: eventStartSortMs(event) })
    }
  }
  rows.sort((a, b) => {
    if (a.sortMs !== b.sortMs) return a.sortMs - b.sortMs
    const ko = mergedKindOrder(a.kind) - mergedKindOrder(b.kind)
    if (ko !== 0) return ko
    return mergedRowLabel(a).localeCompare(mergedRowLabel(b), "es")
  })
  if (!hideBeforeToday) return rows
  const todayYmd = formatLocalDateKey(new Date())
  return rows.filter((row) => {
    const k = mergedRowDayKey(row)
    if (k == null) return true
    return k >= todayYmd
  })
}

function monthDayTypeMarkers(dayTasks: UiAgendaTask[]) {
  const order: UiAgendaTask["type"][] = ["recibida", "asignada", "personal"]
  const seen = new Set<UiAgendaTask["type"]>()
  dayTasks.forEach((t) => seen.add(t.type))
  return order.filter((k) => seen.has(k))
}

export type GroupedTasks = {
  recibida: UiAgendaTask[]
  asignada: UiAgendaTask[]
  personal: UiAgendaTask[]
}

function googleTaskNeedsDue(t: GoogleTaskDTO) {
  return !t.due || t.due.length < 10
}

export function AgendaSharedKanban({
  grouped,
  pendingInvites = [],
  calendarFeed,
  googleTasksFeed,
  onSaveComplete,
  onGoogleTaskSetDue,
  hideBeforeToday = true,
  onDeleteOrvitaTask,
  onDeleteCalendarEvent,
  onDeleteGoogleTask,
  onAcceptAssignment,
}: {
  grouped: GroupedTasks
  /** Recibidas aún sin aceptar: se muestran arriba en la columna «Tareas Recibidas». */
  pendingInvites?: UiAgendaTask[]
  calendarFeed?: Pick<GoogleCalendarFeedState, "events" | "connected">
  googleTasksFeed?: Pick<GoogleTasksFeedState, "tasks" | "connected">
  onSaveComplete?: (task: UiAgendaTask, completed: boolean) => Promise<void> | void
  onGoogleTaskSetDue?: (taskId: string, dueYmd: string) => Promise<void>
  /** Oculta ítems con día local anterior a hoy (tareas sin fecha se muestran). */
  hideBeforeToday?: boolean
  onDeleteOrvitaTask?: (task: UiAgendaTask) => Promise<void> | void
  onDeleteCalendarEvent?: (eventId: string) => Promise<void> | void
  onDeleteGoogleTask?: (taskId: string) => Promise<void> | void
  onAcceptAssignment?: (task: UiAgendaTask) => Promise<void> | void
}) {
  const [busyDel, setBusyDel] = useState<string | null>(null)

  const googleReminders = useMemo(
    () => (googleTasksFeed?.connected ? googleTasksForTimelineMerge(googleTasksFeed.tasks) : []),
    [googleTasksFeed?.connected, googleTasksFeed?.tasks]
  )

  const allGroupedForDedupe = useMemo(
    () => [...grouped.personal, ...grouped.recibida, ...grouped.asignada],
    [grouped.personal, grouped.recibida, grouped.asignada],
  )

  const googleMerged = useMemo(
    () =>
      buildMergedTimeline(
        [],
        calendarFeed,
        googleReminders,
        googleTasksFeed?.connected,
        hideBeforeToday,
        allGroupedForDedupe
      ),
    [
      calendarFeed?.events,
      calendarFeed?.connected,
      googleReminders,
      googleTasksFeed?.connected,
      hideBeforeToday,
      allGroupedForDedupe,
    ]
  )

  const googleConnected = Boolean(calendarFeed?.connected || googleTasksFeed?.connected)

  const recibidasColumnItems = [...pendingInvites, ...grouped.recibida]

  return (
    <div className={agendaKanbanGridClass} aria-label="Tres columnas: recibidas, asignadas, personales y Google">
      {[
        { label: "Tareas Recibidas", items: recibidasColumnItems, accent: "var(--agenda-received)" },
        { label: "Asignadas por Mi", items: grouped.asignada, accent: "var(--agenda-assigned)" },
      ].map((column) => (
        <div key={column.label} className={agendaKanbanColumnClass}>
          <p
            className={`m-0 border-l-[3px] border-solid pl-2.5 ${agendaOverlineClass.replace(/^m-0 /, "")}`}
            style={{ borderLeftColor: column.accent }}
          >
            {column.label}
          </p>
          {column.label === "Tareas Recibidas" && pendingInvites.length > 0 ? (
            <p className="m-0 mb-1 max-w-[18rem] text-[10px] leading-snug text-[var(--color-text-secondary)]">
              {pendingInvites.length === 1
                ? "1 asignación pendiente de aceptar (arriba en la columna)."
                : `${pendingInvites.length} asignaciones pendientes de aceptar (arriba en la columna).`}
            </p>
          ) : null}
          {column.items.map((task) => (
            <AgendaOrvitaTaskCard
              key={task.id}
              task={task}
              variant="kanban"
              onSaveComplete={onSaveComplete}
              onAcceptAssignment={onAcceptAssignment}
              onDelete={
                onDeleteOrvitaTask
                  ? async (t) => {
                      if (!confirm(`¿Eliminar “${t.title}” del tablero Órvita?`)) return
                      setBusyDel(`o-${t.id}`)
                      try {
                        await onDeleteOrvitaTask(t)
                      } finally {
                        setBusyDel(null)
                      }
                    }
                  : undefined
              }
              deleteBusy={busyDel === `o-${task.id}`}
            />
          ))}
        </div>
      ))}
      <div className={agendaKanbanColumnClass}>
        <div className="border-l-[3px] border-solid pl-2.5" style={{ borderLeftColor: "var(--agenda-personal)" }}>
          <p className={`m-0 ${agendaColumnHeadingClass}`}>Personales y Google</p>
          <p className="m-0 mt-1 text-[10px] font-medium normal-case tracking-normal text-[var(--color-text-secondary)] sm:text-[11px]">
            Tareas personales Órvita · eventos y recordatorios (solo lectura)
          </p>
        </div>
        {grouped.personal.map((task) => (
          <AgendaOrvitaTaskCard
            key={task.id}
            task={task}
            variant="kanban"
            onSaveComplete={onSaveComplete}
            onAcceptAssignment={onAcceptAssignment}
            onDelete={
              onDeleteOrvitaTask
                ? async (t) => {
                    if (!confirm(`¿Eliminar “${t.title}” del tablero Órvita?`)) return
                    setBusyDel(`o-${t.id}`)
                    try {
                      await onDeleteOrvitaTask(t)
                    } finally {
                      setBusyDel(null)
                    }
                  }
                : undefined
            }
            deleteBusy={busyDel === `o-${task.id}`}
          />
        ))}
        {!googleConnected ? (
          <p className="m-0 text-[11px] leading-snug text-[var(--color-text-secondary)] sm:text-[12px]">
            Conecta Google en Cuenta para mezclar Calendar y Tasks en esta columna.
          </p>
        ) : googleMerged.length === 0 ? (
          grouped.personal.length > 0 ? null : (
            <p className="m-0 text-[11px] text-[var(--color-text-secondary)] sm:text-[12px]">
              Sin personales ni ítems Google en el periodo.
            </p>
          )
        ) : (
          googleMerged.map((row) =>
            row.kind === "reminder" ? (
              <AgendaReadonlyUnifiedCard
                key={`r-${row.reminder.id}`}
                variant="kanban"
                borderLeft={`4px solid ${AGENDA_COLOR.reminder}`}
                title={row.reminder.title || "(Sin título)"}
                TimelineIcon={Bell}
                timelineText={venceLine(localDateKeyFromIso(row.reminder.due) ?? "")}
                googleKind="reminder"
                kindPillLabel="Recordatorio"
                fuente={reminderFuenteLabel()}
                footNote={
                  googleTaskNeedsDue(row.reminder)
                    ? "Sin fecha en Google Tasks: no aparece en Semana/Mes hasta que tenga vencimiento."
                    : onDeleteGoogleTask
                      ? undefined
                      : "Solo lectura en Órvita · edita en Google Tasks"
                }
                footer={
                  onGoogleTaskSetDue && googleTaskNeedsDue(row.reminder) ? (
                    <GoogleTaskDueSetter taskId={row.reminder.id} patchDue={onGoogleTaskSetDue} />
                  ) : undefined
                }
                badgeLetter="GT"
                badgeColorVar={AGENDA_COLOR.reminder}
                editUrl={GOOGLE_TASKS_WEB_APP}
                editTitle="Editar en Google Tasks"
                onDelete={
                  onDeleteGoogleTask
                    ? async () => {
                        if (!confirm("¿Eliminar esta tarea/recordatorio en Google Tasks?")) return
                        setBusyDel(`r-${row.reminder.id}`)
                        try {
                          await onDeleteGoogleTask(row.reminder.id)
                        } finally {
                          setBusyDel(null)
                        }
                      }
                    : undefined
                }
                deleteBusy={busyDel === `r-${row.reminder.id}`}
              />
            ) : row.kind === "event" ? (
              <AgendaReadonlyUnifiedCard
                key={`e-${row.event.id}`}
                variant="kanban"
                borderLeft={`4px solid ${AGENDA_COLOR.calendar}`}
                title={row.event.summary || "(Sin título)"}
                TimelineIcon={Calendar}
                timelineText={calendarEventUnifiedTimeline(row.event)}
                googleKind="calendar"
                kindPillLabel={calendarEventFuenteLabel(row.event)}
                statusLabel="Calendario"
                fuente={calendarEventFuenteLabel(row.event)}
                footNote={
                  onDeleteCalendarEvent ? undefined : "Solo lectura en Órvita · edita en Google Calendar"
                }
                badgeLetter="GC"
                badgeColorVar={AGENDA_COLOR.calendar}
                editUrl={GOOGLE_CALENDAR_WEB_APP}
                editTitle="Editar en Google Calendar"
                onDelete={
                  onDeleteCalendarEvent
                    ? async () => {
                        if (!confirm("¿Eliminar este evento en Google Calendar?")) return
                        setBusyDel(`e-${row.event.id}`)
                        try {
                          await onDeleteCalendarEvent(row.event.id)
                        } finally {
                          setBusyDel(null)
                        }
                      }
                    : undefined
                }
                deleteBusy={busyDel === `e-${row.event.id}`}
              />
            ) : null
          )
        )}
        {googleConnected && googleMerged.length === 0 && grouped.personal.length > 0 ? (
          <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>
            Sin eventos ni recordatorios Google en este periodo.
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function AgendaSharedList({
  filtered,
  pendingInvites = [],
  onSaveComplete,
  calendarFeed,
  googleTasksFeed,
  agendaLoading,
  onGoogleTaskSetDue,
  hideBeforeToday = true,
  onDeleteOrvitaTask,
  onDeleteCalendarEvent,
  onDeleteGoogleTask,
  onAcceptAssignment,
}: {
  filtered: UiAgendaTask[]
  /** Asignaciones de otros pendientes de aceptar (fuera de la cronología hasta aceptar). */
  pendingInvites?: UiAgendaTask[]
  onSaveComplete: (task: UiAgendaTask, completed: boolean) => Promise<void> | void
  /** Vista lista: mezcla eventos de Google Calendar en la misma cronología. */
  calendarFeed?: Pick<GoogleCalendarFeedState, "events" | "loading" | "connected" | "error">
  /** Recordatorios Google Tasks (misma ventana que el panel lateral). */
  googleTasksFeed?: Pick<GoogleTasksFeedState, "tasks" | "loading" | "connected" | "error">
  /** Evita parpadeo vacío mientras aún no hay datos de Órvita. */
  agendaLoading?: boolean
  onGoogleTaskSetDue?: (taskId: string, dueYmd: string) => Promise<void>
  hideBeforeToday?: boolean
  onDeleteOrvitaTask?: (task: UiAgendaTask) => Promise<void> | void
  onDeleteCalendarEvent?: (eventId: string) => Promise<void> | void
  onDeleteGoogleTask?: (taskId: string) => Promise<void> | void
  onAcceptAssignment?: (task: UiAgendaTask) => Promise<void> | void
}) {
  const [busyDel, setBusyDel] = useState<string | null>(null)

  const googleReminders = useMemo(
    () => (googleTasksFeed?.connected ? googleTasksForTimelineMerge(googleTasksFeed.tasks) : []),
    [googleTasksFeed?.connected, googleTasksFeed?.tasks]
  )

  const merged = useMemo(
    () =>
      buildMergedTimeline(
        filtered,
        calendarFeed,
        googleReminders,
        googleTasksFeed?.connected,
        hideBeforeToday
      ),
    [
      filtered,
      calendarFeed?.events,
      calendarFeed?.connected,
      googleReminders,
      googleTasksFeed?.connected,
      hideBeforeToday,
    ]
  )

  const googleErrored = Boolean(calendarFeed?.error || googleTasksFeed?.error)
  const waitingGoogle =
    filtered.length === 0 &&
    (Boolean(calendarFeed?.connected) || Boolean(googleTasksFeed?.connected)) &&
    (Boolean(calendarFeed?.loading) || Boolean(googleTasksFeed?.loading))

  const feedsLoading =
    merged.length === 0 &&
    pendingInvites.length === 0 &&
    !googleErrored &&
    (Boolean(agendaLoading && filtered.length === 0) || waitingGoogle)

  return (
    <div
      className={`${agendaViewStackClass} min-h-[min(280px,42dvh)]`}
      aria-label="Cronología unificada: Órvita y Google (Tasks con fecha en orden de vencimiento; sin fecha al final)"
    >
      {merged.length === 0 && pendingInvites.length === 0 ? (
        <div
          role={feedsLoading ? "status" : undefined}
          aria-live={feedsLoading ? "polite" : undefined}
          className={
            feedsLoading
              ? "m-0 flex min-h-[5.5rem] items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-6 text-center text-[12px] text-[var(--color-text-secondary)] sm:text-[13px]"
              : "m-0 flex min-h-[5.5rem] items-center justify-center rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-8 text-center text-[12px] leading-snug text-[var(--color-text-secondary)] sm:text-[13px]"
          }
        >
          <p className="m-0">
            {feedsLoading
              ? "Cargando agenda (Órvita, Calendar y Tasks)…"
              : googleErrored
                ? "No se pudo cargar Google (revisa conexión o vuelve a conectar la cuenta). Los datos de Órvita siguen abajo si aplican."
                : calendarFeed && !calendarFeed.connected
                  ? "Nada que mostrar con estos filtros. Conecta Google en Configuración para mezclar Calendar y recordatorios de Tasks aquí."
                  : hideBeforeToday
                    ? "Nada de hoy en adelante con estos filtros. Activa «Ver fechas anteriores» para mostrar días pasados."
                    : "Nada que mostrar con estos filtros (Órvita + Google Tasks y Calendar sincronizados)."}
          </p>
        </div>
      ) : null}
      {pendingInvites.length > 0 ? (
        <div className="flex flex-col gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3 sm:p-4">
          <p className={`m-0 ${agendaSectionTitleClass}`}>Pendientes de aceptar</p>
          <p className="m-0 text-[11px] leading-snug text-[var(--color-text-secondary)] sm:text-[12px]">
            Te asignaron estas tareas desde tu hogar. Al aceptarlas pasan a tu tablero y cronología.
          </p>
          <div className="flex flex-col gap-2">
            {pendingInvites.map((task) => (
              <AgendaOrvitaTaskCard
                key={`p-${task.id}`}
                task={task}
                variant="list"
                onAcceptAssignment={onAcceptAssignment}
              />
            ))}
          </div>
        </div>
      ) : null}
      {merged.map((row) =>
        row.kind === "task" ? (
          <AgendaOrvitaTaskCard
            key={`t-${row.task.id}`}
            task={row.task}
            variant="list"
            onSaveComplete={onSaveComplete}
            onAcceptAssignment={onAcceptAssignment}
            onDelete={
              onDeleteOrvitaTask
                ? async (t) => {
                    if (!confirm(`¿Eliminar “${t.title}” del tablero Órvita?`)) return
                    setBusyDel(`o-${t.id}`)
                    try {
                      await onDeleteOrvitaTask(t)
                    } finally {
                      setBusyDel(null)
                    }
                  }
                : undefined
            }
            deleteBusy={busyDel === `o-${row.task.id}`}
          />
        ) : row.kind === "reminder" ? (
          <AgendaReadonlyUnifiedCard
            key={`r-${row.reminder.id}`}
            variant="list"
            borderLeft={`4px solid ${AGENDA_COLOR.reminder}`}
            title={row.reminder.title || "(Sin título)"}
            TimelineIcon={Bell}
            timelineText={venceLine(localDateKeyFromIso(row.reminder.due) ?? "")}
            googleKind="reminder"
            kindPillLabel="Recordatorio"
            fuente={reminderFuenteLabel()}
            footNote={
              googleTaskNeedsDue(row.reminder)
                ? "Sin fecha en Google Tasks: no se agrupa en calendario. Añade vencimiento abajo o en Google."
                : onDeleteGoogleTask
                  ? undefined
                  : "Solo lectura en Órvita · edita en Google Tasks"
            }
            footer={
              onGoogleTaskSetDue && googleTaskNeedsDue(row.reminder) ? (
                <GoogleTaskDueSetter taskId={row.reminder.id} patchDue={onGoogleTaskSetDue} />
              ) : undefined
            }
            badgeLetter="GT"
            badgeColorVar={AGENDA_COLOR.reminder}
            editUrl={GOOGLE_TASKS_WEB_APP}
            editTitle="Editar en Google Tasks"
            onDelete={
              onDeleteGoogleTask
                ? async () => {
                    if (!confirm("¿Eliminar esta tarea/recordatorio en Google Tasks?")) return
                    setBusyDel(`r-${row.reminder.id}`)
                    try {
                      await onDeleteGoogleTask(row.reminder.id)
                    } finally {
                      setBusyDel(null)
                    }
                  }
                : undefined
            }
            deleteBusy={busyDel === `r-${row.reminder.id}`}
          />
        ) : (
          <AgendaReadonlyUnifiedCard
            key={`e-${row.event.id}`}
            variant="list"
            borderLeft={`4px solid ${AGENDA_COLOR.calendar}`}
            title={row.event.summary || "(Sin título)"}
            TimelineIcon={Calendar}
            timelineText={calendarEventUnifiedTimeline(row.event)}
            googleKind="calendar"
            kindPillLabel={calendarEventFuenteLabel(row.event)}
            statusLabel="Calendario"
            fuente={calendarEventFuenteLabel(row.event)}
            footNote={
              onDeleteCalendarEvent ? undefined : "Solo lectura en Órvita · edita en Google Calendar"
            }
            badgeLetter="GC"
            badgeColorVar={AGENDA_COLOR.calendar}
            editUrl={GOOGLE_CALENDAR_WEB_APP}
            editTitle="Editar en Google Calendar"
            onDelete={
              onDeleteCalendarEvent
                ? async () => {
                    if (!confirm("¿Eliminar este evento en Google Calendar?")) return
                    setBusyDel(`e-${row.event.id}`)
                    try {
                      await onDeleteCalendarEvent(row.event.id)
                    } finally {
                      setBusyDel(null)
                    }
                  }
                : undefined
            }
            deleteBusy={busyDel === `e-${row.event.id}`}
          />
        )
      )}
    </div>
  )
}

export function AgendaSharedWeek({
  weekDays,
  weekMap,
  totalWeeklyTasks,
  totalWeeklyCompleted,
  totalWeeklyPending,
  totalWeeklyMinutes,
  formatDateKey,
  formatDayLabel,
  googleByDay,
}: {
  weekDays: Date[]
  weekMap: Record<string, UiAgendaTask[]>
  totalWeeklyTasks: number
  totalWeeklyCompleted: number
  totalWeeklyPending: number
  totalWeeklyMinutes: number
  formatDateKey: (d: Date) => string
  formatDayLabel: (d: Date) => string
  googleByDay?: Record<string, GoogleDayBucket>
}) {
  return (
    <div className={agendaSectionStackClass} aria-label="Semana: Órvita y Google por día">
      <Card className={agendaCardPadClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <p className={agendaOverlineClass}>Semana operativa</p>
            <p className={agendaSectionTitleClass}>Órvita + eventos y recordatorios Google por día</p>
          </div>
          <div className={agendaMetaRowClass}>
            <span>Total tareas: {totalWeeklyTasks}</span>
            <span>Completadas: {totalWeeklyCompleted}</span>
            <span>Pendientes: {totalWeeklyPending}</span>
            <span>Horas totales: {(totalWeeklyMinutes / 60).toFixed(1)}h</span>
          </div>
        </div>
      </Card>
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-2.5 xl:gap-3">
        {weekDays.map((day) => {
          const key = formatDateKey(day)
          const isToday = key === formatDateKey(new Date())
          const dayTasks = weekMap[key] || []
          const g = googleByDay?.[key]
          const gCount = countGoogleDayItems(g)
          return (
            <Card
              key={key}
              className="min-h-0 min-w-0 w-full p-3 lg:flex-1 lg:min-w-0"
              style={{
                borderColor: isToday ? "color-mix(in srgb, var(--agenda-personal) 45%, var(--color-border))" : "var(--color-border)",
                background: isToday ? "color-mix(in srgb, var(--agenda-personal) 8%, var(--color-surface))" : "var(--color-surface)",
              }}
            >
              <div className="flex min-h-0 flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="grid min-w-0 gap-0.5">
                    <span className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)] sm:text-[11px]">
                      {formatDayLabel(day)}
                    </span>
                    <span className="text-[10px] text-[var(--color-text-secondary)] sm:text-[11px]">
                      {dayTasks.length} Órvita{gCount > 0 ? ` · ${gCount} Google` : ""}
                    </span>
                  </div>
                  {isToday && (
                    <span className="shrink-0 text-[10px] font-semibold uppercase text-[var(--agenda-personal)]">Hoy</span>
                  )}
                </div>
                <div className="flex max-h-[min(52dvh,28rem)] min-h-0 flex-col gap-1.5 overflow-y-auto pr-0.5 lg:max-h-[min(58dvh,36rem)] lg:gap-1.5">
                  {dayTasks.map((task) => (
                    <AgendaOrvitaMiniCard key={task.id} task={task} />
                  ))}
                  {(g?.events ?? []).map((ev) => (
                    <AgendaReadonlyUnifiedCard
                      key={`gcal-${ev.id}`}
                      variant="compact"
                      embedded
                      borderLeft={`4px solid ${AGENDA_COLOR.calendar}`}
                      title={ev.summary || "(Evento)"}
                      TimelineIcon={Calendar}
                      timelineText={calendarEventUnifiedTimeline(ev)}
                      googleKind="calendar"
                      kindPillLabel={calendarEventFuenteLabel(ev)}
                      statusLabel="Calendario"
                      fuente={calendarEventFuenteLabel(ev)}
                      badgeLetter="GC"
                      badgeColorVar={AGENDA_COLOR.calendar}
                      editUrl={GOOGLE_CALENDAR_WEB_APP}
                      editTitle="Editar en Google Calendar"
                    />
                  ))}
                  {(g?.reminders ?? []).map((r) => (
                    <AgendaReadonlyUnifiedCard
                      key={`gt-${r.id}`}
                      variant="compact"
                      embedded
                      borderLeft={`4px solid ${AGENDA_COLOR.reminder}`}
                      title={r.title || "(Recordatorio)"}
                      TimelineIcon={Bell}
                      timelineText={venceLine(localDateKeyFromIso(r.due) ?? "")}
                      googleKind="reminder"
                      kindPillLabel="Recordatorio"
                      fuente={reminderFuenteLabel()}
                      badgeLetter="GT"
                      badgeColorVar={AGENDA_COLOR.reminder}
                      editUrl={GOOGLE_TASKS_WEB_APP}
                      editTitle="Editar en Google Tasks"
                    />
                  ))}
                  {dayTasks.length === 0 && gCount === 0 && (
                    <p className="m-0 text-[10px] text-[var(--color-text-secondary)]">Sin ítems</p>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export function AgendaSharedMonth({
  monthGrid,
  monthLabel,
  monthSummary,
  tasks,
  selectedDay,
  onSelectDay,
  dayDetails,
  formatDateKey,
  googleByDay,
  onPrevMonth,
  onNextMonth,
  onGoThisMonth,
}: {
  monthGrid: { date: Date | null; key: string }[]
  monthLabel: string
  monthSummary: { total: number; completed: number; hours: number }
  tasks: UiAgendaTask[]
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
  dayDetails: UiAgendaTask[]
  formatDateKey: (d: Date) => string
  googleByDay?: Record<string, GoogleDayBucket>
  onPrevMonth?: () => void
  onNextMonth?: () => void
  onGoThisMonth?: () => void
}) {
  const selectedGoogle = selectedDay ? googleByDay?.[selectedDay] : undefined
  const selectedGoogleCount = countGoogleDayItems(selectedGoogle)

  return (
    <div
      className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-[var(--layout-gap)]"
      aria-label="Mes: Órvita y Google por día"
    >
      <Card className={agendaCardPadClass}>
        <div className="grid gap-3 sm:gap-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
            <div className="min-w-0">
              <p className={agendaOverlineClass}>{monthLabel}</p>
              <p className={agendaSectionTitleClass}>Órvita + Google</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {onPrevMonth && onNextMonth ? (
                <div
                  className="flex items-center gap-0.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-0.5"
                  role="group"
                  aria-label="Cambiar mes"
                >
                  <button
                    type="button"
                    onClick={onPrevMonth}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
                    aria-label="Mes anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {onGoThisMonth ? (
                    <button
                      type="button"
                      onClick={onGoThisMonth}
                      className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                    >
                      Este mes
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={onNextMonth}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]"
                    aria-label="Mes siguiente"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              <span className="text-[10px] text-[var(--color-text-secondary)] sm:text-[11px]">Vista mensual</span>
            </div>
          </div>
          <div className="grid min-w-0 grid-cols-7 gap-1 sm:gap-2">
            {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
              <span
                key={d}
                className="truncate text-center text-[8px] font-medium uppercase tracking-[0.08em] text-[var(--color-text-secondary)] sm:text-[10px] sm:tracking-[0.12em]"
              >
                {d}
              </span>
            ))}
            {monthGrid.map((cell) => {
              const day = cell.date
              const dayKey = day != null ? formatDateKey(day) : ""
              const tasksForDay = day != null ? tasks.filter((t) => t.due === dayKey) : []
              const g = day != null ? googleByDay?.[dayKey] : undefined
              const gCount = countGoogleDayItems(g)
              const dayTotal = tasksForDay.length + gCount
              const isSelected = day != null && selectedDay === dayKey
              const markers = monthDayTypeMarkers(tasksForDay)
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    if (day != null) onSelectDay(dayKey)
                  }}
                  className={`touch-manipulation min-h-[48px] rounded-lg border border-[var(--color-border)] p-1 text-left sm:min-h-[56px] sm:rounded-xl sm:p-1.5 md:min-h-[62px] md:p-2 ${
                    cell.date ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
                  }`}
                  style={{
                    background: isSelected ? "var(--color-surface)" : "var(--color-surface-alt)",
                    boxShadow: isSelected ? "0 8px 18px rgba(15,23,42,0.08)" : "none",
                  }}
                  disabled={!cell.date}
                >
                  <div className="flex items-center justify-between gap-0.5 text-[10px] sm:text-[11px]">
                    <span className="tabular-nums font-medium">{cell.date ? cell.date.getDate() : ""}</span>
                    {dayTotal > 0 && (
                      <span className="shrink-0 text-[9px] text-[var(--color-text-secondary)] sm:text-[10px]">{dayTotal}</span>
                    )}
                  </div>
                  {(markers.length > 0 || (g?.events.length ?? 0) > 0 || (g?.reminders.length ?? 0) > 0) && (
                    <div className="mt-1 flex flex-wrap items-center gap-0.5 sm:mt-1.5 sm:gap-[3px]">
                      {markers.map((tp) => (
                        <span
                          key={tp}
                          title={tp}
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "999px",
                            background: taskTypeAccentVar(tp),
                          }}
                        />
                      ))}
                      {(g?.events.length ?? 0) > 0 && (
                        <span
                          title="Google Calendar"
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "999px",
                            background: AGENDA_COLOR.calendar,
                          }}
                        />
                      )}
                      {(g?.reminders.length ?? 0) > 0 && (
                        <span
                          title="Recordatorio Tasks"
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "999px",
                            background: AGENDA_COLOR.reminder,
                          }}
                        />
                      )}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </Card>
      <Card className={agendaCardPadClass}>
        <div className="grid gap-3 sm:gap-3">
          <div>
            <p className={agendaOverlineClass}>Resumen del mes</p>
            <p className="m-0 mt-1.5 text-[16px] font-semibold sm:text-[18px]">{monthSummary.total} tareas activas</p>
          </div>
          <div className="grid gap-1.5 text-[11px] text-[var(--color-text-secondary)] sm:gap-2 sm:text-[12px]">
            <span>Completadas: {monthSummary.completed}</span>
            <span>Pendientes: {monthSummary.total - monthSummary.completed}</span>
            <span>Horas estimadas: {monthSummary.hours}h</span>
          </div>
          <div className="h-1.5 rounded-full bg-[var(--color-border)] sm:h-1.5">
            <div
              className="h-full rounded-full bg-[var(--agenda-assigned)]"
              style={{
                width: monthSummary.total ? `${Math.round((monthSummary.completed / monthSummary.total) * 100)}%` : "0%",
              }}
            />
          </div>
          <div className="mt-1 min-w-0 sm:mt-0">
            <p className="m-0 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-secondary)] sm:text-[11px]">
              Detalle del día
            </p>
            {selectedDay ? (
              <div className="mt-2 grid max-h-[min(50dvh,28rem)] gap-2 overflow-y-auto pr-0.5 sm:mt-2 sm:gap-2">
                {dayDetails.length === 0 && selectedGoogleCount === 0 && (
                  <p className="m-0 text-[11px] text-[var(--color-text-secondary)] sm:text-[12px]">Sin ítems este día</p>
                )}
                {dayDetails.map((task) => (
                  <AgendaOrvitaMiniCard key={task.id} task={task} />
                ))}
                {(selectedGoogle?.events ?? []).map((ev) => (
                  <AgendaReadonlyUnifiedCard
                    key={`m-cal-${ev.id}`}
                    variant="compact"
                    embedded
                    borderLeft={`4px solid ${AGENDA_COLOR.calendar}`}
                    title={ev.summary || "(Evento)"}
                    TimelineIcon={Calendar}
                    timelineText={calendarEventUnifiedTimeline(ev)}
                    googleKind="calendar"
                    kindPillLabel={calendarEventFuenteLabel(ev)}
                    statusLabel="Calendario"
                    fuente={calendarEventFuenteLabel(ev)}
                    badgeLetter="GC"
                    badgeColorVar={AGENDA_COLOR.calendar}
                    editUrl={GOOGLE_CALENDAR_WEB_APP}
                    editTitle="Editar en Google Calendar"
                  />
                ))}
                {(selectedGoogle?.reminders ?? []).map((r) => (
                  <AgendaReadonlyUnifiedCard
                    key={`m-gt-${r.id}`}
                    variant="compact"
                    embedded
                    borderLeft={`4px solid ${AGENDA_COLOR.reminder}`}
                    title={r.title || "(Recordatorio)"}
                    TimelineIcon={Bell}
                    timelineText={venceLine(localDateKeyFromIso(r.due) ?? "")}
                    googleKind="reminder"
                    kindPillLabel="Recordatorio"
                    fuente={reminderFuenteLabel()}
                    badgeLetter="GT"
                    badgeColorVar={AGENDA_COLOR.reminder}
                    editUrl={GOOGLE_TASKS_WEB_APP}
                    editTitle="Editar en Google Tasks"
                  />
                ))}
              </div>
            ) : (
              <p className="m-0 mt-1.5 text-[11px] text-[var(--color-text-secondary)] sm:text-[12px]">
                Selecciona un día para ver detalle.
              </p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
