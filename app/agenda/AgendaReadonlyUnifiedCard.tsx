"use client"

import type { LucideIcon } from "lucide-react"
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
      </div>
      {showBadge ? (
        <div
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
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
