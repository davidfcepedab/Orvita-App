/**
 * Punto de entrada para el sistema de tarjetas de tarea (Órvita V3 / agenda).
 * Implementación vive en `app/agenda/*` por colocación con rutas.
 */
export {
  TASK_CARD_GRID,
  TASK_CARD_ITERATION_QUERY,
  taskCardDensityVars,
  taskCardGridStyle,
  taskCardMiniGridStyle,
  type TaskCardDensity,
} from "@/app/agenda/taskCardConfig"
export { TaskCardIterationProvider, useTaskCardIterationMode } from "@/app/agenda/TaskCardIterationContext"
export { TaskCardArea } from "@/app/agenda/TaskCardArea"
export { AgendaOrvitaTaskCard } from "@/app/agenda/AgendaOrvitaTaskCard"
export { AgendaOrvitaMiniCard } from "@/app/agenda/AgendaOrvitaMiniCard"
export { AgendaReadonlyUnifiedCard } from "@/app/agenda/AgendaReadonlyUnifiedCard"
