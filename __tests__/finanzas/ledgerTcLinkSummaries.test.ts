import { summarizeTcMovementLinks } from "@/lib/finanzas/ledgerTcLinkSummaries"
import type { LedgerAccountSortable } from "@/lib/finanzas/sortLedgerAccounts"
import type { FinanceTransaction } from "@/lib/finanzas/types"

describe("summarizeTcMovementLinks", () => {
  const tc: LedgerAccountSortable = {
    id: "c1",
    label: "TC | Visa Villas | Juan | 5419",
    account_class: "tarjeta_credito",
    nature: "pasivo_rotativo",
    credit_limit: 25_000_000,
    balance_used: 0,
    sort_order: 0,
  }

  test("counts fk, label and last4 links separately", () => {
    const rows: FinanceTransaction[] = [
      {
        id: "a",
        date: "2026-03-01",
        description: "A",
        amount: 10_000,
        type: "expense",
        category: "X",
        created_at: "",
        updated_at: "",
        finance_account_id: "c1",
      },
      {
        id: "b",
        date: "2026-03-02",
        description: "B",
        amount: 20_000,
        type: "expense",
        category: "X",
        created_at: "",
        updated_at: "",
        account_label: "TC | Visa Villas | Juan | 5419",
      },
      {
        id: "c",
        date: "2026-03-03",
        description: "Pago 5419",
        amount: 5_000,
        type: "expense",
        category: "X",
        created_at: "",
        updated_at: "",
        account_label: "",
        finance_account_id: null,
      },
    ]
    const [s] = summarizeTcMovementLinks([tc], rows, "2026-03-31")
    expect(s.matchedCount).toBe(3)
    expect(s.byFk).toBe(1)
    expect(s.byLabel).toBe(1)
    expect(s.byLast4).toBe(1)
    expect(s.netExpense).toBe(35_000)
  })
})
