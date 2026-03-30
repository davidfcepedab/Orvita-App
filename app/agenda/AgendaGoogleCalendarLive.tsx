"use client"

import { useEffect } from "react"
import { Card } from "@/src/components/ui/Card"
import { useGoogleCalendar } from "@/app/hooks/useGoogleCalendar"
import { AGENDA_COLOR } from "@/app/agenda/taskTypeVisual"

type AgendaGoogleCalendarLiveProps = {
  livePullKey: number
  /** Sin Card ni título: para incrustar en el panel unificado. */
  embedded?: boolean
}

export function AgendaGoogleCalendarLive({ livePullKey, embedded = false }: AgendaGoogleCalendarLiveProps) {
  const { events, loading, error, connected, notice, refresh } = useGoogleCalendar()

  useEffect(() => {
    void refresh()
  }, [livePullKey, refresh])

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
          Reuniones y eventos — Google Calendar (en vivo, próximos 14 días)
        </p>
      )}
      {notice && (
        <p style={{ margin: embedded ? "0 0 0" : "8px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>{notice}</p>
      )}
      {error && (
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-accent-danger)" }}>{error}</p>
      )}
      {loading ? (
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>Cargando eventos…</p>
      ) : connected ? (
        <ul
          style={{
            margin: embedded ? "6px 0 0" : "10px 0 0",
            paddingLeft: "18px",
            fontSize: "12px",
            color: "var(--color-text-primary)",
          }}
        >
          {events.slice(0, 16).map((ev) => (
            <li
              key={ev.id}
              style={{
                marginBottom: "6px",
                paddingLeft: "4px",
                borderLeft: `3px solid ${AGENDA_COLOR.calendar}`,
              }}
            >
              <span style={{ fontWeight: 500 }}>{ev.summary}</span>
              <span style={{ color: "var(--color-text-secondary)", marginLeft: "8px" }}>
                {ev.startAt ? `${ev.startAt.slice(0, 10)}${ev.allDay ? "" : ` ${ev.startAt.slice(11, 16)}`}` : "—"}
              </span>
            </li>
          ))}
          {events.length === 0 && (
            <li style={{ color: "var(--color-text-secondary)", listStyle: "none", marginLeft: "-18px" }}>
              Sin eventos en este periodo.
            </li>
          )}
        </ul>
      ) : (
        <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>
          Conecta Google en Configuración para ver tu calendario aquí.
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
        borderLeft: `4px solid ${AGENDA_COLOR.calendar}`,
        overflow: "hidden",
      }}
    >
      <div style={{ padding: "var(--spacing-md)" }}>{body}</div>
    </Card>
  )
}
