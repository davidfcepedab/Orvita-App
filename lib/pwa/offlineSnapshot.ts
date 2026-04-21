/**
 * Resumen mínimo para la página offline (`/offline.html`) y el SW.
 * Se persiste en localStorage (sin credenciales).
 */
export const OFFLINE_SNAPSHOT_KEY = "orvita:pwa:offline_snapshot"

export type OfflineCheckinSnapshot = {
  /** ISO local legible */
  savedAt: string
  /** Una línea: energía, productividad, foco, entreno… */
  flowSummary: string
  /** Prioridad operativa inferida del formulario */
  palanca1: string
}

export function saveOfflineCheckinSnapshot(s: OfflineCheckinSnapshot) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(OFFLINE_SNAPSHOT_KEY, JSON.stringify(s))
  } catch {
    /* quota / modo privado */
  }
}

/** Construye texto a partir del estado del check-in (campos ya presentes en la página). */
export function buildOfflineSnapshotFromCheckinForm(form: {
  energia: number
  productividad: number
  deepWork: string
  entreno: boolean
  minutosEntreno: string | number
  fecha: string
}): OfflineCheckinSnapshot {
  const flowParts: string[] = []
  flowParts.push(`Energía ${form.energia}/10`)
  flowParts.push(`Productividad ${form.productividad}/10`)
  const dw = String(form.deepWork ?? "").trim()
  if (dw) flowParts.push(`Foco profundo ${dw} h`)
  if (form.entreno) {
    const m = String(form.minutosEntreno ?? "").trim()
    flowParts.push(m ? `Entreno ${m} min` : "Entreno registrado")
  }

  let palanca1 = "Sostener ritmo: revisa Hoy y Capital al volver la red."
  if (dw) {
    palanca1 = `Proteger bloque de foco (${dw} h): calendariza deep work al reconectar.`
  } else if (form.productividad <= 4) {
    palanca1 = "Palanca #1: recuperar productividad — un solo siguiente paso en /hoy."
  } else if (form.entreno) {
    palanca1 = "Palanca #1: consolidar el estímulo físico — hidratación y descanso."
  }

  return {
    savedAt: new Date().toISOString(),
    flowSummary: flowParts.join(" · "),
    palanca1,
  }
}
