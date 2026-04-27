import type { VisualGoalMode } from "@/lib/training/trainingPrefsTypes"

export const VISUAL_GOAL_MODE_OPTIONS: { id: VisualGoalMode; label: string; short: string }[] = [
  { id: "hipertrofia_magra", label: "Hipertrofia magra", short: "Volumen limpio" },
  { id: "recomposicion", label: "Recomposición corporal", short: "Menos grasa, más músculo" },
  { id: "bajar_medidas", label: "Bajar medidas / déficit", short: "Pérdida de grasa prioritaria" },
  { id: "definicion", label: "Definición", short: "Déficit moderado, detalle" },
  { id: "mantenimiento", label: "Mantenimiento", short: "Estabilidad y rendimiento" },
]

export function labelForVisualGoalMode(mode: VisualGoalMode | undefined): string {
  if (!mode) return "Hipertrofia magra"
  const row = VISUAL_GOAL_MODE_OPTIONS.find((o) => o.id === mode)
  return row?.label ?? "Hipertrofia magra"
}

export function defaultVisualGoalMode(): VisualGoalMode {
  return "hipertrofia_magra"
}
