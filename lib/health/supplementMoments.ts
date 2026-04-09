import type { SupplementMomentId } from "@/lib/health/healthPrefsTypes"

/** Orden del día para agrupar el stack (6 momentos). */
export const SUPPLEMENT_MOMENT_ORDER: SupplementMomentId[] = [
  "apenas_me_levanto",
  "en_ayunas",
  "dia_manana",
  "mediodia",
  "tarde",
  "antes_de_dormir",
]

export const SUPPLEMENT_MOMENT_LABELS: Record<SupplementMomentId, string> = {
  apenas_me_levanto: "Apenas me levanto",
  en_ayunas: "En ayunas",
  dia_manana: "Mañana",
  mediodia: "Mediodía",
  tarde: "Tarde",
  antes_de_dormir: "Antes de dormir",
}

/**
 * Valores guardados legacy (4 franjas). `manana` en storage antiguo = bloque mañana → primer slot del día.
 */
export const LEGACY_SUPPLEMENT_MOMENT_MAP: Record<string, SupplementMomentId> = {
  mediodia: "mediodia",
  tarde: "tarde",
}

/** Etiquetas en español (JSON / importación). "Mañana" → dia_manana (no colisiona con legacy `manana`). */
const MOMENT_ALIAS_FROM_LABEL: Record<string, SupplementMomentId> = {
  "apenas me levanto": "apenas_me_levanto",
  "en ayunas": "en_ayunas",
  mañana: "dia_manana",
  manana: "dia_manana",
  mediodía: "mediodia",
  mediodia: "mediodia",
  tarde: "tarde",
  "antes de dormir": "antes_de_dormir",
}

export function isSupplementMomentId(v: string): v is SupplementMomentId {
  return (SUPPLEMENT_MOMENT_ORDER as string[]).includes(v)
}

/** Normaliza `daypart` / `moment` guardado o legado a un id válido. */
export function normalizeSupplementMomentId(raw: unknown): SupplementMomentId {
  if (typeof raw !== "string" || !raw.trim()) return "apenas_me_levanto"
  const t = raw.trim()
  if (t === "noche") return "antes_de_dormir"
  /** Storage antiguo: `manana` era la única franja de mañana. */
  if (t === "manana") return "apenas_me_levanto"
  if (isSupplementMomentId(t)) return t
  const legacy = LEGACY_SUPPLEMENT_MOMENT_MAP[t]
  if (legacy) return legacy
  const fromLabel = MOMENT_ALIAS_FROM_LABEL[t.toLowerCase()]
  if (fromLabel) return fromLabel
  return "apenas_me_levanto"
}
