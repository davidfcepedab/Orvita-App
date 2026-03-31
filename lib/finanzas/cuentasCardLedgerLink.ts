/**
 * Las tarjetas grandes en Capital pueden venir de:
 * - Catálogo oficial: `orbita_finance_accounts` → id UI `ledger-{uuid}`
 * - Insertos manuales: `household_finance_manual_items` → id `manual-cc-*` / `manual-saving-*` / `manual-loan-*`
 *   a veces con `replacesSyntheticId` apuntando al ledger sustituido.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Acepta `ledger-{uuid}` o solo `uuid` (datos viejos) para alinear con ids de tarjeta API.
 */
export function normalizeReplacesSyntheticId(raw: string | undefined | null): string | undefined {
  const s = typeof raw === "string" ? raw.trim() : ""
  if (!s) return undefined
  if (s.startsWith("ledger-")) return s
  if (UUID_RE.test(s)) return `ledger-${s}`
  return s
}

/** UUID de `orbita_finance_accounts` si esta tarjeta representa esa fila (directa o vía manual que reemplaza). */
export function ledgerFinanceAccountUuidFromCard(card: {
  id: string
  replacesSyntheticId?: string
}): string | null {
  if (card.id.startsWith("ledger-")) {
    return card.id.slice("ledger-".length).trim() || null
  }
  const rep = normalizeReplacesSyntheticId(card.replacesSyntheticId)
  if (rep?.startsWith("ledger-")) {
    return rep.slice("ledger-".length).trim() || null
  }
  return null
}

export function cardUsesLedgerCatalogRow(card: {
  id: string
  replacesSyntheticId?: string
}): boolean {
  return ledgerFinanceAccountUuidFromCard(card) != null
}
