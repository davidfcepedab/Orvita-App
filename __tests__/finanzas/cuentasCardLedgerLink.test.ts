import {
  ledgerFinanceAccountUuidFromCard,
  normalizeReplacesSyntheticId,
} from "@/lib/finanzas/cuentasCardLedgerLink"

describe("cuentasCardLedgerLink", () => {
  test("normalizeReplacesSyntheticId añade prefijo ledger- a UUID suelto", () => {
    const u = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    expect(normalizeReplacesSyntheticId(u)).toBe(`ledger-${u}`)
    expect(normalizeReplacesSyntheticId(`ledger-${u}`)).toBe(`ledger-${u}`)
  })

  test("ledgerFinanceAccountUuidFromCard desde manual que reemplaza ledger", () => {
    const u = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"
    expect(
      ledgerFinanceAccountUuidFromCard({
        id: "manual-cc-1",
        replacesSyntheticId: `ledger-${u}`,
      }),
    ).toBe(u)
    expect(
      ledgerFinanceAccountUuidFromCard({
        id: "manual-cc-1",
        replacesSyntheticId: u,
      }),
    ).toBe(u)
  })
})
