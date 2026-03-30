/**
 * Import rows from Google Sheets "Movimientos" into Supabase `orbita_finance_transactions`.
 *
 * Row mapping (Órbita Movimientos + legacy API_CONTRACT; 0-based columns):
 *   [0]  date
 *   [5]  description
 *   [6]  category
 *   [7]  subcategory
 *   [10] amount (signed: negative = expense, positive = income)
 *   [12] month key (optional filter; e.g. YYYY-MM aligned with sheet)
 *
 * Fallbacks si falla fecha o monto: fecha serial ampliada; d-m-a y d.m.a; col 12 YYYY-MM → día 1;
 * monto en cols 5/4/3 si parecen importe o parsean número; signo según Tipo (Ingreso/Gasto).
 *
 * Sheet convention → DB v2: amount always positive; `type` is income | expense.
 *
 * Env:
 *   GOOGLE_CREDENTIALS          — JSON or base64 service account (same as diagnose script)
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   — required (bypasses RLS for batch import)
 *   FINANCE_IMPORT_HOUSEHOLD_ID — uuid
 *   FINANCE_IMPORT_PROFILE_ID   — opcional: uuid de public.users como texto; si falta, se usa el
 *                                 primer usuario del hogar (misma fila household_id)
 *
 * Optional:
 *   FINANCE_SHEETS_SPREADSHEET_ID — default: Órbita control financiero (1A8uc…)
 *   FINANZAS_SPREADSHEET_ID       — mismo libro Órbita si no usas FINANCE_SHEETS_SPREADSHEET_ID
 *   FINANCE_SHEETS_GID            — gid de la URL (?gid=) = sheetId API; default 761723801 en libro Órbita
 *   FINANCE_SHEETS_RANGE          — rango A1 completo, ej. 'Mi hoja'!A2:U5000
 *   FINANCE_SHEETS_TAB            — solo nombre de pestaña (se combina con FINANCE_SHEETS_CELLS)
 *   FINANCE_SHEETS_CELLS          — default A2:U5000 si usas FINANCE_SHEETS_TAB
 *   FINANCE_SHEETS_DATE_ORDER     — DMY (default, hoja CO) o MDY para fechas d/m/y vs m/d/y
 *
 * Usage:
 *   npx tsx scripts/import-finance-from-sheets.ts --dry-run
 *   npx tsx scripts/import-finance-from-sheets.ts --month=2025-03
 *   npx tsx scripts/import-finance-from-sheets.ts --replace-month=2025-03
 *   npx tsx scripts/import-finance-from-sheets.ts --no-rebuild-snapshots
 *   npx tsx scripts/import-finance-from-sheets.ts --credentials-check
 *   npx tsx scripts/import-finance-from-sheets.ts --list-tabs
 *   npx tsx scripts/import-finance-from-sheets.ts --help
 *
 * @see API_CONTRACT.md — GET /api/finanzas/transactions technical notes
 */
import fs from "node:fs"
import path from "node:path"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import {
  buildSheetRange,
  fetchSheetValues,
  getSheetTitleBySheetId,
  getSheetsReadonlyToken,
  listSpreadsheetSheetsMeta,
  parseServiceAccount,
  privateKeyPemLooksValid,
} from "./lib/googleSheetsServiceAccount"
import {
  formatPostgrestError,
  loadCatalogNormalizedKeys,
  normalizeFinanceCatalogKey,
} from "@/lib/finanzas/subcategoryCatalog"

/** Libro "00. Orbita | Control financiero | Casa Mambo" (Movimientos). */
const ORBITA_FINANCE_SPREADSHEET_ID = "1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4"
/** Pestaña de movimientos (gid de la URL = sheetId). */
const ORBITA_MOVIMIENTOS_SHEET_GID = 761723801

const DEFAULT_SPREADSHEET_ID = ORBITA_FINANCE_SPREADSHEET_ID

/** Tutorial placeholders that must not be sent to Supabase */
function looksLikeDocPlaceholder(v: string | undefined): boolean {
  if (!v || !v.trim()) return true
  return /<[^>\s]+>/.test(v.trim())
}

function readDotenvScalar(key: string): string | undefined {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), name)
    if (!fs.existsSync(p)) continue
    const text = fs.readFileSync(p, "utf8")
    for (const line of text.split(/\r?\n/)) {
      if (!line || line.startsWith("#")) continue
      if (!line.startsWith(`${key}=`)) continue
      let val = line.slice(key.length + 1).trim()
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1)
      }
      if (val) return val
    }
  }
  return undefined
}

/** Shell export wins; si es placeholder del tutorial, usa .env.local */
function pickEnv(shellKey: string, dotKey = shellKey): string | undefined {
  const fromShell = process.env[shellKey]?.trim()
  if (fromShell && !looksLikeDocPlaceholder(fromShell)) return fromShell
  const fromFile = readDotenvScalar(dotKey)?.trim()
  if (fromFile && !looksLikeDocPlaceholder(fromFile)) return fromFile
  return undefined
}

function resolveSupabaseUrl(): string | undefined {
  return pickEnv("SUPABASE_URL") || pickEnv("NEXT_PUBLIC_SUPABASE_URL")
}

async function resolveProfileIdForImport(
  supabase: SupabaseClient<any, "public", any>,
  householdId: string,
  explicit: string | undefined,
): Promise<string> {
  if (explicit && explicit.trim()) return explicit.trim()
  const { data, error } = await supabase
    .from("users")
    .select("id")
    .eq("household_id", householdId)
    .limit(1)
    .maybeSingle()
  if (error) {
    console.error("No se pudo leer public.users para profile_id:", error.message)
    process.exit(1)
  }
  const row = data as { id: string } | null
  if (!row?.id) {
    console.error(
      "No hay ningún usuario en public.users con ese household_id. Crea el usuario en la app o define FINANCE_IMPORT_PROFILE_ID=<uuid de users.id>.",
    )
    process.exit(1)
  }
  console.error("profile_id (desde public.users del hogar):", row.id)
  return String(row.id)
}

function validateSupabaseUrlForClient(url: string): void {
  try {
    const u = new URL(url)
    if (u.protocol !== "https:") {
      console.error("SUPABASE_URL debe ser https:", url)
      process.exit(1)
    }
    if (!u.hostname || u.hostname.length < 4) {
      console.error("SUPABASE_URL sin host válido:", url)
      process.exit(1)
    }
  } catch {
    console.error("SUPABASE_URL no es una URL válida (revisa copiar/pegar desde Supabase → Settings → API):", url)
    process.exit(1)
  }
}

/** 0-based column indices — Órbita Movimientos (ver fila cabecera del libro) */
const COL = {
  date: 0,
  description: 5,
  category: 6,
  subcategory: 7,
  amount: 10,
  monthKey: 12,
  /** Memo (técnico); a veces trae monto si “Monto normalizado” está vacío */
  memo: 4,
} as const

type ParsedRow = {
  sheetRowNumber: number
  date: string
  description: string
  category: string
  subcategory: string
  amount: number
  type: "income" | "expense"
}

function cell(row: string[], i: number): string {
  const v = row[i]
  if (v == null) return ""
  return String(v).trim()
}

/** Google Sheets serial date → YYYY-MM-DD (UTC). */
function serialToIsoDate(serial: number): string | null {
  if (!Number.isFinite(serial)) return null
  const epoch = Date.UTC(1899, 11, 30)
  const ms = epoch + Math.round(serial) * 86400000
  const d = new Date(ms)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

function sheetDateOrder(): "DMY" | "MDY" {
  const o = process.env.FINANCE_SHEETS_DATE_ORDER?.trim().toUpperCase()
  if (o === "MDY" || o === "US") return "MDY"
  return "DMY"
}

function parseSheetDate(raw: string): string | null {
  const t = raw.trim()
  if (!t) return null

  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t)
  if (slash) {
    const a = parseInt(slash[1], 10)
    const b = parseInt(slash[2], 10)
    const y = parseInt(slash[3], 10)
    const order = sheetDateOrder()
    const day = order === "DMY" ? a : b
    const month = order === "DMY" ? b : a
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const dash = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(t)
  if (dash) {
    const a = parseInt(dash[1], 10)
    const b = parseInt(dash[2], 10)
    const y = parseInt(dash[3], 10)
    const order = sheetDateOrder()
    const day = order === "DMY" ? a : b
    const month = order === "DMY" ? b : a
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const dot = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(t)
  if (dot) {
    const a = parseInt(dot[1], 10)
    const b = parseInt(dot[2], 10)
    const y = parseInt(dot[3], 10)
    const order = sheetDateOrder()
    const day = order === "DMY" ? a : b
    const month = order === "DMY" ? b : a
    if (month < 1 || month > 12 || day < 1 || day > 31) return null
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const asNum = Number(String(t).replace(",", "."))
  if (Number.isFinite(asNum) && asNum > 20000 && asNum < 100000) {
    return serialToIsoDate(Math.round(asNum))
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
  const d = new Date(t)
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return null
}

/** Si la celda Fecha falla: mes contable YYYY-MM → día 1 (mejor que perder la fila). */
function parseMonthYmFirstDay(raw: string): string | null {
  const t = raw.trim()
  const m = /^(\d{4})-(\d{2})$/.exec(t)
  if (!m) return null
  const mo = parseInt(m[2], 10)
  if (mo < 1 || mo > 12) return null
  return `${m[1]}-${m[2]}-01`
}

function resolveRowDate(values: string[]): string | null {
  const d0 = parseSheetDate(cell(values, COL.date))
  if (d0) return d0
  const dYm = parseMonthYmFirstDay(cell(values, COL.monthKey))
  if (dYm) return dYm
  return null
}

function cellLooksLikeMoney(s: string): boolean {
  const t = s.trim()
  if (!t) return false
  if (/\$/.test(t)) return true
  if (/^-?[\d]{1,3}(,\d{3})+(\.\d+)?$/.test(t.replace(/\s/g, ""))) return true
  if (/^-?\d+\.\d{2}$/.test(t.replace(/\s/g, ""))) return true
  // Enteros COP grandes sin símbolo (evita 4 dígitos tipo últimos de TC)
  if (/^-?\d{5,}$/.test(t.replace(/\s/g, "").replace(/,/g, ""))) return true
  return false
}

/** Columna 3 o 4 suele ser Tipo (Ingreso/Gasto/Transferencia) según fila TC vs ahorros. */
function findTipoColumnIndex(values: string[]): number | null {
  if (/^(gasto|ingreso|transferencia)/i.test(cell(values, 3))) return 3
  if (/^(gasto|ingreso|transferencia)/i.test(cell(values, 4))) return 4
  return null
}

/** Ajusta signo del monto leído en columnas alternativas según Tipo (Ingreso/Gasto). */
function applyTipoToFallbackAmount(n: number, values: string[]): number {
  const tipoIdx = findTipoColumnIndex(values)
  if (tipoIdx == null) return n
  const tipo = cell(values, tipoIdx).toLowerCase()
  if (/transferencia/i.test(tipo)) return n
  if (/ingreso/i.test(tipo)) return Math.abs(n)
  if (/gasto/i.test(tipo)) return -Math.abs(n)
  return n
}

/**
 * Monto: primero col 10; si falla, 5→4→3 (solo “parece dinero”, luego cualquier parseo válido).
 * No usa col 3 como monto si col 4 ya es Tipo (fila TC con últimos dígitos en col 3).
 */
function resolveSignedMoney(values: string[]): number | null {
  const norm = parseAmount(cell(values, COL.amount))
  if (norm != null && norm !== 0) return norm

  const tryCols = [COL.description, COL.memo, 3] as const

  for (const i of tryCols) {
    const s = cell(values, i)
    if (!cellLooksLikeMoney(s)) continue
    const n = parseAmount(s)
    if (n == null || n === 0) continue
    return applyTipoToFallbackAmount(n, values)
  }

  for (const i of tryCols) {
    const s = cell(values, i)
    if (!s) continue
    if (i === 3) {
      const c3 = cell(values, 3).replace(/\s/g, "")
      const c4 = cell(values, 4).toLowerCase()
      if (/^\d{4}$/.test(c3) && /^(gasto|ingreso|transferencia)/.test(c4)) continue
    }
    const n = parseAmount(s)
    if (n == null || n === 0) continue
    return applyTipoToFallbackAmount(n, values)
  }

  return null
}

/**
 * Montos estilo COP en Sheets: "26,400" / "$ -350,000" (coma = miles), no "26.4".
 */
function parseAmount(raw: string): number | null {
  let t = raw.trim().replace(/\s/g, "").replace(/\$/g, "").replace(/€/g, "")
  if (!t || t === "-" || t === "–" || t === "." || t === ",") return null

  let neg = false
  if (t.startsWith("-")) {
    neg = true
    t = t.slice(1)
  } else if (t.startsWith("(") && t.endsWith(")")) {
    neg = true
    t = t.slice(1, -1).trim()
  }

  if (!t) return null

  if (t.includes(",") && t.includes(".")) {
    const lastComma = t.lastIndexOf(",")
    const lastDot = t.lastIndexOf(".")
    if (lastComma > lastDot) {
      t = t.replace(/\./g, "").replace(",", ".")
    } else {
      t = t.replace(/,/g, "")
    }
  } else if (t.includes(",") && !t.includes(".")) {
    const parts = t.split(",")
    if (parts.length >= 2) {
      const last = parts[parts.length - 1] ?? ""
      if (last.length === 3 && /^\d{3}$/.test(last)) {
        t = parts.join("")
      } else if (parts.length === 2 && last.length >= 1 && last.length <= 2 && /^\d+$/.test(last)) {
        t = `${parts[0]}.${last}`
      } else {
        t = parts.join("")
      }
    }
  } else if (t.includes(".") && !t.includes(",")) {
    const parts = t.split(".")
    if (parts.length > 2) {
      t = parts.join("")
    } else if (parts.length === 2) {
      const [a, b] = [parts[0] ?? "", parts[1] ?? ""]
      if (b.length <= 2 && /^\d+$/.test(b)) {
        t = `${a}.${b}`
      } else if (b.length === 3 && /^\d{3}$/.test(b) && /^\d+$/.test(a)) {
        t = a + b
      } else {
        t = `${a}.${b}`
      }
    }
  }

  const n = Number(t)
  if (!Number.isFinite(n)) return null
  return neg ? -n : n
}

function mapSignedAmountToDb(signed: number): { type: "income" | "expense"; amount: number } | null {
  if (!Number.isFinite(signed) || signed === 0) return null
  if (signed > 0) return { type: "income", amount: signed }
  return { type: "expense", amount: Math.abs(signed) }
}

function parseRow(values: string[], sheetRowNumber: number): ParsedRow | null {
  const date = resolveRowDate(values)
  if (!date) return null

  let description = cell(values, COL.description) || "(sin descripción)"
  if (cellLooksLikeMoney(description)) {
    const memo = cell(values, COL.memo)
    if (memo && !cellLooksLikeMoney(memo)) description = memo
    else {
      const cat = cell(values, COL.category)
      const sub = cell(values, COL.subcategory)
      const parts = [cat, sub].filter((x) => x && !cellLooksLikeMoney(x))
      description = parts.length > 0 ? parts.join(" · ") : "(sin descripción)"
    }
  }

  const category = cell(values, COL.category) || "Sin categoría"
  const subRaw = cell(values, COL.subcategory)
  const subcategory = subRaw.length > 0 ? subRaw : ""

  const signed = resolveSignedMoney(values)
  if (signed == null) return null
  const mapped = mapSignedAmountToDb(signed)
  if (!mapped) return null

  return {
    sheetRowNumber,
    date,
    description,
    category,
    subcategory,
    amount: mapped.amount,
    type: mapped.type,
  }
}

function monthBoundsYm(ym: string): { start: string; end: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  if (mo < 1 || mo > 12) return null
  const start = `${m[1]}-${m[2]}-01`
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate()
  const end = `${m[1]}-${m[2]}-${String(last).padStart(2, "0")}`
  return { start, end }
}

function printHelp(): void {
  console.error(`
Import Órbita Movimientos → Supabase orbita_finance_transactions

Flags:
  --dry-run              Solo parsea y muestra muestra (no Supabase)
  --credentials-check    Valida GOOGLE_CREDENTIALS / PEM
  --list-tabs            Lista gid + nombre de pestañas del spreadsheet
  --month=YYYY-MM        Filtra filas por mes (fecha o col M)
  --replace-month=YYYY-MM Borra transacciones del hogar en ese mes y reinserta
  --no-rebuild-snapshots No llama rebuild_month_snapshot tras insertar
  --strict-catalog      Falla si alguna subcategoría no está en orbita_finance_subcategory_catalog
  --help                 Este mensaje

Env obligatorio para import real (sin --dry-run):
  SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL  (URL real, no https://<proyecto>.supabase.co)
  SUPABASE_SERVICE_ROLE_KEY               (service_role, no el anon key)
  FINANCE_IMPORT_HOUSEHOLD_ID             (uuid real, no <uuid-del-hogar>)
  Puedes ponerlos en .env.local; si exportaste placeholders, se ignoran y se lee el archivo.
  GOOGLE_CREDENTIALS o GOOGLE_APPLICATION_CREDENTIALS en .env.local

Env opcional: FINANZAS_SPREADSHEET_ID, FINANCE_SHEETS_GID, FINANCE_SHEETS_RANGE,
  FINANCE_SHEETS_DATE_ORDER=DMY|MDY, FINANCE_IMPORT_PROFILE_ID (si no, primer users.id del hogar)

Ejemplos:
  npm run import-finance:sheets -- --dry-run
  FINANCE_IMPORT_HOUSEHOLD_ID=<uuid> npm run import-finance:sheets
  npm run import-finance:sheets -- --replace-month=2025-01
`)
}

function parseArgs(argv: string[]) {
  let dryRun = false
  let credentialsCheck = false
  let listTabs = false
  let help = false
  let month: string | undefined
  let replaceMonth: string | undefined
  let rebuildSnapshots = true
  let strictCatalog = false
  for (const a of argv) {
    if (a === "--dry-run") dryRun = true
    else if (a === "--credentials-check") credentialsCheck = true
    else if (a === "--list-tabs") listTabs = true
    else if (a === "--help" || a === "-h") help = true
    else if (a === "--no-rebuild-snapshots") rebuildSnapshots = false
    else if (a === "--strict-catalog") strictCatalog = true
    else if (a.startsWith("--month=")) month = a.slice("--month=".length)
    else if (a.startsWith("--replace-month=")) replaceMonth = a.slice("--replace-month=".length)
  }
  return { dryRun, credentialsCheck, listTabs, help, month, replaceMonth, rebuildSnapshots, strictCatalog }
}

async function resolveSheetA1Range(
  spreadsheetId: string,
  accessToken: string,
): Promise<string | null> {
  const full = process.env.FINANCE_SHEETS_RANGE?.trim()
  if (full) return full
  const tab = process.env.FINANCE_SHEETS_TAB?.trim()
  const cells = process.env.FINANCE_SHEETS_CELLS?.trim() || "A2:U5000"
  if (tab) return buildSheetRange(tab, cells)

  const gidRaw = process.env.FINANCE_SHEETS_GID?.trim()
  let gid: number | null = null
  if (gidRaw) {
    const n = parseInt(gidRaw, 10)
    if (Number.isFinite(n)) gid = n
  } else if (spreadsheetId === ORBITA_FINANCE_SPREADSHEET_ID) {
    gid = ORBITA_MOVIMIENTOS_SHEET_GID
  }

  if (gid != null) {
    const title = await getSheetTitleBySheetId(spreadsheetId, gid, accessToken)
    if (title) {
      console.error(`Resolved sheet gid=${gid} → ${JSON.stringify(title)}`)
      return buildSheetRange(title, cells)
    }
    console.error(`No tab with sheetId/gid ${gid} in spreadsheet ${spreadsheetId}`)
    return null
  }

  return buildSheetRange("Movimientos", cells)
}

async function main() {
  const {
    dryRun,
    credentialsCheck,
    listTabs,
    help,
    month: filterMonth,
    replaceMonth,
    rebuildSnapshots,
    strictCatalog,
  } = parseArgs(process.argv.slice(2))

  if (help) {
    printHelp()
    process.exit(0)
  }

  const spreadsheetId =
    process.env.FINANCE_SHEETS_SPREADSHEET_ID?.trim() ||
    process.env.FINANZAS_SPREADSHEET_ID?.trim() ||
    DEFAULT_SPREADSHEET_ID

  if (credentialsCheck) {
    const sa = parseServiceAccount()
    if (!sa) {
      console.error("parseServiceAccount: failed (missing or invalid GOOGLE_CREDENTIALS)")
      process.exit(1)
    }
    const pemOk = privateKeyPemLooksValid(sa.private_key)
    console.error("GOOGLE_CREDENTIALS loaded OK")
    console.error("  client_email:", sa.client_email)
    console.error("  private_key length:", sa.private_key?.length ?? 0)
    console.error("  private_key PEM valid (Node crypto):", pemOk)
    if (!pemOk) {
      console.error("  Fix: regenerate key in GCP IAM → Service accounts → Keys, or repair PEM newlines.")
      process.exit(1)
    }
    process.exit(0)
  }

  const tokenEarly = await getSheetsReadonlyToken()
  if (!tokenEarly) process.exit(1)

  if (listTabs) {
    console.error("spreadsheetId:", spreadsheetId)
    const meta = await listSpreadsheetSheetsMeta(spreadsheetId, tokenEarly)
    if (!meta) process.exit(1)
    console.error("Pestañas: gid (URL ?gid=) → nombre. FINANCE_SHEETS_GID o FINANCE_SHEETS_TAB:")
    for (const m of meta) console.error(`  ${m.sheetId}\t${JSON.stringify(m.title)}`)
    process.exit(0)
  }

  const range = await resolveSheetA1Range(spreadsheetId, tokenEarly)
  if (!range) process.exit(1)

  const supabaseUrl = resolveSupabaseUrl()
  const serviceKey = pickEnv("SUPABASE_SERVICE_ROLE_KEY")
  const householdId = pickEnv("FINANCE_IMPORT_HOUSEHOLD_ID")
  const profileId = pickEnv("FINANCE_IMPORT_PROFILE_ID")

  if (!dryRun) {
    if (!supabaseUrl || !serviceKey || !householdId) {
      console.error(
        "Faltan SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY o FINANCE_IMPORT_HOUSEHOLD_ID con valores reales.",
      )
      console.error(
        "No uses los textos de ejemplo del tutorial (<proyecto>, <uuid-del-hogar>, <service_role>).",
      )
      console.error(
        "Pon la URL y las claves en Supabase → Project Settings → API, y el household_id en Table Editor → households.",
      )
      console.error("O define las tres variables en .env.local (el script las lee si el shell trae placeholders).")
      process.exit(1)
    }
    validateSupabaseUrlForClient(supabaseUrl)
  }

  console.error("Using range:", range)

  const rows = await fetchSheetValues(spreadsheetId, range, tokenEarly)
  if (!rows) process.exit(1)

  const headerOffset = 2
  const parsed: ParsedRow[] = []
  const skipped: { row: number; reason: string }[] = []

  for (let i = 0; i < rows.length; i += 1) {
    const sheetRowNumber = headerOffset + i
    const r = rows[i]
    if (!r || r.every((c) => !String(c ?? "").trim())) continue

    const monthCell = cell(r, COL.monthKey)
    if (filterMonth && monthCell && monthCell !== filterMonth) {
      skipped.push({ row: sheetRowNumber, reason: `month column ${monthCell} !== ${filterMonth}` })
      continue
    }

    const pr = parseRow(r, sheetRowNumber)
    if (!pr) {
      skipped.push({ row: sheetRowNumber, reason: "invalid date or amount" })
      continue
    }

    if (filterMonth && !pr.date.startsWith(`${filterMonth}-`)) {
      skipped.push({ row: sheetRowNumber, reason: `date ${pr.date} not in ${filterMonth}` })
      continue
    }

    parsed.push(pr)
  }

  console.error(`Parsed ${parsed.length} rows (skipped ${skipped.length})`)
  if (skipped.length > 0 && skipped.length <= 30) {
    for (const s of skipped) console.error(`  row ${s.row}: ${s.reason}`)
  } else if (skipped.length > 30) {
    console.error(`  (first 15 skip reasons)`)
    for (const s of skipped.slice(0, 15)) console.error(`  row ${s.row}: ${s.reason}`)
  }

  if (strictCatalog && parsed.length > 0) {
    const supabaseUrlSc = resolveSupabaseUrl()
    const serviceKeySc = pickEnv("SUPABASE_SERVICE_ROLE_KEY")
    const householdIdSc = pickEnv("FINANCE_IMPORT_HOUSEHOLD_ID")
    if (!supabaseUrlSc || !serviceKeySc || !householdIdSc) {
      console.error(
        "--strict-catalog requiere SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY y FINANCE_IMPORT_HOUSEHOLD_ID (valores reales).",
      )
      process.exit(1)
    }
    validateSupabaseUrlForClient(supabaseUrlSc)
    const supabaseCatalog = createClient(supabaseUrlSc, serviceKeySc)
    let keys: Set<string>
    try {
      keys = await loadCatalogNormalizedKeys(supabaseCatalog, householdIdSc)
    } catch (e) {
      const msg = formatPostgrestError(e)
      console.error("No se pudo cargar orbita_finance_subcategory_catalog:", msg)
      if (/does not exist|42P01|PGRST205|not find the table/i.test(msg)) {
        console.error("Aún no existe la tabla en el proyecto de Supabase al que apunta tu .env (URL + service_role).")
        console.error("  1) Dashboard → SQL → New query")
        console.error("  2) Pega todo el archivo: supabase/migrations/20260330120000_finance_profile_uuid_fk_catalog_accounts.sql")
        console.error("  3) Run. El archivo termina con NOTIFY pgrst para refrescar el API.")
        console.error("  Si sigue fallando: Settings → API → revisa que la URL del .env sea la misma instancia donde ejecutaste el SQL.")
      }
      process.exit(1)
    }
    if (keys.size === 0) {
      console.error("--strict-catalog: el catálogo está vacío. Ejecuta migraciones o inserta filas en la tabla.")
      process.exit(1)
    }
    const bad = new Set<string>()
    for (const p of parsed) {
      const sub = p.subcategory.trim()
      if (!sub) continue
      if (!keys.has(normalizeFinanceCatalogKey(sub))) bad.add(sub)
    }
    if (bad.size > 0) {
      const list = [...bad].slice(0, 40)
      console.error(
        `--strict-catalog: ${bad.size} subcategoría(s) no están en el catálogo (muestra hasta 40):`,
        list.join("; "),
      )
      process.exit(1)
    }
    console.error("--strict-catalog: todas las subcategorías no vacías coinciden con el catálogo.")
  }

  if (dryRun) {
    console.log(JSON.stringify(parsed.slice(0, 5), null, 2))
    if (parsed.length > 5) console.error(`... and ${parsed.length - 5} more (dry-run)`)
    return
  }

  const supabase = createClient(supabaseUrl!, serviceKey!)

  const resolvedProfileId = await resolveProfileIdForImport(supabase, householdId!, profileId)

  if (replaceMonth) {
    const b = monthBoundsYm(replaceMonth)
    if (!b) {
      console.error("Invalid --replace-month (use YYYY-MM)")
      process.exit(1)
    }
    const { error: delErr } = await supabase
      .from("orbita_finance_transactions")
      .delete()
      .eq("household_id", householdId!)
      .gte("date", b.start)
      .lte("date", b.end)
    if (delErr) {
      console.error("Delete failed:", delErr.message)
      process.exit(1)
    }
    console.error(`Deleted existing rows for household ${householdId} in ${replaceMonth}`)
  }

  const now = new Date().toISOString()
  const insertPayload = parsed.map((p) => {
    const row: Record<string, unknown> = {
      household_id: householdId,
      date: p.date,
      description: p.description,
      category: p.category,
      subcategory: p.subcategory,
      amount: p.amount,
      type: p.type,
      currency: "USD",
      created_at: now,
      updated_at: now,
      deleted_at: null,
      profile_id: resolvedProfileId,
    }
    return row
  })

  const chunkSize = 200
  for (let i = 0; i < insertPayload.length; i += chunkSize) {
    const chunk = insertPayload.slice(i, i + chunkSize)
    const { error } = await supabase.from("orbita_finance_transactions").insert(chunk)
    if (error) {
      console.error(`Insert chunk ${i / chunkSize + 1} failed:`, error.message)
      process.exit(1)
    }
  }
  console.error(`Inserted ${insertPayload.length} rows`)

  if (rebuildSnapshots && insertPayload.length > 0) {
    const months = new Map<string, { y: number; m: number }>()
    for (const p of parsed) {
      const y = Number(p.date.slice(0, 4))
      const m = Number(p.date.slice(5, 7))
      if (Number.isFinite(y) && m >= 1 && m <= 12) {
        months.set(`${y}-${m}`, { y, m })
      }
    }
    for (const { y, m } of months.values()) {
      const { error: rpcErr } = await supabase.rpc("rebuild_month_snapshot", {
        p_household: householdId,
        p_year: y,
        p_month: m,
      })
      if (rpcErr) {
        console.error(`rebuild_month_snapshot ${y}-${m} failed:`, rpcErr.message)
        process.exit(1)
      }
    }
    console.error(`Rebuilt ${months.size} monthly snapshot(s)`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
