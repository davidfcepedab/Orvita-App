export interface FinanceTransaction {
  id: string
  profile_id: string
  date: string
  description: string
  amount: number
  category: string
  subcategory?: string | null
  created_at: string
  updated_at: string
}
