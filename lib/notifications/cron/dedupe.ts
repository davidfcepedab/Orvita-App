import type { SupabaseClient } from "@supabase/supabase-js"

/**
 * @returns true si esta ejecución puede enviar (primera vez hoy para user+job+fecha).
 */
export async function tryAcquireCronSend(
  supabase: SupabaseClient,
  userId: string,
  job: string,
  scopeDate: string,
): Promise<boolean> {
  const { error } = await supabase.from("orbita_cron_notification_sent").insert({
    user_id: userId,
    job,
    scope_date: scopeDate,
  })

  if (error) {
    if (/duplicate key|unique constraint/i.test(error.message)) {
      return false
    }
    console.error("tryAcquireCronSend:", error.message)
    return false
  }
  return true
}
