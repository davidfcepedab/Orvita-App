import { buildShoppingListPlainText, buildShoppingListPrintHtml } from "@/lib/training/shoppingListExport"

describe("shoppingListExport", () => {
  test("buildShoppingListPlainText incluye cabecera y filas", () => {
    const text = buildShoppingListPlainText({
      targets: { kcal: 2200, p: 180, c: 250, f: 70 },
      prep: [{ title: "Batch", detail: "Cocinar", minutes: 30 }],
    })
    expect(text).toContain("2200")
    expect(text).toContain("Batch")
    expect(text).toContain("30 min")
  })

  test("buildShoppingListPrintHtml escapa HTML", () => {
    const html = buildShoppingListPrintHtml("T", "a<b>\n&")
    expect(html).toContain("&lt;b&gt;")
    expect(html).toContain("&amp;")
    expect(html).toContain("<br/>")
  })
})
