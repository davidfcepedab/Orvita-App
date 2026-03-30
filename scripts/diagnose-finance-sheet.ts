/**
 * List tab names + fetch first rows of Movimientos (or first tab that works).
 * Run from repo root: `npx tsx scripts/diagnose-finance-sheet.ts`
 * Reads GOOGLE_CREDENTIALS from process.env or parses .env.local (avoids bash mangling JSON).
 */
import {
  fetchSheetValues,
  getSheetsReadonlyToken,
} from "./lib/googleSheetsServiceAccount"

const SPREADSHEET_ID = "1A8ucJUgSvxP2JLbPf1Z5PlB5UytbO4aKdJLf_ctaUz4"

async function main() {
  const token = await getSheetsReadonlyToken()
  if (!token) process.exit(1)

  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}?fields=sheets.properties.title`
  const meta = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } })
  const metaText = await meta.text()
  if (!meta.ok) {
    console.error("spreadsheet.get", meta.status, metaText)
    process.exit(1)
  }
  const parsed = JSON.parse(metaText) as { sheets?: { properties?: { title?: string } }[] }
  const titles = (parsed.sheets ?? []).map((s) => s.properties?.title).filter(Boolean) as string[]
  console.error("Tab titles:", titles.join(" | "))

  const ranges = ["Movimientos!A1:U12", ...titles.map((t) => `${t}!A1:U5`)]
  for (const range of ranges) {
    const values = await fetchSheetValues(SPREADSHEET_ID, range, token)
    if (!values) continue
    console.error("OK", range, "rows", values.length)
    console.log(JSON.stringify(values))
    break
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
