"use client"

import type { LucideIcon } from "lucide-react"
import { Check, Pencil, Trash2 } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import type { AgendaCardShell } from "@/app/agenda/agendaCardChrome"
import { agendaCardChrome } from "@/app/agenda/agendaUnifiedCardStyles"
import {
  agendaPillBaseClass,
  googleSourcePillStyle,
  priorityPillStyle,
  statusPillStyle,
} from "@/app/agenda/agendaUnifiedCardStyles"
import { formatPriorityTitle } from "@/app/agenda/taskCardFormat"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"
import { useTaskCardDesign } from "@/app/agenda/TaskCardDesignContext"
import type { TaskCardDensity } from "@/app/agenda/taskCardConfig"

type Variant = "list" | "kanban" | "compact"

function variantToDensity(v: Variant): TaskCardDensity {
  if (v === "compact") return "compact"
  if (v === "list") return "list"
  return "kanban"
}

const moveBtnClass =
  "rounded-full bg-[color-mix(in_srgb,var(--color-accent-primary)_10%,transparent)] px-1.5 py-0 text-[9px] font-medium tracking-tight text-[var(--color-text-secondary)] transition-colors hover:bg-[color-mix(in_srgb,var(--color-accent-primary)_16%,transparent)] hover:text-[var(--color-text-primary)]"

const topActionBtnClass =
  "inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--color-text-secondary)] transition-[opacity,color,background-color] hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_8%,transparent)]"

type Props = {
  variant: Variant
  embedded?: boolean
  shell: AgendaCardShell
  MetaIcon: LucideIcon
  metaText: string
  title: string
  googleKind: "reminder" | "calendar"
  kindPillLabel: string
  statusLabel: string
  statusKey: string
  /** Prioridad local (Google Tasks); si es null, no se muestra píldora extra. */
  priorityUi?: UiAgendaTask["priority"] | null
  assigneeSubtle?: string | null
  onEdit?: () => void
  /** Recordatorio Google: alternar completado en API. */
  onToggleGoogleComplete?: () => void
  googleCompleteBusy?: boolean
  /** Evento Calendar: hecho solo en sesión. */
  calendarUiDone?: boolean
  onToggleCalendarUiDone?: () => void
  showMoveDue?: boolean
  onMoveTomorrow?: () => void
  onMoveAfterTomorrow?: () => void
  moveDueBusy?: boolean
  onDelete?: () => void | Promise<void>
  deleteBusy?: boolean
  /** Insignia GT/GC (desactivada por defecto para una tarjeta más limpia). */
  showCornerBadge?: boolean
  badgeLetter?: string
  badgeColorVar?: string
}

export function AgendaReadonlyUnifiedCard({
  variant,
  embedded = false,
  shell,
  MetaIcon,
  metaText,
  title,
  googleKind,
  kindPillLabel,
  statusLabel,
  statusKey,
  priorityUi = null,
  assigneeSubtle = null,
  onEdit,
  onToggleGoogleComplete,
  googleCompleteBusy = false,
  calendarUiDone = false,
  onToggleCalendarUiDone,
  showMoveDue = false,
  onMoveTomorrow,
  onMoveAfterTomorrow,
  moveDueBusy = false,
  onDelete,
  deleteBusy = false,
  showCornerBadge = false,
  badgeLetter = "",
  badgeColorVar = "var(--color-text-secondary)",
}: Props) {
  const { getMergedVarStyle } = useTaskCardDesign()
  const density = variantToDensity(variant)
  const varStyle = getMergedVarStyle(density)
  const iconCls = variant === "compact" ? "h-2.5 w-2.5" : "h-3 w-3"
  const titleClass =
    variant === "compact"
      ? "text-[11px] font-semibold leading-snug"
      : variant === "list"
        ? "text-[14px] font-semibold leading-snug sm:text-[15px]"
        : "text-[13px] font-semibold leading-snug sm:text-[14px]"

  const showComplete =
    googleKind === "reminder" && Boolean(onToggleGoogleComplete)
  const showCalToggle = googleKind === "calendar" && Boolean(onToggleCalendarUiDone)
  const showRightChrome =
    showComplete || showCalToggle || (showCornerBadge && variant !== "compact")
  const doneVisual =
    googleKind === "reminder"
      ? statusKey.includes("complet")
      : calendarUiDone

  async function handleDeleteClick() {
    if (!onDelete || deleteBusy) return
    await onDelete()
  }

  const inner = (
    <div
      className="flex flex-col gap-1.5 px-3 py-2 sm:gap-2 sm:px-3 sm:py-2.5"
      style={{ ...varStyle, fontFamily: "var(--task-card-font-family, inherit)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="m-0 flex min-w-0 flex-1 items-center gap-1 text-[9px] leading-tight text-[var(--color-text-secondary)] sm:text-[10px]">
          <MetaIcon className={`${iconCls} shrink-0 opacity-55`} strokeWidth={2} aria-hidden />
          <span className="truncate">{metaText}</span>
        </p>
        {onDelete || onEdit ? (
          <div className="flex shrink-0 items-center gap-0.5">
            {onDelete ? (
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => void handleDeleteClick()}
                className={`${topActionBtnClass} opacity-45 hover:opacity-100 hover:text-[var(--color-accent-danger)] disabled:opacity-25`}
                aria-label={
                  googleKind === "calendar"
                    ? "Eliminar evento también en Google Calendar"
                    : "Eliminar tarea o recordatorio también en Google Tasks"
                }
                title={deleteBusy ? "Eliminando…" : "Eliminar"}
              >
                <Trash2 className="h-2.5 w-2.5" strokeWidth={2} aria-hidden />
              </button>
            ) : null}
            {onEdit ? (
              <button
                type="button"
                className={`${topActionBtnClass} opacity-55 hover:opacity-100 hover:text-[var(--color-text-primary)]`}
                aria-label="Editar"
                title="Editar"
                onClick={onEdit}
              >
                <Pencil className="h-3 w-3" strokeWidth={1.75} aria-hidden />
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      {showRightChrome ? (
        <div className="flex items-center justify-between gap-2">
          <p
            className={`m-0 min-w-0 flex-1 tracking-tight text-[var(--color-text-primary)] ${titleClass}`}
          >
            {title}
          </p>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {showComplete ? (
              <button
                type="button"
                role="checkbox"
                aria-checked={doneVisual}
                disabled={googleCompleteBusy}
                aria-label={doneVisual ? "Marcar como pendiente" : "Marcar como realizada"}
                onClick={() => onToggleGoogleComplete?.()}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-border)] text-[var(--agenda-reminder)] transition-[transform,background-color,border-color] duration-300 hover:border-[var(--agenda-reminder)] disabled:opacity-45"
                style={
                  doneVisual
                    ? {
                        borderColor: "color-mix(in srgb, #4ade80 70%, var(--color-border))",
                        background: "color-mix(in srgb, #86efac 55%, transparent)",
                      }
                    : undefined
                }
              >
                {doneVisual ? (
                  <Check className="h-3.5 w-3.5 animate-agenda-check-pop text-[#15803d]" strokeWidth={2.75} aria-hidden />
                ) : null}
              </button>
            ) : null}
            {showCalToggle ? (
              <button
                type="button"
                role="checkbox"
                aria-checked={calendarUiDone}
                aria-label={calendarUiDone ? "Quitar marca de visto" : "Marcar como visto"}
                onClick={() => onToggleCalendarUiDone?.()}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[var(--color-border)] text-[var(--agenda-calendar)] transition-[transform,background-color,border-color] duration-300 hover:border-[var(--agenda-calendar)]"
                style={
                  calendarUiDone
                    ? {
                        borderColor: "color-mix(in srgb, #4ade80 70%, var(--color-border))",
                        background: "color-mix(in srgb, #86efac 55%, transparent)",
                      }
                    : undefined
                }
              >
                {calendarUiDone ? (
                  <Check className="h-3.5 w-3.5 animate-agenda-check-pop text-[#15803d]" strokeWidth={2.75} aria-hidden />
                ) : null}
              </button>
            ) : null}
            {showCornerBadge && variant !== "compact" ? (
              <div
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[8px] font-bold text-white"
                style={{
                  background: `color-mix(in srgb, ${badgeColorVar} 78%, #0f172a)`,
                  boxShadow: `0 0 0 2px color-mix(in srgb, ${badgeColorVar} 28%, transparent)`,
                }}
                aria-hidden
              >
                {badgeLetter}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <p className={`m-0 min-w-0 tracking-tight text-[var(--color-text-primary)] ${titleClass}`}>{title}</p>
      )}

      <div className="flex flex-wrap items-center gap-1">
        <span
          className={agendaPillBaseClass}
          style={{
            ...googleSourcePillStyle(googleKind),
            fontSize: "var(--task-card-pill-size, 9px)",
          }}
        >
          {kindPillLabel}
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
          {statusLabel}
        </span>
        {priorityUi ? (
          <>
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
                ...priorityPillStyle(priorityUi),
                fontSize: "var(--task-card-pill-size, 9px)",
              }}
            >
              {formatPriorityTitle(priorityUi)}
            </span>
          </>
        ) : null}
      </div>

      {showMoveDue && (onMoveTomorrow || onMoveAfterTomorrow) ? (
        <div className="flex flex-wrap items-center gap-1">
          {onMoveTomorrow ? (
            <button
              type="button"
              disabled={moveDueBusy}
              className={moveBtnClass}
              onClick={() => onMoveTomorrow()}
            >
              Mañana
            </button>
          ) : null}
          {onMoveAfterTomorrow ? (
            <button
              type="button"
              disabled={moveDueBusy}
              className={moveBtnClass}
              onClick={() => onMoveAfterTomorrow()}
            >
              Pasado mañana
            </button>
          ) : null}
        </div>
      ) : null}

      {assigneeSubtle ? (
        <p className="m-0 truncate text-[9px] leading-snug text-[var(--color-text-secondary)] opacity-90 sm:text-[10px]">
          {assigneeSubtle}
        </p>
      ) : null}
    </div>
  )

  const shellStyle = {
    ...agendaCardChrome,
    background: shell.background,
    borderRadius: "var(--task-card-radius, var(--radius-card))",
    fontFamily: "var(--task-card-font-family, inherit)",
    minHeight: "var(--task-card-min-height, unset)",
  } as const

  const chromeBorderVar = "var(--task-card-border-color, var(--color-border))"
  const thinEdge = "var(--task-card-chrome-border, 0.5px solid var(--color-border))"
  const embeddedEdge = `1px solid ${chromeBorderVar}`
  const frameEmbedded = {
    borderTop: embeddedEdge,
    borderRight: embeddedEdge,
    borderBottom: embeddedEdge,
    borderLeft: shell.borderLeft,
  } as const
  const frameCard = {
    borderTop: thinEdge,
    borderRight: thinEdge,
    borderBottom: thinEdge,
    borderLeft: shell.borderLeft,
  } as const

  if (embedded) {
    return (
      <div
        className="overflow-hidden transition-[background-color] duration-500 ease-out"
        style={{
          ...shellStyle,
          ...frameEmbedded,
        }}
      >
        {inner}
      </div>
    )
  }

  return (
    <Card
      hover
      className="p-0 overflow-hidden transition-[background-color,box-shadow] duration-500 ease-out"
      style={{
        ...shellStyle,
        ...frameCard,
      }}
    >
      {inner}
    </Card>
  )
}
