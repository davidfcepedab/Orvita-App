import { excelColumnLetter } from "@/lib/finanzas/transactionsTemplateXlsx"

describe("excelColumnLetter", () => {
  test("maps 1-based column indices", () => {
    expect(excelColumnLetter(1)).toBe("A")
    expect(excelColumnLetter(2)).toBe("B")
    expect(excelColumnLetter(26)).toBe("Z")
    expect(excelColumnLetter(27)).toBe("AA")
  })
})
