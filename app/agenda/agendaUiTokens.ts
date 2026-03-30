/**
 * Convenciones visuales compartidas en la agenda (tipografía, espaciado, superficies).
 * Usar estas clases para mantener coherencia entre lista, kanban, semana y mes.
 */

/** Contenedor de vista completa (columna principal). */
export const agendaViewStackClass = "grid min-w-0 gap-3 sm:gap-4"

/** Rejilla kanban (columnas responsive). */
export const agendaKanbanGridClass =
  "grid min-w-0 gap-4 md:grid-cols-2 md:gap-[var(--layout-gap)] xl:grid-cols-3 xl:gap-[var(--layout-gap)]"

/** Columna interna del kanban (título + tarjetas). */
export const agendaKanbanColumnClass = "grid min-w-0 gap-2 sm:gap-[var(--spacing-sm)]"

/** Bloque flex vertical entre secciones grandes (p. ej. semana: resumen + días). */
export const agendaSectionStackClass = "flex min-w-0 flex-col gap-4 md:gap-[var(--spacing-md)]"

/** Padding estándar de tarjetas Card en agenda. */
export const agendaCardPadClass = "min-w-0 overflow-hidden p-3 sm:p-4"

/** Rótulo pequeño en mayúsculas (encabezados de sección). */
export const agendaOverlineClass =
  "m-0 text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)] sm:text-[12px]"

/** Igual que overline sin m-0 (títulos con borde izquierdo en kanban). */
export const agendaColumnHeadingClass =
  "text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)] sm:text-[12px]"

/** Título de sección bajo el rótulo. */
export const agendaSectionTitleClass =
  "m-0 mt-1 text-[13px] font-semibold leading-snug text-[var(--color-text-primary)] sm:text-[14px]"

/** Fila de metadatos / stats secundarios. */
export const agendaMetaRowClass =
  "flex min-w-0 flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-[var(--color-text-secondary)] sm:gap-x-3 sm:text-[12px]"

/** Estado vacío (mensaje centrado). */
export const agendaEmptyStateClass =
  "m-0 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-8 text-center text-[12px] leading-snug text-[var(--color-text-secondary)] sm:text-[13px]"

/** Estado de carga inicial. */
export const agendaLoadingStateClass =
  "m-0 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-6 text-center text-[12px] text-[var(--color-text-secondary)] sm:text-[13px]"

/** Fondo de panel elevado alineado con la barra de filtros (blanco / superficie). */
export const agendaPanelSurfaceStyle = {
  borderWidth: "0.5px" as const,
  background: "var(--color-surface)" as const,
  boxShadow: "var(--shadow-card)" as const,
}
