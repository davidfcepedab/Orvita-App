const DAY_LABELS = ["L", "M", "X", "J", "V", "S", "D"] as const

/** Etiquetas de eje X al estilo “intradía” (misma referencia visual que el mock). */
export const BIOMETRIC_CORRELATION_HOUR_LABELS = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"] as const

export type SleepEnergyPoint = {
  name: string
  sueno: number
  energia: number
}

/** Punto para ComposedChart: área “fatigue / sleep debt” + línea energía. */
export type BiometricCorrelationChartPoint = {
  hour: string
  /** Índice invertido respecto al sueño (más alto = más fatiga / deuda perceptual). */
  fatigue: number
  energy: number
  /** Etiqueta corta del día (L, M, X…). */
  dayAbbrev: string
  /** Texto para tooltips: aclara que son 7 muestras diarias, no telemetría horaria. */
  sequenceHint: string
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

/**
 * Últimos 7 puntos de tendencia como proxy de energía; sueño correlacionado con recuperación base.
 */
export function buildSleepVsEnergySeries(
  tendencia7d: { value: number }[],
  scoreRecuperacion: number,
): SleepEnergyPoint[] {
  const base = Number.isFinite(scoreRecuperacion) ? scoreRecuperacion : 55
  let vals = tendencia7d.map((t) => clamp(t.value, 15, 100))

  if (vals.length === 0) {
    const flat = clamp(base, 18, 96)
    vals = Array.from({ length: 7 }, () => flat)
  } else {
    const seed = vals[0] ?? base
    while (vals.length < 7) {
      vals = [seed, ...vals]
    }
    vals = vals.slice(-7)
  }

  return vals.map((energia, i) => {
    const e = Math.round(energia)
    const sueno = Math.round(clamp(base * 0.72 + e * 0.28 + (i % 2) * 3 - 8, 32, 98))
    return {
      name: DAY_LABELS[i] ?? `D${i + 1}`,
      sueno,
      energia: e,
    }
  })
}

/**
 * Misma correlación de 7 puntos, etiquetada como franjas horarias para el gráfico compuesto (área + línea).
 */
export function buildBiometricCorrelationChartSeries(
  tendencia7d: { value: number }[],
  scoreRecuperacion: number,
): BiometricCorrelationChartPoint[] {
  const daily = buildSleepVsEnergySeries(tendencia7d, scoreRecuperacion)
  return daily.map((p, i) => {
    const hour = BIOMETRIC_CORRELATION_HOUR_LABELS[i] ?? BIOMETRIC_CORRELATION_HOUR_LABELS[0]
    const fatigue = Math.round(clamp(100 - p.sueno * 0.92 + (i % 3) * 2, 18, 88))
    const dayAbbrev = p.name
    const sequenceHint = `Muestra ${i + 1} de 7 · día ${dayAbbrev} (eje inferior solo referencia visual)`
    return { hour, fatigue, energy: p.energia, dayAbbrev, sequenceHint }
  })
}
