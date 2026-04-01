import type { SupplementComplianceMap } from "@/lib/health/healthPrefsTypes"

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/
const KEEP_DAYS = 120

export function todayYmdLocal(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function normalizeCompliance(raw: unknown): SupplementComplianceMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {}
  const out: SupplementComplianceMap = {}
  for (const [date, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!YMD_RE.test(date)) continue
    if (!v || typeof v !== "object" || Array.isArray(v)) continue
    const inner: Record<string, boolean> = {}
    for (const [id, b] of Object.entries(v as Record<string, unknown>)) {
      if (typeof id === "string" && id && typeof b === "boolean") inner[id] = b
    }
    if (Object.keys(inner).length > 0) out[date] = inner
  }
  return trimComplianceMap(out)
}

export function trimComplianceMap(map: SupplementComplianceMap): SupplementComplianceMap {
  const dates = Object.keys(map).filter((d) => YMD_RE.test(d)).sort()
  if (dates.length <= KEEP_DAYS) return map
  const drop = dates.length - KEEP_DAYS
  const cut = new Set(dates.slice(0, drop))
  const out: SupplementComplianceMap = {}
  for (const [d, row] of Object.entries(map)) {
    if (cut.has(d)) continue
    out[d] = row
  }
  return out
}
