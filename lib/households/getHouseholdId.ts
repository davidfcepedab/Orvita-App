import type { SupabaseClient } from "@supabase/supabase-js"

type UserRow = {
  household_id: string | null
}

export async function getHouseholdId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("users")
    .select("household_id")
    .eq("id", userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  const row = data as UserRow | null
  return row?.household_id ?? null
}
