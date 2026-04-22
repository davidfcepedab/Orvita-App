"use client"

import { useMemo, useState } from "react"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import { Calendar, CheckCircle2, Circle, Clock, Flame } from "lucide-react"
import { getAgendaDisplayTimeZone } from "@/lib/agenda/agendaTimeZone"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import type { OperationalTask } from "@/lib/operational/types"

export default function HoyV3() {
  const theme = useOrbitaSkin()
  const [completed, setCompleted] = useState<string[]>([])
  const { data } = useOperationalContext()

  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CO", {
        timeZone: getAgendaDisplayTimeZone(),
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(new Date()),
    [],
  )

  const tasks: OperationalTask[] = data?.today_tasks ?? []
  const nextTask = tasks.find((task) => !completed.includes(task.id))

  const toggle = (id: string) => {
    setCompleted((previous) =>
      previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]
    )
  }

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-8 overflow-x-hidden">
      <div className="flex items-center justify-between border-b pb-6" style={{ borderColor: theme.border }}>
        <div>
          <h2 className="text-3xl tracking-tight">Ejecución: hoy</h2>
          <p className="mt-2 flex items-center gap-2 text-sm capitalize" style={{ color: theme.textMuted }}>
            <Calendar className="h-4 w-4 shrink-0" aria-hidden />
            {todayLabel}
          </p>
          {typeof data?.delta_tendencia === "number" && (
            <p className="mt-2 text-xs" style={{ color: theme.textMuted }}>
              Tendencia 14d: {data.delta_tendencia > 0 ? "+" : ""}
              {data.delta_tendencia}%
            </p>
          )}
        </div>
        <p className="text-right text-4xl font-light">
          {completed.length}
          <span className="ml-1 text-xl" style={{ color: theme.textMuted }}>/ {tasks.length}</span>
        </p>
      </div>

      {nextTask && (
        <div className="relative overflow-hidden rounded-2xl border-2 p-8" style={{ backgroundColor: theme.surface, borderColor: `${theme.accent.agenda}88` }}>
          <div className="mb-4 flex items-center gap-2">
            <Flame className="h-4 w-4" style={{ color: theme.accent.agenda }} />
            <span className="text-xs uppercase tracking-wider" style={{ color: theme.accent.agenda }}>
              Foco Actual Inmediato
            </span>
          </div>
          <h3 className="mb-3 text-2xl">{nextTask.title}</h3>
          <p className="mb-6 flex items-center gap-2 text-sm" style={{ color: theme.textMuted }}>
            <Clock className="h-4 w-4" />
            {nextTask.domain}
          </p>
          <button
            onClick={() => toggle(nextTask.id)}
            className="w-full rounded-xl py-3 font-medium"
            style={{ backgroundColor: theme.text, color: theme.bg }}
          >
            Marcar como completado
          </button>
        </div>
      )}

      <div className="space-y-3">
        {tasks.map((task) => {
          const isDone = completed.includes(task.id)
          if (task.id === nextTask?.id && !isDone) return null
          return (
            <button
              key={task.id}
              onClick={() => toggle(task.id)}
              className="flex w-full items-center gap-4 rounded-xl border p-4 text-left"
              style={{
                backgroundColor: isDone ? theme.surfaceAlt : theme.surface,
                borderColor: isDone ? `${theme.accent.health}66` : theme.border,
                opacity: isDone ? 0.7 : 1,
              }}
            >
              {isDone ? (
                <CheckCircle2 className="h-5 w-5" style={{ color: theme.accent.health }} />
              ) : (
                <Circle className="h-5 w-5" style={{ color: theme.textMuted }} />
              )}
              <div className="flex-1">
                <p className={isDone ? "line-through" : ""}>{task.title}</p>
              </div>
              <span className="text-xs" style={{ color: theme.textMuted }}>{task.domain}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
