"use client"

import { Card } from "@/src/components/ui/Card"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import { useMemo, useState } from "react"

// ← V3 RECONSTRUIDO: fiel a captura + navegación preservada
export default function DecisionPage() {
  const { data } = useOperationalContext()
  const [weeklyHours, setWeeklyHours] = useState(18)
  const [upfrontCost, setUpfrontCost] = useState(5000)
  const [expectedRevenue, setExpectedRevenue] = useState(2800)

  const derived = useMemo(() => {
    const contextScore = data?.score_global ?? 72
    const capitalScore = Math.max(
      0,
      Math.min(
        100,
        100 -
          Math.round((upfrontCost / 15000) * 80) +
          Math.round((expectedRevenue / 6000) * 20)
      )
    )
    const timeScore = Math.max(0, 100 - Math.round((weeklyHours / 30) * 100))
    const energyScore = Math.max(0, 100 - Math.round((weeklyHours / 30) * 80))
    const overall = Math.round((capitalScore + timeScore + energyScore + contextScore) / 4)
    return { capitalScore, timeScore, energyScore, overall, contextScore }
  }, [weeklyHours, upfrontCost, expectedRevenue, data?.score_global])

  const statusLabel = derived.overall >= 70 ? "Recomendado" : derived.overall >= 50 ? "Revisar" : "No recomendado"
  const energyLabel = weeklyHours >= 22 ? "Alta" : weeklyHours >= 14 ? "Media" : "Baja"
  return (
      <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "26px", fontWeight: 500 }}>Motor de decisiones estratégicas</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
            Evalúa decisiones por impacto en capital, tiempo y energía.
          </p>
        </div>

        <Card>
          <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-md)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                  Decisión: Nuevo proyecto de adquisición
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "14px", color: "var(--color-text-secondary)" }}>
                  Proyecto de consultoría con ingresos mensuales recurrentes.
                </p>
              </div>
              <span style={{ padding: "4px 10px", borderRadius: "999px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", background: "color-mix(in srgb, var(--color-accent-warning) 12%, transparent)", color: "var(--color-accent-warning)" }}>
                Pendiente de revisión
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                  Puntaje global
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "32px", fontWeight: 600, color: "var(--color-accent-danger)" }}>
                  {derived.overall}
                </p>
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>{statusLabel}</p>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-md)" }}>
            <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Parámetros ajustables
            </p>
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "grid", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Horas semanales requeridas</span>
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>{weeklyHours} h/sem</span>
                </div>
                <input
                  type="range"
                  min={5}
                  max={30}
                  value={weeklyHours}
                  onChange={(event) => setWeeklyHours(Number(event.target.value))}
                />
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Inversión inicial</span>
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>${upfrontCost.toLocaleString("es-CO")}</span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={15000}
                  step={500}
                  value={upfrontCost}
                  onChange={(event) => setUpfrontCost(Number(event.target.value))}
                />
              </div>
              <div style={{ display: "grid", gap: "6px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>Ingresos mensuales esperados</span>
                  <span style={{ fontSize: "12px", fontWeight: 600 }}>${expectedRevenue.toLocaleString("es-CO")}</span>
                </div>
                <input
                  type="range"
                  min={500}
                  max={6000}
                  step={100}
                  value={expectedRevenue}
                  onChange={(event) => setExpectedRevenue(Number(event.target.value))}
                />
              </div>
            </div>
          </div>
        </Card>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
          {[
            {
              label: "Impacto capital",
              value: `${derived.capitalScore}/100`,
              detail: "Costo inicial",
              delta: `-$${upfrontCost.toLocaleString("es-CO")}`,
              accent: "var(--color-accent-primary)",
            },
            {
              label: "Impacto tiempo",
              value: `${derived.timeScore}/100`,
              detail: "Horas semanales",
              delta: `${weeklyHours}h`,
              accent: "var(--color-accent-warning)",
            },
            {
              label: "Impacto energía",
              value: `${derived.energyScore}/100`,
              detail: "Carga cognitiva",
              delta: energyLabel,
              accent: "var(--color-accent-danger)",
            },
            {
              label: "Estado del sistema",
              value: `${derived.contextScore}/100`,
              detail: "Score global",
              delta: "Contexto actual",
              accent: "var(--color-accent-health)",
            },
          ].map((card) => (
            <Card key={card.label} hover>
              <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
                <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                  {card.label}
                </p>
                <p style={{ margin: 0, fontSize: "20px", fontWeight: 600, color: card.accent }}>{card.value}</p>
                <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>{card.detail}</p>
                <p style={{ margin: 0, fontSize: "12px", fontWeight: 600 }}>{card.delta}</p>
              </div>
            </Card>
          ))}
        </div>

        <Card>
          <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-md)" }}>
            <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Recomendación ejecutiva
            </p>
            <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary)" }}>
              {statusLabel === "Recomendado"
                ? "La decisión es viable con presión controlada y margen de ejecución suficiente."
                : statusLabel === "Revisar"
                ? "La decisión es posible, pero requiere ajustar carga de tiempo o capital."
                : "No recomendado: la presión de tiempo/energía supera la capacidad operativa actual."}
            </p>
            <div style={{ display: "flex", gap: "var(--spacing-md)" }}>
              <div style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "var(--color-surface-alt)" }}>
                <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>Siguiente acción</p>
                <p style={{ margin: "6px 0 0", fontSize: "12px" }}>Reducir horas semanales o mover inicio a 2 semanas.</p>
              </div>
              <div style={{ flex: 1, padding: "12px", borderRadius: "12px", background: "var(--color-surface-alt)" }}>
                <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>Mitigación</p>
                <p style={{ margin: "6px 0 0", fontSize: "12px" }}>Ajustar presupuesto y liberar 2 bloques de foco.</p>
              </div>
            </div>
          </div>
        </Card>
      </div>
  )
}
