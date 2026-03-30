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
      background: "color-mix(in srgb, var(--color-accent-danger) 16%, transparent)",
      color: "var(--color-accent-danger)",
    }
  }
  if (p === "media") {
    return {
      background: "color-mix(in srgb, var(--color-accent-warning) 16%, transparent)",
      color: "var(--color-accent-warning)",
    }
  }
  return {
    background: "color-mix(in srgb, var(--color-border) 40%, transparent)",
    color: "var(--color-text-secondary)",
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
