"use client"

import { useEffect, useState } from "react"
import { Check, Clock, Trash2 } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"
import { assignmentShortLine } from "@/app/agenda/mapAgendaTaskToUi"
import { TaskSourceBadge } from "@/app/agenda/TaskSourceBadge"
import {
  agendaCardSurfaceStyle,
  agendaPillBaseClass,
  priorityPillStyle,
  statusPillStyle,
} from "@/app/agenda/agendaUnifiedCardStyles"
import { formatPriorityTitle, formatStatusTitle, venceLine } from "@/app/agenda/taskCardFormat"
import { taskLeftBorder } from "@/app/agenda/taskTypeVisual"
import {
  TASK_CARD_GRID,
  taskCardGridStyle,
  type TaskCardDensity,
} from "@/app/agenda/taskCardConfig"
import { TaskCardArea } from "@/app/agenda/TaskCardArea"
import { useTaskCardDesign } from "@/app/agenda/TaskCardDesignContext"
import { useTaskCardIterationMode } from "@/app/agenda/TaskCardIterationContext"

type Props = {
  task: UiAgendaTask
  variant: "list" | "kanban"
  /** Estudio: fuerza el preset de tokens (si no, se deriva del variant). */
  designDensity?: TaskCardDensity
  /** Modo iteración: bordes por área (también `?taskCardDev=1` vía provider). */
  iterationMode?: boolean
  onSaveComplete?: (task: UiAgendaTask, completed: boolean) => Promise<void> | void
  onDelete?: (task: UiAgendaTask) => Promise<void> | void
  deleteBusy?: boolean
  onAcceptAssignment?: (task: UiAgendaTask) => Promise<void> | void
}

export function AgendaOrvitaTaskCard({
  task,
  variant,
  designDensity,
  iterationMode: iterationProp,
  onSaveComplete,
  onDelete,
  deleteBusy,
  onAcceptAssignment,
}: Props) {
  const fromCtx = useTaskCardIterationMode()
  const iterationMode = iterationProp ?? fromCtx
  const { getMergedVarStyle, getResolvedGridTemplate } = useTaskCardDesign()

  const density: TaskCardDensity =
    designDensity ?? (variant === "list" ? "list" : "kanban")
  const varStyle = getMergedVarStyle(density)
  const hasActions = Boolean(onSaveComplete || onDelete)
  const gridStyle = hasActions
    ? taskCardGridStyle(getResolvedGridTemplate("orvita"))
    : ({
        display: "grid",
        gridTemplateColumns: "minmax(0,1fr)",
        gridTemplateAreas: '"title" "meta" "pills" "assign" "footer"',
        gap: "var(--task-card-gap)",
        padding: "var(--task-card-pad)",
      } as const)

  const [done, setDone] = useState(task.completed)
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [accepting, setAccepting] = useState(false)

  useEffect(() => {
    setDone(task.completed)
    setDirty(false)
  }, [task.id, task.completed])

  const durationVenceLine = `${task.duration} min | ${venceLine(task.due)}`
  const statusTitle = formatStatusTitle(task.status)
  const statusKey = task.status.toLowerCase()
  const assignShort = assignmentShortLine(task)
  const showAssignRow =
    task.assigneePendingAccept ||
    task.assigneeAccepted ||
    (task.needsAcceptance && onAcceptAssignment)

  async function handleGuardar() {
    if (!onSaveComplete || !dirty) return
    setSaving(true)
    try {
      await onSaveComplete(task, done)
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete || deleting || deleteBusy) return
    setDeleting(true)
    try {
      await onDelete(task)
    } finally {
      setDeleting(false)
    }
  }

  async function handleAcceptAssignment() {
    if (!onAcceptAssignment || accepting) return
    setAccepting(true)
    try {
      await onAcceptAssignment(task)
    } finally {
      setAccepting(false)
    }
  }

  return (
    <Card
      hover
      className="p-0 overflow-hidden"
      style={{ ...agendaCardSurfaceStyle(taskLeftBorder(task.type, 4)), ...varStyle }}
    >
      <div style={gridStyle}>
        <TaskCardArea area="title" iterationMode={iterationMode} className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-1">
          <p
            className="m-0 min-w-0 flex-1 font-semibold tracking-tight text-[var(--color-text-primary)]"
            style={{
              fontSize: "var(--task-card-title-size)",
              lineHeight: "var(--task-card-line-title)",
            }}
          >
            {task.title}
          </p>
          <TaskSourceBadge type={task.type} />
        </TaskCardArea>

        <TaskCardArea area="meta" iterationMode={iterationMode}>
          <p
            className="m-0 flex items-center gap-1 text-[var(--color-text-secondary)]"
            style={{
              fontSize: "var(--task-card-meta-size)",
              lineHeight: "var(--task-card-line-body)",
            }}
          >
            <Clock className="h-3 w-3 shrink-0 opacity-70" strokeWidth={2} aria-hidden />
            <span>{durationVenceLine}</span>
          </p>
        </TaskCardArea>

        <TaskCardArea area="pills" iterationMode={iterationMode}>
          <div
            className="flex flex-wrap items-center"
            style={{ gap: "var(--task-card-gap-tight)" }}
          >
            <span
              className={agendaPillBaseClass}
              style={{
                ...priorityPillStyle(task.priority),
                fontSize: "var(--task-card-pill-size)",
              }}
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
              {statusTitle}
            </span>
          </div>
        </TaskCardArea>

        <TaskCardArea area="assign" iterationMode={iterationMode}>
          {showAssignRow ? (
            <div
              className="flex flex-wrap items-center"
              style={{ gap: "var(--task-card-gap-tight)" }}
            >
              {task.assigneePendingAccept ? (
                <span
                  className={agendaPillBaseClass}
                  style={{
                    fontSize: "var(--task-card-pill-size)",
                    background: "color-mix(in srgb, var(--color-accent-warning) 18%, transparent)",
                    color: "var(--color-accent-warning)",
                  }}
                >
                  Pendiente de aceptación
                </span>
              ) : null}
              {task.assigneeAccepted ? (
                <span
                  className={agendaPillBaseClass}
                  style={{
                    fontSize: "var(--task-card-pill-size)",
                    background: "color-mix(in srgb, var(--color-accent-health) 18%, transparent)",
                    color: "var(--color-accent-health)",
                  }}
                >
                  Aceptada
                </span>
              ) : null}
              {task.needsAcceptance && onAcceptAssignment ? (
                <button
                  type="button"
                  disabled={accepting}
                  onClick={() => void handleAcceptAssignment()}
                  className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-px font-semibold uppercase tracking-[0.08em] text-[var(--color-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-accent-primary)_12%,var(--color-surface-alt))] disabled:opacity-50"
                  style={{ fontSize: "var(--task-card-action-size)" }}
                >
                  {accepting ? "Aceptando…" : "Aceptar"}
                </button>
              ) : null}
            </div>
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

        {hasActions ? (
          <TaskCardArea
            area="actions"
            iterationMode={iterationMode}
            className="flex shrink-0 flex-col items-end gap-2 self-start pt-0.5"
          >
            <div className="flex items-center gap-2">
              {onDelete ? (
                <button
                  type="button"
                  disabled={deleting || Boolean(deleteBusy)}
                  onClick={() => void handleDelete()}
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-transparent text-[var(--color-text-secondary)] opacity-45 transition-[opacity,color,background-color] hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_10%,transparent)] hover:opacity-100 hover:text-[var(--color-accent-danger)] disabled:opacity-25"
                  aria-label="Eliminar tarea"
                  title="Eliminar"
                >
                  <Trash2 className="h-2.5 w-2.5" strokeWidth={1.5} aria-hidden />
                </button>
              ) : null}
              {onSaveComplete ? (
                <>
                  <button
                    type="button"
                    disabled={!dirty || saving}
                    onClick={() => void handleGuardar()}
                    className="min-w-0 border-0 bg-transparent p-0 font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)] underline decoration-[var(--color-border)] underline-offset-2 transition-colors hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
                    style={{ fontSize: "var(--task-card-action-size)" }}
                  >
                    {saving ? "Guardando…" : "Guardar"}
                  </button>
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={done}
                    aria-label={done ? "Marcar como pendiente" : "Marcar como realizada"}
                    onClick={() => {
                      setDone((v) => !v)
                      setDirty(true)
                    }}
                    className="flex shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-border)] text-[var(--agenda-assigned)] transition-colors hover:border-[var(--agenda-assigned)]"
                    style={{
                      width: "var(--task-card-check-size)",
                      height: "var(--task-card-check-size)",
                      ...(done
                        ? {
                            borderColor: "var(--agenda-assigned)",
                            background:
                              "color-mix(in srgb, var(--agenda-assigned) 22%, transparent)",
                          }
                        : {}),
                    }}
                  >
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden /> : null}
                  </button>
                </>
              ) : null}
            </div>
          </TaskCardArea>
        ) : null}
      </div>
    </Card>
  )
}

// === MODO ITERACIÓN ============================================================
// Cambia variables en app/agenda/taskCardConfig.ts (DENSITY_VARS / BASE_VARS) y guarda.
// Activa overlays: añade ?taskCardDev=1 a la URL de /agenda o pasa iterationMode al provider.
//
// Ejemplo (tokens que puedes duplicar en :root si prefieres CSS global):
//   --task-card-pad: 10px;
//   --task-card-gap: 6px;
//   --task-card-title-size: 13px;
//   --task-card-meta-size: 10px;
//   --task-card-fuente-size: 9px;
//   --task-card-radius: 12px;
//
// Reordenar bloques: edita TASK_CARD_GRID.orvita en taskCardConfig.ts (grid-template-areas).
// ===============================================================================
