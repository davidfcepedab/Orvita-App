import { google } from "googleapis"

function createSheetsClient() {
  const credentialsString = process.env.GOOGLE_CREDENTIALS
  if (!credentialsString) {
    throw new Error("GOOGLE_CREDENTIALS is not defined")
  }
  // Sanitize control characters that may appear in private_key when stored in env vars
  const sanitized = credentialsString.replace(/\n/g, "\\n").replace(/\r/g, "\\r")
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(sanitized),
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
  return google.sheets({ version: "v4", auth })
}

let _sheets: ReturnType<typeof google.sheets> | null = null

export function getSheetsClient() {
  if (!_sheets) _sheets = createSheetsClient()
  return _sheets
}

/** @deprecated Use getSheetsClient() instead */
export const sheets = new Proxy({} as ReturnType<typeof google.sheets>, {
  get(_target, prop) {
    return getSheetsClient()[prop as keyof ReturnType<typeof google.sheets>]
  },
})

