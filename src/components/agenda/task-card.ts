/**
 * Punto de entrada para el sistema de tarjetas de tarea (Órvita V3 / agenda).
 * Implementación vive en `app/agenda/*` por colocación con rutas.
 */
export {
  TASK_CARD_GRID,
  TASK_CARD_ITERATION_QUERY,
  allTaskCardCssVarKeys,
  mergeTaskCardVarOverrides,
  resolveTaskCardGridTemplate,
  taskCardDensityVars,
  taskCardGridStyle,
  taskCardMiniGridStyle,
  type TaskCardDensity,
  type TaskCardGridKey,
} from "@/app/agenda/taskCardConfig"
export { TaskCardDesignProvider, useTaskCardDesign } from "@/app/agenda/TaskCardDesignContext"
export { TaskCardIterationProvider, useTaskCardIterationMode } from "@/app/agenda/TaskCardIterationContext"
export { TaskCardArea } from "@/app/agenda/TaskCardArea"
export { AgendaOrvitaTaskCard } from "@/app/agenda/AgendaOrvitaTaskCard"
export { AgendaOrvitaMiniCard } from "@/app/agenda/AgendaOrvitaMiniCard"
export { AgendaReadonlyUnifiedCard } from "@/app/agenda/AgendaReadonlyUnifiedCard"
