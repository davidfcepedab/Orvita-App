"use client"

import { useMemo } from "react"
import { AppShell } from "@/src/components/layout/AppShell"
import { Card } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import { ArrowRight, CheckCircle2, Circle, Clock, Plus, UserPlus } from "lucide-react"

const teamMembers = [
  { id: "AG", name: "Ana García", color: "var(--color-accent-primary)" },
  { id: "CR", name: "Carlos Ruiz", color: "var(--color-accent-health)" },
  { id: "ML", name: "María López", color: "var(--color-accent-warning)" },
  { id: "CM", name: "Commander (Tú)", color: "var(--color-accent-agenda)" },
]

export default function AgendaPage() {
  const { data } = useOperationalContext()
  const tasks = data?.today_tasks ?? []

  const grouped = useMemo(() => {
    const received = tasks.slice(0, 2)
    const assigned = tasks.slice(2, 4)
    const personal = tasks.slice(4, 6)
    return { received, assigned, personal }
  }, [tasks])

  return (
    <AppShell
      moduleLabel="Agenda Module"
      moduleTitle="Tareas Compartidas"
      primaryAction={{ label: "Nueva Tarea" }}
      showSidebar={false}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-lg)" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 500 }}>Tareas Compartidas</h1>
            <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
              Vista de columnas: Mis tareas • Asignadas por mí • Personales
            </p>
          </div>
          <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
            <Button>
              <Plus size={14} />
              Nueva Tarea
            </Button>
            <Button>
              <UserPlus size={14} />
              Asignar
            </Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
          {[
            { label: "Tareas Recibidas", value: grouped.received.length, icon: ArrowRight, accent: "var(--color-accent-agenda)" },
            { label: "Asignadas por Mí", value: grouped.assigned.length, icon: UserPlus, accent: "var(--color-accent-health)" },
            { label: "Tareas Personales", value: grouped.personal.length, icon: Circle, accent: "var(--color-accent-primary)" },
          ].map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} hover>
                <div style={{ padding: "var(--spacing-md)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                      {stat.label}
                    </p>
                    <p style={{ margin: "6px 0 0", fontSize: "22px", fontWeight: 600 }}>{stat.value}</p>
                  </div>
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      borderRadius: "999px",
                      background: `color-mix(in srgb, ${stat.accent} 12%, transparent)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon size={16} style={{ color: stat.accent }} />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
          {[
            { label: "Tareas Recibidas", accent: "var(--color-accent-agenda)", items: grouped.received },
            { label: "Asignadas por Mí", accent: "var(--color-accent-health)", items: grouped.assigned },
            { label: "Tareas Personales", accent: "var(--color-accent-primary)", items: grouped.personal },
          ].map((column) => (
            <div key={column.label} style={{ display: "grid", gap: "var(--spacing-sm)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h2 style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em" }}>{column.label}</h2>
                <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: column.accent }} />
              </div>
              {column.items.map((task) => (
                <Card key={task.id} hover>
                  <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                      <div>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>{task.title}</p>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "6px", color: "var(--color-text-secondary)", fontSize: "11px" }}>
                          <Clock size={12} />
                          30 min
                        </div>
                      </div>
                      {task.completed ? (
                        <CheckCircle2 size={16} style={{ color: "var(--color-accent-health)" }} />
                      ) : (
                        <Circle size={16} style={{ color: "var(--color-text-secondary)" }} />
                      )}
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "10px",
                          textTransform: "uppercase",
                          letterSpacing: "0.12em",
                          background: "var(--color-surface-alt)",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        Alta
                      </span>
                      {!task.completed && (
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: "6px",
                            fontSize: "10px",
                            textTransform: "uppercase",
                            letterSpacing: "0.12em",
                            background: `color-mix(in srgb, ${column.accent} 12%, transparent)`,
                            color: column.accent,
                          }}
                        >
                          En Progreso
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>

        <Card>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
            <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Miembros del equipo
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "var(--spacing-sm)" }}>
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "10px",
                    borderRadius: "12px",
                    background: "var(--color-surface-alt)",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "999px",
                      background: member.color,
                      color: "var(--color-surface)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 600,
                    }}
                  >
                    {member.id}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 500 }}>{member.name}</p>
                    <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>Activo</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  )
}
