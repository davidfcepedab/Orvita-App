/**
 * Textos cortos compartidos por las vistas del módulo Finanzas (Capital).
 * Evita repetir el mismo párrafo en cabecera, P&L y Cuentas.
 */

/** Una línea para FinanceViewHeader en P&L y vistas que describen el hilo contable. */
export const FINANCE_MODULE_STRAPLINE =
  "Caja → operativo → cierre. Saldos por cuenta: pestaña Cuentas."

/** Cabecera página P&L: evita repetir el párrafo largo que vive en el panel inferior. */
export const FINANCE_PL_PAGE_SUBTITLE =
  "Una sola columna: caja del mes, operación, capa financiera del mapa; la conciliación KPI↔mapa va aparte si la necesitas."

/** Texto desplegable “cómo leer” dentro del panel P&L (referencia tipo estado de resultados). */
export const FINANCE_PL_README_EXPANDED =
  "Primero ves cómo se decanta el mes: arrastre del mes anterior, ingresos, gastos totales y flujo neto. Luego el gasto operativo (catálogo y mapa sin módulo financiero). El módulo financiero en el mapa va en su propia fila. Abajo, en «Conciliación», están brechas, puentes y lo sin explicar — útil para alinear KPI con el mapa, no para leer el resultado del hogar. Saldos bancarios: pestaña Cuentas."

/** Cabecera de la página Cuentas (no repetir el párrafo largo del callout). */
export const FINANCE_CUENTAS_HEADER_SUBTITLE =
  "Resumen arriba; despliega «Ledger manual» para alinear saldos con tu extracto (sin API)."

/** Perspectivas: mismo criterio de exclusión que KPI / categorías / P&L operativo. */
export const FINANCE_INSIGHTS_STRAPLINE =
  "Flujo neto por mes (misma base que Resumen; sin ajustes de conciliación en el índice)."
