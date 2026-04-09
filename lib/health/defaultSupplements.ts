import type { HealthSupplement } from "@/lib/health/healthPrefsTypes"

export const DEFAULT_HEALTH_SUPPLEMENTS: HealthSupplement[] = [
  {
    id: "creatine",
    name: "Creatine Monohydrate",
    amount: "5g",
    active: true,
    daypart: "apenas_me_levanto",
    indispensable: true,
  },
  {
    id: "vd3k2",
    name: "Vitamin D3 + K2",
    amount: "5000 IU",
    active: true,
    daypart: "apenas_me_levanto",
    indispensable: true,
  },
  {
    id: "omega3",
    name: "Omega-3 (EPA/DHA)",
    amount: "2g",
    active: true,
    daypart: "en_ayunas",
    indispensable: false,
  },
  {
    id: "mg-thr",
    name: "Magnesium L-Threonate",
    amount: "200mg",
    active: true,
    daypart: "mediodia",
    indispensable: false,
  },
  {
    id: "zma",
    name: "Zinc + Magnesium (ZMA)",
    amount: "1 capsule",
    active: true,
    daypart: "antes_de_dormir",
    indispensable: true,
  },
  {
    id: "ashwa",
    name: "Ashwagandha",
    amount: "300mg",
    active: true,
    daypart: "antes_de_dormir",
    indispensable: false,
  },
]
