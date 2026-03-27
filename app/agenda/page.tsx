"use client"

import { useState } from "react"
import { AppShell } from "@/src/components/layout/AppShell"
import { Card } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { SectionHeader } from "@/src/components/ui/SectionHeader"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import { useLayoutMode } from "@/src/theme/ThemeProvider"
import { designTokens } from "@/src/theme/design-tokens"

export default function AgendaPage() {
  const { data } = useOperationalContext()
  const { layoutMode } = useLayoutMode()
  const [tab, setTab] = useState("Hoy")
  const [view, setView] = useState<"list" | "kanban">("list")
  const tasks = data?.today_tasks ?? []

  return (
    <AppShell
      moduleLabel="Agenda Module"
      moduleTitle="Tareas Compartidas"
      primaryAction={{ label: "Nueva Tarea" }}
      metaInfo={`Layout: ${layoutMode}`}
    >
      <SectionHeader
        title="Tareas Compartidas"
        description="Vista de ejecución compartida y prioridades diarias."
        gradient
      />

      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--spacing-sm)", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", gap: "var(--spacing-sm)", flexWrap: "wrap" }}>
          {["Hoy", "Proximos 7 dias", "Semana", "Mes"].map((value) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              style={{
                padding: "8px 16px",
                borderRadius: "999px",
                border: "0.5px solid var(--color-border)",
                background: tab === value ? "var(--color-surface)" : "var(--color-surface-alt)",
                color: tab === value ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                fontSize: "12px",
                fontWeight: 500,
              }}
            >
              {value}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
          <Button onClick={() => setView("list")}>Lista</Button>
          <Button onClick={() => setView("kanban")}>Kanban</Button>
        </div>
      </div>

      {view === "list" ? (
        <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
          {tasks.map((task) => (
            <Card key={task.id} hover>
              <div style={{ padding: "var(--spacing-md)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-md)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--spacing-md)" }}>
                  <div style={{ width: "6px", height: "32px", borderRadius: "999px", background: "var(--color-accent-agenda)" }} />
                  <div style={{ display: "grid", gap: "4px" }}>
                    <p style={{ margin: 0, fontWeight: 500 }}>{task.title}</p>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>
                      Dominio: {task.domain} • {task.completed ? "completada" : "pendiente"}
                    </p>
                  </div>
                </div>
                <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{tab}</span>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
          {["Por Hacer", "En Progreso", "Completado"].map((column) => (
            <Card key={column}>
              <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: designTokens.typography.scale.caption["font-size"],
                    letterSpacing: designTokens.typography.scale.caption["letter-spacing"],
                    textTransform: "uppercase",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {column}
                </p>
                {tasks.slice(0, 3).map((task) => (
                  <div
                    key={`${column}-${task.id}`}
                    style={{
                      padding: "var(--spacing-sm)",
                      borderRadius: "var(--radius-card)",
                      border: "0.5px solid var(--color-border)",
                      background: "var(--color-surface)",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "14px" }}>{task.title}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  )
}
