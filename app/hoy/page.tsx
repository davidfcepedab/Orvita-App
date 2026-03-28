"use client"

import Link from "next/link"
import { useMemo } from "react"
import { Card } from "@/src/components/ui/Card"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import { useGoogleCalendar } from "@/app/hooks/useGoogleCalendar"

const timeline = [
  { time: "08:00", label: "Bloque de Trabajo Profundo" },
  { time: "10:30", label: "Sincronización Equipo" },
  { time: "13:00", label: "Recuperación (Pausa)" },
  { time: "14:30", label: "Trabajo Reactivo" },
]

const reminders = [
  "Enviar update diario a finanzas",
  "Confirmar agenda con partner",
]

const supplements = [
  "Creatine 5g",
  "Vitamina D3 + K2",
  "Omega-3",
]

// ← V3 RECONSTRUIDO: fiel a captura + navegación preservada
function formatEventTime(iso: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })
}

function eventDurationLabel(start: string | null, end: string | null) {
  if (!start || !end) return "—"
  const ms = Date.parse(end) - Date.parse(start)
  if (!Number.isFinite(ms) || ms <= 0) return "—"
  return `${Math.round(ms / 60000)}m`
}

export default function HoyPage() {
  const { data } = useOperationalContext()
  const { events: calendarEvents, loading: calLoading, notice: calNotice, connected: calConnected, refresh: refreshCal } =
    useGoogleCalendar()

  const meetings = useMemo(() => {
    const todayKey = new Date().toISOString().slice(0, 10)
    return calendarEvents
      .filter((e) => e.startAt && e.startAt.slice(0, 10) === todayKey)
      .map((e) => ({
        key: e.id,
        time: formatEventTime(e.startAt),
        label: e.summary,
        duration: eventDurationLabel(e.startAt, e.endAt),
      }))
  }, [calendarEvents])

  const focusTask = data?.next_action ?? "Completar propuesta para cliente"
  const focusTime = data?.next_time_required ?? "120 min"
  const tasks = data?.today_tasks ?? []
  const habits = data?.habits ?? []

  return (
    <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 style={{ margin: 0, fontSize: "clamp(22px, 5vw, 28px)", fontWeight: 500 }}>Ejecución: Hoy</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
            {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
          <Link
            href="/checkin"
            className="inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[10px] border border-[var(--color-border)] px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-sm transition active:opacity-90 sm:min-h-0 sm:w-auto sm:px-4 sm:py-2.5"
            style={{
              background: "var(--color-accent-health)",
              textDecoration: "none",
            }}
          >
            Check-in diario
          </Link>
          <div className="text-center sm:text-right">
            <p style={{ margin: 0, fontSize: "24px", fontWeight: 600, color: "var(--color-text-primary)" }}>0/3</p>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--color-text-secondary)",
              }}
            >
              Impacto completado
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-[var(--layout-gap)] lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Card className="p-5">
          <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Timeline Operativo
            </p>
            <div style={{ display: "grid", gap: "12px" }}>
              {timeline.map((item, index) => (
                <div key={item.time} style={{ display: "flex", gap: "10px" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                    <span
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "999px",
                        background: index === 1 ? "var(--color-accent-primary)" : "var(--color-border)",
                      }}
                    />
                    {index < timeline.length - 1 && (
                      <span style={{ width: "1px", height: "24px", background: "var(--color-border)" }} />
                    )}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>{item.time}</p>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 500 }}>{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
          <Card className="p-5">
            <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                Plan Ejecutable
              </p>
              <div style={{ border: "0.5px solid var(--color-border)", borderRadius: "14px", padding: "16px" }}>
                <p style={{ margin: 0, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.16em", color: "var(--color-accent-primary)" }}>
                  Foco actual inmediato
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 600 }}>{focusTask}</p>
                <div style={{ display: "flex", gap: "8px", marginTop: "8px", alignItems: "center", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  <span>{focusTime}</span>
                  <span style={{ padding: "2px 8px", borderRadius: "999px", border: "0.5px solid var(--color-border)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em" }}>
                    Crítica
                  </span>
                </div>
                <button
                  style={{
                    marginTop: "12px",
                    width: "100%",
                    padding: "10px",
                    borderRadius: "12px",
                    border: "none",
                    background: "#1F2937",
                    color: "white",
                    fontSize: "12px",
                    fontWeight: 600,
                  }}
                >
                  Marcar como completado
                </button>
              </div>
            </div>
          </Card>

          <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
            {tasks.slice(0, 2).map((task) => (
              <Card key={task.id} hover className="p-4">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ width: "14px", height: "14px", borderRadius: "999px", border: "0.5px solid var(--color-border)" }} />
                    <div>
                      <p style={{ margin: 0, fontSize: "13px", fontWeight: 500 }}>{task.title}</p>
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>45m</p>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>45m</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
        <Card className="p-5">
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                Google Calendar (hoy)
              </p>
              <button
                type="button"
                onClick={() => void refreshCal()}
                style={{
                  fontSize: "10px",
                  padding: "4px 8px",
                  borderRadius: "8px",
                  border: "0.5px solid var(--color-border)",
                  background: "var(--color-surface-alt)",
                }}
              >
                Actualizar
              </button>
            </div>
            {calNotice && (
              <p style={{ margin: 0, fontSize: "10px", color: "var(--color-text-secondary)" }}>{calNotice}</p>
            )}
            {!calConnected && !calLoading && !calNotice && (
              <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-secondary)" }}>
                Conecta Google en Configuración para ver eventos reales.
              </p>
            )}
            {calLoading ? (
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>Cargando calendario…</p>
            ) : meetings.length === 0 ? (
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>
                Sin eventos hoy en el rango sincronizado.
              </p>
            ) : (
              meetings.map((meeting) => (
                <div
                  key={meeting.key}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}
                >
                  <span>{meeting.label}</span>
                  <span style={{ color: "var(--color-text-secondary)" }}>
                    {meeting.time} · {meeting.duration}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
        <Card className="p-5">
          <div style={{ display: "grid", gap: "8px" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Hábitos clave
            </p>
            {habits.slice(0, 3).map((habit) => (
              <div key={habit.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px" }}>
                <span>{habit.name}</span>
                <span style={{ color: habit.completed ? "var(--color-accent-health)" : "var(--color-text-secondary)" }}>
                  {habit.completed ? "Hecho" : "Pendiente"}
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div style={{ display: "grid", gap: "8px" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Stack / Recordatorios
            </p>
            {supplements.map((item) => (
              <span key={item} style={{ fontSize: "12px", color: "var(--color-text-secondary)" }}>{item}</span>
            ))}
            {reminders.map((item) => (
              <span key={item} style={{ fontSize: "12px" }}>• {item}</span>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div style={{ display: "grid", gap: "8px", maxWidth: "320px" }}>
          <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
            Check-in de foco
          </p>
          <div style={{ display: "flex", gap: "6px" }}>
            {[1, 2, 3, 4, 5].map((score) => (
              <div
                key={score}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "10px",
                  border: "0.5px solid var(--color-border)",
                  background: "var(--color-surface-alt)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "12px",
                  fontWeight: 600,
                }}
              >
                {score}
              </div>
            ))}
          </div>
        </div>
      </Card>
    </div>
  )
}

