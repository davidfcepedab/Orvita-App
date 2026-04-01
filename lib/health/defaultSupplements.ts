import type { HealthSupplement } from "@/lib/health/healthPrefsTypes"

export const DEFAULT_HEALTH_SUPPLEMENTS: HealthSupplement[] = [
  { id: "creatine", name: "Creatine Monohydrate", amount: "5g", active: true, daypart: "manana", indispensable: true },
  { id: "vd3k2", name: "Vitamin D3 + K2", amount: "5000 IU", active: true, daypart: "manana", indispensable: false },
  { id: "omega3", name: "Omega-3 (EPA/DHA)", amount: "2g", active: true, daypart: "mediodia", indispensable: false },
  { id: "mg-thr", name: "Magnesium L-Threonate", amount: "200mg", active: false, daypart: "tarde", indispensable: false },
  { id: "zma", name: "Zinc + Magnesium (ZMA)", amount: "1 capsule", active: false, daypart: "noche", indispensable: false },
  { id: "ashwa", name: "Ashwagandha", amount: "300mg", active: false, daypart: "noche", indispensable: false },
]
