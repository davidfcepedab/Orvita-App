import type { GoogleCalendarEventDTO } from "@/lib/google/types"

export type WorkoutSlotPref = "morning" | "afternoon" | null

export type SuggestedWorkoutSlot = {
  startAt: string
  endAt: string
  label: string
}

type BusyInterval = { startMs: number; endMs: number }

function ymdInTz(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

function hmInTz(d: Date, timeZone: string): { h: number; m: number } {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = f.formatToParts(d)
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? "0")
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? "0")
  return { h, m }
}

/** Primer instante (resolución 1 min) en `timeZone` donde el reloj local coincide con ymd + hora + minuto. */
export function zonedWallInstant(ymd: string, hour: number, minute: number, timeZone: string): Date | null {
  const [y, mo, da] = ymd.split("-").map(Number)
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) return null
  const anchor = Date.UTC(y, mo - 1, da, 12, 0, 0)
  for (let deltaMin = -14 * 60; deltaMin <= 14 * 60; deltaMin++) {
    const d = new Date(anchor + deltaMin * 60_000)
    if (ymdInTz(d, timeZone) !== ymd) continue
    const { h, m } = hmInTz(d, timeZone)
    if (h === hour && m === minute) return d
  }
  return null
}

/** Suma días civiles en el calendario de `timeZone` a partir de `startYmd`. */
export function addCalendarDaysToYmd(startYmd: string, deltaDays: number, timeZone: string): string {
  const ref = zonedWallInstant(startYmd, 12, 0, timeZone)
  if (!ref) return startYmd
  const t = ref.getTime() + deltaDays * 24 * 60 * 60 * 1000
  return ymdInTz(new Date(t), timeZone)
}

function mergeBusy(raw: BusyInterval[]): BusyInterval[] {
  raw.sort((x, y) => x.startMs - y.startMs)
  const merged: BusyInterval[] = []
  for (const cur of raw) {
    const last = merged[merged.length - 1]
    if (last && cur.startMs <= last.endMs) last.endMs = Math.max(last.endMs, cur.endMs)
    else merged.push({ ...cur })
  }
  return merged
}

function busyInWindow(ws: Date, we: Date, events: GoogleCalendarEventDTO[]): BusyInterval[] {
  const lo = ws.getTime()
  const hi = we.getTime()
  const out: BusyInterval[] = []
  for (const ev of events) {
    if (ev.allDay) continue
    if (!ev.startAt || !ev.endAt) continue
    const a = Date.parse(ev.startAt)
    const b = Date.parse(ev.endAt)
    if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) continue
    const s = Math.max(a, lo)
    const e = Math.min(b, hi)
    if (e > s) out.push({ startMs: s, endMs: e })
  }
  return mergeBusy(out)
}

function labelSlot(start: Date, end: Date, timeZone: string): string {
  const df = new Intl.DateTimeFormat("es-CO", {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return `${df.format(start)} → ${df.format(end)}`
}

function matchesPref(hour: number, pref: WorkoutSlotPref): boolean {
  if (!pref) return true
  if (pref === "morning") return hour >= 6 && hour < 13
  return hour >= 13 && hour < 22
}

export type SuggestWorkoutSlotsOptions = {
  events: GoogleCalendarEventDTO[]
  /** Primer día civil YYYY-MM-DD (en `timeZone`) */
  startYmd: string
  horizonDays: number
  durationMinutes: number
  timeZone: string
  pref?: WorkoutSlotPref
  workStartHour?: number
  workEndHour?: number
  maxSlots?: number
}

/**
 * Huecos libres de al menos `durationMinutes` entre eventos, ventana laboral local (08:00–22:00 por defecto).
 */
export function suggestWorkoutSlots(opts: SuggestWorkoutSlotsOptions): SuggestedWorkoutSlot[] {
  const {
    events,
    startYmd,
    horizonDays,
    durationMinutes,
    timeZone,
    pref = null,
    workStartHour = 8,
    workEndHour = 22,
    maxSlots = 6,
  } = opts
  const durationMs = Math.max(15, durationMinutes) * 60_000
  const slots: SuggestedWorkoutSlot[] = []

  for (let i = 0; i < horizonDays && slots.length < maxSlots; i++) {
    const ymd = addCalendarDaysToYmd(startYmd, i, timeZone)
    const ws = zonedWallInstant(ymd, workStartHour, 0, timeZone)
    const we = zonedWallInstant(ymd, workEndHour, 0, timeZone)
    if (!ws || !we || we.getTime() <= ws.getTime()) continue
    const busy = busyInWindow(ws, we, events)
    const dayStart = ws.getTime()
    const dayEnd = we.getTime()

    let cursor = dayStart
    for (const b of busy) {
      if (b.startMs > cursor) {
        const gap = b.startMs - cursor
        if (gap >= durationMs) {
          const endMs = cursor + durationMs
          const startD = new Date(cursor)
          const endD = new Date(endMs)
          const h = hmInTz(startD, timeZone).h
          if (matchesPref(h, pref)) {
            slots.push({
              startAt: startD.toISOString(),
              endAt: endD.toISOString(),
              label: labelSlot(startD, endD, timeZone),
            })
            if (slots.length >= maxSlots) return slots
          }
        }
      }
      cursor = Math.max(cursor, b.endMs)
    }
    if (dayEnd > cursor) {
      const gap = dayEnd - cursor
      if (gap >= durationMs) {
        const endMs = cursor + durationMs
        const startD = new Date(cursor)
        const endD = new Date(endMs)
        const h = hmInTz(startD, timeZone).h
        if (matchesPref(h, pref)) {
          slots.push({
            startAt: startD.toISOString(),
            endAt: endD.toISOString(),
            label: labelSlot(startD, endD, timeZone),
          })
        }
      }
    }
  }
  return slots.slice(0, maxSlots)
}

export function googleCalendarTemplateUrl(title: string, startIso: string, endIso: string): string {
  const toG = (iso: string) => {
    const d = new Date(iso)
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, "0")
    const day = String(d.getUTCDate()).padStart(2, "0")
    const h = String(d.getUTCHours()).padStart(2, "0")
    const min = String(d.getUTCMinutes()).padStart(2, "0")
    const s = String(d.getUTCSeconds()).padStart(2, "0")
    return `${y}${m}${day}T${h}${min}${s}Z`
  }
  const dates = `${toG(startIso)}/${toG(endIso)}`
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}
