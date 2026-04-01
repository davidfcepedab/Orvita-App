import { TRANSACTION_CSV_HEADERS_ES } from "@/lib/finanzas/transactionsCsv"

export type TransactionsImportParsedRow = {
  fecha: string
  tipo: "income" | "expense"
  categoria: string
  subcategoria: string
  cuenta: string
  concepto: string
  monto: number
}

export type TransactionsImportLineError = {
  line: number
  message: string
}

/** Quita acentos para comparar cabeceras. */
function normalizeHeaderKey(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .toLowerCase()
}

/** Parseo CSV mínimo con comillas dobles. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ""
  let i = 0
  let inQ = false
  while (i < line.length) {
    const c = line[i]!
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i += 2
          continue
        }
        inQ = false
        i += 1
        continue
      }
      cur += c
      i += 1
      continue
    }
    if (c === '"') {
      inQ = true
      i += 1
      continue
    }
    if (c === ",") {
      out.push(cur)
      cur = ""
      i += 1
      continue
    }
    cur += c
    i += 1
  }
  out.push(cur)
  return out
}

const REQUIRED_KEYS = ["fecha", "tipo", "categoria", "subcategoria", "cuenta", "concepto", "monto"] as const

function mapHeaderIndex(headerCells: string[]): Map<string, number> | null {
  const positions = new Map<string, number>()
  for (const key of REQUIRED_KEYS) {
    const idx = headerCells.findIndex((h) => normalizeHeaderKey(h) === key)
    if (idx === -1) return null
    positions.set(key, idx)
  }
  return positions
}

function parseIsoDate(s: string): string | null {
  const t = s.trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t)
  if (iso) {
    const y = Number(iso[1])
    const m = Number(iso[2])
    const d = Number(iso[3])
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31) return t
  }
  const dm = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t)
  if (dm) {
    const d = Number(dm[1])
    const m = Number(dm[2])
    const y = Number(dm[3])
    if (m >= 1 && m <= 12 && d >= 1 && d <= 31 && y >= 2000 && y <= 2100) {
      return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
    }
  }
  return null
}

function parseMoney(s: string): number | null {
  let t = s.trim().replace(/\s/g, "")
  if (!t) return null
  if (/^\d+[.,]\d{3}([.,]\d+)?$/.test(t.replace(/[^\d.,]/g, ""))) {
    t = t.replace(/\./g, "").replace(",", ".")
  } else {
    t = t.replace(/,/g, ".")
  }
  const n = Number(t)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.round(n * 100) / 100
}

function parseTipo(raw: string): "income" | "expense" | null {
  const x = raw.trim().toLowerCase()
  if (x === "ingreso" || x === "income") return "income"
  if (x === "gasto" || x === "expense") return "expense"
  return null
}

/**
 * Parsea CSV con la cabecera de `TRANSACTION_CSV_HEADERS_ES` (orden flexible).
 * Devuelve filas válidas y errores por línea de datos (1-based respecto al archivo; incluye cabecera).
 */
export function parseTransactionsImportCsv(text: string): {
  rows: TransactionsImportParsedRow[]
  errors: TransactionsImportLineError[]
} {
  const rows: TransactionsImportParsedRow[] = []
  const errors: TransactionsImportLineError[] = []
  const raw = text.replace(/^\uFEFF/, "")
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0)
  if (lines.length < 2) {
    errors.push({ line: 1, message: "El archivo debe tener cabecera y al menos una fila de datos." })
    return { rows, errors }
  }

  const headerCells = splitCsvLine(lines[0]!)
  const pos = mapHeaderIndex(headerCells)
  if (!pos) {
    errors.push({
      line: 1,
      message: `Cabecera inválida. Se esperan columnas: ${TRANSACTION_CSV_HEADERS_ES.join(", ")}`,
    })
    return { rows, errors }
  }

  const cellAt = (key: (typeof REQUIRED_KEYS)[number], cells: string[]) => {
    const j = pos.get(key)
    if (j === undefined) return ""
    return (cells[j] ?? "").trim()
  }

  for (let li = 1; li < lines.length; li += 1) {
    const lineNum = li + 1
    const cells = splitCsvLine(lines[li]!)

    const fechaRaw = cellAt("fecha", cells)
    const tipoRaw = cellAt("tipo", cells)
    const categoria = cellAt("categoria", cells)
    const subcategoria = cellAt("subcategoria", cells)
    const cuenta = cellAt("cuenta", cells)
    const concepto = cellAt("concepto", cells)
    const montoRaw = cellAt("monto", cells)

    if (!fechaRaw && !tipoRaw && !categoria && !montoRaw) continue

    const fecha = parseIsoDate(fechaRaw)
    if (!fecha) {
      errors.push({ line: lineNum, message: `Fecha inválida: "${fechaRaw}"` })
      continue
    }
    const tipo = parseTipo(tipoRaw)
    if (!tipo) {
      errors.push({ line: lineNum, message: `Tipo inválido (use Gasto o Ingreso): "${tipoRaw}"` })
      continue
    }
    const monto = parseMoney(montoRaw)
    if (monto == null) {
      errors.push({ line: lineNum, message: `Monto inválido: "${montoRaw}"` })
      continue
    }

    rows.push({
      fecha,
      tipo,
      categoria: categoria || "Sin categoría",
      subcategoria: subcategoria || "",
      cuenta: cuenta || "",
      concepto: concepto || "(sin descripción)",
      monto,
    })
  }

  return { rows, errors }
}
