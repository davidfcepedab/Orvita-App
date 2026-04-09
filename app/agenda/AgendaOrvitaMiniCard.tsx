"use client"

import { Clock } from "lucide-react"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"
import {
  agendaPillBaseClass,
  priorityPillStyle,
  statusPillStyle,
} from "@/app/agenda/agendaUnifiedCardStyles"
import { agendaCardChrome } from "@/app/agenda/agendaUnifiedCardStyles"
import { dueMetaCompact, formatPriorityTitle, formatStatusTitle } from "@/app/agenda/taskCardFormat"
import { orvitaAgendaCardShell } from "@/app/agenda/agendaCardChrome"
import { taskCardMiniGridStyle } from "@/app/agenda/taskCardConfig"
import { TaskCardArea } from "@/app/agenda/TaskCardArea"
import { useTaskCardDesign } from "@/app/agenda/TaskCardDesignContext"
import { useTaskCardIterationMode } from "@/app/agenda/TaskCardIterationContext"

type Props = {
  task: UiAgendaTask
  viewerUserId?: string | null
  iterationMode?: boolean
}

/** Vista compacta (semana/mes): misma jerarquía que la tarjeta completa, sin acciones. */
export function AgendaOrvitaMiniCard({
  task,
  viewerUserId = null,
  iterationMode: iterationProp,
}: Props) {
  const fromCtx = useTaskCardIterationMode()
  const iterationMode = iterationProp ?? fromCtx
  const { getMergedVarStyle, getResolvedGridTemplate } = useTaskCardDesign()
  const varStyle = getMergedVarStyle("compact")
  const gridStyle = taskCardMiniGridStyle(getResolvedGridTemplate("mini"))
  const shell = orvitaAgendaCardShell(task, { viewerUserId })
  const statusKey = task.status.toLowerCase()

  return (
    <div
      className="overflow-hidden"
      style={{
        ...agendaCardChrome,
        ...varStyle,
        ...gridStyle,
        ...shell,
        borderRadius: "var(--task-card-radius)",
        border: "1px solid var(--task-card-border-color, var(--color-border))",
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
          <span>{dueMetaCompact(task.due)}</span>
        </p>
      </TaskCardArea>

      <TaskCardArea area="pills" iterationMode={iterationMode}>
        <div className="flex flex-wrap items-center" style={{ gap: "var(--task-card-gap-tight)" }}>
          <span
            className={agendaPillBaseClass}
            style={{ ...priorityPillStyle(task.priority), fontSize: "var(--task-card-pill-size)" }}
            title="Prioridad"
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
            title="Estado"
          >
            {formatStatusTitle(task.status)}
          </span>
        </div>
      </TaskCardArea>

      {task.assigneeContact ? (
        <TaskCardArea area="extra" iterationMode={iterationMode}>
          <p
            className="m-0 truncate text-[var(--color-text-secondary)]"
            style={{
              fontSize: "var(--task-card-meta-size)",
              lineHeight: "var(--task-card-line-body)",
              opacity: 0.92,
            }}
          >
            {task.assigneeContact}
          </p>
        </TaskCardArea>
      ) : null}
    </div>
  )
}
