/** Infiere clase / naturaleza desde el texto de la hoja Movimientos (columna Cuenta). */
export function inferFinanceAccountMeta(label: string): {
  account_class: "ahorro" | "tarjeta_credito" | "credito"
  nature: "activo_liquido" | "pasivo_rotativo" | "pasivo_estructural"
} {
  const t = label.trim()
  if (/^tc\s*\|/i.test(t)) return { account_class: "tarjeta_credito", nature: "pasivo_rotativo" }
  if (/^credito\s*\|/i.test(t)) return { account_class: "credito", nature: "pasivo_estructural" }
  if (/ahorro/i.test(t)) return { account_class: "ahorro", nature: "activo_liquido" }
  return { account_class: "ahorro", nature: "activo_liquido" }
}
