import type { FinanceSubcategoryCatalogRow } from "@/lib/finanzas/subcategoryCatalog"
import { normalizeFinanceCatalogKey } from "@/lib/finanzas/subcategoryCatalog"

/**
 * Subcategorías cuyo nombre (normalizado) aparece en más de una categoría:
 * en la plantilla Excel el desplegable usa «Sub (Categoría)» para desambiguar.
 */
export function buildSubcategoryDuplicateNormalizedSet(rows: FinanceSubcategoryCatalogRow[]): Set<string> {
  const bySub = new Map<string, Set<string>>()
  for (const r of rows) {
    if (r.active === false) continue
    const c = String(r.category ?? "").trim()
    const s = String(r.subcategory ?? "").trim()
    if (!c || !s) continue
    const nk = normalizeFinanceCatalogKey(s)
    if (!bySub.has(nk)) bySub.set(nk, new Set())
    bySub.get(nk)!.add(normalizeFinanceCatalogKey(c))
  }
  const dups = new Set<string>()
  for (const [nk, cats] of bySub) {
    if (cats.size > 1) dups.add(nk)
  }
  return dups
}

export function subcategoryTemplateDropdownLabel(
  sub: string,
  category: string,
  duplicateNormalizedSubs: Set<string>,
): string {
  const nk = normalizeFinanceCatalogKey(sub)
  return duplicateNormalizedSubs.has(nk) ? `${sub} (${category})` : sub
}

export type TemplatePairRow = { category: string; sub: string; label: string }

export function buildTemplatePairRows(rows: FinanceSubcategoryCatalogRow[]): TemplatePairRow[] {
  const dups = buildSubcategoryDuplicateNormalizedSet(rows)
  const out: TemplatePairRow[] = []
  for (const r of rows) {
    if (r.active === false) continue
    const c = String(r.category ?? "").trim()
    const s = String(r.subcategory ?? "").trim()
    if (!c || !s) continue
    out.push({
      category: c,
      sub: s,
      label: subcategoryTemplateDropdownLabel(s, c, dups),
    })
  }
  out.sort(
    (a, b) =>
      a.label.localeCompare(b.label, "es") || a.category.localeCompare(b.category, "es"),
  )
  return out
}
