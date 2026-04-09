import type { CSSProperties } from "react"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"
import { AGENDA_COLOR } from "@/app/agenda/taskTypeVisual"

const SURFACE = "var(--color-surface)"

function mix(accent: string, pct: number): string {
  return `color-mix(in srgb, ${accent} ${pct}%, ${SURFACE})`
}

/** Fondo de tarjeta Órvita según estado y tipo (prioridad: completada > pendiente aceptación > aceptada > tipo). */
export function orvitaTaskCardChrome(task: UiAgendaTask): Pick<CSSProperties, "background"> {
  if (task.completed) {
    return { background: mix("var(--color-accent-health)", 14) }
  }
  if (task.type === "asignada" && task.assigneePendingAccept) {
    return { background: mix("var(--color-accent-warning)", 16) }
  }
  if (task.type === "asignada" && task.assigneeAccepted) {
    return { background: mix("var(--agenda-assigned)", 13) }
  }
  if (task.type === "recibida") {
    return { background: mix("var(--agenda-received)", 12) }
  }
  return { background: mix("var(--agenda-personal)", 13) }
}

export function googleReadonlyCardChrome(opts: {
  kind: "reminder" | "calendar"
  completed: boolean
}): Pick<CSSProperties, "background"> {
  if (opts.completed && opts.kind === "reminder") {
    return { background: mix("var(--color-accent-health)", 14) }
  }
  if (opts.kind === "calendar") {
    return { background: mix(AGENDA_COLOR.calendar, 11) }
  }
  // Google Tasks: tinte navy suave en el lienzo (pills/borde siguen usando --agenda-reminder).
  return { background: mix("#1e3a5f", 12) }
}
