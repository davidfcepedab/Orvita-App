import type { CSSProperties } from "react"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"

const SURFACE = "var(--color-surface)"

function mix(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, ${SURFACE})`
}

export type AgendaCardShell = Pick<CSSProperties, "background" | "borderLeft">

/** Órvita: menta/sage (personal), coral (recibidas), índigo suave (asignadas por ti), verde pastel si completada. */
export function orvitaAgendaCardShell(task: UiAgendaTask): AgendaCardShell {
  if (task.completed) {
    return {
      background: mix("#86efac", 34),
      borderLeft: "4px solid color-mix(in srgb, #4ade80 50%, transparent)",
    }
  }
  if (task.type === "recibida") {
    return {
      background: mix("#fdba74", 18),
      borderLeft: "4px solid color-mix(in srgb, #f97316 35%, transparent)",
    }
  }
  if (task.type === "asignada") {
    return {
      background: mix("#c7d2fe", 16),
      borderLeft: "4px solid color-mix(in srgb, #6366f1 32%, transparent)",
    }
  }
  return {
    background: mix("#a7f3d0", 15),
    borderLeft: "4px solid color-mix(in srgb, #10b981 30%, transparent)",
  }
}

/** Google: lavanda (Calendar), azul pastel (Tasks), verde si completado. */
export function googleAgendaCardShell(opts: {
  kind: "reminder" | "calendar"
  completed: boolean
}): AgendaCardShell {
  if (opts.completed) {
    return {
      background: mix("#86efac", 34),
      borderLeft: "4px solid color-mix(in srgb, #4ade80 50%, transparent)",
    }
  }
  if (opts.kind === "calendar") {
    return {
      background: mix("#ddd6fe", 22),
      borderLeft: "4px solid color-mix(in srgb, #a78bfa 42%, transparent)",
    }
  }
  return {
    background: mix("#bfdbfe", 18),
    borderLeft: "4px solid color-mix(in srgb, #3b82f6 34%, transparent)",
  }
}

/** Compat: solo fondo (mini / estudio). */
export function orvitaTaskCardChrome(task: UiAgendaTask): Pick<CSSProperties, "background"> {
  return { background: orvitaAgendaCardShell(task).background }
}

export function googleReadonlyCardChrome(opts: {
  kind: "reminder" | "calendar"
  completed: boolean
}): Pick<CSSProperties, "background"> {
  return { background: googleAgendaCardShell(opts).background }
}
