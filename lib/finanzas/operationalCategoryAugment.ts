import type {
  CategoryAnalyticsPayload,
  CategoryGrowthRow,
  DistributionSlice,
  StrategicInsight,
} from "@/lib/finanzas/categoryAnalyticsEngine"
import type { MonthCategoryBudgetsV1 } from "@/lib/finanzas/categoryBudgetStorage"
import {
  correlateHabitsWithLabel,
  narrativeForGrowth,
  operationalCauseForAnt,
  operationalDriverForLabel,
  timeReliefHeuristicMonthlyHours,
  type HabitRef,
} from "@/lib/finanzas/operationalFinanceBridges"

export type EnrichedStrategicInsight = StrategicInsight & {
  rootCauseOperational?: string
  agendaAction?: string
  energyOrTimeNote?: string
}

export type GrowthRowOperational = CategoryGrowthRow & {
  operationalLine: string
  habitEcho: string
}

export type DistributionSliceOperational = DistributionSlice & {
  driverHint: string
}

export type StrategicAlertKind = "ant" | "budget" | "growth_pressure"

export type StrategicAlertRow = {
  id: string
  kind: StrategicAlertKind
  severity: "alto" | "medio" | "bajo"
  title: string
  subtitle?: string
  amountCop: number
  sharePct?: number
  frequency?: number
  trend?: string
  operationalCause: string
  impactMonthlyCop: number
  ctaHref?: string
  ctaLabel?: string
}

function combinedBudgetCapForCategory(name: string, budgets: MonthCategoryBudgetsV1): number {
  const cf = budgets.category[`fixed|${name}`] ?? 0
  const cv = budgets.category[`variable|${name}`] ?? 0
  let sum = (cf > 0 ? cf : 0) + (cv > 0 ? cv : 0)
  if (sum > 0) return sum
  for (const [k, v] of Object.entries(budgets.subcategory)) {
    if (!(v > 0)) continue
    const parts = k.split("|")
    if (parts.length === 3 && parts[1] === name) sum += v
  }
  return sum
}

export function buildGrowthOperationalRows(
  rows: CategoryGrowthRow[],
  habits: HabitRef[],
): GrowthRowOperational[] {
  return rows.map((r) => {
    const corr = correlateHabitsWithLabel(r.category, habits)
    return {
      ...r,
      operationalLine: narrativeForGrowth(r.category, r.momPct, habits),
      habitEcho: corr.line,
    }
  })
}

export function buildPieWithDrivers(
  slices: DistributionSlice[],
  kind: "expense" | "income",
): DistributionSliceOperational[] {
  return slices.map((s) => ({
    ...s,
    driverHint:
      kind === "income"
        ? `${operationalDriverForLabel(s.name).driver} (entrada de efecto operativo).`
        : operationalDriverForLabel(s.name).driver,
  }))
}

export function buildStrategicAlertTable(
  data: CategoryAnalyticsPayload,
  budgets: MonthCategoryBudgetsV1,
  habits: HabitRef[],
): StrategicAlertRow[] {
  const out: StrategicAlertRow[] = []

  for (const a of data.antExpenses) {
    const impact = a.total
    out.push({
      id: `ant-${a.key}`,
      kind: "ant",
      severity: a.sharePct >= 8 ? "alto" : "medio",
      title: a.subcategory,
      subtitle: a.category,
      amountCop: a.total,
      sharePct: a.sharePct,
      frequency: a.txCount,
      trend: a.trendLabel === "up" ? "↑" : a.trendLabel === "down" ? "↓" : "→",
      operationalCause: operationalCauseForAnt(a.category, a.subcategory),
      impactMonthlyCop: impact,
      ctaHref: `/finanzas/transactions?month=${encodeURIComponent(data.anchorMonth)}&category=${encodeURIComponent(a.category)}&subcategory=${encodeURIComponent(a.subcategory)}&tipo=gasto`,
      ctaLabel: "Movimientos",
    })
  }

  for (const slice of data.expensePie) {
    const cap = combinedBudgetCapForCategory(slice.name, budgets)
    if (cap <= 0) continue
    const pct = (slice.value / cap) * 100
    if (pct < 92) continue
    const over = Math.max(0, slice.value - cap)
    out.push({
      id: `budget-${slice.name}`,
      kind: "budget",
      severity: pct >= 100 ? "alto" : "medio",
      title: `Presión vs presupuesto: ${slice.name}`,
      subtitle: `${pct.toFixed(0)}% del tope definido`,
      amountCop: slice.value,
      sharePct: slice.pct,
      operationalCause: `${operationalDriverForLabel(slice.name).driver} El gasto ya rozó o superó el tope mensual que definiste; el ajuste en origen es priorizar decisiones que reduzcan la frecuencia o el ticket.`,
      impactMonthlyCop: over > 0 ? over : slice.value * 0.07,
      ctaHref: `/finanzas/categories`,
      ctaLabel: "Revisar presupuestos",
    })
  }

  for (const g of data.fastGrowing) {
    if (g.severity !== "alert" || (g.momPct ?? 0) < data.params.momAlertPct) continue
    out.push({
      id: `growth-${g.category}`,
      kind: "growth_pressure",
      severity: "alto",
      title: `Crecimiento rápido: ${g.category}`,
      subtitle: g.momPct != null ? `+${g.momPct.toFixed(0)}% MoM` : undefined,
      amountCop: g.expenseCurrent,
      sharePct: data.kpis.totalExpenseAnchor > 0 ? (g.expenseCurrent / data.kpis.totalExpenseAnchor) * 100 : 0,
      operationalCause: narrativeForGrowth(g.category, g.momPct, habits),
      impactMonthlyCop: g.expenseCurrent * 0.12,
      ctaHref: `/finanzas/transactions?month=${encodeURIComponent(data.anchorMonth)}&category=${encodeURIComponent(g.category)}&tipo=gasto`,
      ctaLabel: "Ver movimientos",
    })
  }

  out.sort((a, b) => {
    const rk = { alto: 0, medio: 1, bajo: 2 }
    if (rk[a.severity] !== rk[b.severity]) return rk[a.severity] - rk[b.severity]
    return b.impactMonthlyCop - a.impactMonthlyCop
  })

  return out
}

export function enrichStrategicInsights(
  insights: StrategicInsight[],
  data: CategoryAnalyticsPayload,
  habits: HabitRef[],
): EnrichedStrategicInsight[] {
  return insights.map((ins) => {
    const baseAgenda =
      "Agenda: bloque fijo semanal de revisión financiera (20 min) y una decisión de ajuste para la semana entrante."
    const baseEnergy =
      "Menos micro-decisiones de gasto libera carga cognitiva y tiempo de context-switch (pagos, apps, compras impulsivas)."
    let rootCauseOperational =
      "El capital operativo es consecuencia de hábitos, agenda y energía; el número en pantalla es la foto del sistema."
    let agendaAction = baseAgenda
    let energyOrTimeNote = baseEnergy

    if (ins.id === "growth-top") {
      const m = ins.title.match(/«(.+?)»/)
      const cat = m?.[1] ?? ""
      const op = operationalDriverForLabel(cat)
      rootCauseOperational = op.driver
      agendaAction = `${op.agendaLevers} ${baseAgenda}`
      if (ins.savingsMonthly) {
        energyOrTimeNote = `${baseEnergy} Estimación de tiempo recuperable si reduces fricción: ~${timeReliefHeuristicMonthlyHours(ins.savingsMonthly)} h/mes.`
      }
    } else if (ins.id === "ant-cluster") {
      rootCauseOperational =
        "Gastos hormiga: muchas decisiones pequeñas suman; suelen correlacionar con agenda fragmentada y compras en automático."
      agendaAction =
        "Lista única de compras semanal; silenciar notificaciones de comercio; batch de pagos de suscripciones el mismo día."
      if (ins.savingsMonthly) {
        energyOrTimeNote = `Batching y límites pueden devolver ~${timeReliefHeuristicMonthlyHours(ins.savingsMonthly)} h/mes en micro-gestión.`
      }
    } else if (ins.id === "total-exp-up") {
      rootCauseOperational = "Subida transversal del gasto: a menudo hay más actividad social, trabajo o estrés → más salidas de bolsillo."
      agendaAction = "Reduce salidas improvisadas: plan de comidas + ventana única de 'gasto discrecional' en la semana."
    } else if (ins.id === "net-negative-run") {
      rootCauseOperational =
        "Flujo negativo sostenido erosiona opciones: suele venir de sumar pequeños compromisos sin cerrar otros."
      agendaAction = "Prioriza 1 cierre fuerte (categoría o suscripción) antes de añadir nuevos hábitos de gasto."
    }

    const corr =
      habits.length > 0
        ? correlateHabitsWithLabel(ins.title, habits).line
        : "Conecta hábitos en Órbita para ver ecos con este insight."
    return {
      ...ins,
      rootCauseOperational: `${rootCauseOperational} ${corr}`,
      agendaAction,
      energyOrTimeNote,
    }
  })
}

export function scenarioOriginAdjustment(data: CategoryAnalyticsPayload): {
  monthlyCop: number
  annualCop: number
  narrative: string
} {
  const a = data.scenarioImpact.ifReduceFastGrowingByScenario
  const b = data.scenarioImpact.ifTrimAntByHalf
  const monthlyCop = a + b
  return {
    monthlyCop,
    annualCop: monthlyCop * 12,
    narrative:
      "Escenario 'ajuste en origen': combina contener crecimientos en alerta y recortar la mitad del bloque hormiga detectado; orden de magnitud para orientar agenda y hábitos.",
  }
}
