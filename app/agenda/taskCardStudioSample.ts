import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"

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
}
