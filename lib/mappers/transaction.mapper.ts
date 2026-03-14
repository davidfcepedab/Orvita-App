import type { Transaction } from "@/lib/types"

/**
 * Filters raw Movimientos rows by month (col 12) and optional category (col 6).
 * All numeric column references are centralised here so route files stay index-free.
 */
export function filterTransactionRows(
  rows: any[][],
  month: string,
  category?: string | null
): any[][] {
  return rows.filter((r) => {
    const rowMonth = r?.[12]
    const rowCategory = r?.[6]
    if (!rowMonth) return false
    if (rowMonth !== month) return false
    if (category && rowCategory !== category) return false
    return true
  })
}

/**
 * Maps a single raw Movimientos row to a typed Transaction object.
 * Column positions: [0] fecha, [5] descripcion, [6] categoria, [7] subcategoria, [10] monto, [12] mes.
 */
export function mapRowToTransaction(row: any[]): Transaction {
  return {
    fecha: row?.[0] || "",
    descripcion: row?.[5] || "",
    categoria: row?.[6] || "",
    subcategoria: row?.[7] || "",
    monto: Number(row?.[10] || 0),
    mes: String(row?.[12] || ""),
  }
}
