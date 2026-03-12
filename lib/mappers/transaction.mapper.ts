/**
 * Maps a raw Google Sheets row (Movimientos!A2:U5000) to a typed Transaction.
 *
 * Column reference (0-indexed):
 *  0  = fecha (date)
 *  5  = descripcion (description)
 *  6  = categoria (category)
 *  7  = subcategoria (subcategory)
 * 10  = monto (amount)
 * 12  = mes (month, YYYY-MM)
 */

export interface Transaction {
  id: string
  date: string
  description: string
  amount: number
  category: string
  subcategory: string
  month: string
}

export function mapRowToTransaction(row: any[], index: number): Transaction {
  return {
    id: `${row?.[0] ?? ""}-${index}`,
    date: String(row?.[0] ?? ""),
    description: String(row?.[5] ?? ""),
    amount: Number(row?.[10] ?? 0),
    category: String(row?.[6] ?? ""),
    subcategory: String(row?.[7] ?? ""),
    month: String(row?.[12] ?? ""),
  }
}
