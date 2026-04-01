/** Columnas alineadas con la vista Movimientos / hoja para nuevas filas e importación. */

export const TRANSACTION_CSV_HEADERS_ES = [
  "Fecha",
  "Tipo",
  "Categoría",
  "Subcategoría",
  "Cuenta",
  "Concepto",
  "Monto",
] as const

function csvCell(s: string): string {
  const t = String(s ?? "")
  if (/[",\n\r]/.test(t)) return `"${t.replace(/"/g, '""')}"`
  return t
}

/** Plantilla con una fila de ejemplo (valores orientativos). */
export function buildTransactionsTemplateCsv(): string {
  const header = TRANSACTION_CSV_HEADERS_ES.join(",")
  const example = [
    "2026-04-01",
    "Gasto",
    "Alimentacion",
    "Mercado hogar",
    "Nomina principal",
    "Compra supermercado",
    "150000",
  ].map(csvCell)
  return `\uFEFF${header}\n${example.join(",")}\n`
}

export type TransactionCsvRow = {
  fecha: string
  tipoLabel: "Ingreso" | "Gasto"
  categoria: string
  subcategoria: string
  cuenta: string
  concepto: string
  monto: number
}

export function buildTransactionsExportCsv(rows: TransactionCsvRow[]): string {
  const header = TRANSACTION_CSV_HEADERS_ES.join(",")
  const lines = rows.map((r) =>
    [
      r.fecha,
      r.tipoLabel,
      r.categoria,
      r.subcategoria,
      r.cuenta,
      r.concepto,
      String(Math.round(Math.abs(r.monto))),
    ].map(csvCell),
  )
  const body = lines.map((cells) => cells.join(",")).join("\n")
  return lines.length ? `\uFEFF${header}\n${body}\n` : `\uFEFF${header}\n`
}
