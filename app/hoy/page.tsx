"use client"

import { useState } from "react"
import { AppShell } from "@/src/components/layout/AppShell"
import { Card } from "@/src/components/ui/Card"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"

export default function HoyPage() {
  const { data } = useOperationalContext()
  const [tab, setTab] = useState("Día")

  const nextAction = data?.next_action ?? "Complete client proposal deck"
  const nextImpact = data?.next_impact ?? "Impacto: 95"
  const nextTimeRequired = data?.next_time_required ?? "120 min"
  const habits = data?.habits ?? []

  return (
    <AppShell moduleLabel="Control" moduleTitle="Órbita Control" showSidebar={false}>
      <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-lg)" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 500 }}>Órbita Control</h1>
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>Centro de mando adaptativo.</p>
          </div>
          <div
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              border: "0.5px solid var(--color-border)",
              background: "var(--color-surface-alt)",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--color-text-secondary)",
            }}
          >
            Órbita adaptó tu día por baja de energía
          </div>
        </div>

        <div style={{ display: "flex", gap: "6px", padding: "4px", borderRadius: "12px", border: "0.5px solid var(--color-border)", background: "var(--color-surface-alt)", width: "fit-content" }}>
          {["Día", "Semana", "Mes"].map((item) => (
            <button
              key={item}
              onClick={() => setTab(item)}
              style={{
                padding: "6px 16px",
                borderRadius: "10px",
                border: "none",
                background: tab === item ? "var(--color-surface)" : "transparent",
                color: tab === item ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                fontSize: "11px",
                fontWeight: 600,
              }}
            >
              {item}
            </button>
          ))}
        </div>

        <Card>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Hoy (Siguiente acción)
            </p>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: 500 }}>{nextAction}</p>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>
              {nextImpact} • {nextTimeRequired}
            </p>
          </div>
        </Card>

        <Card>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Hábitos & Streaks
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--spacing-sm)" }}>
              {habits.slice(0, 3).map((habit) => (
                <div key={habit.id} style={{ padding: "12px", borderRadius: "12px", background: "var(--color-surface-alt)" }}>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 500 }}>{habit.name}</p>
                  <p style={{ margin: "6px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>47 días</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Foco Operativo
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--spacing-sm)" }}>
              <div style={{ padding: "12px", borderRadius: "12px", background: "var(--color-surface-alt)" }}>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>Work Block (Actual)</p>
                <p style={{ margin: "6px 0 0", fontSize: "14px", fontWeight: 500 }}>Deep Work (90m)</p>
              </div>
              <div style={{ padding: "12px", borderRadius: "12px", background: "var(--color-surface-alt)" }}>
                <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>Energía</p>
                <p style={{ margin: "6px 0 0", fontSize: "14px", fontWeight: 500, color: "var(--color-accent-health)" }}>71%</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Check-in Narrativo
            </p>
            <textarea
              placeholder="¿Cómo se siente la carga operativa hoy?"
              style={{
                minHeight: "120px",
                borderRadius: "12px",
                border: "0.5px solid var(--color-border)",
                padding: "12px",
                background: "var(--color-surface)",
                color: "var(--color-text-primary)",
                resize: "none",
              }}
            />
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
