import type { CSSProperties } from "react"

/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  ÓRVITA V3 — TASK CARD: variables de diseño (única fuente de verdad)      ║
 * ╠══════════════════════════════════════════════════════════════════════════╣
 * ║  Edita valores por defecto aquí, o en vivo en /agenda/task-card-studio    ║
 * ║  (botón “Tarjeta maestra” en la agenda). Overrides → localStorage.        ║
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

export type TaskCardGridKey = keyof typeof TASK_CARD_GRID

/** Filas de contenido (sin columna `actions`) para armar grid-template-areas en el estudio. */
export const TASK_CARD_ORVITA_ROWS = ["title", "meta", "pills", "assign", "footer"] as const
export const TASK_CARD_MINI_ROWS = ["title", "meta", "pills", "extra", "footer"] as const
export const TASK_CARD_READONLY_ROWS = ["title", "meta", "pills", "fuente", "footer"] as const

export function defaultRowOrderForGrid(slot: TaskCardGridKey): string[] {
  if (slot === "orvita") return [...TASK_CARD_ORVITA_ROWS]
  if (slot === "mini") return [...TASK_CARD_MINI_ROWS]
  return [...TASK_CARD_READONLY_ROWS]
}

/** Kanban/Lista: cada fila comparte columna `actions` a la derecha. */
export function buildOrvitaGridTemplateFromRows(rows: string[]): string {
  return rows.map((r) => `"${r} actions"`).join(" ")
}

/** Semana/Mes: una sola columna. */
export function buildMiniGridTemplateFromRows(rows: string[]): string {
  return rows.map((r) => `"${r}"`).join(" ")
}

/** Google: igual que orvita (acciones a la derecha). */
export function buildReadonlyGridTemplateFromRows(rows: string[]): string {
  return rows.map((r) => `"${r} actions"`).join(" ")
}

export function buildGridTemplateFromRows(slot: TaskCardGridKey, rows: string[]): string {
  if (slot === "mini") return buildMiniGridTemplateFromRows(rows)
  if (slot === "readonly") return buildReadonlyGridTemplateFromRows(rows)
  return buildOrvitaGridTemplateFromRows(rows)
}

/** Variables opcionales del estudio (no están en BASE/DENSITY hasta que las guardes). */
const STUDIO_OPTIONAL_VAR_KEYS: string[] = [
  "--task-card-font-family",
  "--task-card-font-weight-title",
  "--task-card-min-height",
  "--task-card-surface-bg",
  "--task-card-chrome-border",
  "--task-card-border-color",
  "--task-card-title-color",
  "--task-card-meta-color",
  "--task-card-priority-alta-bg",
  "--task-card-priority-alta-fg",
  "--task-card-priority-media-bg",
  "--task-card-priority-media-fg",
  "--task-card-priority-baja-bg",
  "--task-card-priority-baja-fg",
]

/** Une tokens por densidad + overrides no vacíos (estudio / localStorage). */
export function mergeTaskCardVarOverrides(
  base: CSSProperties,
  overrides: Record<string, string>,
): CSSProperties {
  const out = { ...(base as Record<string, string | number>) }
  for (const [key, val] of Object.entries(overrides)) {
    const t = val.trim()
    if (t !== "") out[key] = t
  }
  return out as CSSProperties
}

export function resolveTaskCardGridTemplate(
  slot: TaskCardGridKey,
  override?: string | null,
): string {
  const t = override?.trim()
  return t || TASK_CARD_GRID[slot]
}

/** Lista ordenada de todas las variables CSS usadas por las tarjetas (para el estudio). */
export function allTaskCardCssVarKeys(): string[] {
  const set = new Set<string>()
  for (const k of Object.keys(BASE_VARS)) set.add(k)
  for (const d of Object.keys(DENSITY_VARS) as TaskCardDensity[]) {
    for (const k of Object.keys(DENSITY_VARS[d])) set.add(k)
  }
  for (const k of STUDIO_OPTIONAL_VAR_KEYS) set.add(k)
  return [...set].sort()
}

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
// URL: /agenda?taskCardDev=1 → bordes por área en la agenda.
// Estudio: /agenda/task-card-studio → panel con variables, grid y previews.
//
// Ejemplo de overrides (copiar a BASE_VARS o a un preset):
//   "--task-card-pad": "8px",
//   "--task-card-gap": "4px",
//   "--task-card-title-size": "12px",
//   "--task-card-radius": "10px",
//
// Reordenar bloques: edita TASK_CARD_GRID.orvita | .mini | .readonly (grid-template-areas).
// ===============================================================================
//
// === MODO ESTUDIO ACTIVADO ===
// Abre /agenda/task-card-studio
// Arrastra filas en “Estructura”, usa sliders y colores; todo se replica en Kanban, Lista, Semana y Mes.
// Los cambios se guardan en localStorage (iteración rápida) y puedes “Copiar JSON” para llevarlo al repo.
// ===============================================================================
