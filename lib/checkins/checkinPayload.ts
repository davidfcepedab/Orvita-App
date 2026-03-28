import type { OrvitaDailyCheckinSummary } from "@/lib/checkins/checkinSummary"

/**
 * Corporal and measure fields persisted in checkins.body_metrics (jsonb).
 * All keys optional; extra keys are allowed for additive evolution.
 */
export type CheckinBodyMetrics = {
  /** YYYY-MM-DD reported by the form (additive; not a DB column). */
  fecha_reportada?: string
  peso?: string | number
  /** Porcentaje de grasa corporal */
  pct_grasa?: string | number
  cintura?: string | number
  pecho?: string | number
  hombros?: string | number
  bicepsDer?: string | number
  bicepsIzq?: string | number
  cuadricepsDer?: string | number
  cuadricepsIzq?: string | number
  gluteos?: string | number
}

export type CheckinSource = "sheets" | "manual"

export type CheckinFormPayload = {
  fecha: string
  hoy?: boolean
  ayer?: boolean
  horaDespertar?: string
  horaDormir?: string
  agua?: string | number
  meditacion?: string | number
  lectura?: string | number
  dietaCumplida?: number | boolean
  avanceProyecto?: number | boolean
  tiempoPareja?: number | boolean
  interaccionSocial?: number | boolean
  calidadSueno?: number
  descanso?: number
  energia?: number
  ansiedad?: number
  estadoAnimo?: number
  calidadConexion?: number
  entreno?: boolean
  tipoEntreno?: string
  minutosEntreno?: string | number
  peso?: string | number
  pct_grasa?: string | number
  cintura?: string | number
  pecho?: string | number
  hombros?: string | number
  bicepsDer?: string | number
  bicepsIzq?: string | number
  cuadricepsDer?: string | number
  cuadricepsIzq?: string | number
  gluteos?: string | number
  deepWork?: string | number
  productividad?: number
  sheet_row_id?: string
  /** Client hint: where the row was captured (defaults applied server-side). */
  source?: CheckinSource
}

const BODY_FORM_KEYS = [
  "peso",
  "pct_grasa",
  "cintura",
  "pecho",
  "hombros",
  "bicepsDer",
  "bicepsIzq",
  "cuadricepsDer",
  "cuadricepsIzq",
  "gluteos",
] as const

export function buildBodyMetricsFromForm(payload: CheckinFormPayload): CheckinBodyMetrics {
  const out: CheckinBodyMetrics = {}
  if (payload.fecha) {
    out.fecha_reportada = payload.fecha
  }
  for (const key of BODY_FORM_KEYS) {
    const v = payload[key]
    if (v === undefined || v === null || v === "") continue
    out[key] = typeof v === "number" ? v : String(v)
  }
  return out
}

function n(value: unknown, fallback: number): number {
  const x = typeof value === "number" ? value : Number(value)
  return Number.isFinite(x) ? x : fallback
}

/** Derives legacy score_* columns for operational context (additive). */
export function deriveLegacyScores(payload: CheckinFormPayload): {
  score_global: number | null
  score_fisico: number | null
  score_salud: number | null
  score_profesional: number | null
} {
  const calidadSueno = n(payload.calidadSueno, NaN)
  const descanso = n(payload.descanso, NaN)
  const energia = n(payload.energia, NaN)
  const estadoAnimo = n(payload.estadoAnimo, NaN)
  const productividad = n(payload.productividad, NaN)
  const mins = n(payload.minutosEntreno, 0)

  const saludParts = [calidadSueno, descanso, energia, estadoAnimo].filter((x) => !Number.isNaN(x))
  const score_salud = saludParts.length ? saludParts.reduce((a, b) => a + b, 0) / saludParts.length : null

  const score_profesional = Number.isNaN(productividad) ? null : productividad

  let score_fisico: number | null = null
  if (payload.entreno && mins > 0) {
    score_fisico = Math.min(10, Math.max(1, mins / 15))
  } else if (payload.entreno) {
    score_fisico = 5
  }

  const globalParts = [score_salud, score_profesional].filter((x): x is number => x !== null)
  const score_global = globalParts.length ? globalParts.reduce((a, b) => a + b, 0) / globalParts.length : null

  return { score_global, score_fisico, score_salud, score_profesional }
}

export function parseCheckinFormBody(body: unknown): { ok: true; data: CheckinFormPayload } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Invalid JSON body" }
  }
  const b = body as Record<string, unknown>
  const fecha = typeof b.fecha === "string" ? b.fecha.trim() : ""
  if (!fecha) {
    return { ok: false, error: "fecha is required (YYYY-MM-DD)" }
  }
  const sourceRaw = b.source
  const source: CheckinSource | undefined =
    sourceRaw === "manual" || sourceRaw === "sheets" ? sourceRaw : undefined

  const data: CheckinFormPayload = {
    fecha,
    hoy: typeof b.hoy === "boolean" ? b.hoy : undefined,
    ayer: typeof b.ayer === "boolean" ? b.ayer : undefined,
    horaDespertar: typeof b.horaDespertar === "string" ? b.horaDespertar : undefined,
    horaDormir: typeof b.horaDormir === "string" ? b.horaDormir : undefined,
    agua: b.agua as CheckinFormPayload["agua"],
    meditacion: b.meditacion as CheckinFormPayload["meditacion"],
    lectura: b.lectura as CheckinFormPayload["lectura"],
    dietaCumplida: b.dietaCumplida as CheckinFormPayload["dietaCumplida"],
    avanceProyecto: b.avanceProyecto as CheckinFormPayload["avanceProyecto"],
    tiempoPareja: b.tiempoPareja as CheckinFormPayload["tiempoPareja"],
    interaccionSocial: b.interaccionSocial as CheckinFormPayload["interaccionSocial"],
    calidadSueno: typeof b.calidadSueno === "number" ? b.calidadSueno : undefined,
    descanso: typeof b.descanso === "number" ? b.descanso : undefined,
    energia: typeof b.energia === "number" ? b.energia : undefined,
    ansiedad: typeof b.ansiedad === "number" ? b.ansiedad : undefined,
    estadoAnimo: typeof b.estadoAnimo === "number" ? b.estadoAnimo : undefined,
    calidadConexion: typeof b.calidadConexion === "number" ? b.calidadConexion : undefined,
    entreno: typeof b.entreno === "boolean" ? b.entreno : undefined,
    tipoEntreno: typeof b.tipoEntreno === "string" ? b.tipoEntreno : undefined,
    minutosEntreno: b.minutosEntreno as CheckinFormPayload["minutosEntreno"],
    peso: b.peso as CheckinFormPayload["peso"],
    pct_grasa: b.pct_grasa as CheckinFormPayload["pct_grasa"],
    cintura: b.cintura as CheckinFormPayload["cintura"],
    pecho: b.pecho as CheckinFormPayload["pecho"],
    hombros: b.hombros as CheckinFormPayload["hombros"],
    bicepsDer: b.bicepsDer as CheckinFormPayload["bicepsDer"],
    bicepsIzq: b.bicepsIzq as CheckinFormPayload["bicepsIzq"],
    cuadricepsDer: b.cuadricepsDer as CheckinFormPayload["cuadricepsDer"],
    cuadricepsIzq: b.cuadricepsIzq as CheckinFormPayload["cuadricepsIzq"],
    gluteos: b.gluteos as CheckinFormPayload["gluteos"],
    deepWork: b.deepWork as CheckinFormPayload["deepWork"],
    productividad: typeof b.productividad === "number" ? b.productividad : undefined,
    sheet_row_id: typeof b.sheet_row_id === "string" ? b.sheet_row_id.trim() : undefined,
    source,
  }
  return { ok: true, data }
}

export type CheckinPreloadData = Partial<CheckinFormPayload> & {
  _summary?: OrvitaDailyCheckinSummary | null
}

