import { google } from "googleapis"

const credentialsString = process.env.GOOGLE_CREDENTIALS

if (!credentialsString) {
  throw new Error("GOOGLE_CREDENTIALS is not defined")
}

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(credentialsString),
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
})

export const sheets = google.sheets({
  version: "v4",
  auth,
})

