import type { CSSProperties } from "react"

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ÓRVITA V3 — TASK CARD: variables de diseño (única fuente de verdad)      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Edita los valores por defecto aquí o en el bloque MODO ITERACIÓN al     ║
 * ║  final de AgendaOrvitaTaskCard.tsx. Todas las vistas leen estos tokens.   ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Espaciado                                                               ║
 * ║  • --task-card-pad          padding interno del cuerpo (tarjeta Órvita)   ║
 * ║  • --task-card-gap          gap del grid principal                        ║
 * ║  • --task-card-gap-tight    gap entre pills / filas secundarias         ║
 * ║  • --task-card-radius       border-radius contenedor embebido / mini      ║
 * ║  • --task-card-border-left  ancho borde izquierdo (tipo tarea)            ║
 * ║                                                                           ║
 * ║  Tipografía                                                               ║
 * ║  • --task-card-title-size   título principal                              ║
 * ║  • --task-card-meta-size    línea tiempo / timeline                       ║
 * ║  • --task-card-pill-size    pastillas prioridad/estado                    ║
 * ║  • --task-card-fuente-size  “Fuente:” y notas                              ║
 * ║  • --task-card-action-size  Guardar / enlaces                             ║
 * ║  • --task-card-line-title   line-height título                            ║
 * ║  • --task-card-line-body    line-height cuerpo                            ║
 * ║                                                                           ║
 * ║  Acciones / iconos                                                        ║
 * ║  • --task-card-action-col-width  ancho columna acciones (full card)      ║
 * ║  • --task-card-check-size        botón check                              ║
 * ║                                                                           ║
 * ║  Grid (órdenes de áreas — cambia en TASK_CARD_GRID_* abajo)              ║
 * ║  • orvita: title | meta | pills | assign | footer | actions              ║
 * ║  • mini:   title | meta | pills | extra | footer                         ║
 * ║  • google: title | meta | pills | fuente | footer | actions              ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

export type TaskCardDensity = "kanban" | "list" | "compact"

/** Query string: ?taskCardDev=1 activa bordes de área + etiquetas (ver TaskCardIterationContext). */
export const TASK_CARD_ITERATION_QUERY = "taskCardDev"

const BASE_VARS: Record<string, string> = {
  "--task-card-radius": "12px",
  "--task-card-border-left": "4px",
  "--task-card-line-title": "1.25",
  "--task-card-line-body": "1.35",
  "--task-card-action-col-width": "min-content",
  "--task-card-check-size": "28px",
}

const DENSITY_VARS: Record<TaskCardDensity, Record<string, string>> = {
  kanban: {
    "--task-card-pad": "10px",
    "--task-card-gap": "6px",
    "--task-card-gap-tight": "4px",
    "--task-card-title-size": "13px",
    "--task-card-meta-size": "10px",
    "--task-card-pill-size": "9px",
    "--task-card-fuente-size": "9px",
    "--task-card-action-size": "10px",
    "--task-card-icon-meta": "12px",
  },
  list: {
    "--task-card-pad": "12px",
    "--task-card-gap": "8px",
    "--task-card-gap-tight": "5px",
    "--task-card-title-size": "14px",
    "--task-card-meta-size": "11px",
    "--task-card-pill-size": "9px",
    "--task-card-fuente-size": "10px",
    "--task-card-action-size": "10px",
    "--task-card-icon-meta": "12px",
  },
  compact: {
    "--task-card-pad": "8px",
    "--task-card-gap": "4px",
    "--task-card-gap-tight": "3px",
    "--task-card-title-size": "11px",
    "--task-card-meta-size": "10px",
    "--task-card-pill-size": "8px",
    "--task-card-fuente-size": "9px",
    "--task-card-action-size": "9px",
    "--task-card-icon-meta": "10px",
    "--task-card-check-size": "24px",
  },
}

/** Plantillas CSS Grid (grid-template-areas). Reordena filas moviendo strings entre comillas. */
export const TASK_CARD_GRID = {
  /** Tarjeta Órvita editable (Kanban / Lista): columna acciones a la derecha. */
  orvita:
    '"title actions" "meta actions" "pills actions" "assign actions" "footer actions"',
  /** Mini (semana / mes): una columna. */
  mini: '"title" "meta" "pills" "extra" "footer"',
  /** Google Calendar / Tasks unificado. */
  readonly:
    '"title actions" "meta actions" "pills actions" "fuente actions" "footer actions"',
} as const

export function taskCardDensityVars(density: TaskCardDensity): CSSProperties {
  return {
    ...BASE_VARS,
    ...DENSITY_VARS[density],
  } as CSSProperties
}

export function taskCardGridStyle(
  templateAreas: string,
  columns: string = "1fr minmax(0,var(--task-card-action-col-width))",
): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: columns,
    gridTemplateAreas: templateAreas,
    gap: "var(--task-card-gap)",
    padding: "var(--task-card-pad)",
  }
}

/** Mini card: una sola columna. */
export function taskCardMiniGridStyle(templateAreas: string): CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "minmax(0,1fr)",
    gridTemplateAreas: templateAreas,
    gap: "var(--task-card-gap)",
    padding: "var(--task-card-pad)",
  }
}

// === MODO ITERACIÓN (diseño) ===================================================
// Cambia DENSITY_VARS / BASE_VARS arriba y guarda: Kanban, Lista, Semana, Mes leen los mismos tokens.
// URL: /agenda?taskCardDev=1 → bordes naranjas por área (title, meta, pills, …).
//
// Ejemplo de overrides (copiar a BASE_VARS o a un preset):
//   "--task-card-pad": "8px",
//   "--task-card-gap": "4px",
//   "--task-card-title-size": "12px",
//   "--task-card-radius": "10px",
//
// Reordenar bloques: edita TASK_CARD_GRID.orvita | .mini | .readonly (grid-template-areas).
// ===============================================================================
