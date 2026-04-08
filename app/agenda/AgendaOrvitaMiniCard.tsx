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
import { taskCardMiniGridStyle } from "@/app/agenda/taskCardConfig"
import { TaskCardArea } from "@/app/agenda/TaskCardArea"
import { useTaskCardDesign } from "@/app/agenda/TaskCardDesignContext"
import { useTaskCardIterationMode } from "@/app/agenda/TaskCardIterationContext"

type Props = {
  task: UiAgendaTask
  iterationMode?: boolean
}

/** Misma jerarquía que la tarjeta completa; semana/mes (sin acciones). Tokens = vista compacta. */
export function AgendaOrvitaMiniCard({ task, iterationMode: iterationProp }: Props) {
  const fromCtx = useTaskCardIterationMode()
  const iterationMode = iterationProp ?? fromCtx
  const { getMergedVarStyle, getResolvedGridTemplate } = useTaskCardDesign()
  const varStyle = getMergedVarStyle("compact")
  const gridStyle = taskCardMiniGridStyle(getResolvedGridTemplate("mini"))

  const statusKey = task.status.toLowerCase()
  const assignShort = assignmentShortLine(task)

  return (
    <div
      className="overflow-hidden"
      style={{
        ...varStyle,
        ...gridStyle,
        borderRadius: "var(--task-card-radius)",
        border: "1px solid var(--task-card-border-color, var(--color-border))",
        borderLeft: taskLeftBorder(task.type, 4),
        background: "var(--task-card-surface-bg, var(--color-surface-alt))",
        fontFamily: "var(--task-card-font-family, inherit)",
        minHeight: "var(--task-card-min-height, unset)",
      }}
    >
      <TaskCardArea area="title" iterationMode={iterationMode}>
        <p
          className="m-0 tracking-tight"
          style={{
            fontSize: "var(--task-card-title-size)",
            lineHeight: "var(--task-card-line-title)",
            fontWeight: "var(--task-card-font-weight-title, 600)",
            color: "var(--task-card-title-color, var(--color-text-primary))",
          }}
        >
          {task.title}
        </p>
      </TaskCardArea>

      <TaskCardArea area="meta" iterationMode={iterationMode}>
        <p
          className="m-0 flex items-center gap-1"
          style={{
            fontSize: "var(--task-card-meta-size)",
            lineHeight: "var(--task-card-line-body)",
            color: "var(--task-card-meta-color, var(--color-text-secondary))",
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
