/** Etiqueta estable para enlazar `bank_accounts` con `orbita_finance_accounts` (misma regla en connect y sync). */
export function orbitaLedgerLabelForBankAccount(account: { account_name: string; account_mask: string }): string {
  const name = account.account_name.trim() || "Cuenta"
  const mask = account.account_mask.trim() || "****"
  return `${name} · ${mask}`
}
