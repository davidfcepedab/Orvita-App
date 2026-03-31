import {
  classifyLedgerTransactionLink,
  transactionMatchesLedgerAccount,
} from "@/lib/finanzas/ledgerAccountTxRollup"
import type { FinanceTransaction } from "@/lib/finanzas/types"

const baseTx = (over: Partial<FinanceTransaction>): FinanceTransaction => ({
  id: "x",
  date: "2026-03-15",
  description: "",
  amount: 100_000,
  type: "expense",
  category: "X",
  created_at: "",
  updated_at: "",
  ...over,
})

describe("classifyLedgerTransactionLink", () => {
  const accountId = "acc-1"
  const ledgerLabel = "TC | Visa Villas | Juan | 5419"

  test("fk wins when finance_account_id matches", () => {
    const t = baseTx({ finance_account_id: accountId, account_label: "otra cosa" })
    expect(classifyLedgerTransactionLink(t, accountId, ledgerLabel)).toBe("fk")
  })

  test("label when account_label normalizes equal to ledger", () => {
    const t = baseTx({
      account_label: "TC|Visa Villas|Juan|5419",
      finance_account_id: null,
    })
    expect(classifyLedgerTransactionLink(t, accountId, ledgerLabel)).toBe("label")
  })

  test("last4 when no FK even if account_label is wrong or generic", () => {
    const t = baseTx({
      description: "COMPRA FARMATODO ref 5419",
      account_label: "Gastos fijos",
      finance_account_id: null,
    })
    expect(classifyLedgerTransactionLink(t, accountId, ledgerLabel)).toBe("last4")
  })

  test("no last4 match when finance_account_id is set to another id", () => {
    const t = baseTx({
      description: "5419",
      finance_account_id: "other-uuid",
      account_label: "",
    })
    expect(classifyLedgerTransactionLink(t, accountId, ledgerLabel)).toBeNull()
  })

  test("transactionMatchesLedgerAccount mirrors classify", () => {
    const t = baseTx({
      description: "Pago tarjeta 6732",
      account_label: "nada que ver",
      finance_account_id: null,
    })
    const label6732 = "TC | Banco | Ana | 6732"
    expect(transactionMatchesLedgerAccount(t, "acc-2", label6732)).toBe(true)
  })
})
