import type { CSSProperties } from "react"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"

const SURFACE = "var(--color-surface)"

function mix(color: string, pct: number): string {
  return `color-mix(in srgb, ${color} ${pct}%, ${SURFACE})`
}

export type AgendaCardShell = Pick<CSSProperties, "background" | "borderLeft">

/** Coral / terracota suave: recibidas o responsable = usuario actual. */
function coralShell(): AgendaCardShell {
  return {
    background: mix("#fdba74", 18),
    borderLeft: "4px solid color-mix(in srgb, #ea580c 34%, transparent)",
  }
}

/** Órvita: menta/sage por defecto; coral si aplica seguimiento; verde pastel si completada. */
export function orvitaAgendaCardShell(
  task: UiAgendaTask,
  opts?: { viewerUserId?: string | null },
): AgendaCardShell {
  if (task.completed) {
    return {
      background: mix("#86efac", 34),
      borderLeft: "4px solid color-mix(in srgb, #4ade80 50%, transparent)",
    }
  }
  const v = opts?.viewerUserId
  const assignedToMe =
    Boolean(v && task.assigneeUserId && task.assigneeUserId === v) || task.type === "recibida"
  if (assignedToMe) return coralShell()
  return {
    background: mix("#a7f3d0", 15),
    borderLeft: "4px solid color-mix(in srgb, #10b981 30%, transparent)",
  }
}

/** Google: lavanda (Calendar), azul pastel (Tasks), coral si recordatorio asignado a ti (local), verde si completado. */
export function googleAgendaCardShell(opts: {
  kind: "reminder" | "calendar"
  completed: boolean
  /** Recordatorio con responsable local = usuario actual. */
  assignedToViewer?: boolean
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
  if (opts.assignedToViewer) return coralShell()
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
  assignedToViewer?: boolean
}): Pick<CSSProperties, "background"> {
  return { background: googleAgendaCardShell(opts).background }
}
