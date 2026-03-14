import { mapRowToTransaction } from "@/lib/mappers/transaction.mapper"
import { buildStructuralTree } from "./categoriesEngine"

export function financialAdvancedEngine({
  rows,
  month,
}: {
  rows: any[][]
  month: string
}) {
  const transactions = Array.isArray(rows)
    ? rows.map(mapRowToTransaction)
    : []
  return buildStructuralTree(transactions, month)
}
