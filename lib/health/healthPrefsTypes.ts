/** Momento del protocolo (6 franjas; el campo persistido sigue siendo `daypart` por compatibilidad). */
export type SupplementMomentId =
  | "apenas_me_levanto"
  | "en_ayunas"
  | "dia_manana"
  | "mediodia"
  | "tarde"
  | "antes_de_dormir"

/** @deprecated Usar SupplementMomentId; se mantiene alias por imports antiguos. */
export type SupplementDaypart = SupplementMomentId

export type HealthSupplement = {
  id: string
  name: string
  amount: string
  active: boolean
  /** Momento del día (id interno; API/JSON pueden enviar también `moment`). */
  daypart: SupplementMomentId
  /** Alta prioridad en el protocolo (visual «VITAL» / crítico). */
  indispensable: boolean
}

/** Mapa fecha YYYY-MM-DD → id suplemento → tomado sí/no */
export type SupplementComplianceMap = Record<string, Record<string, boolean>>

export type HealthPreferencesPayload = {
  supplements?: HealthSupplement[]
  supplementCompliance?: SupplementComplianceMap
  /**
   * ISO 8601: el usuario ya obtuvo datos Hevy vía Órvita (sync en Config o carga de entrenos).
   * El check-in usa esto junto con `serverConfigured` para no asumir Hevy solo porque el API del proyecto responde.
   */
  hevyLinkedAt?: string | null
  /** Litros de agua registrados hoy (manual). */
  hydrationLitersToday?: number
  /** Meta litros/día (manual). */
  hydrationTargetLiters?: number
  /** Gramos ingeridos hoy (manual). */
  macrosGramsToday?: {
    protein: number
    carbs: number
    fats: number
  }
}
