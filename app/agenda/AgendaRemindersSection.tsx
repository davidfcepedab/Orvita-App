"use client"

import { useMemo } from "react"
import { Card } from "@/src/components/ui/Card"
import type { GoogleTasksFeedState } from "@/app/hooks/useGoogleTasks"
import { agendaCardSurfaceStyle } from "@/app/agenda/agendaUnifiedCardStyles"
import { AGENDA_COLOR } from "@/app/agenda/taskTypeVisual"
import {
  GOOGLE_AGENDA_PANEL_REMINDER_LIMIT,
  GOOGLE_AGENDA_WINDOW_DAYS,
  upcomingGoogleReminders,
} from "@/lib/agenda/googleTasksUpcoming"

type AgendaRemindersSectionProps = {
  feed: Pick<GoogleTasksFeedState, "tasks" | "loading" | "error" | "connected" | "notice">
  embedded?: boolean
}

export function AgendaRemindersSection({ feed, embedded = false }: AgendaRemindersSectionProps) {
  const { tasks, loading, error, connected, notice } = feed

  const upcoming = useMemo(
    () => upcomingGoogleReminders(tasks, GOOGLE_AGENDA_WINDOW_DAYS, GOOGLE_AGENDA_PANEL_REMINDER_LIMIT),
    [tasks]
  )

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
            <li
              key={t.id}
              style={{
                marginBottom: "6px",
                paddingLeft: "4px",
                borderLeft: `3px solid ${AGENDA_COLOR.reminder}`,
              }}
            >
              <span style={{ fontWeight: 500 }}>{t.title}</span>
              <span style={{ color: AGENDA_COLOR.reminder, marginLeft: "8px" }}>{t.due ? t.due.slice(0, 10) : "—"}</span>
            </li>
          ))}
          {upcoming.length === 0 && (
            <li style={{ color: "var(--color-text-secondary)", listStyle: "none", marginLeft: "-18px" }}>
              Sin vencimientos en los próximos {GOOGLE_AGENDA_WINDOW_DAYS} días.
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
      className="p-0 overflow-hidden"
      style={agendaCardSurfaceStyle(`4px solid ${AGENDA_COLOR.reminder}`)}
    >
      <div style={{ padding: "var(--spacing-md)" }}>{body}</div>
    </Card>
  )
}
