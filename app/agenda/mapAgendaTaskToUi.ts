import type { AgendaTask } from "@/app/hooks/useAgendaTasks"

export type UiAgendaTask = {
  id: string
  title: string
  duration: number
  due: string
  type: "recibida" | "asignada" | "personal"
  priority: "alta" | "media" | "baja"
  status: string
  owner: string
  completed: boolean
  /** Línea legible para lista enriquecida (asignación / origen). */
  assigneeLine: string
}

export function mapAgendaTaskToUi(t: AgendaTask): UiAgendaTask {
  const typeMap: Record<AgendaTask["type"], UiAgendaTask["type"]> = {
    received: "recibida",
    assigned: "asignada",
    personal: "personal",
  }
  const priMap: Record<AgendaTask["priority"], UiAgendaTask["priority"]> = {
    Alta: "alta",
    Media: "media",
    Baja: "baja",
  }
  let displayStatus = "pendiente"
  if (t.status === "in-progress") displayStatus = "en progreso"
  if (t.status === "completed") displayStatus = "completada"

  const owner =
    t.type === "personal" ? "Yo" : (t.assigneeName?.trim().slice(0, 2).toUpperCase() || "EQ")

  const name = t.assigneeName?.trim() || ""
  let assigneeLine = ""
  if (t.type === "personal") {
    assigneeLine = "Para ti · las tareas sin asignatario pueden sincronizarse con Google Tasks"
  } else if (t.type === "assigned") {
    assigneeLine = name ? `Asignado a: ${name}` : "Asignado a: sin nombre (añade asignatario al crear la tarea)"
  } else {
    assigneeLine = name ? `Recibida · origen / contacto: ${name}` : "Recibida · sin contacto indicado"
  }

  return {
    id: t.id,
    title: t.title,
    duration: t.estimatedMinutes,
    due: t.dueDate ? t.dueDate.slice(0, 10) : "",
    type: typeMap[t.type],
    priority: priMap[t.priority],
    status: displayStatus,
    owner,
    completed: t.status === "completed",
    assigneeLine,
  }
}

export function priorityFormToApi(p: string): "Alta" | "Media" | "Baja" {
  if (p === "alta") return "Alta"
  if (p === "baja") return "Baja"
  return "Media"
}
