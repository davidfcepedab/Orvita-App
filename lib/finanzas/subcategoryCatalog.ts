import type { SupabaseClient } from "@supabase/supabase-js"

export type FinanceSubcategoryCatalogEntry = {
  subcategory: string
  category: string
  expense_type: "fijo" | "variable"
  financial_impact: string
  budgetable: boolean
  active: boolean
  comment?: string | null
}

export type FinanceSubcategoryCatalogRow = FinanceSubcategoryCatalogEntry & {
  id: string
  household_id: string | null
}

export function normalizeFinanceCatalogKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ")
}

/** PostgREST / Supabase devuelve `{ message, details, hint, code }`, no siempre `Error`. */
export function formatPostgrestError(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>
    const message = o.message != null ? String(o.message) : ""
    const details = o.details != null ? String(o.details) : ""
    const hint = o.hint != null ? String(o.hint) : ""
    const code = o.code != null ? String(o.code) : ""
    const line = [message, details, hint, code && `code=${code}`].filter(Boolean).join(" — ")
    if (line) return line
  }
  try {
    return JSON.stringify(err)
  } catch {
    return String(err)
  }
}

function rowFromDb(r: Record<string, unknown>): FinanceSubcategoryCatalogRow {
  return {
    id: String(r.id),
    household_id: (r.household_id as string | null) ?? null,
    subcategory: String(r.subcategory ?? ""),
    category: String(r.category ?? ""),
    expense_type: r.expense_type === "variable" ? "variable" : "fijo",
    financial_impact: String(r.financial_impact ?? ""),
    budgetable: Boolean(r.budgetable),
    active: r.active !== false,
    comment: (r.comment as string | null) ?? null,
  }
}

/** Catálogo global + filas del hogar (las del hogar pisan subcategoría homónima). */
export async function fetchSubcategoryCatalogMerged(
  supabase: SupabaseClient,
  householdId: string,
): Promise<FinanceSubcategoryCatalogRow[]> {
  const { data: global, error: gErr } = await supabase
    .from("orbita_finance_subcategory_catalog")
    .select("id, household_id, subcategory, category, expense_type, financial_impact, budgetable, active, comment")
    .is("household_id", null)
    .eq("active", true)

  if (gErr) throw new Error(formatPostgrestError(gErr))

  const { data: local, error: lErr } = await supabase
    .from("orbita_finance_subcategory_catalog")
    .select("id, household_id, subcategory, category, expense_type, financial_impact, budgetable, active, comment")
    .eq("household_id", householdId)
    .eq("active", true)

  if (lErr) throw new Error(formatPostgrestError(lErr))

  const byNorm = new Map<string, FinanceSubcategoryCatalogRow>()
  for (const raw of global ?? []) {
    const r = rowFromDb(raw as Record<string, unknown>)
    byNorm.set(normalizeFinanceCatalogKey(r.subcategory), r)
  }
  for (const raw of local ?? []) {
    const r = rowFromDb(raw as Record<string, unknown>)
    byNorm.set(normalizeFinanceCatalogKey(r.subcategory), r)
  }

  return [...byNorm.values()].sort(
    (a, b) => a.category.localeCompare(b.category, "es") || a.subcategory.localeCompare(b.subcategory, "es"),
  )
}

/** Claves normalizadas aceptadas para validación de import (global + hogar). */
export async function loadCatalogNormalizedKeys(
  supabase: SupabaseClient,
  householdId: string,
): Promise<Set<string>> {
  const rows = await fetchSubcategoryCatalogMerged(supabase, householdId)
  return new Set(rows.map((r) => normalizeFinanceCatalogKey(r.subcategory)))
}
