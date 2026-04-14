import ExcelJS from "exceljs"
import type { DataValidation } from "exceljs"
import type { FinanceSubcategoryCatalogRow } from "@/lib/finanzas/subcategoryCatalog"
import { buildTemplatePairRows } from "@/lib/finanzas/subcategoryTemplateLabel"

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

/**
 * Plantilla .xlsx: desplegable Tipo; en D elija **subcategoría** (lista única);
 * la **categoría** en C se rellena sola con fórmula (INDEX/MATCH sobre Listas).
 * Cuentas del hogar en Listas y validación sugerida en E.
 */
export async function buildTransactionsTemplateXlsxBuffer(
  catalogRows: FinanceSubcategoryCatalogRow[],
  accountLabels: string[],
): Promise<ArrayBuffer> {
  const pairRows = buildTemplatePairRows(catalogRows)
  const lastPairRow = Math.max(1, pairRows.length + 1)

  const wb = new ExcelJS.Workbook()
  wb.creator = "ÓRVITA"
  wb.created = new Date()

  const mov = wb.addWorksheet("Movimientos", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  })
  const listas = wb.addWorksheet("Listas", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 1 }],
  })

  listas.getColumn(1).width = 26
  listas.getColumn(2).width = 22
  listas.getColumn(3).width = 36
  listas.getRow(1).font = { bold: true }
  listas.getCell("A1").value = "Categoría"
  listas.getCell("B1").value = "Subcategoría"
  listas.getCell("C1").value = "Desplegable (columna D en Movimientos)"

  for (let i = 0; i < pairRows.length; i += 1) {
    const pr = pairRows[i]!
    const row = i + 2
    listas.getCell(row, 1).value = pr.category
    listas.getCell(row, 2).value = pr.sub
    listas.getCell(row, 3).value = pr.label
  }

  /** Columna D en Listas = cuentas (no solapa con A:C de pares). */
  const accLetter = "D"
  const sortedAccounts = [...new Set(accountLabels.map((a) => a.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "es"),
  )
  const maxAccRows = Math.min(sortedAccounts.length, 500)
  listas.getCell(`${accLetter}1`).value = "Cuentas — usar en columna E (Movimientos)"
  listas.getCell(`${accLetter}1`).font = { bold: true }
  listas.getColumn(4).width = 26
  for (let i = 0; i < maxAccRows; i += 1) {
    listas.getCell(`${accLetter}${i + 2}`).value = sortedAccounts[i] ?? ""
  }
  const lastAccRow = Math.max(2, 1 + maxAccRows)

  mov.columns = [
    { width: 12 },
    { width: 10 },
    { width: 22 },
    { width: 28 },
    { width: 20 },
    { width: 36 },
    { width: 12 },
  ]

  MOV_HEADERS.forEach((h, i) => {
    mov.getCell(1, i + 1).value = h
  })
  mov.getRow(1).font = { bold: true }

  const firstPair = pairRows[0]
  mov.getCell("A2").value = "2026-04-01"
  mov.getCell("B2").value = "Gasto"
  mov.getCell("E2").value = sortedAccounts[0] ?? ""
  mov.getCell("F2").value = "Ejemplo: compra / transferencia"
  mov.getCell("G2").value = 150000

  const lastMovRow = 1 + MAX_DATA_ROWS

  if (pairRows.length > 0) {
    mov.getCell("D2").value = firstPair!.label
    for (let r = 2; r <= lastMovRow; r += 1) {
      mov.getCell(r, 3).value = {
        formula: `IF($D${r}="","",IFERROR(INDEX(Listas!$A:$A,MATCH($D${r},Listas!$C:$C,0)),""))`,
      }
    }
  } else {
    mov.getCell("C2").value = ""
    mov.getCell("D2").value = ""
  }

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

  if (pairRows.length > 0) {
    addDataValidation(mov, `D2:D${lastMovRow}`, {
      type: "list",
      allowBlank: false,
      formulae: [`=Listas!$C$2:$C$${lastPairRow}`],
      showInputMessage: true,
      promptTitle: "Subcategoría",
      prompt: "Elija la subcategoría; la categoría (columna C) se rellena sola.",
      showErrorMessage: true,
      errorStyle: "warning",
      errorTitle: "Subcategoría",
      error: "Elija un valor de la lista (hoja Listas, columna de desplegable).",
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
      "Rellene desde la fila 2. Elija la subcategoría en D (lista); la categoría en C es automática.",
      "Si un mismo nombre de subcategoría existe en varias categorías, la lista muestra «Sub (Categoría)».",
      "Tipo de gasto e impacto financiero los toma el sistema del catálogo al usar un par válido.",
      "E: cuentas en Listas; etiqueta nueva → se crea la cuenta al importar.",
      "Exporte «Movimientos» a CSV (UTF-8) para importar aquí.",
    ].join(" ")
  mov.getCell("H1").font = { italic: true, size: 9 }
  mov.getRow(1).height = 52
  mov.getCell("H1").alignment = { wrapText: true, vertical: "top" }

  const buf = await wb.xlsx.writeBuffer()
  return buf as ArrayBuffer
}
