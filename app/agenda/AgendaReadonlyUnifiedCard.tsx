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

type Variant = "list" | "kanban" | "compact"

type Props = {
  variant: Variant
  /** Borde izquierdo completo, ej. `4px solid var(--agenda-reminder)` */
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
  /** Sin `Card`: para rejillas semana/mes */
  embedded?: boolean
  /** Acciones bajo la nota (p. ej. asignar fecha a Google Task) */
  footer?: ReactNode
  /** Elimina en Google (Calendar o Tasks) */
  onDelete?: () => void | Promise<void>
  deleteBusy?: boolean
  /** Abre Google en nueva pestaña para editar el ítem */
  editUrl?: string
  editTitle?: string
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
}: Props) {
  const pad = variant === "list" ? "p-3" : variant === "kanban" ? "p-2.5" : "p-2"
  const titleCls =
    variant === "list" ? "text-[14px]" : variant === "kanban" ? "text-[13px]" : "text-[11px]"
  const lineCls =
    variant === "list" ? "text-[11px]" : variant === "kanban" ? "text-[10px]" : "text-[10px]"
  const fuenteCls =
    variant === "list" ? "text-[10px]" : variant === "kanban" ? "text-[9px]" : "text-[9px]"
  const iconPx = variant === "compact" ? 10 : 12
  const sepCls = variant === "compact" ? "text-[9px]" : "text-[10px]"
  const showBadge = variant !== "compact"

  async function handleDeleteClick() {
    if (!onDelete || deleteBusy) return
    await onDelete()
  }

  const inner = (
    <div className={`flex items-start gap-2 text-left ${pad}`}>
      <div className="min-w-0 flex-1 space-y-1">
        <p
          className={`m-0 font-semibold leading-snug tracking-tight text-[var(--color-text-primary)] ${titleCls}`}
        >
          {title}
        </p>
        <p
          className={`m-0 flex items-center gap-1 leading-snug text-[var(--color-text-secondary)] ${lineCls}`}
        >
          <TimelineIcon
            className="shrink-0 opacity-70"
            width={iconPx}
            height={iconPx}
            strokeWidth={2}
            aria-hidden
          />
          <span>{timelineText}</span>
        </p>
        <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
          <span
            className={agendaPillBaseClass}
            style={googleSourcePillStyle(googleKind)}
            title="Tipo (Google)"
          >
            {kindPillLabel}
          </span>
          <span className={`text-[var(--color-text-secondary)] ${sepCls}`} aria-hidden>
            |
          </span>
          <span
            className={agendaPillBaseClass}
            style={statusPillStyle(statusLabel.toLowerCase())}
            title="Estado"
          >
            {statusLabel}
          </span>
        </div>
        <p className={`m-0 text-[var(--color-text-secondary)] ${fuenteCls}`}>Fuente: {fuente}</p>
        {footNote ? (
          <p className={`m-0 text-[var(--color-text-secondary)] ${fuenteCls}`}>{footNote}</p>
        ) : null}
        {footer ? <div className={`mt-1.5 ${fuenteCls}`}>{footer}</div> : null}
      </div>
      <div className="mt-0.5 flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
        {editUrl ? (
          <button
            type="button"
            onClick={() => window.open(editUrl, "_blank", "noopener,noreferrer")}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] font-semibold text-[var(--color-text-primary)] shadow-sm transition hover:bg-[color-mix(in_srgb,var(--color-surface-alt)_85%,var(--color-text-secondary))] ${
              variant === "list" ? "px-3 py-2 text-[12px]" : "px-2.5 py-1.5 text-[11px]"
            }`}
            aria-label={editTitle}
            title={editTitle}
          >
            <Pencil className={variant === "list" ? "h-3.5 w-3.5" : "h-3 w-3"} strokeWidth={2} aria-hidden />
            Editar
          </button>
        ) : null}
        <div className="flex items-center justify-end gap-1">
          {onDelete ? (
            <button
              type="button"
              disabled={deleteBusy}
              onClick={() => void handleDeleteClick()}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-transparent text-[var(--color-text-secondary)] opacity-45 transition-[opacity,color,background-color] hover:bg-[color-mix(in_srgb,var(--color-text-secondary)_10%,transparent)] hover:opacity-100 hover:text-[var(--color-accent-danger)] disabled:opacity-25"
              aria-label="Eliminar"
              title="Eliminar"
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
      </div>
    </div>
  )

  if (embedded) {
    return (
      <div
        className="overflow-hidden rounded-[12px] border border-[var(--color-border)] bg-[var(--color-surface-alt)]"
        style={{ borderLeft }}
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
