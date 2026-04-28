import { energyPressureFromOperationalContext } from "@/lib/hoy/commandDerivation"
import type { OperationalContextData } from "@/lib/operational/types"

/**
 * Insights del día que correlacionan Capital (Belvo + flujo) con energía (check-in + Apple Health).
 * Se antepone a otros insights en `buildOperationalContext`.
 */
export function buildStrategicCorrelatedInsights(ctx: OperationalContextData): string[] {
  const cap = ctx.capital
  if (!cap) return []

  const energy = energyPressureFromOperationalContext(ctx)
  const lines: string[] = []

  if (cap.pressure === "alta" && energy.band === "alto") {
    lines.push(
      "Presión financiera y energía baja: bloquea gastos impulsivos y aplaza compras no esenciales.",
    )
  } else if (cap.pressure === "alta") {
    lines.push("Presión de capital: prioriza conciliar salidas y decidir qué no paga este mes.")
  }

  if (cap.monthlyNetCop < 0 && energy.band === "alto" && cap.pressure !== "alta") {
    lines.push("Flujo del mes en rojo con baja energía: micro-descansos antes de decidir gastos.")
  }

  if (cap.sandboxDegraded && cap.belvoSandbox) {
    lines.push("Sandbox BR mock activo; CO se activará cuando tu tenant Belvo tenga instituciones colombianas.")
  }

  return lines
}
