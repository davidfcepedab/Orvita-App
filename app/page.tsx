"use client"

import { useState } from "react"
import Link from "next/link"
import { Card } from "@/src/components/ui/Card"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import { ChevronRight } from "lucide-react"

// ← V3 RECONSTRUIDO: fiel a captura + navegación preservada
export default function ControlPage() {
  const { data } = useOperationalContext()
  const [tab, setTab] = useState("Día")

  const nextAction = data?.next_action ?? "Completar propuesta para cliente"
  const nextImpact = data?.next_impact ?? "Impacto: 95"
  const nextTimeRequired = data?.next_time_required ?? "120 min"
  const habits = data?.habits ?? []

  const metrics = [
    { label: "Score global", value: data?.score_global ?? 72, accent: "var(--color-accent-health)" },
    { label: "Disciplina", value: data?.score_disciplina ?? 68, accent: "var(--color-accent-warning)" },
    { label: "Recuperación", value: data?.score_recuperacion ?? 74, accent: "var(--color-accent-primary)" },
    { label: "Tendencia 7D", value: `${data?.delta_tendencia ?? 5}%`, accent: "var(--color-accent-finance)" },
  ]

  return (
    <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-lg)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 500 }}>Inicio / Control</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
            Centro de mando adaptativo.
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Link
            href="/checkin"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 14px",
              borderRadius: "10px",
              border: "0.5px solid var(--color-border)",
              background: "var(--color-accent-health)",
              color: "white",
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              textDecoration: "none",
            }}
          >
            Hacer check-in del día
          </Link>
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
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "var(--color-accent-health)" }} />
            Órbita adaptó tu día por baja de energía
          </div>
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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
        {metrics.map((metric) => {
          const numeric = Number(String(metric.value).replace("%", ""))
          const isZero = Number.isFinite(numeric) && numeric === 0
          return (
          <Card key={metric.label} hover>
            <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                {metric.label}
              </p>
              <p style={{ margin: 0, fontSize: "26px", fontWeight: 600, color: isZero ? "var(--color-text-secondary)" : metric.accent }}>
                {metric.value}
              </p>
              {isZero && (
                <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>
                  Sin señal aún
                </p>
              )}
            </div>
          </Card>
          )
        })}
      </div>

      <Card>
        <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "12px" }}>
          <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
            Atención inmediata
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "999px",
                border: "0.5px solid var(--color-border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-accent-primary)",
                background: "var(--color-surface-alt)",
              }}
            >
              <ChevronRight size={14} />
            </div>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: 500 }}>{nextAction}</p>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>
            {nextImpact} • {nextTimeRequired}
          </p>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
        <Card>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "8px" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Señales clave
            </p>
            <p style={{ margin: 0, fontSize: "12px" }}>Carga operativa alta en la mañana.</p>
            <p style={{ margin: 0, fontSize: "12px" }}>Riesgo de ruptura en 1 hábito.</p>
            <p style={{ margin: 0, fontSize: "12px" }}>Agenda con 2 reuniones críticas.</p>
          </div>
        </Card>
        <Card>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "8px" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Hábitos clave
            </p>
            {habits.slice(0, 3).map((habit) => (
              <div key={habit.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                <span>{habit.name}</span>
                <span style={{ color: habit.completed ? "var(--color-accent-health)" : "var(--color-text-secondary)" }}>
                  {habit.completed ? "Hecho" : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "8px" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Agenda de hoy
            </p>
            <p style={{ margin: 0, fontSize: "12px" }}>09:00 · Reunión equipo</p>
            <p style={{ margin: 0, fontSize: "12px" }}>11:00 · Reunión cliente</p>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>+2 pendientes críticos</p>
          </div>
        </Card>
      </div>

      <Card>
        <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
          <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
            Foco Operativo
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "var(--spacing-sm)" }}>
            <div style={{ padding: "12px", borderRadius: "12px", background: "var(--color-surface-alt)" }}>
              <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>Bloque de trabajo (actual)</p>
              <p style={{ margin: "6px 0 0", fontSize: "14px", fontWeight: 500 }}>Trabajo profundo (90m)</p>
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
  )
}

