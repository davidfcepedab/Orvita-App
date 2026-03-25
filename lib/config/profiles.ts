export type AppProfileId = "david" | "esposo"

export function isAppProfileId(value: string | null | undefined): value is AppProfileId {
  return value === "david" || value === "esposo"
}

export function resolveDefaultProfileId(): AppProfileId {
  const raw = process.env.DEFAULT_PROFILE_ID?.trim().toLowerCase()
  return raw === "esposo" ? "esposo" : "david"
}

export function resolveProfileLabel(profileId: AppProfileId) {
  if (profileId === "esposo") {
    return process.env.ESPOSO_PROFILE_LABEL?.trim() || "Juan Camilo Ruiz"
  }
  return process.env.DAVID_PROFILE_LABEL?.trim() || "David Cepeda"
}

export function resolvePersonalSpreadsheetId(profileId: AppProfileId) {
  if (profileId === "esposo") {
    const fromEnv = process.env.ESPOSO_PERSONAL_SPREADSHEET_ID?.trim()
    if (!fromEnv) {
      throw new Error("ESPOSO_PERSONAL_SPREADSHEET_ID is not configured")
    }
    return fromEnv
  }

  return (
    process.env.DAVID_PERSONAL_SPREADSHEET_ID?.trim() ||
    process.env.PERSONAL_SPREADSHEET_ID?.trim() ||
    // Fallback histórico del repo (David)
    "1fEP_Em30-BTUhmeObzAE9zObQRc7CNkYXbVCecpCHO0"
  )
}

export function resolveAgendaSpreadsheetId(profileId: AppProfileId) {
  if (profileId === "esposo") {
    const fromEnv =
      process.env.ESPOSO_AGENDA_SPREADSHEET_ID?.trim() ||
      process.env.AGENDA_SPREADSHEET_ID?.trim()
    if (!fromEnv) {
      throw new Error("ESPOSO_AGENDA_SPREADSHEET_ID is not configured")
    }
    return fromEnv
  }

  const fromEnv = (
    process.env.DAVID_AGENDA_SPREADSHEET_ID?.trim() ||
    process.env.AGENDA_SPREADSHEET_ID?.trim() ||
    ""
  )
  if (!fromEnv) {
    throw new Error("DAVID_AGENDA_SPREADSHEET_ID is not configured")
  }
  return fromEnv
}
