"use client"

import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Pencil, Trash2 } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import {
  agendaCardSurfaceStyle,
  agendaPillBaseClass,
  googleSourcePillStyle,
  statusPillStyle,
} from "@/app/agenda/agendaUnifiedCardStyles"
import { taskCardGridStyle, type TaskCardDensity } from "@/app/agenda/taskCardConfig"
import { TaskCardArea } from "@/app/agenda/TaskCardArea"
import { useTaskCardDesign } from "@/app/agenda/TaskCardDesignContext"
import { useTaskCardIterationMode } from "@/app/agenda/TaskCardIterationContext"

type Variant = "list" | "kanban" | "compact"

type Props = {
  variant: Variant
  borderLeft: string
  title: string
  TimelineIcon: LucideIcon
  timelineText: string
  googleKind: "reminder" | "calendar"
  kindPillLabel: string
  statusLabel?: string
  fuente: string
  footNote?: string
  badgeLetter: string
  badgeColorVar: string
  embedded?: boolean
  footer?: ReactNode
  onDelete?: () => void | Promise<void>
  deleteBusy?: boolean
  editUrl?: string
  editTitle?: string
  iterationMode?: boolean
}

function variantToDensity(v: Variant): TaskCardDensity {
  if (v === "compact") return "compact"
  if (v === "list") return "list"
  return "kanban"
}

export function AgendaReadonlyUnifiedCard({
  variant,
  borderLeft,
  title,
  TimelineIcon,
  timelineText,
  googleKind,
  kindPillLabel,
  statusLabel = "Pendiente",
  fuente,
  footNote,
  badgeLetter,
  badgeColorVar,
  embedded = false,
  footer,
  onDelete,
  deleteBusy = false,
  editUrl,
  editTitle = "Editar en Google",
  iterationMode: iterationProp,
}: Props) {
  const fromCtx = useTaskCardIterationMode()
  const iterationMode = iterationProp ?? fromCtx
  const { getMergedVarStyle, getResolvedGridTemplate } = useTaskCardDesign()

  const density = variantToDensity(variant)
  const varStyle = getMergedVarStyle(density)
  const gridStyle = taskCardGridStyle(getResolvedGridTemplate("readonly"))
  const showBadge = variant !== "compact"
  const iconCls = variant === "compact" ? "h-2.5 w-2.5" : "h-3 w-3"

  async function handleDeleteClick() {
    if (!onDelete || deleteBusy) return
    await onDelete()
  }

  const inner = (
    <div style={{ ...varStyle, ...gridStyle }}>
      <TaskCardArea area="title" iterationMode={iterationMode}>
        <p
          className="m-0 font-semibold tracking-tight text-[var(--color-text-primary)]"
          style={{
            fontSize: "var(--task-card-title-size)",
            lineHeight: "var(--task-card-line-title)",
          }}
        >
          {title}
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
          <TimelineIcon className={`${iconCls} shrink-0 opacity-70`} strokeWidth={2} aria-hidden />
          <span>{timelineText}</span>
        </p>
      </TaskCardArea>

      <TaskCardArea area="pills" iterationMode={iterationMode}>
        <div className="flex flex-wrap items-center" style={{ gap: "var(--task-card-gap-tight)" }}>
          <span
            className={agendaPillBaseClass}
            style={{ ...googleSourcePillStyle(googleKind), fontSize: "var(--task-card-pill-size)" }}
            title="Tipo (Google)"
          >
            {kindPillLabel}
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
            style={{ ...statusPillStyle(statusLabel.toLowerCase()), fontSize: "var(--task-card-pill-size)" }}
            title="Estado"
          >
            {statusLabel}
          </span>
        </div>
      </TaskCardArea>

      <TaskCardArea area="fuente" iterationMode={iterationMode}>
        <p
          className="m-0 text-[var(--color-text-secondary)]"
          style={{
            fontSize: "var(--task-card-fuente-size)",
            lineHeight: "var(--task-card-line-body)",
          }}
        >
          Fuente: {fuente}
        </p>
      </TaskCardArea>

      <TaskCardArea area="footer" iterationMode={iterationMode}>
        {footNote ? (
          <p
            className="m-0 text-[var(--color-text-secondary)]"
            style={{
              fontSize: "var(--task-card-fuente-size)",
              lineHeight: "var(--task-card-line-body)",
            }}
          >
            {footNote}
          </p>
        ) : null}
        {footer ? (
          <div style={{ marginTop: footNote ? "var(--task-card-gap-tight)" : 0 }}>{footer}</div>
        ) : null}
      </TaskCardArea>

      <TaskCardArea
        area="actions"
        iterationMode={iterationMode}
        className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end"
      >
        {editUrl ? (
          <button
            type="button"
            onClick={() => window.open(editUrl, "_blank", "noopener,noreferrer")}
            className="group inline-flex max-w-full items-center gap-1 rounded-md border-0 bg-transparent font-normal text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color-mix(in_srgb,var(--color-text-secondary)_35%,transparent)]"
            style={{ fontSize: "var(--task-card-meta-size)" }}
            aria-label={editTitle}
            title={editTitle}
          >
            <Pencil
              className={`shrink-0 opacity-45 transition-opacity group-hover:opacity-80 ${variant === "list" ? "h-3 w-3" : "h-2.5 w-2.5"}`}
              strokeWidth={1.75}
              aria-hidden
            />
            <span className="underline-offset-2 group-hover:underline">Editar</span>
          </button>
        ) : null}
        <div className="flex items-center justify-end gap-1">
          {onDelete ? (
            <button
              type="button"
              disabled={deleteBusy}
              onClick={() => void handleDeleteClick()}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-transparent text-[var(--color-text-secondary)] opacity-45 transition-[opacity,color,background-color] hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_10%,transparent)] hover:opacity-100 hover:text-[var(--color-accent-danger)] disabled:opacity-25"
              aria-label={
                googleKind === "calendar"
                  ? "Eliminar evento también en Google Calendar"
                  : "Eliminar tarea o recordatorio también en Google Tasks"
              }
              title={
                deleteBusy
                  ? "Eliminando…"
                  : googleKind === "calendar"
                    ? "Eliminar también en Google Calendar"
                    : "Eliminar también en Google Tasks"
              }
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden />
            </button>
          ) : null}
          {showBadge ? (
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
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
      </TaskCardArea>
    </div>
  )

  if (embedded) {
    return (
      <div
        className="overflow-hidden"
        style={{
          overflow: "hidden",
          borderRadius: "var(--task-card-radius)",
          border: "1px solid var(--color-border)",
          background: "var(--color-surface-alt)",
          borderLeft,
        }}
      >
        {inner}
      </div>
    )
  }

  return (
    <Card hover className="p-0 overflow-hidden" style={agendaCardSurfaceStyle(borderLeft)}>
      {inner}
    </Card>
  )
}
