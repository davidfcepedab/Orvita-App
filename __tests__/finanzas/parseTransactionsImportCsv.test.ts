import {
  parseTransactionsImportCsv,
  resolveImportCategorySubcategory,
  splitCsvLine,
} from "@/lib/finanzas/parseTransactionsImportCsv"
import type { FinanceSubcategoryCatalogRow } from "@/lib/finanzas/subcategoryCatalog"
import { buildTransactionsExportCsv } from "@/lib/finanzas/transactionsCsv"

describe("parseTransactionsImportCsv", () => {
  test("splitCsvLine handles quoted commas", () => {
    expect(splitCsvLine(`a,"b,c",d`)).toEqual(["a", "b,c", "d"])
  })

  test("accepts semicolon delimiter (Excel regional ES)", () => {
    const csv =
      "Fecha;Tipo;Categoría;Subcategoría;Cuenta;Concepto;Monto\n" +
      "2026-04-01;Gasto;Hogar;Sub;A;Test;150000\n"
    const { rows, errors } = parseTransactionsImportCsv(csv)
    expect(errors).toHaveLength(0)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.monto).toBe(150000)
  })

  test("accepts negative amounts in CSV (uses absolute value)", () => {
    const csv =
      "Fecha,Tipo,Categoría,Subcategoría,Cuenta,Concepto,Monto\n" +
      "2026-04-01,Gasto,Hogar,Sub,A,Test,-50000\n"
    const { rows, errors } = parseTransactionsImportCsv(csv)
    expect(errors).toHaveLength(0)
    expect(rows[0]?.monto).toBe(50000)
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
    expect(rows[0]?.sourceLine).toBe(2)
  })
})

describe("resolveImportCategorySubcategory", () => {
  const catalog: FinanceSubcategoryCatalogRow[] = [
    { category: "A", subcategory: "Duplicada", active: true } as FinanceSubcategoryCatalogRow,
    { category: "B", subcategory: "Duplicada", active: true } as FinanceSubcategoryCatalogRow,
    { category: "C", subcategory: "Unica", active: true } as FinanceSubcategoryCatalogRow,
  ]

  test("resolves etiqueta plantilla con sub duplicada", () => {
    const r = resolveImportCategorySubcategory(catalog, "B", "Duplicada (B)")
    expect(r).toEqual({ categoria: "B", subcategoria: "Duplicada" })
  })

  test("resolves par plano cuando coincide", () => {
    const r = resolveImportCategorySubcategory(catalog, "C", "Unica")
    expect(r).toEqual({ categoria: "C", subcategoria: "Unica" })
  })

  test("resolves sub única sin categoría en CSV", () => {
    const r = resolveImportCategorySubcategory(catalog, "", "Unica")
    expect(r).toEqual({ categoria: "C", subcategoria: "Unica" })
  })
})
