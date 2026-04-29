/**
 * Colores semánticos /salud (solo presentación).
 * Verde = ok · Ámbar = atención · Rojo = crítico · Púrpura = recuperación · Naranja = energía.
 * Azul solo como neutro estructural (no “estado”).
 */
/** Variantes más oscuras para números / enlaces sobre fondos tintados (contraste WCAG). */
export const SALUD_SEM_STRONG = {
  ok: "#15803d",
  warn: "#a16207",
  risk: "#b91c1c",
} as const

export const SALUD_SEM = {
  ok: "#22c55e",
  warn: "#eab308",
  risk: "#ef4444",
  recovery: "#a855f7",
  energy: "#f97316",
  neutral: "#94a3b8",
  /** UI neutra (tarjetas conexión / check-in vs Apple), no semáforo. */
  uiBlue: "#3b82f6",
} as const

export type SaludSemanticKey = keyof typeof SALUD_SEM
