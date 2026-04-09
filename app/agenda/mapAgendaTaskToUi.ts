import type { AgendaTask } from "@/app/hooks/useAgendaTasks"
import { localDateKeyFromIso } from "@/lib/agenda/localDateKey"

function initialsFromName(name: string): string {
  const t = name.trim()
  if (!t) return ""
  const parts = t.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0][0] || ""
    const b = parts[parts.length - 1][0] || ""
    return (a + b).toUpperCase()
  }
  return t.slice(0, 2).toUpperCase()
}

function orvitaFuenteForType(type: "recibida" | "asignada" | "personal"): string {
  if (type === "recibida") return "Me la asignaron"
  if (type === "asignada") return "Yo la asigné"
  return "Nueva"
}

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
  /** Iniciales de la persona relacionada (contacto o asignado). Vacío en personales. */
  relatedPersonInitials: string
  /** "Asignado por …" / "Asignado a …". Vacío en personales. */
  assignmentCaption: string
  /** Texto para pie "Fuente: …". */
  orvitaFuente: string
  /** Id en Google Tasks si esta fila ya está enlazada (dedupe con feed de Tasks). */
  googleTaskId?: string | null
  /** Recibida de otro miembro y aún sin aceptar en inicio/agenda. */
  needsAcceptance: boolean
  /** Asigné a otro: pendiente de que acepte. */
  assigneePendingAccept: boolean
  /** Asigné a otro: ya aceptó. */
  assigneeAccepted: boolean
  /** Id del asignatario en auth (para selector). */
  assigneeUserId: string | null
  /** Quien creó la fila (auth id). */
  createdByUserId: string
}

export function assignmentShortLine(task: UiAgendaTask): string | null {
  const ini = task.relatedPersonInitials.trim()
  if (!ini) return null
  if (task.type === "recibida") return `De: ${ini}`
  if (task.type === "asignada") return `Para: ${ini}`
  return null
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

  const name = t.assigneeName?.trim() || ""
  const relatedPersonInitials = t.type === "personal" ? "" : initialsFromName(name)
  const owner =
    t.type === "personal" ? "YO" : relatedPersonInitials || "EQ"

  let assigneeLine = ""
  let assignmentCaption = ""
  if (t.type === "personal") {
    assigneeLine = "Para ti · las tareas sin asignatario pueden sincronizarse con Google Tasks"
  } else if (t.type === "assigned") {
    assigneeLine = name ? `Asignado a: ${name}` : "Asignado a: sin nombre (añade asignatario al crear la tarea)"
    assignmentCaption = name ? `Asignado a ${name}` : "Asignado a (sin nombre)"
  } else {
    assigneeLine = name ? `Recibida · origen / contacto: ${name}` : "Recibida · sin contacto indicado"
    assignmentCaption = name ? `Asignado por ${name}` : "Asignado por (sin nombre)"
  }

  const orvitaFuente = orvitaFuenteForType(typeMap[t.type])
  const acceptedAt = t.assignmentAcceptedAt ?? null
  const needsAcceptance = typeMap[t.type] === "recibida" && !acceptedAt
  const assigneePendingAccept = typeMap[t.type] === "asignada" && !acceptedAt
  const assigneeAccepted = typeMap[t.type] === "asignada" && Boolean(acceptedAt)

  return {
    id: t.id,
    title: t.title,
    duration: t.estimatedMinutes,
    due: t.dueDate ? (localDateKeyFromIso(t.dueDate) ?? t.dueDate.slice(0, 10)) : "",
    type: typeMap[t.type],
    priority: priMap[t.priority],
    status: displayStatus,
    owner,
    completed: t.status === "completed",
    assigneeLine,
    relatedPersonInitials,
    assignmentCaption,
    orvitaFuente,
    googleTaskId: t.googleTaskId ?? null,
    needsAcceptance,
    assigneePendingAccept,
    assigneeAccepted,
    assigneeUserId: t.assigneeId ?? null,
    createdByUserId: t.createdBy,
  }
}

export function priorityFormToApi(p: string): "Alta" | "Media" | "Baja" {
  if (p === "alta") return "Alta"
  if (p === "baja") return "Baja"
  return "Media"
}
