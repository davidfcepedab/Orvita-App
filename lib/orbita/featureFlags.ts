export type OrvitaModule = "tasks" | "habits" | "projects" | "calendar_events"

export type OrvitaDataSource = "supabase" | "sheets" | "hybrid"

function normalizeSource(value: string | undefined | null): OrvitaDataSource | null {
  const v = value?.trim().toLowerCase()
  if (v === "supabase") return "supabase"
  if (v === "sheets") return "sheets"
  if (v === "hybrid") return "hybrid"
  return null
}

export function resolveOrvitaDataSource(module: OrvitaModule): OrvitaDataSource {
  const perModule = normalizeSource(process.env[`ORVITA_SOURCE_${module.toUpperCase()}`])
  if (perModule) return perModule

  const global = normalizeSource(process.env.ORVITA_SOURCE)
  return global ?? "hybrid"
}

export function orvitaFallbackToSheetsEnabled() {
  const raw = process.env.ORVITA_FALLBACK_TO_SHEETS?.trim().toLowerCase()
  if (!raw) return true
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on"
}

