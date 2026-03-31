/** Clases Tailwind para chips del catálogo (categorías / subcategorías). */

export function sheetTipoPillClass(tipo: "fijo" | "variable"): string {
  return tipo === "fijo"
    ? "border border-sky-300/80 bg-sky-100/90 text-sky-950"
    : "border border-violet-300/80 bg-violet-100/90 text-violet-950"
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
