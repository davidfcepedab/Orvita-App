/** Plantilla de comidas sugeridas (proporciones del día). Los gramos/kcal se derivan del día seleccionado en el plan. */
export const SUGGESTED_MEAL_SLOTS = [
  { time: "07:00", label: "Desayuno proteico", kcalShare: 0.22, proShare: 0.22, icon: "sun" as const },
  { time: "12:30", label: "Comida principal", kcalShare: 0.34, proShare: 0.32, icon: "utensils" as const },
  { time: "16:00", label: "Snack / peri-entreno", kcalShare: 0.14, proShare: 0.18, icon: "apple" as const },
  { time: "20:00", label: "Cena", kcalShare: 0.3, proShare: 0.28, icon: "moon" as const },
]

export function splitDayIntoSuggestedMeals(dayKcal: number, dayProtein: number) {
  return SUGGESTED_MEAL_SLOTS.map((slot) => ({
    ...slot,
    kcal: Math.max(0, Math.round(dayKcal * slot.kcalShare)),
    proteinG: Math.max(0, Math.round(dayProtein * slot.proShare)),
  }))
}
