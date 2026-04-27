import type { VisualGoalMode } from "@/lib/training/trainingPrefsTypes"
import { SUGGESTED_MEAL_SLOTS } from "@/lib/training/suggestedDayMeals"

export type ConcreteMealSlot = {
  time: string
  label: string
  icon: (typeof SUGGESTED_MEAL_SLOTS)[number]["icon"]
  kcal: number
  proteinG: number
  carbG: number
  fatG: number
  /** Línea detallada con alimentos y cantidades orientativas. */
  detail: string
}

const EGG_PRO_G = 6
const EGG_KCAL = 78
const CHICKEN_PRO_PER_100 = 31
const CHICKEN_KCAL_PER_100 = 165
const PASTA_DRY_CARB_PER_100 = 75
const PASTA_KCAL_PER_100 = 350
const AREPA_MEDIUM_CARB = 35
const CHEESE_30G_PRO = 7

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function round5(n: number): number {
  return Math.round(n / 5) * 5
}

/** Genera ejemplos de plato alineados con kcal y macros del slot y el contexto del día. */
export function buildConcreteDayMeals(input: {
  dayKcal: number
  dayProtein: number
  dayCarb: number
  dayFat: number
  isTrainingDay: boolean
  goalMode: VisualGoalMode | undefined
}): ConcreteMealSlot[] {
  const { dayKcal, dayProtein, dayCarb, dayFat, isTrainingDay, goalMode } = input
  const deficitLean = goalMode === "definicion" || goalMode === "bajar_medidas"
  const surplusBias = goalMode === "hipertrofia_magra" || goalMode === "recomposicion"

  return SUGGESTED_MEAL_SLOTS.map((slot) => {
    const kcal = Math.max(0, Math.round(dayKcal * slot.kcalShare))
    const proSlot = Math.max(0, Math.round(dayProtein * slot.proShare))
    const carbSlot =
      dayCarb > 0 ? Math.max(0, Math.round(dayCarb * slot.kcalShare)) : Math.max(0, Math.round((kcal * 0.45) / 4))
    const fatSlot =
      dayFat > 0 ? Math.max(0, Math.round(dayFat * slot.kcalShare)) : Math.max(0, Math.round((kcal * 0.3) / 9))

    const detail = mealDetailForSlot({
      slotLabel: slot.label,
      kcal,
      proteinG: proSlot,
      carbG: carbSlot,
      fatG: fatSlot,
      isTrainingDay,
      deficitLean,
      surplusBias,
    })

    return {
      time: slot.time,
      label: slot.label,
      icon: slot.icon,
      kcal,
      proteinG: proSlot,
      carbG: carbSlot,
      fatG: fatSlot,
      detail,
    }
  })
}

function mealDetailForSlot(ctx: {
  slotLabel: string
  kcal: number
  proteinG: number
  carbG: number
  fatG: number
  isTrainingDay: boolean
  deficitLean: boolean
  surplusBias: boolean
}): string {
  const { slotLabel, kcal, proteinG, carbG, fatG, isTrainingDay, deficitLean, surplusBias } = ctx
  const lower = slotLabel.toLowerCase()

  if (lower.includes("desayuno")) {
    const eggs = clamp(Math.round(proteinG / EGG_PRO_G), 2, 6)
    const eggPro = eggs * EGG_PRO_G
    const remainPro = Math.max(0, proteinG - eggPro)
    const cheesePortions = remainPro > 4 ? Math.min(2, Math.round(remainPro / CHEESE_30G_PRO)) : remainPro > 2 ? 1 : 0
    const cheeseG = cheesePortions * 30
    let carbChoice: string
    if (carbG < 25) {
      carbChoice = "1 rebanada de pan integral (~12 g CHO) o 1/2 arepa pequeña"
    } else if (carbG < 55) {
      carbChoice = `arepa mediana (~${AREPA_MEDIUM_CARB} g CHO) o 2 rebanadas de pan integral + fruta pequeña (manzana/plátano baby)`
    } else {
      carbChoice = "arepa grande o 2 arepas medianas + fruta; si entrenas después, prioriza este carbohidrato"
    }
    const fatNote =
      fatG > 18
        ? "1 cdita aceite de oliva en el huevo o 1/4 aguacate"
        : deficitLean
          ? "café/té sin azúcar; evita jugos"
          : "té o café; opcional 1 cdita miel si te cuesta el volumen"
    return `${eggs} huevo(s) enteros (~${eggPro} g P)${cheeseG ? ` + ~${cheeseG} g quajo fresco/mozzarella (~${cheesePortions * CHEESE_30G_PRO} g P)` : ""}. ${carbChoice} (~${carbG} g CHO objetivo en este slot). ${fatNote}. ≈${kcal} kcal orientativas.`
  }

  if (lower.includes("comida")) {
    const chickenG = clamp(Math.round((proteinG / CHICKEN_PRO_PER_100) * 100), 100, 220)
    const pastaG = clamp(Math.round((carbG / PASTA_DRY_CARB_PER_100) * 100), 40, 120)
    const oliveMl = fatG > 25 ? 1.5 : 1
    const carbAlt =
      carbG > 85
        ? `o ${round5(pastaG + 20)} g pasta seca + extra verdura`
        : `${pastaG} g pasta integral/seca (peso en crudo) o ~${round5(carbG * 1.2)} g arroz cocido`
    return `~${chickenG} g pechuga de pollo/pavo a la plancha (~${Math.round((chickenG / 100) * CHICKEN_PRO_PER_100)} g P). ${carbAlt} (~${carbG} g CHO). Ensalada grande (2–3 tazas) + ${oliveMl} cdita aceite de oliva (~grasas del slot). ≈${kcal} kcal.`
  }

  if (lower.includes("snack") || lower.includes("peri")) {
    if (isTrainingDay && lower.includes("peri")) {
      const cho = clamp(Math.round(carbG), 20, 55)
      return `Pre-entreno: plátano mediano + ${cho > 35 ? "40–50" : "25–35"} g avena o 2 galletas integrales; opcional 15–20 g whey si te falta proteína (${proteinG} g P objetivo en slot). ~${cho} g CHO rápido.`
    }
    const yogurt = proteinG >= 25 ? "Yogur griego 200–250 g" : "Yogur natural 150 g"
    const nuts = fatG > 12 ? ` + 15–20 g frutos secos` : ""
    const fruit = carbG > 25 ? " + fruta (manzana o pera)" : ""
    return `${yogurt} (${proteinG} g P aprox en slot)${fruit}${nuts}. Si hace falta CHO: ${clamp(carbG, 15, 45)} g en fruta/galleta integral.`
  }

  if (lower.includes("cena")) {
    const fishG = clamp(Math.round(proteinG * 5.5), 120, 220)
    const vegCarb = carbG < 35 ? "ensalada + 1 taza verduras cocidas" : `verduras asadas + ~${round5(carbG - 15)} g patata/boniato o 1/2 taza arroz`
    const fatLine = fatG > 20 ? `1 cdita aceite o 1/2 aguacate` : "poco aceite; prioriza proteína"
    return `~${fishG} g pescado/blanco o carne magra (~${proteinG} g P). ${vegCarb} (~${carbG} g CHO). ${fatLine}. Cena más ligera si tu objetivo es ${deficitLean ? "déficit" : surplusBias ? "soporte al entreno" : "control"} — ≈${kcal} kcal.`
  }

  return `Reparte ~${proteinG} g proteína, ~${carbG} g carbos y ~${fatG} g grasa en alimentos enteros; objetivo ${kcal} kcal en este momento.`
}
