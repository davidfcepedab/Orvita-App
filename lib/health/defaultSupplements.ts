import type { HealthSupplement } from "@/lib/health/healthPrefsTypes"

export const DEFAULT_HEALTH_SUPPLEMENTS: HealthSupplement[] = [
  { id: "creatine", name: "Creatine Monohydrate", amount: "5g", active: true },
  { id: "vd3k2", name: "Vitamin D3 + K2", amount: "5000 IU", active: true },
  { id: "omega3", name: "Omega-3 (EPA/DHA)", amount: "2g", active: true },
  { id: "mg-thr", name: "Magnesium L-Threonate", amount: "200mg", active: false },
  { id: "zma", name: "Zinc + Magnesium (ZMA)", amount: "1 capsule", active: false },
  { id: "ashwa", name: "Ashwagandha", amount: "300mg", active: false },
]
