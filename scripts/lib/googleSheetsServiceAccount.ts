/**
 * Service account JWT for Google Sheets API (read scopes).
 * Shared by scripts/diagnose-finance-sheet.ts and scripts/import-finance-from-sheets.ts.
 */
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

export type GoogleServiceAccount = { client_email: string; private_key: string }

/** Value after KEY= in a dotenv file: one line, or multiline `{ ... }` JSON. */
function extractDotenvValue(text: string, key: string): string | null {
  const re = new RegExp(`^${key}=`, "m")
  const m = re.exec(text)
  if (!m || m.index === undefined) return null
  const afterEq = text.slice(m.index + key.length + 1)
  let rest = afterEq.replace(/^\s+/, "")
  if (!rest.length) return null

  if (rest[0] === "{" || rest[0] === "[") {
    const open = rest[0]
    const close = open === "{" ? "}" : "]"
    let depth = 0
    let inStr = false
    let esc = false
    for (let i = 0; i < rest.length; i += 1) {
      const c = rest[i]
      if (inStr) {
        if (esc) {
          esc = false
          continue
        }
        if (c === "\\") {
          esc = true
          continue
        }
        if (c === '"') inStr = false
        continue
      }
      if (c === '"') {
        inStr = true
        continue
      }
      if (c === open) depth += 1
      if (c === close) {
        depth -= 1
        if (depth === 0) return rest.slice(0, i + 1).trim()
      }
    }
    return null
  }

  if (rest[0] === "'" || rest[0] === '"') {
    const q = rest[0]
    let i = 1
    let out = ""
    while (i < rest.length) {
      const c = rest[i]
      if (c === "\\" && q === '"') {
        out += rest[i + 1] ?? ""
        i += 2
        continue
      }
      if (c === q) return out
      out += c
      i += 1
    }
    return null
  }

  const nl = rest.search(/\r?\n/)
  return (nl === -1 ? rest : rest.slice(0, nl)).trim()
}

function loadFromEnvFiles(key: string): string | null {
  for (const name of [".env.local", ".env"]) {
    const p = path.join(process.cwd(), name)
    if (!fs.existsSync(p)) continue
    const text = fs.readFileSync(p, "utf8")
    const v = extractDotenvValue(text, key)
    if (v) return v
  }
  return null
}

function readCredentialsFileAtPath(gacPath: string): string | null {
  const unquoted =
    (gacPath.startsWith('"') && gacPath.endsWith('"')) || (gacPath.startsWith("'") && gacPath.endsWith("'"))
      ? gacPath.slice(1, -1)
      : gacPath
  const abs = path.isAbsolute(unquoted) ? unquoted : path.join(process.cwd(), unquoted)
  if (fs.existsSync(abs)) return fs.readFileSync(abs, "utf8")
  return null
}

export function loadGoogleCredentialsRaw(): string | null {
  const fromEnv = process.env.GOOGLE_CREDENTIALS?.trim()
  if (fromEnv) return fromEnv

  const gacShell = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim()
  if (gacShell) {
    const raw = readCredentialsFileAtPath(gacShell)
    if (raw) return raw
  }

  const gacFile = loadFromEnvFiles("GOOGLE_APPLICATION_CREDENTIALS")?.trim()
  if (gacFile) {
    const raw = readCredentialsFileAtPath(gacFile)
    if (raw) return raw
  }

  return loadFromEnvFiles("GOOGLE_CREDENTIALS")
}

function normalizePrivateKeyPem(pk: string): string {
  return pk
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .trim()
}

/** Exported for `import-finance-from-sheets --credentials-check`. */
export function parseServiceAccount(): GoogleServiceAccount | null {
  const raw = loadGoogleCredentialsRaw()
  if (!raw) {
    console.error("No GOOGLE_CREDENTIALS in env or .env.local")
    return null
  }
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8")
    const o = JSON.parse(json) as GoogleServiceAccount
    if (!o.client_email || !o.private_key) return null
    o.private_key = normalizePrivateKeyPem(o.private_key)
    return o
  } catch (e) {
    console.error("JSON parse GOOGLE_CREDENTIALS failed:", e)
    return null
  }
}

/** True if Node can load the PEM (catches truncated / wrong keys before calling Google). */
export function privateKeyPemLooksValid(pem: string): boolean {
  try {
    crypto.createPrivateKey({ key: pem, format: "pem" })
    return true
  } catch {
    return false
  }
}

function b64url(obj: unknown) {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

/** OAuth access token for spreadsheets.readonly */
export async function getSheetsReadonlyToken(): Promise<string | null> {
  const c = parseServiceAccount()
  if (!c) return null
  const now = Math.floor(Date.now() / 1000)
  const header = b64url({ alg: "RS256", typ: "JWT" })
  const claim = b64url({
    iss: c.client_email,
    sub: c.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
  })
  const signInput = `${header}.${claim}`
  const sign = crypto.createSign("RSA-SHA256")
  sign.update(signInput)
  const signature = sign.sign(c.private_key, "base64url")
  const jwt = `${signInput}.${signature}`
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  })
  if (!res.ok) {
    console.error("Token exchange failed", res.status, await res.text())
    return null
  }
  const data = (await res.json()) as { access_token?: string }
  return data.access_token ?? null
}

/**
 * A1 notation for a sheet title. Quote if name has spaces/special chars (Google Sheets rules).
 * @example quoteSheetNameForA1("Movimientos") → "Movimientos"
 * @example quoteSheetNameForA1("Base CFO") → "'Base CFO'"
 */
export function quoteSheetNameForA1(sheetTitle: string): string {
  const t = sheetTitle.trim()
  if (!t) return "''"
  const needsQuote =
    /[\s!'#]/.test(t) || /^\d/.test(t) || !/^[A-Za-z0-9_]+$/.test(t)
  if (!needsQuote) return t
  return `'${t.replace(/'/g, "''")}'`
}

export function buildSheetRange(sheetTitle: string, cellsA1: string): string {
  return `${quoteSheetNameForA1(sheetTitle)}!${cellsA1.replace(/^\s+/, "")}`
}

export type SheetTabMeta = { sheetId: number; title: string }

export async function listSpreadsheetSheetsMeta(
  spreadsheetId: string,
  accessToken: string,
): Promise<SheetTabMeta[] | null> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(sheetId,title)`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const body = await res.text()
  if (!res.ok) {
    console.error("spreadsheets.get failed", res.status, body.slice(0, 400))
    return null
  }
  const j = JSON.parse(body) as {
    sheets?: { properties?: { sheetId?: number; title?: string } }[]
  }
  const out: SheetTabMeta[] = []
  for (const s of j.sheets ?? []) {
    const p = s.properties
    if (p?.sheetId != null && p.title) out.push({ sheetId: p.sheetId, title: p.title })
  }
  return out
}

export async function listSpreadsheetSheetTitles(
  spreadsheetId: string,
  accessToken: string,
): Promise<string[] | null> {
  const meta = await listSpreadsheetSheetsMeta(spreadsheetId, accessToken)
  if (!meta) return null
  return meta.map((m) => m.title)
}

/** `gid` en la URL del navegador = `sheetId` en la API. */
export async function getSheetTitleBySheetId(
  spreadsheetId: string,
  sheetId: number,
  accessToken: string,
): Promise<string | null> {
  const meta = await listSpreadsheetSheetsMeta(spreadsheetId, accessToken)
  if (!meta) return null
  const hit = meta.find((m) => m.sheetId === sheetId)
  return hit?.title ?? null
}

export async function fetchSheetValues(
  spreadsheetId: string,
  a1Range: string,
  accessToken: string,
): Promise<string[][] | null> {
  const enc = encodeURIComponent(a1Range)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${enc}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const body = await res.text()
  if (!res.ok) {
    console.error("sheets.values.get failed", res.status, body.slice(0, 400))
    if (res.status === 400 && /Unable to parse range|not found/i.test(body)) {
      console.error(
        "Hint: el nombre de la pestaña no coincide con el rango A1. Ejecuta: npm run import-finance:sheets -- --list-tabs",
      )
      console.error(
        "Luego en .env.local usa FINANCE_SHEETS_TAB=\"Nombre exacto\" o FINANCE_SHEETS_RANGE='Nombre'!A2:U5000",
      )
    }
    return null
  }
  const j = JSON.parse(body) as { values?: string[][] }
  return j.values ?? []
}
