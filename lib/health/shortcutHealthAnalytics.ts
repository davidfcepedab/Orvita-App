/**
 * Analítica ligera para importación Atajo / Apple (no clínica; señal operativa).
 */

export type HealthMetricRowLike = {
  observed_at: string
  sleep_hours: number | null
  hrv_ms: number | null
  resting_hr_bpm: number | null
  steps: number | null
  calories: number | null
  apple_workout_minutes: number | null
  metadata?: Record<string, unknown> | null
}

function num(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === "number" && Number.isFinite(v)) return v
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v)
  return null
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((a, b) => a + b, 0) / nums.length
}

function sleepSecondsFromRow(r: HealthMetricRowLike): number | null {
  const m = r.metadata
  if (m && typeof m === "object" && "apple_sleep_duration_seconds" in m) {
    const s = num(m.apple_sleep_duration_seconds)
    if (s != null && s >= 0) return s
  }
  const sh = r.sleep_hours
  if (sh != null && sh > 0) return sh * 3600
  return null
}

function workoutSecondsFromRow(r: HealthMetricRowLike): number | null {
  const m = r.metadata
  if (m && typeof m === "object" && "apple_workouts_duration_seconds" in m) {
    const s = num(m.apple_workouts_duration_seconds)
    if (s != null && s >= 0) return s
  }
  const wm = r.apple_workout_minutes
  if (wm != null && wm > 0) return wm * 60
  return null
}

export function sleepHoursFromSeconds(sec: number | null) {
  if (sec == null || sec < 0) return null
  return sec / 3600
}

export function formatHoursMinutesFromSeconds(sec: number | null) {
  if (sec == null || sec < 0) return null
  const h = Math.floor(sec / 3600)
  const m = Math.round((sec % 3600) / 60)
  return { h, m, label: `${h}h ${m}m` }
}

/**
 * Tendencia: últimos 7 vs 7 anteriores (por observed_at). No crashea con &lt;14 filas.
 */
export function buildWeeklyStraddle(rows: HealthMetricRowLike[]) {
  const sorted = [...rows].sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())
  const recent = sorted.slice(0, 7)
  const prev = sorted.slice(7, 14)

  const takeMean = (list: HealthMetricRowLike[], fn: (r: HealthMetricRowLike) => number | null) => {
    const v = list.map(fn).filter((n): n is number => n != null && Number.isFinite(n))
    return mean(v)
  }

  const fSleep = (r: HealthMetricRowLike) => sleepSecondsFromRow(r)
  const fHrv = (r: HealthMetricRowLike) => (r.hrv_ms != null ? r.hrv_ms : null)
  const fRhr = (r: HealthMetricRowLike) => (r.resting_hr_bpm != null ? r.resting_hr_bpm : null)
  const fSteps = (r: HealthMetricRowLike) => (r.steps != null ? r.steps : null)
  const fCal = (r: HealthMetricRowLike) => (r.calories != null ? r.calories : null)
  const fWsec = (r: HealthMetricRowLike) => workoutSecondsFromRow(r)

  return {
    current_window_n: recent.length,
    previous_window_n: prev.length,
    sleep_hours_avg_recent: (() => {
      const secs = recent.map(fSleep).filter((s): s is number => s != null)
      if (!secs.length) return null
      return mean(secs.map((s) => s / 3600))
    })(),
    sleep_hours_avg_prev: (() => {
      const secs = prev.map(fSleep).filter((s): s is number => s != null)
      if (!secs.length) return null
      return mean(secs.map((s) => s / 3600))
    })(),
    hrv_ms_avg_recent: takeMean(recent, fHrv),
    hrv_ms_avg_prev: takeMean(prev, fHrv),
    resting_hr_bpm_avg_recent: takeMean(recent, fRhr),
    resting_hr_bpm_avg_prev: takeMean(prev, fRhr),
    steps_avg_recent: takeMean(recent, fSteps),
    steps_avg_prev: takeMean(prev, fSteps),
    active_energy_kcal_avg_recent: takeMean(recent, fCal),
    active_energy_kcal_avg_prev: takeMean(prev, fCal),
    workout_seconds_sum_recent: (() => {
      const v = recent.map(fWsec).filter((s): s is number => s != null)
      if (!v.length) return null
      return v.reduce((a, b) => a + b, 0)
    })(),
    workout_seconds_sum_prev: (() => {
      const v = prev.map(fWsec).filter((s): s is number => s != null)
      if (!v.length) return null
      return v.reduce((a, b) => a + b, 0)
    })(),
  }
}

function directionLabel(
  recent: number | null,
  previous: number | null,
  lowerIsBetter = false,
): "sube" | "baja" | "estable" | "sin dato" {
  if (recent == null || previous == null) return "sin dato"
  const d = recent - previous
  if (Math.abs(d) < 1e-6) return "estable"
  const up = d > 0
  if (lowerIsBetter) return up ? "sube" : "baja"
  return up ? "sube" : "baja"
}

/**
 * A: energía (calorías activas) vs sueño noche → día siguiente: usa filas consecutivas por calendario.
 */
export function energyVsSleepNarrative(rows: HealthMetricRowLike[]): string[] {
  const sorted = [...rows].sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime())
  if (sorted.length < 2) return []
  const out: string[] = []
  for (let i = 1; i < sorted.length; i++) {
    const prevDay = sorted[i - 1]!
    const day = sorted[i]!
    const sPrev = sleepSecondsFromRow(prevDay)
    const sDay = sleepSecondsFromRow(day)
    const en = day.calories
    if (sPrev == null || en == null) continue
    const sh = sPrev / 3600
    if (sh >= 7.5 && sh <= 8.5 && en < 200) {
      out.push("Sueño dentro del rango; energía activa baja: puede ser descanso o fatiga leve (lectura no médica).")
    } else if (sh < 6.5 && en > 400) {
      out.push("Sueño bajo y energía activa alta: día intenso pese a poco descanso; prioriza cierre y sueño la próxima noche.")
    } else if (sh > 8.5) {
      out.push("Sueño alto: vigila si el día siguiente se siente más lento; puede ser compensación o acumulación previa.")
    } else {
      out.push("Equilibrado (sueño y movimiento) en la ventana reciente: mantén constancia suave.")
    }
    if (out.length >= 2) break
  }
  return out.slice(0, 2)
}

/**
 * B: HRV vs carga (min entreno + kcal).
 */
export function hrvVsLoadNarrative(r: HealthMetricRowLike | null) {
  if (!r) return { label: "sin dato" as const, text: "Sin importación reciente de Apple/Atajo." }
  const h = r.hrv_ms
  const wsec = workoutSecondsFromRow(r) ?? 0
  const wm = wsec / 60
  const kcal = r.calories ?? 0
  const load = wm + kcal
  if (h == null) return { label: "HRV" as const, text: "Sin HRV en la última importación; el cruce con carga queda limitado." }
  if (h < 32 && load > 400) {
    return { label: "posible fatiga" as const, text: "HRV bajo con carga perceptible: sesión o día exigente; valora bajar intenso 24h." }
  }
  if (h < 32 && load < 150) {
    return { label: "estrés / no recuperación" as const, text: "HRV bajo con poca carga explícita: prioriza sueño, paseo suave, rutina fija." }
  }
  if (h >= 40 && kcal < 500 && wm < 60) {
    return { label: "adaptación / ligero" as const, text: "HRV aceptable con carga moderada: buen contexto para progreso gradual." }
  }
  if (h >= 45) {
    return { label: "recuperación razonable" as const, text: "HRV con margen: si la FC en reposo no está subida, buen contenedor para carga suave o técnica." }
  }
  return { label: "mixto" as const, text: "Cruce HRV y carga neutro: sigue 48h con datos antes de ajustar plan." }
}

export function recoveryScoreAndLabel(args: {
  hrv: number | null
  hrv7: number | null
  rhr: number | null
  rhr7: number | null
  sleepH: number | null
}): { score: number | null; readiness_label: "Alta" | "Media" | "Baja" } {
  const { hrv, hrv7, rhr, rhr7, sleepH } = args
  if (hrv == null && rhr == null && sleepH == null) {
    return { score: null, readiness_label: "Baja" }
  }
  let pts = 50
  if (hrv != null && hrv7 != null && hrv7 > 0) {
    const ratio = hrv / hrv7
    if (ratio >= 1.05) pts += 15
    else if (ratio >= 0.95) pts += 5
    else pts -= 10
  }
  if (rhr != null && rhr7 != null && rhr7 > 0) {
    const d = (rhr7 - rhr) / rhr7
    if (d > 0.02) pts += 10
    else if (d < -0.02) pts -= 8
  }
  if (sleepH != null) {
    if (sleepH >= 7.5 && sleepH <= 8.5) pts += 12
    else if (sleepH >= 6.5) pts += 4
    else pts -= 8
  }
  const score = Math.max(0, Math.min(100, Math.round(pts)))
  const readiness_label: "Alta" | "Media" | "Baja" = score >= 65 ? "Alta" : score >= 45 ? "Media" : "Baja"
  return { score, readiness_label }
}

export function trainingLoadProxy(r: HealthMetricRowLike | null) {
  if (!r) return null
  const wsec = workoutSecondsFromRow(r) ?? 0
  const wm = wsec / 60
  const k = r.calories ?? 0
  return { workout_minutes: Math.round(wm * 10) / 10, active_energy_kcal: k, proxy: Math.round((wm + k) * 10) / 10 }
}

function meanHrvExcludingLatest(rows: HealthMetricRowLike[]) {
  const sorted = [...rows].sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())
  if (sorted.length < 2) return null
  const tail = sorted.slice(1, 8)
  const v = tail.map((r) => (r.hrv_ms != null ? r.hrv_ms : null)).filter((n): n is number => n != null)
  return mean(v)
}

function meanRhrExcludingLatest(rows: HealthMetricRowLike[]) {
  const sorted = [...rows].sort((a, b) => new Date(b.observed_at).getTime() - new Date(a.observed_at).getTime())
  if (sorted.length < 2) return null
  const tail = sorted.slice(1, 8)
  const v = tail.map((r) => (r.resting_hr_bpm != null ? r.resting_hr_bpm : null)).filter((n): n is number => n != null)
  return mean(v)
}

export function buildShortcutAnalyticsPayload(timeline: HealthMetricRowLike[], latest: HealthMetricRowLike | null) {
  const t = buildWeeklyStraddle(timeline)
  const load = trainingLoadProxy(latest)
  const ssec = latest ? sleepSecondsFromRow(latest) : null
  const sH = sleepHoursFromSeconds(ssec)
  const hrv7 = meanHrvExcludingLatest(timeline)
  const rhr7 = meanRhrExcludingLatest(timeline)
  const rec = recoveryScoreAndLabel({
    hrv: latest?.hrv_ms ?? null,
    hrv7: hrv7 ?? t.hrv_ms_avg_prev,
    rhr: latest?.resting_hr_bpm ?? null,
    rhr7: rhr7 ?? t.resting_hr_bpm_avg_prev,
    sleepH: sH,
  })

  return {
    weekly: {
      ...t,
      sleep_trend: directionLabel(t.sleep_hours_avg_recent, t.sleep_hours_avg_prev),
      hrv_trend: directionLabel(t.hrv_ms_avg_recent, t.hrv_ms_avg_prev),
      resting_hr_trend: directionLabel(t.resting_hr_bpm_avg_recent, t.resting_hr_bpm_avg_prev),
      steps_trend: directionLabel(t.steps_avg_recent, t.steps_avg_prev),
      training_trend: directionLabel(t.workout_seconds_sum_recent, t.workout_seconds_sum_prev),
    },
    recovery: {
      recovery_score: rec.score,
      readiness_label: rec.readiness_label,
      training_load: load,
    },
    signals: {
      energy_vs_sleep: energyVsSleepNarrative(timeline),
      hrv_vs_load: hrvVsLoadNarrative(latest),
    },
  }
}

export type ShortcutHealthAnalyticsSnapshot = ReturnType<typeof buildShortcutAnalyticsPayload>
