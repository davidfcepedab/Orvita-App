/** Query params compartidos entre /training y /agenda para sugerir huecos de entreno. */
export const AGENDA_SUGGEST_TRAINING_KEY = "sugerir"
export const AGENDA_SUGGEST_TRAINING_VALUE = "entreno"

export type AgendaSuggestTrainingOptions = {
  duracionMinutos?: number
  pref?: "morning" | "afternoon"
  origen?: "descanso" | "reprogramar" | "calendario"
}

export function buildAgendaSuggestTrainingUrl(opts: AgendaSuggestTrainingOptions = {}): string {
  const p = new URLSearchParams()
  p.set(AGENDA_SUGGEST_TRAINING_KEY, AGENDA_SUGGEST_TRAINING_VALUE)
  const d = opts.duracionMinutos ?? 60
  if (d >= 15 && d <= 180) p.set("duracion", String(Math.round(d)))
  if (opts.pref) p.set("pref", opts.pref)
  if (opts.origen) p.set("origen", opts.origen)
  return `/agenda?${p.toString()}`
}
