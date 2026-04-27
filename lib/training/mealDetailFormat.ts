/** Parte un párrafo de sugerencias en frases para listas legibles. */
export function mealDetailBulletLines(detail: string): string[] {
  const raw = detail.trim()
  if (!raw) return []
  return raw
    .split(/\.\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.endsWith(".") ? s : `${s}.`))
}
