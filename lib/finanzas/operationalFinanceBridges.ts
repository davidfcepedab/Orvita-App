/**
 * Conecta categorías financieras con lenguaje operativo (agenda, hábitos, energía).
 * Las correlaciones con hábitos son heurísticas por nombre; refina en la UI de hábitos.
 */

export type HabitRef = { name: string; domain?: string | null }

export type OperationalDriverProfile = {
  /** Narrativa corta del driver de fondo */
  driver: string
  /** Acciones concretas en agenda / rutina */
  agendaLevers: string
  /** Palabras clave para cruzar con nombres de hábitos */
  habitKeywords: string[]
}

/** Perfil operativo por etiqueta de categoría o subcategoría (heurística en español). */
export function operationalDriverForLabel(name: string): OperationalDriverProfile {
  const n = name.toLowerCase()
  if (/aliment|mercado|restaur|comida|café|cafe|domicilio|rapi/.test(n)) {
    return {
      driver:
        "Decisiones de alimentación y compras frecuentes (planificación baja → más improvisación y delivery).",
      agendaLevers:
        "Plan semanal de mercado, bloques de cocina batch y límite de pedidos; revisar triggers horario (noche/fin de semana).",
      habitKeywords: ["comida", "mercado", "nutrición", "cocina", "salud"],
    }
  }
  if (/movil|uber|transport|gasolina|peaje|parking|parqueadero/.test(n)) {
    return {
      driver: "Movilidad y desplazamientos: más viajes dispersos o horarios pico suelen subir el gasto discreto.",
      agendaLevers:
        "Agrupar salidas, revisar suscripciones de movilidad y combinar tramos; calendarizar reuniones para reducir idas extra.",
      habitKeywords: ["movilidad", "transporte", "pasos", "caminar", "entrenamiento"],
    }
  }
  if (/suscrip|software|saas|spotify|netflix|digital|app|cloud/.test(n)) {
    return {
      driver:
        "Capa digital: muchas suscripciones pequeñas suman; suele ir con trabajo en pantalla y multitarea.",
      agendaLevers:
        "Auditoría trimestral de SaaS; batch de altas/bajas el mismo día; recordatorios en agenda para cortes de prueba.",
      habitKeywords: ["enfoque", "pantalla", "trabajo", "profesional", "software"],
    }
  }
  if (/salud|médico|medic|seguro|gym|entren|deporte|terapia/.test(n)) {
    return {
      driver: "Inversión en salud y rendimiento: puede subir con más sesiones o copagos concentrados.",
      agendaLevers: "Coordinar citas en misma ventana; revisar si hay duplicidad de servicios; negociar paquetes.",
      habitKeywords: ["salud", "ejercicio", "descanso", "agua", "energía"],
    }
  }
  if (/educ|curso|libro|icetex|univers|idioma/.test(n)) {
    return {
      driver: "Educación y desarrollo: crecimiento alineado a temporadas académicas o cursos.",
      agendaLevers: "Mapear hitos de pago en agenda; sustituir cursos solapados; usar bloques de estudio para amortizar.",
      habitKeywords: ["estudio", "lectura", "aprendizaje", "profesional"],
    }
  }
  if (/hogar|vivienda|arriend|servicio|luz|agua|aseo/.test(n)) {
    return {
      driver: "Base del hogar: estructura fija; variaciones suelen venir de servicios, reparaciones o convivencia.",
      agendaLevers: "Revisión anual de contratos; agrupar mantenimiento; negociar tarifas en una sola ventana de tiempo.",
      habitKeywords: ["hogar", "organización", "limpieza", "rutina"],
    }
  }
  if (/ingreso|freelance|cliente|venta|nomina|nómina|salario/.test(n)) {
    return {
      driver: "Capacidad de ingreso ligada a carga laboral y foco; más entregas o clientes activos.",
      agendaLevers: "Proteger bloques de trabajo profundo; revisar precio/hora vs fatiga; pipeline en agenda visible.",
      habitKeywords: ["profesional", "enfoque", "trabajo", "energía"],
    }
  }
  return {
    driver:
      "Gasto operativo ligado a decisiones repetidas (qué compras, cuándo y con qué frecuencia) más que al número aislado.",
    agendaLevers:
      "Revisión semanal de 15–20 min en Órbita: categoría → movimientos → una decisión de ajuste para la semana siguiente.",
    habitKeywords: ["rutina", "enfoque", "energía", "descanso"],
  }
}

/** Cruza nombres de hábitos con la categoría (substring / token simple). */
export function correlateHabitsWithLabel(label: string, habits: HabitRef[]): { matched: string[]; line: string } {
  const ln = label.toLowerCase()
  const tokens = ln.split(/[^a-záéíóúñ0-9]+/i).filter((t) => t.length > 3)
  const matched: string[] = []
  for (const h of habits) {
    const hn = h.name.toLowerCase()
    if (tokens.some((t) => hn.includes(t))) {
      matched.push(h.name)
      continue
    }
    const op = operationalDriverForLabel(label)
    if (op.habitKeywords.some((k) => hn.includes(k))) matched.push(h.name)
  }
  const uniq = [...new Set(matched)].slice(0, 4)
  return {
    matched: uniq,
    line:
      uniq.length > 0
        ? `Hábitos con eco nominal: ${uniq.join(", ")}. Si la frecuencia de esos hábitos subió este mes, puede explicar parte del gasto.`
        : "Sin eco directo con nombres de hábitos: revisa agenda (eventos recurrentes) y triggers de compra (horario, fatiga).",
  }
}

export function operationalCauseForAnt(category: string, subcategory: string): string {
  const sub = subcategory.toLowerCase()
  const cat = category.toLowerCase()
  const base = operationalDriverForLabel(subcategory).driver
  if (/café|coffee|snack|pan/.test(sub))
    return `${base} Patrón típico: muchas transacciones pequeñas = decisiones en automático entre reuniones.`
  if (/transport|movil|uber|taxi/.test(sub) || /movil/.test(cat))
    return `${base} Frecuencia alta suele correlacionar con agenda fragmentada o muchas salidas cortas.`
  return `${base} Muchos cargos pequeños sugieren falta de batching o límites claros por semana.`
}

export function narrativeForGrowth(category: string, momPct: number | null, habits: HabitRef[]): string {
  const op = operationalDriverForLabel(category)
  const corr = correlateHabitsWithLabel(category, habits)
  const spike =
    momPct != null && momPct >= 15
      ? ` El incremento fuerte (MoM) suele ir detrás de un cambio de rutina, más salidas o menos planificación.`
      : momPct != null && momPct > 0
        ? ` Ligero aumento: conviene vigilar si se consolida en el hábito de gasto.`
        : ""
  return `${op.driver} ${spike} ${corr.line}`
}

export function timeReliefHeuristicMonthlyHours(savingsMonthlyCop: number): number {
  /** Orden de magnitud: ~1 h/mes por cada ~$400k COP ahorrados en micro-decisiones (editable). */
  if (savingsMonthlyCop <= 0) return 0
  return Math.min(12, Math.round(savingsMonthlyCop / 400_000))
}
