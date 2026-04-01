export type SupplementDaypart = "manana" | "mediodia" | "tarde" | "noche"

export type HealthSupplement = {
  id: string
  name: string
  amount: string
  active: boolean
  /** Momento del día recomendado (4 franjas). */
  daypart: SupplementDaypart
  /** Si es crítico en tu protocolo (solo etiqueta visual). */
  indispensable: boolean
}

/** Mapa fecha YYYY-MM-DD → id suplemento → tomado sí/no */
export type SupplementComplianceMap = Record<string, Record<string, boolean>>

export type HealthPreferencesPayload = {
  supplements?: HealthSupplement[]
  supplementCompliance?: SupplementComplianceMap
}
