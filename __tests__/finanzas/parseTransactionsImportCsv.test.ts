import {
  parseTransactionsImportCsv,
  splitCsvLine,
} from "@/lib/finanzas/parseTransactionsImportCsv"
import { buildTransactionsExportCsv } from "@/lib/finanzas/transactionsCsv"

describe("parseTransactionsImportCsv", () => {
  test("splitCsvLine handles quoted commas", () => {
    expect(splitCsvLine(`a,"b,c",d`)).toEqual(["a", "b,c", "d"])
  })

  test("round-trips export csv format", () => {
    const csv = buildTransactionsExportCsv([
      {
        fecha: "2026-04-01",
        tipoLabel: "Gasto",
        categoria: "Alimentacion",
        subcategoria: "Mercado",
        cuenta: "TC",
        concepto: "Test",
        monto: 10000,
      },
    ])
    const { rows, errors } = parseTransactionsImportCsv(csv)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.fecha).toBe("2026-04-01")
    expect(rows[0]?.tipo).toBe("expense")
    expect(rows[0]?.monto).toBe(10000)
  })
})
