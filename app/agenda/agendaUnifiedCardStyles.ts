import type { CSSProperties } from "react"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"

export const agendaCardChrome: CSSProperties = {
  borderRadius: "16px",
  boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
}

export function agendaCardSurfaceStyle(borderLeft: string): CSSProperties {
  return { ...agendaCardChrome, borderLeft }
}

export function priorityPillStyle(p: UiAgendaTask["priority"]): CSSProperties {
  if (p === "alta") {
    return {
      background:
        "var(--task-card-priority-alta-bg, color-mix(in srgb, var(--color-accent-danger) 16%, transparent))",
      color: "var(--task-card-priority-alta-fg, var(--color-accent-danger))",
    }
  }
  if (p === "media") {
    return {
      background:
        "var(--task-card-priority-media-bg, color-mix(in srgb, var(--color-accent-warning) 16%, transparent))",
      color: "var(--task-card-priority-media-fg, var(--color-accent-warning))",
    }
  }
  return {
    background:
      "var(--task-card-priority-baja-bg, color-mix(in srgb, var(--color-border) 40%, transparent))",
    color: "var(--task-card-priority-baja-fg, var(--color-text-secondary))",
  }
}

export function statusPillStyle(statusLower: string): CSSProperties {
  if (statusLower.includes("complet")) {
    return {
      background: "color-mix(in srgb, var(--agenda-assigned) 18%, transparent)",
      color: "var(--agenda-assigned)",
    }
  }
  if (statusLower.includes("progreso")) {
    return {
      background: "color-mix(in srgb, var(--color-accent-health) 18%, transparent)",
      color: "var(--color-accent-health)",
    }
  }
  return {
    background: "color-mix(in srgb, var(--color-border) 35%, transparent)",
    color: "var(--color-text-secondary)",
  }
}

export function googleSourcePillStyle(kind: "reminder" | "calendar"): CSSProperties {
  const c = kind === "reminder" ? "var(--agenda-reminder)" : "var(--agenda-calendar)"
  return {
    background: `color-mix(in srgb, ${c} 18%, transparent)`,
    color: c,
  }
}

export const agendaPillBaseClass =
  "inline-flex max-w-full rounded-full px-2 py-px text-[9px] font-semibold uppercase tracking-[0.08em]"

/** Icono secundario (editar / borrar): sin relleno, borde y sombra casi imperceptibles. */
export const agendaTaskCircleActionClass =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent text-[var(--color-text-secondary)] opacity-[0.72] shadow-none transition-[opacity,color,background-color,transform] motion-safe:duration-200 hover:border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] hover:bg-[color-mix(in_srgb,var(--color-text-primary)_6%,transparent)] hover:text-[var(--color-text-primary)] hover:opacity-100 active:scale-[0.96] disabled:pointer-events-none disabled:opacity-35 sm:h-9 sm:w-9 sm:rounded-lg"

/** Edición / borrar en la fila de fecha: menos peso visual que el toggle principal. */
export const agendaTaskSubtleIconActionClass =
  `${agendaTaskCircleActionClass} !h-7 !w-7 !opacity-55 hover:!opacity-100 sm:!h-8 sm:!w-8`

/** Texto bajo el toggle principal (hecho / visto); secundarios van sin leyenda visible (icono + aria). */
export const agendaTaskCircleCaptionClass =
  "hidden max-w-[4.25rem] truncate text-end text-[8px] font-semibold uppercase leading-tight tracking-[0.1em] text-[var(--color-text-secondary)] xs:block sm:max-w-none"

/** Leyenda bajo el anillo de completado, centrada respecto al botón (columna fija --task-card-check-size). */
export const agendaTaskToggleCaptionClass =
  "hidden w-full min-w-0 max-w-[5rem] truncate text-center text-[8px] font-semibold uppercase leading-tight tracking-[0.1em] text-[var(--color-text-secondary)] xs:block sm:max-w-none"

/** Anillo del toggle principal (hecho / visto). */
export const agendaTaskCheckOuterClass =
  "inline-flex shrink-0 items-center justify-center rounded-full border-2 border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_96%,transparent)] shadow-[0_1px_0_color-mix(in_srgb,var(--color-border)_35%,transparent)] transition-[transform,background-color,border-color,box-shadow] motion-safe:duration-300 hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--color-accent-health)_28%,transparent)] disabled:opacity-45"

/** Botones de filtro de prioridad (barra sticky): misma cromática que las tarjetas. */
export function priorityFilterControlStyle(
  p: UiAgendaTask["priority"],
  active: boolean
): CSSProperties {
  const pill = priorityPillStyle(p)
  if (active) {
    return {
      ...pill,
      border: "none",
      boxShadow: `0 0 0 2px color-mix(in srgb, ${String(pill.color)} 55%, transparent)`,
    }
  }
  return {
    ...pill,
    border: "none",
    opacity: 0.58,
  }
}
