export type SupplementSeed = {
  name: string
  dose: string
  time: string
}

export type EnergyWindowSeed = {
  hour: string
  offset: number
}

export const HEALTH_SUPPLEMENT_STACK: SupplementSeed[] = [
  { name: "Omega-3", dose: "1000 mg", time: "07:00" },
  { name: "Creatina", dose: "5 g", time: "07:30" },
  { name: "Vitamina D", dose: "2000 IU", time: "08:00" },
  { name: "Electrolitos", dose: "1 scoop", time: "11:00" },
  { name: "Magnesio", dose: "400 mg", time: "21:00" },
  { name: "Colageno", dose: "10 g", time: "20:00" },
]

export const HEALTH_ENERGY_PROFILE: EnergyWindowSeed[] = [
  { hour: "06", offset: -14 },
  { hour: "09", offset: -5 },
  { hour: "12", offset: -10 },
  { hour: "15", offset: -20 },
  { hour: "18", offset: -28 },
  { hour: "21", offset: -18 },
]

export const HEALTH_MACRO_TARGETS = {
  protein: { label: "Proteina", target: 165, unit: "g" },
  carbs: { label: "Carbohidratos", target: 240, unit: "g" },
  fats: { label: "Grasas", target: 70, unit: "g" },
}

export const HEALTH_HYDRATION_TARGET = 2.8
