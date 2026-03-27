"use client"

import { useState } from "react"
import { AppShell } from "@/src/components/layout/AppShell"
import { Card } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { SectionHeader } from "@/src/components/ui/SectionHeader"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import { useLayoutMode } from "@/src/theme/ThemeProvider"

export default function HoyPage() {
  const { data } = useOperationalContext()
  const { layoutMode } = useLayoutMode()
  const [completed, setCompleted] = useState<string[]>([])

  const tasks = data?.today_tasks ?? []
  const nextTask = tasks.find((task) => !completed.includes(task.id))

  const toggle = (id: string) => {
    setCompleted((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]
    )
  }

  return (
    <AppShell
      moduleLabel="Execution Module"
      moduleTitle="Ejecución: Hoy"
      metaInfo={`Layout: ${layoutMode}`}
    >
      <SectionHeader
        title="Ejecución: Hoy"
        description={new Date().toLocaleDateString("es-ES", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
        gradient
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
        <div style={{ gridColumn: "span 5" }}>
          <Card hover>
            <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-md)" }}>
              <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
                Timeline Operativo
              </p>
              <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
                {tasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => toggle(task.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "var(--spacing-sm)",
                      borderRadius: "var(--radius-card)",
                      border: "0.5px solid var(--color-border)",
                      background: completed.includes(task.id) ? "var(--color-surface-alt)" : "var(--color-surface)",
                      textAlign: "left",
                    }}
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 500 }}>{task.title}</p>
                      <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>{task.domain}</p>
                    </div>
                    <span style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>
                      {completed.includes(task.id) ? "Hecho" : "Pendiente"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        <div style={{ gridColumn: "span 7" }}>
          <Card hover>
            <div style={{ padding: "var(--spacing-xl)", display: "grid", gap: "var(--spacing-md)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
                    Foco Actual Inmediato
                  </p>
                  <h3 style={{ margin: "var(--spacing-sm) 0 0", fontSize: "24px" }}>
                    {nextTask?.title ?? "Sin tarea prioritaria"}
                  </h3>
                </div>
                <div style={{ fontSize: "32px", fontWeight: 500 }}>
                  {completed.length}
                  <span style={{ fontSize: "16px", color: "var(--color-text-secondary)" }}>/{tasks.length}</span>
                </div>
              </div>
              <p style={{ margin: 0, color: "var(--color-text-secondary)" }}>
                {nextTask?.domain ?? "Todas las tareas completadas"}
              </p>
              <Button onClick={() => nextTask && toggle(nextTask.id)} disabled={!nextTask}>
                Marcar como completado
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
