import crypto from "node:crypto"
import { resolveDefaultProfileId, resolvePersonalSpreadsheetId } from "@/lib/config/profiles"

type ServiceAccountCredentials = {
  client_email: string
  private_key: string
}

function parseGoogleCredentials(): ServiceAccountCredentials | null {
  const raw = process.env.GOOGLE_CREDENTIALS?.trim()
  if (!raw) return null
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8")
    const o = JSON.parse(json) as ServiceAccountCredentials
    if (!o.client_email || !o.private_key) return null
    return o
  } catch {
    return null
  }
}

function base64urlFromJson(obj: unknown) {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

async function getAccessTokenFromServiceAccount(): Promise<string | null> {
  const c = parseGoogleCredentials()
  if (!c) return null

  const now = Math.floor(Date.now() / 1000)
  const header = base64urlFromJson({ alg: "RS256", typ: "JWT" })
  const claim = base64urlFromJson({
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
  const signature = sign.sign(c.private_key.replace(/\\n/g, "\n"), "base64url")
  const jwt = `${signInput}.${signature}`

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  })

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  })

  if (!res.ok) {
    return null
  }

  const data = (await res.json()) as { access_token?: string }
  return data.access_token ?? null
}

export async function fetchSpreadsheetValues(
  spreadsheetId: string,
  rangeA1: string
): Promise<string[][] | null> {
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY?.trim()
  const encodedRange = encodeURIComponent(rangeA1)

  if (apiKey) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}?key=${apiKey}`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = (await res.json()) as { values?: string[][] }
    return data.values ?? []
  }

  const token = await getAccessTokenFromServiceAccount()
  if (!token) return null

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodedRange}`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) return null
  const data = (await res.json()) as { values?: string[][] }
  return data.values ?? []
}

export function resolveCheckinSpreadsheetId(): string {
  const explicit = process.env.CHECKIN_MEASURES_SPREADSHEET_ID?.trim()
  if (explicit) return explicit
  const fallback = process.env.PERSONAL_SPREADSHEET_ID?.trim()
  if (fallback) return fallback
  try {
    return resolvePersonalSpreadsheetId(resolveDefaultProfileId())
  } catch {
    const david = process.env.DAVID_PERSONAL_SPREADSHEET_ID?.trim()
    if (david) return david
    return ""
  }
}

/** A1 range (tab + cells). Override via CHECKIN_MEASURES_SHEET_RANGE or ORVITA_CHECKIN_SHEET_RANGE. */
export function resolveCheckinSheetRangeA1(): string {
  return (
    process.env.CHECKIN_MEASURES_SHEET_RANGE?.trim() ||
    process.env.ORVITA_CHECKIN_SHEET_RANGE?.trim() ||
    "Respuestas!A:AA"
  )
}

/**
 * 1-based spreadsheet row number of the first row returned in `values`
 * (depends on how the A1 range was requested).
 */
export function resolveCheckinSheetFirstRowNumber(): number {
  const raw = process.env.CHECKIN_SHEET_FIRST_ROW?.trim()
  if (raw) {
    const n = parseInt(raw, 10)
    if (Number.isFinite(n) && n >= 1) return n
  }
  const range = resolveCheckinSheetRangeA1()
  const m = range.match(/!(?:[A-Za-z]+)?(\d+)/)
  if (m) {
    const n = parseInt(m[1], 10)
    if (Number.isFinite(n) && n >= 1) return n
  }
  return 1
}

export function pickLastNonEmptyRow(
  values: string[][],
  firstRowNumber: number
): { cells: string[]; sheetRowId: string } | null {
  for (let i = values.length - 1; i >= 0; i--) {
    const row = values[i]
    if (!row || row.length === 0) continue
    const has = row.some((cell) => cell != null && String(cell).trim() !== "")
    if (!has) continue
    return { cells: row.map((c) => (c == null ? "" : String(c))), sheetRowId: String(firstRowNumber + i) }
  }
  return null
}

