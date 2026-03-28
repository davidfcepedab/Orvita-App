/**
 * List tab names + fetch first rows of Movimientos (or first tab that works).
 * Run from repo root: `npx tsx scripts/diagnose-finance-sheet.ts`
 * Reads GOOGLE_CREDENTIALS from process.env or parses .env.local (avoids bash mangling JSON).
 */
import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"

const SPREADSHEET_ID = "1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4"

type Sa = { client_email: string; private_key: string }

function loadCredentialsRaw(): string | null {
  const fromEnv = process.env.GOOGLE_CREDENTIALS?.trim()
  if (fromEnv) return fromEnv
  const p = path.join(process.cwd(), ".env.local")
  if (!fs.existsSync(p)) return null
  const text = fs.readFileSync(p, "utf8")
  const line = text.split(/\r?\n/).find((l) => /^GOOGLE_CREDENTIALS=/.test(l))
  if (!line) return null
  const eq = line.indexOf("=")
  let v = line.slice(eq + 1).trim()
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
    v = v.slice(1, -1)
  }
  return v
}

function parseSa(): Sa | null {
  const raw = loadCredentialsRaw()
  if (!raw) {
    console.error("No GOOGLE_CREDENTIALS in env or .env.local")
    return null
  }
  try {
    const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8")
    const o = JSON.parse(json) as Sa
    if (!o.client_email || !o.private_key) return null
    console.error("Service account:", o.client_email, "private_key chars:", o.private_key.length)
    return o
  } catch (e) {
    console.error("JSON parse GOOGLE_CREDENTIALS failed:", e)
    return null
  }
}

function b64url(obj: unknown) {
  return Buffer.from(JSON.stringify(obj))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

async function saToken(): Promise<string | null> {
  const c = parseSa()
  if (!c) {
    console.error("No GOOGLE_CREDENTIALS")
    return null
  }
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
  const signature = sign.sign(c.private_key.replace(/\\n/g, "\n"), "base64url")
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

async function main() {
  const token = await saToken()
  if (!token) process.exit(1)

  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title`
  const meta = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } })
  const metaText = await meta.text()
  if (!meta.ok) {
    console.error("spreadsheet.get", meta.status, metaText)
    process.exit(1)
  }
  const parsed = JSON.parse(metaText) as { sheets?: { properties?: { title?: string } }[] }
  const titles = (parsed.sheets ?? []).map((s) => s.properties?.title).filter(Boolean)
  console.error("Tab titles:", titles.join(" | "))

  const ranges = ["Movimientos!A1:U12", ...titles.map((t) => `${t}!A1:U5`)]
  for (const range of ranges) {
    const enc = encodeURIComponent(range)
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${enc}`
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    const body = await res.text()
    if (!res.ok) {
      console.error("FAIL", range, res.status, body.slice(0, 200))
      continue
    }
    const j = JSON.parse(body) as { values?: string[][] }
    console.error("OK", range, "rows", j.values?.length ?? 0)
    console.log(JSON.stringify(j.values ?? []))
    break
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
