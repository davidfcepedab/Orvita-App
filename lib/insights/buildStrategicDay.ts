import { energyPressureFromOperationalContext } from "@/lib/hoy/commandDerivation"
import type { OperationalContextData } from "@/lib/operational/types"

/**
 * Insights del día: Apple Health (Atajo) + Capital + energía operativa.
 * Se antepone a otros insights en `buildOperationalContext`.
 */
export function buildStrategicCorrelatedInsights(ctx: OperationalContextData): string[] {
  const lines: string[] = []
  const apple = ctx.apple_health

  if (apple) {
    const sleep = apple.sleep_hours
    const hrv = apple.hrv_ms
    const pulse = apple.energy_index ?? apple.readiness_score
    if (sleep != null && hrv != null) {
      const p = pulse ?? 55
      if (p >= 65) {
        lines.push(`Sueño ${sleep.toFixed(1)} h + HRV ${hrv} ms → energía alta en el pulso de hoy.`)
      } else if (p < 52) {
        lines.push(`Sueño ${sleep.toFixed(1)} h + HRV ${hrv} ms → ritmo conservador; prioriza recuperación.`)
      } else {
        lines.push(`Sueño ${sleep.toFixed(1)} h + HRV ${hrv} ms → ritmo equilibrado para el día.`)
      }
    } else if (sleep != null) {
      lines.push(`Sueño ~${sleep.toFixed(1)} h registrado en Apple para hoy.`)
    } else if (hrv != null) {
      lines.push(`HRV ${hrv} ms en Apple: úsalo como señal de carga autonómica junto al check-in.`)
    }
    if (apple.source === "apple_health_shortcut") {
      lines.push("Salud: última lectura importada vía Atajo iOS.")
    }
  }

  const cap = ctx.capital
  if (!cap) return lines

  const energy = energyPressureFromOperationalContext(ctx)

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
