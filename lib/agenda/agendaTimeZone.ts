/** Zona IANA para fechas/horas mostradas en agenda (finanzas relacionadas pueden reutilizar la misma). */
const DEFAULT_AGENDA_DISPLAY_TZ = "America/Bogota"

export function getAgendaDisplayTimeZone(): string {
  const raw = process.env.NEXT_PUBLIC_AGENDA_DISPLAY_TZ
  if (typeof raw === "string" && raw.trim()) return raw.trim()
  return DEFAULT_AGENDA_DISPLAY_TZ
}
