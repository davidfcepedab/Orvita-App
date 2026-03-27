"use client"

import { AppShell } from "@/src/components/layout/AppShell"
import { Card } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import { Activity, Flame, TrendingDown } from "lucide-react"

const days = ["L", "M", "X", "J", "V", "S", "D"]

export default function HabitosPage() {
  const { data } = useOperationalContext()
  const habits = data?.habits ?? []

  return (
    <AppShell
      moduleLabel="Habits Module"
      moduleTitle="Sistema de Hábitos"
      primaryAction={{ label: "Nuevo Hábito" }}
      showSidebar={false}
    >
      <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-lg)" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 500 }}>Sistema de Hábitos</h1>
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
              Consistencia, tendencias y riesgo de ruptura
            </p>
          </div>
          <Button>
            + Nuevo Hábito
          </Button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
          <Card hover>
            <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Activity size={12} />
                Consistencia 30D
              </p>
              <p style={{ margin: 0, fontSize: "28px", fontWeight: 600 }}>{data?.score_profesional ?? 84}%</p>
            </div>
          </Card>
          <Card hover>
            <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <Flame size={12} />
                Mejor Streak
              </p>
              <p style={{ margin: 0, fontSize: "28px", fontWeight: 600 }}>52</p>
            </div>
          </Card>
          <Card hover>
            <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
                <TrendingDown size={12} />
                En Riesgo
              </p>
              <p style={{ margin: 0, fontSize: "28px", fontWeight: 600 }}>1</p>
            </div>
          </Card>
        </div>

        <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
          <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
            Stack Actual
          </p>

          {habits.map((habit, index) => {
            const isRisk = index === 2 && !habit.completed
            return (
              <Card key={habit.id} hover>
                <div style={{ padding: "var(--spacing-md)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-md)" }}>
                  <div style={{ display: "grid", gap: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <p style={{ margin: 0, fontWeight: 500 }}>{habit.name}</p>
                      {isRisk && (
                        <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", padding: "2px 8px", borderRadius: "999px", background: "color-mix(in srgb, var(--color-accent-danger) 12%, transparent)", color: "var(--color-accent-danger)" }}>
                          Riesgo Ruptura
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>
                      {habit.domain} • {habit.completed ? "activo" : "pendiente"}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {days.map((day) => (
                      <span
                        key={`${habit.id}-${day}`}
                        style={{
                          width: "26px",
                          height: "26px",
                          borderRadius: "8px",
                          border: "0.5px solid var(--color-border)",
                          background: habit.completed ? "color-mix(in srgb, var(--color-accent-health) 14%, transparent)" : "var(--color-surface)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "10px",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {day}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
