import type { SupabaseClient } from "@supabase/supabase-js"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import { normalizeTransactionDateIsoDay } from "@/lib/finanzas/transactionDate"

/**
 * Tamaño de página solicitado a PostgREST. El proyecto puede tener `max_rows` menor (p. ej. 500):
 * hay que avanzar `from` según filas devueltas, no asumir página llena = fin del dataset.
 */
const RANGE_PAGE_SIZE = 1000
const RANGE_HARD_CAP = 400_000

export async function getTransactionsByRange(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
): Promise<FinanceTransaction[]> {
  const acc: FinanceTransaction[] = []
  let from = 0

  for (;;) {
    const to = from + RANGE_PAGE_SIZE - 1
    const { data, error } = await supabase
      .from("orbita_finance_transactions")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .is("deleted_at", null)
      .order("date", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to)

    if (error) throw new Error(error.message)

    const batch = (data ?? []) as FinanceTransaction[]
    if (batch.length === 0) break
    acc.push(...batch)
    if (acc.length > RANGE_HARD_CAP) {
      throw new Error(
        "El rango de fechas tiene demasiados movimientos para procesar de una vez; reduce el periodo o contacta soporte.",
      )
    }
    from += batch.length
  }

  return acc.map((row) => ({
    ...row,
    date: normalizeTransactionDateIsoDay(row.date),
  }))
}