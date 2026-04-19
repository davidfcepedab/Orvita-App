import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"

const ACCENT: Record<UiAgendaTask["type"], string> = {
  personal: "var(--agenda-personal)",
  recibida: "var(--agenda-received)",
  asignada: "var(--agenda-assigned)",
  compartida: "var(--agenda-shared)",
}

export function taskTypeAccentVar(type: UiAgendaTask["type"]) {
  return ACCENT[type]
}

export function taskChipStyle(type: UiAgendaTask["type"]) {
  const c = ACCENT[type]
  return {
    background: `color-mix(in srgb, ${c} 18%, transparent)`,
    color: c,
  } as const
}

export function taskLeftBorder(type: UiAgendaTask["type"], widthPx = 3) {
  return `${widthPx}px solid ${ACCENT[type]}`
}

export const AGENDA_COLOR = {
  calendar: "var(--agenda-calendar)",
  reminder: "var(--agenda-reminder)",
} as const
