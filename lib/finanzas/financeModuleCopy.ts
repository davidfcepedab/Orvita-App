/**
 * Textos cortos compartidos por las vistas del módulo Finanzas (Capital).
 * Evita repetir el mismo párrafo en cabecera, P&L y Cuentas.
 */

/** Una línea para FinanceViewHeader en P&L y vistas que describen el hilo contable. */
export const FINANCE_MODULE_STRAPLINE =
  "Caja → operativo → cierre. Saldos por cuenta: pestaña Cuentas."

/** Cabecera página P&L: evita repetir el párrafo largo que vive en el panel inferior. */
export const FINANCE_PL_PAGE_SUBTITLE = "Una tabla: continuidad, resultado del mes y capas operativas."

/** Texto desplegable “cómo leer” dentro del panel P&L (referencia tipo estado de resultados). */
export const FINANCE_PL_README_EXPANDED =
  "Sigue el orden de un estado de resultados: primero el contexto (arrastre del mes anterior), luego ingresos y egresos del mes, y el flujo neto. Las filas operativas comparan el gasto según catálogo KPI con el mapa estructural; los ajustes de conciliación de cuentas no se mezclan con esas capas. Saldos por cuenta: pestaña Cuentas."

/** Cabecera de la página Cuentas (no repetir el párrafo largo del callout). */
export const FINANCE_CUENTAS_HEADER_SUBTITLE =
  "Resumen arriba; en el desplegable inferior alineas extracto con el modelo (manual)."

/** Perspectivas: mismo criterio de exclusión que KPI / categorías / P&L operativo. */
export const FINANCE_INSIGHTS_STRAPLINE =
  "Flujo neto por mes (misma base que Resumen; sin ajustes de conciliación en el índice)."
