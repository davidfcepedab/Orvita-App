import type { SupabaseClient } from "@supabase/supabase-js"
import type { LiveBelvoAnchors } from "@/lib/integrations/belvoLiveAnchors"
import { fetchLiveBelvoAnchors, filterBelvoOrphanTransactions } from "@/lib/integrations/belvoLiveAnchors"
import type { FinanceTransaction } from "@/lib/finanzas/types"
import { normalizeTransactionDateIsoDay } from "@/lib/finanzas/transactionDate"

/**
 * Tamaño de página solicitado a PostgREST. El proyecto puede tener `max_rows` menor (p. ej. 500):
 * hay que avanzar `from` según filas devueltas, no asumir página llena = fin del dataset.
 */
const RANGE_PAGE_SIZE = 1000
const RANGE_HARD_CAP = 400_000

export type GetTransactionsByRangeOpts = {
  householdId?: string
  /** Si viene definido (p. ej. prefetch), evita repetir el RPC en la misma petición. */
  belvoAnchors?: LiveBelvoAnchors | null
}

function normalizeTxDates(rows: FinanceTransaction[]): FinanceTransaction[] {
  return rows.map((row) => ({
    ...row,
    date: normalizeTransactionDateIsoDay(row.date),
  }))
}

/** Rango crudo sin filtrar huérfanos Belvo (p. ej. para detectar cuentas con actividad no Belvo). */
export async function fetchTransactionsByRangeRaw(
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

  return normalizeTxDates(acc)
}

export async function getTransactionsByRange(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
  opts?: GetTransactionsByRangeOpts,
): Promise<FinanceTransaction[]> {
  const raw = await fetchTransactionsByRangeRaw(supabase, startDate, endDate)
  if (!opts?.householdId) {
    return raw
  }
  let anchors: LiveBelvoAnchors | null | undefined = opts.belvoAnchors
  if (anchors === undefined) {
    anchors = await fetchLiveBelvoAnchors(supabase, opts.householdId)
  }
  return filterBelvoOrphanTransactions(raw, anchors ?? null)
}
