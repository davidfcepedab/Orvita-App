/**
 * YYYY-MM-DD en la zona horaria local del usuario (no UTC desde toISOString).
 */
export function formatLocalDateKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Día local a partir de un instante ISO (evento con hora en UTC → día correcto en Colombia, etc.).
 */
export function localDateKeyFromIso(iso: string | null | undefined): string | null {
  if (!iso || iso.length < 10) return null
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return formatLocalDateKey(new Date(t))
}
