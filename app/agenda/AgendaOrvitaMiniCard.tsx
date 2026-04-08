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
import { TASK_CARD_GRID, taskCardDensityVars, taskCardMiniGridStyle } from "@/app/agenda/taskCardConfig"
import { TaskCardArea } from "@/app/agenda/TaskCardArea"
import { useTaskCardIterationMode } from "@/app/agenda/TaskCardIterationContext"

type Props = {
  task: UiAgendaTask
  iterationMode?: boolean
}

/** Misma jerarquía que la tarjeta completa; semana/mes (sin acciones). Tokens = vista compacta. */
export function AgendaOrvitaMiniCard({ task, iterationMode: iterationProp }: Props) {
  const fromCtx = useTaskCardIterationMode()
  const iterationMode = iterationProp ?? fromCtx
  const varStyle = taskCardDensityVars("compact")
  const gridStyle = taskCardMiniGridStyle(TASK_CARD_GRID.mini)

  const statusKey = task.status.toLowerCase()
  const assignShort = assignmentShortLine(task)

  return (
    <div
      className="overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface-alt)]"
      style={{
        ...varStyle,
        ...gridStyle,
        borderRadius: "var(--task-card-radius)",
        borderLeft: taskLeftBorder(task.type, 4),
      }}
    >
      <TaskCardArea area="title" iterationMode={iterationMode}>
        <p
          className="m-0 font-semibold tracking-tight text-[var(--color-text-primary)]"
          style={{
            fontSize: "var(--task-card-title-size)",
            lineHeight: "var(--task-card-line-title)",
          }}
        >
          {task.title}
        </p>
      </TaskCardArea>

      <TaskCardArea area="meta" iterationMode={iterationMode}>
        <p
          className="m-0 flex items-center gap-1 text-[var(--color-text-secondary)]"
          style={{
            fontSize: "var(--task-card-meta-size)",
            lineHeight: "var(--task-card-line-body)",
          }}
        >
          <Clock className="h-2.5 w-2.5 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
          <span>{`${task.duration} min | ${venceLine(task.due)}`}</span>
        </p>
      </TaskCardArea>

      <TaskCardArea area="pills" iterationMode={iterationMode}>
        <div className="flex flex-wrap items-center" style={{ gap: "var(--task-card-gap-tight)" }}>
          <span
            className={agendaPillBaseClass}
            style={{ ...priorityPillStyle(task.priority), fontSize: "var(--task-card-pill-size)" }}
            title="Prioridad (etiqueta de color)"
          >
            {formatPriorityTitle(task.priority)}
          </span>
          <span
            className="text-[var(--color-text-secondary)]"
            style={{ fontSize: "var(--task-card-pill-size)" }}
            aria-hidden
          >
            |
          </span>
          <span
            className={agendaPillBaseClass}
            style={{ ...statusPillStyle(statusKey), fontSize: "var(--task-card-pill-size)" }}
            title="Estado (etiqueta de color)"
          >
            {formatStatusTitle(task.status)}
          </span>
        </div>
      </TaskCardArea>

      <TaskCardArea area="extra" iterationMode={iterationMode}>
        {task.assignmentCaption ? (
          <p
            className="m-0 text-[var(--color-text-primary)]"
            style={{
              fontSize: "var(--task-card-meta-size)",
              lineHeight: "var(--task-card-line-body)",
            }}
          >
            {task.assignmentCaption}
          </p>
        ) : null}
      </TaskCardArea>

      <TaskCardArea area="footer" iterationMode={iterationMode}>
        <p
          className="m-0 text-[var(--color-text-secondary)]"
          style={{
            fontSize: "var(--task-card-fuente-size)",
            lineHeight: "var(--task-card-line-body)",
          }}
        >
          Fuente: {task.orvitaFuente}
        </p>
        {assignShort ? (
          <p
            className="m-0 text-[var(--color-text-secondary)]"
            style={{
              fontSize: "var(--task-card-fuente-size)",
              lineHeight: "var(--task-card-line-body)",
            }}
          >
            {assignShort}
          </p>
        ) : null}
      </TaskCardArea>
    </div>
  )
}
