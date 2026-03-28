export type RecoveryStatus = "optimal" | "stable" | "fragile"

export type HealthSummaryFactsInput = {
  bodyBattery: number
  sleepScore: number
  recoveryStatus: RecoveryStatus
  hrv: number
  restingHR: number
  hydrationCurrent: number
  hydrationTarget: number
  trainedToday: boolean
  activeSupplements: number
  supplementsLoading: boolean
  tendencia: { value: number }[]
  /** Macro más “desviado” del objetivo (opcional, texto ya legible). */
  nutritionHint?: string | null
}

export type HealthSummaryFacts = {
  energyLine: string
  restLine: string
  bodyRhythmLine: string
  hydrationLine: string
  movementLine: string
  supplementsLine: string | null
  weekLine: string
  nutritionLine: string | null
}

function energyLine(bodyBattery: number): string {
  if (bodyBattery >= 78) {
    return "Por lo que muestra tu resumen, llegas con bastante energía acumulada para afrontar el día."
  }
  if (bodyBattery >= 55) {
    return "Tu sensación de energía corporal está en un punto medio: ni sobrada ni al límite."
  }
  return "Tu cuerpo pinta algo justo de energía; conviene priorizar descansar bien y no apretar el ritmo de más."
}

function restLine(recoveryStatus: RecoveryStatus, sleepScore: number): string {
  if (recoveryStatus === "optimal" && sleepScore >= 75) {
    return "El descanso y la sensación de recuperación encajan bien: parece que el cuerpo ha podido reponerse."
  }
  if (recoveryStatus === "fragile" || sleepScore < 50) {
    return "La recuperación se ve justa: merece la pena mimar el sueño y no sumar más fatiga de la necesaria."
  }
  return "Recuperación y sueño están en un terreno normal, sin picos ni alarmas en lo que refleja aquí."
}

function bodyRhythmLine(hrv: number, restingHR: number): string {
  if (hrv >= 62 && restingHR <= 58) {
    return "Cuando estás quieto, el pulso se ve tranquilo y el cuerpo transmite calma."
  }
  if (restingHR >= 64) {
    return "El pulso en reposo está un poco más vivo que otras veces; a veces pasa con el cansancio o un día intenso."
  }
  if (hrv < 52) {
    return "Hay señales de que el cuerpo lleva algo de carga; un día más pausado puede ayudar."
  }
  return "Los signos de ritmo en reposo caen dentro de lo habitual para lo que sueles ver en tu resumen."
}

function hydrationLine(current: number, target: number): string {
  const t = Math.max(0.1, target)
  const pct = Math.round((current / t) * 100)
  if (pct >= 90) {
    return "Con el agua vas bien encaminado hacia lo que marcas como meta del día."
  }
  if (pct >= 65) {
    return "Aún te falta un poco para la cantidad de agua que buscas; repartir vasos a lo largo del día suele funcionar."
  }
  return "La hidratación va algo por debajo de tu objetivo; un par de vasos extra suelen notarse pronto."
}

function movementLine(trainedToday: boolean): string {
  return trainedToday
    ? "Hoy ya has movido el cuerpo con entrenamiento; eso suele ayudar a cerrar el día con mejor sensación."
    : "Hoy no figura entreno; un paseo suave o estiramientos también cuentan si te apetece moverte un poco."
}

function supplementsLine(active: number, loading: boolean): string | null {
  if (loading) return null
  if (active === 0) {
    return "No tienes suplementos marcados como activos en tu rutina ahora mismo."
  }
  if (active === 1) {
    return "Llevas un suplemento activo en tu rutina diaria."
  }
  return `Llevas ${active} suplementos activos en tu rutina diaria.`
}

function weekLine(tendencia: { value: number }[]): string {
  if (tendencia.length < 2) {
    return "Aún hay pocos días para leer tendencia; en cuanto acumules más verás mejor la forma de la semana."
  }
  const first = tendencia[0]?.value ?? 0
  const last = tendencia[tendencia.length - 1]?.value ?? 0
  const delta = last - first
  if (delta > 5) {
    return "A lo largo de la semana tu sensación de forma ha ido mejorando poco a poco."
  }
  if (delta < -5) {
    return "Esta semana se nota un bajón suave en cómo te has sentido; suele mejorar con descanso y menos prisa."
  }
  return "La sensación general de la semana se mantiene bastante estable."
}

export function buildHealthSummaryFacts(input: HealthSummaryFactsInput): HealthSummaryFacts {
  return {
    energyLine: energyLine(input.bodyBattery),
    restLine: restLine(input.recoveryStatus, input.sleepScore),
    bodyRhythmLine: bodyRhythmLine(input.hrv, input.restingHR),
    hydrationLine: hydrationLine(input.hydrationCurrent, input.hydrationTarget),
    movementLine: movementLine(input.trainedToday),
    supplementsLine: supplementsLine(input.activeSupplements, input.supplementsLoading),
    weekLine: weekLine(input.tendencia),
    nutritionLine: input.nutritionHint?.trim() || null,
  }
}

/** Párrafo de respaldo sin API (siempre disponible). */
export function buildFallbackHealthSummaryParagraph(facts: HealthSummaryFacts): string {
  const chunks = [
    facts.energyLine,
    facts.restLine,
    facts.bodyRhythmLine,
    facts.hydrationLine,
    facts.movementLine,
    facts.supplementsLine,
    facts.weekLine,
    facts.nutritionLine,
  ].filter((s): s is string => Boolean(s && s.length > 0))
  return chunks.join(" ")
}

/** Texto que enviamos al modelo (hechos en español plano, sin jerga). */
export function buildHealthSummaryPromptFacts(facts: HealthSummaryFacts): string {
  const lines = [
    facts.energyLine,
    facts.restLine,
    facts.bodyRhythmLine,
    facts.hydrationLine,
    facts.movementLine,
    facts.supplementsLine,
    facts.weekLine,
    facts.nutritionLine,
  ].filter((s): s is string => Boolean(s && s.length > 0))
  return lines.map((l) => `• ${l}`).join("\n")
}

export function macroNutritionHint(
  macros: { label: string; current: number; target: number; unit?: string }[],
): string | null {
  if (!macros.length) return null
  let worst: { label: string; ratio: number; current: number; target: number } | null = null
  for (const m of macros) {
    const t = Math.max(1, m.target)
    const ratio = m.current / t
    const dev = Math.abs(1 - ratio)
    if (!worst || dev > worst.ratio) {
      worst = { label: m.label, ratio: dev, current: m.current, target: m.target }
    }
  }
  if (!worst || worst.ratio < 0.12) {
    return "La ingesta de macronutrientes que ves en el panel está bastante cerca de lo que marcas como referencia."
  }
  if (worst.current < worst.target * 0.88) {
    return `En ${worst.label.toLowerCase()} vas un poco por debajo de tu referencia; un ajuste suave en comidas puede equilibrarlo.`
  }
  return `En ${worst.label.toLowerCase()} vas un poco por encima de tu referencia; nada grave, solo para tenerlo en el radar.`
}
