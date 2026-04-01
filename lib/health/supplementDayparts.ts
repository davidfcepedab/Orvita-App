import type { SupplementDaypart } from "@/lib/health/healthPrefsTypes"

export const SUPPLEMENT_DAYPART_ORDER: SupplementDaypart[] = ["manana", "mediodia", "tarde", "noche"]

export const SUPPLEMENT_DAYPART_LABELS: Record<SupplementDaypart, string> = {
  manana: "Mañana",
  mediodia: "Mediodía",
  tarde: "Tarde",
  noche: "Noche",
}

export function isSupplementDaypart(v: string): v is SupplementDaypart {
  return (SUPPLEMENT_DAYPART_ORDER as string[]).includes(v)
}
