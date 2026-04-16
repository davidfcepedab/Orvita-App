/** Convierte YYYY-MM-DD (día local del cron) a fecha legible para correo y UI. */
export function formatDateLabelForUser(ymd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim())
  if (!m) return ymd.trim()
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const dt = new Date(y, mo - 1, d)
  if (Number.isNaN(dt.getTime())) return ymd.trim()
  return new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(dt)
}
