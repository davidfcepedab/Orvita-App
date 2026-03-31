import { cumulativeNetByAhorroLedgerRows } from "@/lib/finanzas/ledgerAccountTxRollup"
import type { FinanceTransaction } from "@/lib/finanzas/types"

describe("cumulativeNetByAhorroLedgerRows", () => {
  test("suma por finance_account_id en una pasada", () => {
    const savings = [
      { id: "a1", label: "Ahorros | X | Y" },
      { id: "a2", label: "Ahorros | Z | W" },
    ]
    const rows: FinanceTransaction[] = [
      {
        id: "t1",
        date: "2026-03-01",
        description: "",
        amount: 1_000_000,
        type: "income",
        category: "Otros",
        created_at: "2026-03-01T00:00:00Z",
        updated_at: "2026-03-01T00:00:00Z",
        finance_account_id: "a1",
      },
      {
        id: "t2",
        date: "2026-03-02",
        description: "",
        amount: 200_000,
        type: "expense",
        category: "Otros",
        created_at: "2026-03-02T00:00:00Z",
        updated_at: "2026-03-02T00:00:00Z",
        finance_account_id: "a1",
      },
      {
        id: "t3",
        date: "2026-03-03",
        description: "",
        amount: 500_000,
        type: "income",
        category: "Otros",
        created_at: "2026-03-03T00:00:00Z",
        updated_at: "2026-03-03T00:00:00Z",
        finance_account_id: "a2",
      },
    ]
    const m = cumulativeNetByAhorroLedgerRows(savings, rows, "2026-03-31")
    expect(m.get("a1")).toBe(800_000)
    expect(m.get("a2")).toBe(500_000)
  })
})
