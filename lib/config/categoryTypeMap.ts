export type CategoryType = "fixed" | "variable"

export const categoryTypeMap: Record<string, CategoryType> = {
  // Fijos
  "Hogar & Base": "fixed",
  "Obligaciones": "fixed",
  "Suscripciones": "fixed",
  "Movimientos Financieros": "fixed",
  "Finanzas": "fixed",

  // Variables
  "Alimentación": "variable",
  "Estilo de Vida": "variable",
  "Personal": "variable",
  "Movilidad": "variable",
  "Salud & Bienestar": "variable",
  "Desarrollo": "variable",
}
