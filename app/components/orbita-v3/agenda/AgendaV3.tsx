"use client"

import { useState } from "react"
import { useApp, themes } from "@/app/contexts/AppContext"
import { Calendar, ChevronRight, KanbanSquare, LayoutList, Plus } from "lucide-react"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"

export default function AgendaV3() {
  const { colorTheme } = useApp()
  const theme = themes[colorTheme]
  const [tab, setTab] = useState("Hoy")
  const [view, setView] = useState<"list" | "kanban">("list")
  const { data } = useOperationalContext()

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl tracking-tight">Horizonte Temporal</h2>
          <p className="text-sm" style={{ color: theme.textMuted }}>
            Proximo punto de decision: 14:30 - Revision Q2
          </p>
          {typeof data?.score_disciplina === "number" && (
            <p className="mt-2 text-xs" style={{ color: theme.textMuted }}>
              Score disciplina: {data.score_disciplina}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white"
            style={{ backgroundColor: theme.accent.agenda }}
          >
            <Plus className="h-4 w-4" />
            Nueva Tarea
          </button>

          <div className="flex items-center rounded-xl border p-1" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
            {["Hoy", "Proximos 7 dias", "Semana", "Mes"].map((value) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className="rounded-lg px-4 py-1.5 text-xs font-medium"
                style={{
                  backgroundColor: tab === value ? theme.surface : "transparent",
                  color: tab === value ? theme.text : theme.textMuted,
                }}
              >
                {value}
              </button>
            ))}
          </div>

          <div className="flex items-center rounded-xl border p-1" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
            <button
              onClick={() => setView("list")}
              className="rounded-lg p-1.5"
              style={{ backgroundColor: view === "list" ? theme.surface : "transparent" }}
            >
              <LayoutList className="h-4 w-4" style={{ color: view === "list" ? theme.text : theme.textMuted }} />
            </button>
            <button
              onClick={() => setView("kanban")}
              className="rounded-lg p-1.5"
              style={{ backgroundColor: view === "kanban" ? theme.surface : "transparent" }}
            >
              <KanbanSquare className="h-4 w-4" style={{ color: view === "kanban" ? theme.text : theme.textMuted }} />
            </button>
          </div>
        </div>
      </div>

      {view === "list" ? (
        <div className="space-y-3">
          {(data?.today_tasks ?? []).map((task: any) => (
            <div key={task.id} className="flex items-center justify-between rounded-xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="flex items-center gap-4">
                <div className="h-8 w-1.5 rounded-full" style={{ backgroundColor: theme.accent.agenda }} />
                <div>
                  <p className="text-sm font-medium">{task.title}</p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    Prioridad: {task.priority} • {task.estimated_time} min
                  </p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4" style={{ color: theme.textMuted }} />
            </div>
          ))}

          <div className="flex items-center justify-between rounded-xl border p-4" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <div className="flex items-center gap-4">
              <div className="h-8 w-1.5 rounded-full bg-blue-500" />
              <div>
                <p className="text-sm font-medium">Reunion Equipo Q2</p>
                <p className="text-xs" style={{ color: theme.textMuted }}>14:30 - 15:30</p>
              </div>
            </div>
            <Calendar className="h-4 w-4" style={{ color: theme.textMuted }} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {["Por Hacer", "En Progreso", "Completado"].map((column) => (
            <div key={column} className="rounded-2xl border p-4" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
              <p className="mb-4 text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
                {column}
              </p>
              {column === "Por Hacer" && (
                <div className="space-y-3">
                  {(data?.today_tasks ?? []).map((task: any) => (
                    <div key={task.id} className="rounded-xl border p-3 shadow-sm" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
                      <div className="mb-3 h-1 w-6 rounded-full" style={{ backgroundColor: theme.accent.agenda }} />
                      <p className="text-sm">{task.title}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
