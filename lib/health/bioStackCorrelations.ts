/**
 * Notas de correlación educativas entre bio-stack (suplementos / medicación registrada
 * con nombre libre) y señales Apple / narrativa. No es consejo médico.
 */
export function bioStackCorrelationLine(name: string): string | null {
  const n = name.trim().toLowerCase()
  if (!n) return null

  if (n.includes("quetiapin") || n.includes("quentiapin")) {
    return "Puede afectar sueño y somnolencia: si el descanso medido se mueve, coméntalo con tu médico, no solo con la app."
  }
  if (n.includes("sertalin") || n.includes("sertralin")) {
    return "ISRS: conviene fijar horario; los check-ins de ánimo en Órvita ayudan a ver tendencia (no reemplaza seguimiento clínico)."
  }
  if (n.includes("nac ") || n === "nac" || n.startsWith("nac,")) {
    return "NAC: suele ir con hidratación; encaja con días de mucha carga o calidad de aire baja (orientativo)."
  }
  if (n.includes("omega")) {
    return "Omega-3: coherente con días de inflamación o estrés; Apple no mide esto, pero el ritmo del sueño y pasos te dan contexto."
  }
  if (n.includes("magnesio")) {
    return "Magnesio nocturno: complementa señales de relajación; compáralo con HRV bajo o sueño fragmentado (sin diagnosticar)."
  }
  if (n.includes("creatina")) {
    return "Creatina: poca relación con sueño, mucha con rendimiento: si Apple ve entreno intenso y pocos pasos, puede ser sesión de fuerza."
  }
  if (n.includes("electrolit")) {
    return "Electrolitos: días con mucha sudoración o calor: hidratación y pasos de Apple se leen juntos con más sentido."
  }
  return null
}
