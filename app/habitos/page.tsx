"use client"

import { AppShell } from "@/src/components/layout/AppShell"
import { Card } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { SectionHeader } from "@/src/components/ui/SectionHeader"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import { useLayoutMode } from "@/src/theme/ThemeProvider"
import { designTokens } from "@/src/theme/design-tokens"

export default function HabitosPage() {
  const { data } = useOperationalContext()
  const { layoutMode } = useLayoutMode()
  const habits = data?.habits ?? []
  const isCompact = layoutMode === "compact"

  return (
    <AppShell
      moduleLabel="Habits Module"
      moduleTitle="Sistema de Hábitos"
      primaryAction={{ label: "Nuevo Hábito" }}
      metaInfo={`Layout: ${layoutMode}`}
    >
      <SectionHeader
        title="Sistema de Hábitos"
        description="Consistencia, tendencias y riesgo de ruptura"
        gradient
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "repeat(4, minmax(0, 1fr))" : "repeat(12, minmax(0, 1fr))",
          gap: "var(--layout-gap)",
        }}
      >
        {[
          { label: "Consistencia 30D", value: `${data?.score_profesional ?? 0}%`, accent: "var(--color-accent-health)" },
          { label: "Mejor Streak", value: "52", accent: "var(--color-accent-warning)" },
          { label: "En Riesgo", value: "1", accent: "var(--color-accent-danger)" },
        ].map((metric) => (
          <div key={metric.label} style={{ gridColumn: isCompact ? "span 4" : "span 4" }}>
            <Card hover>
              <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-sm)" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: designTokens.typography.scale.caption["font-size"],
                    letterSpacing: designTokens.typography.scale.caption["letter-spacing"],
                    textTransform: "uppercase",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {metric.label}
                </p>
                <p style={{ margin: 0, fontSize: "32px", fontWeight: 500, color: metric.accent }}>
                  {metric.value}
                </p>
              </div>
            </Card>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
        {habits.map((habit, index) => {
          const isRisk = index === 2 && !habit.completed
          return (
            <Card key={habit.id} hover>
              <div
                style={{
                  padding: "var(--spacing-lg)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--spacing-md)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-md)" }}>
                  <div style={{ display: "grid", gap: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-sm)" }}>
                      <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 500 }}>{habit.name}</h3>
                      {isRisk && (
                        <span
                          style={{
                            fontSize: "10px",
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            padding: "4px 10px",
                            borderRadius: "999px",
                            background: "color-mix(in srgb, var(--color-accent-danger) 12%, transparent)",
                            color: "var(--color-accent-danger)",
                          }}
                        >
                          Riesgo Ruptura
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "12px" }}>
                      Dominio: {habit.domain} • Estado: {habit.completed ? "completado" : "pendiente"}
                    </p>
                  </div>
                  <Button>{habit.completed ? "Completado" : "Pendiente"}</Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </AppShell>
  )
}
