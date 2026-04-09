"use client"

import { useEffect, useState } from "react"
import { Check, Clock, Pencil, Trash2 } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"
import {
  agendaCardChrome,
  agendaPillBaseClass,
  priorityPillStyle,
  statusPillStyle,
} from "@/app/agenda/agendaUnifiedCardStyles"
import { dueMetaCompact, formatPriorityTitle, formatStatusTitle } from "@/app/agenda/taskCardFormat"
import { orvitaAgendaCardShell } from "@/app/agenda/agendaCardChrome"
import { addDaysToYmd, isYmdTodayLocal } from "@/lib/agenda/agendaDueShift"
import type { HouseholdMemberDTO } from "@/lib/household/memberTypes"
import type { AgendaTaskPriority } from "@/app/hooks/useAgendaTasks"
import { useTaskCardDesign } from "@/app/agenda/TaskCardDesignContext"
import type { TaskCardDensity } from "@/app/agenda/taskCardConfig"

const moveBtnClass =
  "rounded-full bg-[color-mix(in_srgb,var(--color-accent-primary)_10%,transparent)] px-2 py-0.5 text-[10px] font-medium tracking-tight text-[var(--color-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-accent-primary)_16%,transparent)] hover:text-[var(--color-text-primary)]"

type Props = {
  task: UiAgendaTask
  variant: "list" | "kanban"
  /** Estudio: fuerza el preset de tokens. */
  designDensity?: TaskCardDensity
  viewerUserId?: string | null
  onOpenEdit?: (task: UiAgendaTask) => void
  onSaveComplete?: (task: UiAgendaTask, completed: boolean) => Promise<void> | void
  onDelete?: (task: UiAgendaTask) => Promise<void> | void
  deleteBusy?: boolean
  onAcceptAssignment?: (task: UiAgendaTask) => Promise<void> | void
  householdMembers?: HouseholdMemberDTO[]
  onPatchOrvita?: (
    taskId: string,
    patch: Partial<{
      dueDate: string | null
      assigneeId: string | null
      assigneeName: string | null
      priority: AgendaTaskPriority
    }>,
  ) => Promise<void> | void
}

export function AgendaOrvitaTaskCard({
  task,
  variant,
  designDensity,
  viewerUserId = null,
  onOpenEdit,
  onSaveComplete,
  onDelete,
  deleteBusy,
  onAcceptAssignment,
  householdMembers = [],
  onPatchOrvita,
}: Props) {
  const { getMergedVarStyle } = useTaskCardDesign()
  const density: TaskCardDensity =
    designDensity ?? (variant === "list" ? "list" : "kanban")
  const varStyle = getMergedVarStyle(density)

  const [done, setDone] = useState(task.completed)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [checkPop, setCheckPop] = useState(false)

  useEffect(() => {
    setDone(task.completed)
  }, [task.id, task.completed])

  const effective: UiAgendaTask = { ...task, completed: done }
  const shell = orvitaAgendaCardShell(effective, { viewerUserId })
  const statusKey = task.status.toLowerCase()
  const statusTitle = formatStatusTitle(task.status)
  const showAssignRow =
    task.assigneePendingAccept ||
    task.assigneeAccepted ||
    (task.needsAcceptance && onAcceptAssignment)
  const canEditModal = Boolean(onOpenEdit && onPatchOrvita)
  const dueYmd = task.due?.slice(0, 10) ?? ""
  const showShiftDue =
    !done && Boolean(dueYmd) && isYmdTodayLocal(dueYmd) && Boolean(onPatchOrvita)

  async function toggleComplete() {
    if (!onSaveComplete) return
    const next = !done
    setDone(next)
    if (next) setCheckPop(true)
    setSaving(true)
    try {
      await onSaveComplete(task, next)
    } catch {
      setDone(!next)
      setCheckPop(false)
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

  const titleClass =
    variant === "list"
      ? "text-[16px] font-semibold leading-snug sm:text-[17px]"
      : "text-[15px] font-semibold leading-snug sm:text-[16px]"

  return (
    <Card
      hover
      className="p-0 overflow-hidden transition-[background-color,box-shadow] duration-500 ease-out"
      style={{
        ...agendaCardChrome,
        ...varStyle,
        ...shell,
        borderRadius: "var(--task-card-radius, var(--radius-card))",
        border: "var(--task-card-chrome-border, 0.5px solid var(--color-border))",
        fontFamily: "var(--task-card-font-family, inherit)",
        minHeight: "var(--task-card-min-height, unset)",
      }}
    >
      <div className="flex flex-col gap-2 px-4 py-3 sm:gap-2.5 sm:px-4 sm:py-3.5">
        <div className="flex items-center gap-2">
          <p className="m-0 flex min-w-0 flex-1 items-center gap-1 text-[10px] leading-tight text-[var(--color-text-secondary)]">
            <Clock className="h-3 w-3 shrink-0 opacity-55" strokeWidth={2} aria-hidden />
            <span className="truncate">{dueMetaCompact(task.due)}</span>
          </p>
        </div>

        {onSaveComplete ? (
          <div className="flex items-center justify-between gap-3">
            <p
              className={`m-0 min-w-0 flex-1 tracking-tight text-[var(--color-text-primary)] ${titleClass}`}
            >
              {task.title}
            </p>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <button
                type="button"
                role="checkbox"
                aria-checked={done}
                disabled={saving}
                aria-label={done ? "Marcar como pendiente" : "Marcar como realizada"}
                onClick={() => void toggleComplete()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-border)] text-[var(--agenda-assigned)] transition-[transform,background-color,border-color] duration-300 hover:border-[var(--agenda-assigned)] disabled:opacity-45"
                style={
                  done
                    ? {
                        borderColor: "color-mix(in srgb, #4ade80 70%, var(--color-border))",
                        background: "color-mix(in srgb, #86efac 55%, transparent)",
                      }
                    : undefined
                }
              >
                {done ? (
                  <Check
                    className={`h-4 w-4 text-[#15803d] ${checkPop ? "animate-agenda-check-pop" : ""}`}
                    strokeWidth={2.75}
                    aria-hidden
                    onAnimationEnd={() => setCheckPop(false)}
                  />
                ) : null}
              </button>
            </div>
          </div>
        ) : (
          <p className={`m-0 min-w-0 tracking-tight text-[var(--color-text-primary)] ${titleClass}`}>{task.title}</p>
        )}

        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className={agendaPillBaseClass}
            style={{
              ...priorityPillStyle(task.priority),
              fontSize: "var(--task-card-pill-size, 9px)",
            }}
          >
            {formatPriorityTitle(task.priority)}
          </span>
          <span
            className="text-[var(--color-text-secondary)]"
            style={{ fontSize: "var(--task-card-pill-size, 9px)" }}
            aria-hidden
          >
            |
          </span>
          <span
            className={agendaPillBaseClass}
            style={{
              ...statusPillStyle(statusKey),
              fontSize: "var(--task-card-pill-size, 9px)",
            }}
          >
            {statusTitle}
          </span>
        </div>

        {showShiftDue ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className={moveBtnClass}
              onClick={() =>
                void onPatchOrvita?.(task.id, { dueDate: addDaysToYmd(dueYmd, 1) })
              }
            >
              Mañana
            </button>
            <button
              type="button"
              className={moveBtnClass}
              onClick={() =>
                void onPatchOrvita?.(task.id, { dueDate: addDaysToYmd(dueYmd, 2) })
              }
            >
              Pasado mañana
            </button>
          </div>
        ) : null}

        {task.assigneeContact ? (
          <p className="m-0 truncate text-[10px] leading-snug text-[var(--color-text-secondary)] opacity-90">
            {task.assigneeContact}
          </p>
        ) : null}

        {onDelete || canEditModal ? (
          <div className="flex items-center justify-start gap-2">
            {onDelete ? (
              <button
                type="button"
                disabled={deleting || Boolean(deleteBusy)}
                onClick={() => void handleDelete()}
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--color-text-secondary)] opacity-40 transition-[opacity,color,background-color] hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_8%,transparent)] hover:opacity-100 hover:text-[var(--color-accent-danger)] disabled:opacity-25"
                aria-label="Eliminar tarea"
                title="Eliminar"
              >
                <Trash2 className="h-3 w-3" strokeWidth={1.5} aria-hidden />
              </button>
            ) : null}
            {canEditModal ? (
              <button
                type="button"
                className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md p-0 text-[var(--color-text-secondary)] opacity-50 transition-[opacity,color,background-color] hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_8%,transparent)] hover:opacity-100 hover:text-[var(--color-text-primary)]"
                aria-label="Editar tarea"
                title="Editar"
                onClick={() => onOpenEdit?.(task)}
              >
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}

        {showAssignRow ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {task.assigneePendingAccept ? (
              <span
                className={agendaPillBaseClass}
                style={{
                  fontSize: "var(--task-card-pill-size, 9px)",
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
                  fontSize: "var(--task-card-pill-size, 9px)",
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
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--color-text-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-accent-primary)_12%,var(--color-surface-alt))] disabled:opacity-50"
              >
                {accepting ? "Aceptando…" : "Aceptar"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  )
}
