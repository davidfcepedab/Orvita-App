import type { Transaction } from "@/lib/types"

// Column indices for Movimientos!A2:U5000
const COL_FECHA = 0
const COL_DESCRIPCION = 5
const COL_CATEGORIA = 6
const COL_SUBCATEGORIA = 7
const COL_MONTO = 10
const COL_MES = 12

/**
 * Maps a raw row from the Movimientos sheet to a typed Transaction.
 * All magic indices are confined to this function.
 */
export function mapRowToTransaction(row: any[]): Transaction {
  return {
    fecha: String(row[COL_FECHA] ?? ""),
    descripcion: String(row[COL_DESCRIPCION] ?? ""),
    categoria: String(row[COL_CATEGORIA] ?? ""),
    subcategoria: String(row[COL_SUBCATEGORIA] ?? ""),
    monto: Number(row[COL_MONTO] ?? 0),
    mes: String(row[COL_MES] ?? ""),
  }
}
