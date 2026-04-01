import type { SupabaseClient } from "@supabase/supabase-js"
import { inferFinanceAccountMeta } from "@/lib/finanzas/inferFinanceAccount"
import { formatPostgrestError } from "@/lib/finanzas/subcategoryCatalog"

/**
 * Garantiza que exista una fila en `orbita_finance_accounts` por etiqueta (columna Cuenta).
 * Devuelve mapa label en minúsculas → id.
 */
export async function ensureFinanceAccountsForLabels(
  supabase: SupabaseClient,
  householdId: string,
  labels: string[],
): Promise<Map<string, string>> {
  const byKey = new Map<string, string>()
  const unique = [...new Set(labels.map((l) => l.trim()).filter(Boolean))]
  if (unique.length === 0) return byKey

  const { data: existing, error: e0 } = await supabase
    .from("orbita_finance_accounts")
    .select("id, label")
    .eq("household_id", householdId)
    .is("deleted_at", null)

  if (e0) throw new Error(formatPostgrestError(e0))

  for (const row of existing ?? []) {
    const r = row as { id: string; label: string }
    byKey.set(r.label.trim().toLowerCase(), r.id)
  }

  const now = new Date().toISOString()
  const missing = unique.filter((l) => !byKey.has(l.toLowerCase()))

  for (const label of missing) {
    const meta = inferFinanceAccountMeta(label)
    const { data: ins, error: insErr } = await supabase
      .from("orbita_finance_accounts")
      .insert({
        household_id: householdId,
        label,
        account_class: meta.account_class,
        nature: meta.nature,
        sort_order: 0,
        created_at: now,
        updated_at: now,
      })
      .select("id")
      .single()

    if (insErr) {
      const { data: again, error: e2 } = await supabase
        .from("orbita_finance_accounts")
        .select("id, label")
        .eq("household_id", householdId)
        .is("deleted_at", null)
      if (e2) throw new Error(formatPostgrestError(e2))
      for (const row of again ?? []) {
        const r = row as { id: string; label: string }
        byKey.set(r.label.trim().toLowerCase(), r.id)
      }
      if (!byKey.has(label.toLowerCase())) {
        throw new Error(formatPostgrestError(insErr))
      }
      continue
    }
    byKey.set(label.toLowerCase(), (ins as { id: string }).id)
  }

  return byKey
}
