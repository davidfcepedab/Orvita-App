import type { CheckinBodyMetrics } from "@/lib/checkins/checkinPayload"
import type { BodyMetricDisplayRow } from "@/lib/training/trainingPrefsTypes"

function str(v: unknown): string | undefined {
  if (v === undefined || v === null) return undefined
  const t = String(v).trim()
  return t.length ? t : undefined
}

function emptyRow(
  label: string,
  current: string,
): BodyMetricDisplayRow {
  return {
    label,
    current,
    previous: "—",
    target: "",
    projection: "",
    progressPct: 0,
    trend: "down",
  }
}

const FIELD_SPECS: { key: keyof CheckinBodyMetrics; label: string; matchers: RegExp[] }[] = [
  { key: "peso", label: "Peso Corporal", matchers: [/peso/i, /weight/i] },
  { key: "pct_grasa", label: "% de Grasa", matchers: [/grasa/i, /bf/i, /body fat/i] },
  { key: "cintura", label: "Cintura", matchers: [/cintura/i, /waist/i] },
  { key: "pecho", label: "Pecho", matchers: [/pecho/i, /chest/i] },
  { key: "hombros", label: "Hombros", matchers: [/hombros/i, /shoulder/i] },
  { key: "bicepsDer", label: "Bíceps (der.)", matchers: [/bíceps.*der|biceps.*der/i] },
  { key: "bicepsIzq", label: "Bíceps (izq.)", matchers: [/bíceps.*izq|biceps.*izq/i] },
  { key: "cuadricepsDer", label: "Cuádriceps (der.)", matchers: [/cuádriceps.*der|muslo.*der/i] },
  { key: "cuadricepsIzq", label: "Cuádriceps (izq.)", matchers: [/cuádriceps.*izq|muslo.*izq/i] },
  { key: "gluteos", label: "Glúteos", matchers: [/glúte|glute/i] },
]

function syntheticFromMetrics(m: CheckinBodyMetrics): BodyMetricDisplayRow[] {
  const out: BodyMetricDisplayRow[] = []
  for (const spec of FIELD_SPECS) {
    const v = str(m[spec.key])
    if (v) out.push(emptyRow(spec.label, v))
  }
  return out
}

function rowMatches(row: BodyMetricDisplayRow, matchers: RegExp[]): boolean {
  return matchers.some((re) => re.test(row.label))
}

/**
 * Mezcla `body_metrics` del último check-in en las filas de preferencias para `/training`
 * (rellena `current` cuando hay coincidencia por etiqueta o añade filas si el array está vacío).
 */
export function mergeCheckinBodyIntoDisplayRows(
  rows: BodyMetricDisplayRow[],
  metrics: CheckinBodyMetrics | null | undefined,
): BodyMetricDisplayRow[] {
  if (!metrics) return rows

  if (!rows.length) {
    return syntheticFromMetrics(metrics)
  }

  let next = rows.map((r) => ({ ...r }))
  for (const spec of FIELD_SPECS) {
    const v = str(metrics[spec.key])
    if (!v) continue
    const idx = next.findIndex((r) => rowMatches(r, spec.matchers))
    if (idx >= 0) {
      next[idx] = { ...next[idx], current: v }
    } else {
      next.push(emptyRow(spec.label, v))
    }
  }
  return next
}
