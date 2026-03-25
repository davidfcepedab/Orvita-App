export type OrvitaDailyCheckinSummary = {
  day: string // YYYY-MM-DD
  energy: number | null
  focus: number | null
  mood: number | null
  notes: string | null
}

const ISO_DAY_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/
const DMY_SLASH_RE = /^(0?[1-9]|[12]\d|3[01])\/(0?[1-9]|1[0-2])\/(\d{4})$/
const YMD_SLASH_RE = /^(\d{4})\/(0?[1-9]|1[0-2])\/(0?[1-9]|[12]\d|3[01])$/

function toBoundedInt(value: unknown, options?: { min?: number; max?: number }) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return null
  const rounded = Math.round(parsed)
  const min = options?.min ?? -Infinity
  const max = options?.max ?? Infinity
  return Math.min(max, Math.max(min, rounded))
}

function buildNotes(parts: Array<{ label: string; value: unknown }>) {
  const lines = parts
    .map(({ label, value }) => {
      const text = typeof value === "string" ? value.trim() : ""
      if (!text) return null
      return `${label}: ${text}`
    })
    .filter((line): line is string => Boolean(line))

  if (lines.length === 0) return null

  const joined = lines.join("\n")
  return joined.length > 2000 ? `${joined.slice(0, 1997)}...` : joined
}

function normalizeDayCell(cell: unknown) {
  if (typeof cell === "string") {
    const trimmed = cell.trim()
    if (ISO_DAY_RE.test(trimmed)) return trimmed

    const dmy = trimmed.match(DMY_SLASH_RE)
    if (dmy) {
      const [, dd, mm, yyyy] = dmy
      return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`
    }

    const ymd = trimmed.match(YMD_SLASH_RE)
    if (ymd) {
      const [, yyyy, mm, dd] = ymd
      return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`
    }

    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10)
    }

    return null
  }

  if (typeof cell === "number" && Number.isFinite(cell)) {
    // Google Sheets "UNFORMATTED_VALUE" devuelve fechas como serial (días desde 1899-12-30).
    // Ej: 45200 ~= 2023-10-... (depende). Soportamos también epoch ms por seguridad.
    if (cell > 1_000_000_000_000) {
      return new Date(cell).toISOString().slice(0, 10)
    }

    const serialDays = Math.floor(cell)
    const baseUtcMs = Date.UTC(1899, 11, 30)
    const dayUtcMs = serialDays * 86_400_000
    const date = new Date(baseUtcMs + dayUtcMs)
    return date.toISOString().slice(0, 10)
  }

  if (cell instanceof Date && !Number.isNaN(cell.getTime())) {
    return cell.toISOString().slice(0, 10)
  }

  return null
}

export function parseCheckinRowToSummary(row: unknown[]): OrvitaDailyCheckinSummary | null {
  const cells = Array.isArray(row) ? row : []
  const day = normalizeDayCell(cells[0])
  if (!day || !ISO_DAY_RE.test(day)) return null

  // Orden actual del sheet (por app/api/checkin):
  // A fecha, B morningJournal, C afternoonJournal, D nightJournal,
  // G topPriority, I energia (index 8), K estadoAnimo (index 10), AA productividad (26).
  const energy = toBoundedInt(cells[8], { min: 0, max: 10 })
  const mood = toBoundedInt(cells[10], { min: 0, max: 10 })
  const focus = toBoundedInt(cells[26], { min: 0, max: 10 })

  const notes = buildNotes([
    { label: "Top", value: cells[6] },
    { label: "Blocker", value: cells[15] },
    { label: "Morning", value: cells[1] },
    { label: "Afternoon", value: cells[2] },
    { label: "Night", value: cells[3] },
  ])

  return { day, energy, focus, mood, notes }
}
