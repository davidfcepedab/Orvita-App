"use client"

import { useMemo, useState } from "react"
import { useAgendaTasks } from "@/app/hooks/useAgendaTasks"
import { useApp, themes } from "@/app/contexts/AppContext"
import { CheckCircle2, Circle } from "lucide-react"

export default function AgendaSharedOption2() {
  const { colorTheme } = useApp()
  const theme = themes[colorTheme]
  const { tasks, loading, error, updateTask } = useAgendaTasks()
  const [activeTab, setActiveTab] = useState<"all" | "received" | "assigned" | "personal">("all")
  const [query, setQuery] = useState("")

  const filtered = useMemo(
    () =>
      tasks.filter((task) => {
        if (activeTab !== "all" && task.type !== activeTab) return false
        if (query && !task.title.toLowerCase().includes(query.toLowerCase())) return false
        return true
      }),
    [activeTab, query, tasks]
  )

  if (loading) return <div className="rounded-xl border p-6">Cargando agenda...</div>
  if (error) return <div className="rounded-xl border p-6 text-red-600">{error}</div>

  return (
    <div className="space-y-5" style={{ color: theme.text }}>
      <div className="flex flex-wrap items-center gap-2">
        {[
          { id: "all", label: "Todas" },
          { id: "received", label: "Recibidas" },
          { id: "assigned", label: "Asignadas" },
          { id: "personal", label: "Personales" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className="rounded-full border px-3 py-1 text-xs"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar tarea..."
        className="w-full rounded-lg border px-3 py-2 text-sm"
      />

      <div className="space-y-3">
        {filtered.map((task) => (
          <div key={task.id} className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">{task.title}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {task.priority} • {task.estimatedMinutes} min • Responsable: {task.assigneeName || "Sin asignar"}
                </p>
              </div>
              <button
                onClick={() =>
                  updateTask(task.id, {
                    status: task.status === "completed" ? "pending" : "completed",
                  })
                }
              >
                {task.status === "completed" ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-slate-400" />
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
