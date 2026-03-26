import type { FinanceTransaction } from "@/lib/finanzas/types"

export async function getTransactionsByRange(
  startDate: string,
  endDate: string
): Promise<FinanceTransaction[]> {
  const supabase = (await import("@/lib/supabase/server")).createClient()

  const { data, error } = await supabase
    .from('orbita_finance_transactions')
    .select('*')
    .gte('date', startDate)
    .lte('date', endDate)
    .order('date', { ascending: true })

  if (error) throw new Error(error.message)

  return (data ?? []) as FinanceTransaction[]
}