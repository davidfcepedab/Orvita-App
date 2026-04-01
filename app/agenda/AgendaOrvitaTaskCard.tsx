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
import {
  formatPriorityTitle,
  formatStatusTitle,
  venceLine,
} from "@/app/agenda/taskCardFormat"
import { taskLeftBorder } from "@/app/agenda/taskTypeVisual"

type Props = {
  task: UiAgendaTask
  variant: "list" | "kanban"
  /** Guarda el estado «realizada» al pulsar Guardar (debe resolver cuando el servidor confirme). */
  onSaveComplete?: (task: UiAgendaTask, completed: boolean) => Promise<void> | void
  onDelete?: (task: UiAgendaTask) => Promise<void> | void
  deleteBusy?: boolean
  /** Solo tareas recibidas pendientes de aceptación. */
  onAcceptAssignment?: (task: UiAgendaTask) => Promise<void> | void
}

export function AgendaOrvitaTaskCard({
  task,
  variant,
  onSaveComplete,
  onDelete,
  deleteBusy,
  onAcceptAssignment,
}: Props) {
  const isList = variant === "list"
  const titleCls = isList ? "text-[14px]" : "text-[13px]"
  const lineCls = isList ? "text-[11px]" : "text-[10px]"
  const fuenteCls = isList ? "text-[10px]" : "text-[9px]"

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
      style={agendaCardSurfaceStyle(taskLeftBorder(task.type, 4))}
    >
      <div
        className={`flex items-start gap-3 text-left ${isList ? "p-3" : "p-2.5"}`}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex min-w-0 flex-wrap items-start gap-2">
            <p
              className={`m-0 min-w-0 flex-1 font-semibold leading-snug tracking-tight text-[var(--color-text-primary)] ${titleCls}`}
            >
              {task.title}
            </p>
            <TaskSourceBadge type={task.type} />
          </div>

          <p
            className={`m-0 flex items-center gap-1 leading-snug text-[var(--color-text-secondary)] ${lineCls}`}
          >
            <Clock
              className="h-3 w-3 shrink-0 opacity-70"
              strokeWidth={2}
              aria-hidden
            />
            <span>{durationVenceLine}</span>
          </p>

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span
              className={agendaPillBaseClass}
              style={priorityPillStyle(task.priority)}
              title="Prioridad (etiqueta de color)"
            >
              {formatPriorityTitle(task.priority)}
            </span>
            <span className="text-[var(--color-text-secondary)] text-[10px]" aria-hidden>
              |
            </span>
            <span
              className={agendaPillBaseClass}
              style={statusPillStyle(statusKey)}
              title="Estado (etiqueta de color)"
            >
              {statusTitle}
            </span>
          </div>

          {(task.assigneePendingAccept ||
            task.assigneeAccepted ||
            (task.needsAcceptance && onAcceptAssignment)) && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              {task.assigneePendingAccept ? (
                <span
                  className={agendaPillBaseClass}
                  style={{
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
                  className="inline-flex items-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-accent-primary)_12%,var(--color-surface-alt))] disabled:opacity-50"
                >
                  {accepting ? "Aceptando…" : "Aceptar"}
                </button>
              ) : null}
            </div>
          )}

          <p className={`m-0 text-[var(--color-text-secondary)] ${fuenteCls}`}>
            Fuente: {task.orvitaFuente}
          </p>

          {assignShort ? (
            <p className={`m-0 text-[var(--color-text-secondary)] ${fuenteCls}`}>{assignShort}</p>
          ) : null}
        </div>

        {onSaveComplete || onDelete ? (
          <div className="flex shrink-0 items-center gap-2 self-start pt-0.5">
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
                  className="min-w-0 border-0 bg-transparent p-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)] underline decoration-[var(--color-border)] underline-offset-2 transition-colors hover:text-[var(--color-text-primary)] disabled:cursor-not-allowed disabled:no-underline disabled:opacity-40"
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
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-border)] text-[var(--agenda-assigned)] transition-colors hover:border-[var(--agenda-assigned)]"
                  style={
                    done
                      ? {
                          borderColor: "var(--agenda-assigned)",
                          background:
                            "color-mix(in srgb, var(--agenda-assigned) 22%, transparent)",
                        }
                      : undefined
                  }
                >
                  {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden /> : null}
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  )
}
