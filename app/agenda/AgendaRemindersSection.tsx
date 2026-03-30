"use client"

import { useEffect, useMemo } from "react"
import { Card } from "@/src/components/ui/Card"
import { useGoogleTasks } from "@/app/hooks/useGoogleTasks"
import { AGENDA_COLOR } from "@/app/agenda/taskTypeVisual"

function parseDue(due: string | null) {
  if (!due) return null
  const d = new Date(due)
  return Number.isNaN(d.getTime()) ? null : d
}

function isGoogleTaskDone(status: string | null) {
  const s = (status || "").toLowerCase()
  return s === "completed"
}

type AgendaRemindersSectionProps = {
  livePullKey: number
  embedded?: boolean
}

export function AgendaRemindersSection({ livePullKey, embedded = false }: AgendaRemindersSectionProps) {
  const { tasks, loading, error, connected, notice, refresh } = useGoogleTasks()

  useEffect(() => {
    void refresh()
  }, [livePullKey, refresh])

  const upcoming = useMemo(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const horizon = new Date(start)
    horizon.setDate(horizon.getDate() + 14)
    return tasks
      .filter((t) => {
        if (isGoogleTaskDone(t.status)) return false
        const d = parseDue(t.due)
        if (!d) return false
        return d >= start && d <= horizon
      })
      .sort((a, b) => {
        const da = parseDue(a.due)?.getTime() ?? 0
        const db = parseDue(b.due)?.getTime() ?? 0
        return da - db
      })
      .slice(0, 24)
  }, [tasks])

  const body = (
    <>
      {!embedded && (
        <p
          style={{
            margin: 0,
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--color-text-secondary)",
          }}
        >
          Recordatorios (Google Tasks con vencimiento próximo)
        </p>
      )}
      {notice && (
        <p style={{ margin: embedded ? "0 0 0" : "8px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>{notice}</p>
      )}
      {error && (
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-accent-danger)" }}>{error}</p>
      )}
      {loading ? (
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>Cargando recordatorios…</p>
      ) : connected ? (
        <ul
          style={{
            margin: embedded ? "6px 0 0" : "10px 0 0",
            paddingLeft: "18px",
            fontSize: "12px",
            color: "var(--color-text-primary)",
          }}
        >
          {upcoming.map((t) => (
            <li key={t.id} style={{ marginBottom: "6px" }}>
              <span style={{ fontWeight: 500 }}>{t.title}</span>
              <span style={{ color: AGENDA_COLOR.reminder, marginLeft: "8px" }}>{t.due ? t.due.slice(0, 10) : "—"}</span>
            </li>
          ))}
          {upcoming.length === 0 && (
            <li style={{ color: "var(--color-text-secondary)", listStyle: "none", marginLeft: "-18px" }}>
              Sin vencimientos en los próximos 14 días.
            </li>
          )}
        </ul>
      ) : (
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>
          Conecta Google en Configuración para ver recordatorios de Tasks aquí.
        </p>
      )}
    </>
  )

  if (embedded) {
    return <div className="w-full">{body}</div>
  }

  return (
    <Card
      className="p-0"
      style={{
        borderLeft: `4px solid ${AGENDA_COLOR.reminder}`,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "var(--spacing-md)" }}>{body}</div>
    </Card>
  )
}
