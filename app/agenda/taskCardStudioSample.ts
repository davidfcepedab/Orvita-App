import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"
import type { HouseholdMemberDTO } from "@/lib/household/memberTypes"
import type { GoogleTaskDTO } from "@/lib/google/types"

/** Miembros ficticios para que el estudio muestre el selector de responsable (misma UI que /agenda). */
export const TASK_CARD_STUDIO_HOUSEHOLD_MEMBERS: HouseholdMemberDTO[] = [
  {
    id: "00000000-0000-0000-0000-0000000000aa",
    email: "maria@ejemplo.local",
    displayName: "María López",
    isOwner: false,
  },
  {
    id: "00000000-0000-0000-0000-0000000000cc",
    email: "carlos@ejemplo.local",
    displayName: "Carlos Ruiz",
    isOwner: false,
  },
]

/** Tarea de ejemplo para la vista previa del estudio de tarjetas. */
export const TASK_CARD_STUDIO_SAMPLE: UiAgendaTask = {
  id: "studio-sample-orvita",
  title: "Diseño · Revisión semanal de métricas",
  duration: 45,
  due: new Date().toISOString(),
  type: "asignada",
  priority: "alta",
  status: "en progreso",
  owner: "DC",
  completed: false,
  assigneeLine: "",
  relatedPersonInitials: "ML",
  assignmentCaption: "",
  orvitaFuente: "Yo la asigné",
  needsAcceptance: false,
  assigneePendingAccept: true,
  assigneeAccepted: false,
  assigneeUserId: "00000000-0000-0000-0000-0000000000aa",
  createdByUserId: "00000000-0000-0000-0000-0000000000bb",
}

/** Misma tarjeta pero completada → cromado verde como en producción. */
export const TASK_CARD_STUDIO_SAMPLE_COMPLETED: UiAgendaTask = {
  ...TASK_CARD_STUDIO_SAMPLE,
  completed: true,
  status: "completada",
  assigneePendingAccept: false,
  assigneeAccepted: true,
}

function studioReminderDueIso(): string {
  const d = new Date()
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0)).toISOString()
}

/** Recordatorio Google ficticio para la barra rápida en el estudio. */
export function getTaskCardStudioGoogleReminderSample(): GoogleTaskDTO {
  return {
    id: "studio-google-reminder",
    title: "Recordatorio · ejemplo Google Tasks",
    status: "needsAction",
    due: studioReminderDueIso(),
  }
}
