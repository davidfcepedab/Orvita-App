/** Clases Tailwind para chips del catálogo (categorías / subcategorías). */

import type { CSSProperties } from "react"

/** KPI «Gasto total»: rojo/rosa gasto (más rojizo que magenta puro). */
export const FINANCE_GASTO_TOTAL_MAPA = {
  /** rose-600 */
  accent: "#e11d48",
  /** rose-100 */
  wash: "#ffe4e6",
  /** rose-500 — segundo tono gradiente */
  accentWarm: "#f43f5e",
  /** rose-700 — borde */
  border: "#be123c",
} as const

/**
 * Gasto fijo: ámbar dorado (matiz ~43°) — más amarillo-oro, “compromiso”.
 * Separado del variable en HEX (no solapes con naranja coral).
 */
export const FINANCE_GASTO_FIJO = {
  /** amber-500 */
  accent: "#f59e0b",
  /** amber-50 */
  wash: "#fffbeb",
  /** amber-700 */
  border: "#b45309",
  /** amber-950 — texto chip */
  text: "#451a03",
} as const

/**
 * Gasto variable: naranja rojizo / coral (matiz ~22°) — más rojo que el ámbar fijo.
 */
export const FINANCE_GASTO_VARIABLE = {
  /** orange-600 */
  accent: "#ea580c",
  /** orange-50 */
  wash: "#fff7ed",
  /** orange-700 */
  border: "#c2410c",
  /** orange-950 — texto chip */
  text: "#431407",
} as const

/** Layout tipográfico del chip; colores vía `sheetTipoPillHexStyle` (HEX alineados con KPI). */
export function sheetTipoPillClass(tipo: "fijo" | "variable" | "modulo_finanzas"): string {
  if (tipo === "modulo_finanzas") {
    return "inline-flex rounded-full border border-fuchsia-300/80 bg-fuchsia-100/90 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-fuchsia-950 shadow-sm"
  }
  return "inline-flex rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] shadow-sm"
}

/** Colores exactos `FINANCE_GASTO_FIJO` / `FINANCE_GASTO_VARIABLE` para chips de columna. */
export function sheetTipoPillHexStyle(tipo: "fijo" | "variable"): CSSProperties {
  const p = tipo === "fijo" ? FINANCE_GASTO_FIJO : FINANCE_GASTO_VARIABLE
  return {
    borderWidth: 1,
    borderStyle: "solid",
    borderColor: `${p.border}d9`,
    backgroundColor: p.wash,
    color: p.text,
    boxShadow: `0 1px 2px color-mix(in srgb, ${p.border} 14%, transparent)`,
  }
}

export function financialImpactPillClass(impact: string): string {
  const k = impact.trim().toLowerCase()
  if (k === "operativo") return "border border-emerald-300/80 bg-emerald-100/90 text-emerald-950"
  if (k === "inversion" || k === "inversión")
    return "border border-indigo-300/80 bg-indigo-100/90 text-indigo-950"
  if (k === "ajuste") return "border border-amber-300/80 bg-amber-100/90 text-amber-950"
  if (k === "transferencia") return "border border-cyan-300/80 bg-cyan-100/90 text-cyan-950"
  if (k === "financiero") return "border border-fuchsia-300/80 bg-fuchsia-100/90 text-fuchsia-950"
  return "border border-orbita-border bg-orbita-surface-alt text-orbita-secondary"
}
