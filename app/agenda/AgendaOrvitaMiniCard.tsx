"use client"

import { Clock } from "lucide-react"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"
import { assignmentShortLine } from "@/app/agenda/mapAgendaTaskToUi"
import {
  agendaPillBaseClass,
  priorityPillStyle,
  statusPillStyle,
} from "@/app/agenda/agendaUnifiedCardStyles"
import { formatPriorityTitle, formatStatusTitle, venceLine } from "@/app/agenda/taskCardFormat"
import { taskLeftBorder } from "@/app/agenda/taskTypeVisual"

type Props = { task: UiAgendaTask }

/** Misma jerarquía que la tarjeta de tarea Órvita completa; semana/mes (sin acciones). */
export function AgendaOrvitaMiniCard({ task }: Props) {
  const statusKey = task.status.toLowerCase()
  const assignShort = assignmentShortLine(task)
  return (
    <div
      className="space-y-1 overflow-hidden rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-2"
      style={{ borderLeft: taskLeftBorder(task.type, 4) }}
    >
      <p className="m-0 text-[11px] font-semibold leading-snug tracking-tight text-[var(--color-text-primary)]">
        {task.title}
      </p>
      <p className="m-0 flex items-center gap-1 text-[10px] leading-snug text-[var(--color-text-secondary)]">
        <Clock className="h-2.5 w-2.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
        <span>{`${task.duration} min | ${venceLine(task.due)}`}</span>
      </p>
      <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5">
        <span
          className={agendaPillBaseClass}
          style={priorityPillStyle(task.priority)}
          title="Prioridad (etiqueta de color)"
        >
          {formatPriorityTitle(task.priority)}
        </span>
        <span className="text-[9px] text-[var(--color-text-secondary)]" aria-hidden>
          |
        </span>
        <span
          className={agendaPillBaseClass}
          style={statusPillStyle(statusKey)}
          title="Estado (etiqueta de color)"
        >
          {formatStatusTitle(task.status)}
        </span>
      </div>
      {task.assignmentCaption ? (
        <p className="m-0 text-[10px] text-[var(--color-text-primary)]">{task.assignmentCaption}</p>
      ) : null}
      <p className="m-0 text-[9px] text-[var(--color-text-secondary)]">Fuente: {task.orvitaFuente}</p>
      {assignShort ? (
        <p className="m-0 text-[9px] text-[var(--color-text-secondary)]">{assignShort}</p>
      ) : null}
    </div>
  )
}
