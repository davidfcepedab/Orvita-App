import ExcelJS from "exceljs"
import type { DataValidation } from "exceljs"
import type { FinanceSubcategoryCatalogRow } from "@/lib/finanzas/subcategoryCatalog"

/** exceljs runtime incluye dataValidations; los tipos .d.ts no lo exponen. */
function addDataValidation(
  ws: ExcelJS.Worksheet,
  address: string,
  validation: DataValidation,
): void {
  const w = ws as ExcelJS.Worksheet & {
    dataValidations: { add: (a: string, v: DataValidation) => void }
  }
  w.dataValidations.add(address, validation)
}

/** Columna Excel 1-based → letras (1=A, 27=AA). */
export function excelColumnLetter(columnIndex1Based: number): string {
  let n = columnIndex1Based
  let s = ""
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

const MOV_HEADERS = ["Fecha", "Tipo", "Categoría", "Subcategoría", "Cuenta", "Concepto", "Monto"] as const
const MAX_DATA_ROWS = 4000
/** Filas por columna de subcategorías en hoja Listas (OFFSET). */
const SUB_COLUMN_ROWS = 120

function buildCategorySubMap(rows: FinanceSubcategoryCatalogRow[]): Map<string, string[]> {
  const byCat = new Map<string, Set<string>>()
  for (const r of rows) {
    if (r.active === false) continue
    const c = String(r.category ?? "").trim()
    const s = String(r.subcategory ?? "").trim()
    if (!c || !s) continue
    if (!byCat.has(c)) byCat.set(c, new Set())
    byCat.get(c)!.add(s)
  }
  const out = new Map<string, string[]>()
  for (const [c, set] of byCat) {
    out.set(c, [...set].sort((a, b) => a.localeCompare(b, "es")))
  }
  return out
}

/**
 * Plantilla .xlsx: desplegable Tipo; categorías desde columna A de Listas;
 * subcategorías dependientes vía OFFSET/MATCH sobre la fila 1 de Listas (categorías en B1…);
 * cuentas del hogar en una columna de Listas y validación sugerida en E.
 */
export async function buildTransactionsTemplateXlsxBuffer(
  catalogRows: FinanceSubcategoryCatalogRow[],
  accountLabels: string[],
): Promise<ArrayBuffer> {
  const map = buildCategorySubMap(catalogRows)
  const categories = [...map.keys()].sort((a, b) => a.localeCompare(b, "es"))

  const wb = new ExcelJS.Workbook()
  wb.creator = "ÓRVITA"
  wb.created = new Date()

  const mov = wb.addWorksheet("Movimientos", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  })
  const listas = wb.addWorksheet("Listas", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  })

  listas.getColumn(1).width = 28
  listas.getRow(1).font = { bold: true }
  listas.getCell("A1").value = "Categorías (para columna C)"

  let catStartRow = 2
  for (const c of categories) {
    listas.getCell(`A${catStartRow}`).value = c
    catStartRow += 1
  }
  const lastCatRow = Math.max(1, catStartRow - 1)

  // Fila 1: B1… = cabeceras de categoría; debajo, subcategorías por columna
  const firstCatCol = 2 // B
  const nCat = categories.length
  for (let i = 0; i < nCat; i += 1) {
    const col = firstCatCol + i
    const letter = excelColumnLetter(col)
    const cat = categories[i]!
    listas.getCell(`${letter}1`).value = cat
    listas.getColumn(col).width = 22
    const subs = map.get(cat) ?? []
    for (let r = 0; r < Math.min(subs.length, SUB_COLUMN_ROWS); r += 1) {
      listas.getCell(`${letter}${r + 2}`).value = subs[r]
    }
  }

  const endColLetter = nCat > 0 ? excelColumnLetter(firstCatCol + nCat - 1) : "B"

  /** Columna en Listas para etiquetas de cuenta (no solapa con bloques de subcategorías). */
  const accountsColIndex = nCat === 0 ? 2 : firstCatCol + nCat
  const accLetter = excelColumnLetter(accountsColIndex)
  const sortedAccounts = [...new Set(accountLabels.map((a) => a.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es"),
  )
  const maxAccRows = Math.min(sortedAccounts.length, 500)
  listas.getCell(`${accLetter}1`).value = "Cuentas — usar en columna E (Movimientos)"
  listas.getCell(`${accLetter}1`).font = { bold: true }
  listas.getColumn(accountsColIndex).width = 26
  for (let i = 0; i < maxAccRows; i += 1) {
    listas.getCell(`${accLetter}${i + 2}`).value = sortedAccounts[i] ?? ""
  }
  const lastAccRow = Math.max(2, 1 + maxAccRows)

  mov.columns = [
    { width: 12 },
    { width: 10 },
    { width: 22 },
    { width: 22 },
    { width: 20 },
    { width: 36 },
    { width: 12 },
  ]

  MOV_HEADERS.forEach((h, i) => {
    mov.getCell(1, i + 1).value = h
  })
  mov.getRow(1).font = { bold: true }

  const firstCat = categories[0]
  const firstSub = firstCat ? (map.get(firstCat)?.[0] ?? "") : ""
  mov.getCell("A2").value = "2026-04-01"
  mov.getCell("B2").value = "Gasto"
  mov.getCell("C2").value = firstCat ?? ""
  mov.getCell("D2").value = firstSub
  mov.getCell("E2").value = sortedAccounts[0] ?? ""
  mov.getCell("F2").value = "Ejemplo: compra / transferencia"
  mov.getCell("G2").value = 150000

  const lastMovRow = 1 + MAX_DATA_ROWS

  addDataValidation(mov, `B2:B${lastMovRow}`, {
    type: "list",
    allowBlank: false,
    formulae: ['"Gasto,Ingreso"'],
    showInputMessage: true,
    promptTitle: "Tipo",
    prompt: "Gasto o Ingreso.",
    showErrorMessage: true,
    errorStyle: "error",
    errorTitle: "Tipo",
    error: "Elija Gasto o Ingreso.",
  })

  if (categories.length > 0) {
    addDataValidation(mov, `C2:C${lastMovRow}`, {
      type: "list",
      allowBlank: false,
      formulae: [`=Listas!$A$2:$A$${lastCatRow}`],
      showInputMessage: true,
      promptTitle: "Categoría",
      prompt: "Debe existir en el catálogo del hogar.",
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Categoría",
      error: "Elija una categoría de la lista (hoja Listas, columna A).",
    })

    const subFormula = `=OFFSET(Listas!$B$2,0,MATCH($C2,Listas!$B$1:$${endColLetter}$1,0)-1,${SUB_COLUMN_ROWS},1)`
    addDataValidation(mov, `D2:D${lastMovRow}`, {
      type: "list",
      allowBlank: true,
      formulae: [subFormula],
      showInputMessage: true,
      promptTitle: "Subcategoría",
      prompt: "Primero elija categoría en C; la lista depende de esa celda.",
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Subcategoría",
      error: "Elija una subcategoría válida para la categoría indicada en C.",
    })
  }

  if (sortedAccounts.length > 0) {
    addDataValidation(mov, `E2:E${lastMovRow}`, {
      type: "list",
      allowBlank: true,
      formulae: [`=Listas!$${accLetter}$2:$${accLetter}$${lastAccRow}`],
      showInputMessage: true,
      promptTitle: "Cuenta",
      prompt:
        "Elija una cuenta del hogar (hoja Listas). Si escribe una etiqueta nueva, se creará la cuenta al importar el CSV.",
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Cuenta",
      error: "Valor no está en la lista. Puede continuar si es una cuenta nueva; se creará al importar.",
    })
  }

  mov.getCell("H1").value =
    [
      "Rellene desde la fila 2. C y D: par del catálogo (en D la subcategoría depende de C).",
      "Tipo de gasto (fijo/variable/…) e impacto financiero (operativo/inversión/…) los toma el sistema del catálogo al usar un par válido.",
      "E: cuentas en Listas; etiqueta nueva → se crea la cuenta al importar.",
      "Exporte «Movimientos» a CSV (UTF-8) para importar aquí.",
    ].join(" ")
  mov.getCell("H1").font = { italic: true, size: 9 }
  mov.getRow(1).height = 48
  mov.getCell("H1").alignment = { wrapText: true, vertical: "top" }

  const buf = await wb.xlsx.writeBuffer()
  return buf as ArrayBuffer
}
