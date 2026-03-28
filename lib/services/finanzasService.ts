import type { SupabaseClient } from "@supabase/supabase-js"
import type { FinanceTransaction } from "@/lib/finanzas/types"

export async function getTransactionsByRange(
  supabase: SupabaseClient,
  startDate: string,
  endDate: string,
): Promise<FinanceTransaction[]> {
  const { data, error } = await supabase
    .from("orbita_finance_transactions")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .is("deleted_at", null)
    .order("date", { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []) as FinanceTransaction[]
}