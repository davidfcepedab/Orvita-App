"use client"

import { useState } from "react"
import { useAgendaTasks } from "@/app/hooks/useAgendaTasks"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import AgendaSharedOption1 from "./AgendaSharedOption1"
import AgendaSharedOption2 from "./AgendaSharedOption2"

export default function AgendaSharedComparison() {
  const theme = useOrbitaSkin()
  const { createTask } = useAgendaTasks()
  const [selectedOption, setSelectedOption] = useState<1 | 2>(1)
  const [newTask, setNewTask] = useState("")

  const handleCreate = async () => {
    const title = newTask.trim()
    if (!title) return
    await createTask({ title, priority: "Media", estimatedMinutes: 30 })
    setNewTask("")
  }

  return (
    <div className="space-y-6" style={{ color: theme.text }}>
      <div className="rounded-2xl border p-6" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Agenda Compartida</h2>
            <p className="text-sm" style={{ color: theme.textMuted }}>
              Asigna, reasigna y monitorea responsable en tiempo real.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-xl border p-1" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
            <button
              onClick={() => setSelectedOption(1)}
              className="rounded-lg px-4 py-2 text-sm"
              style={{ backgroundColor: selectedOption === 1 ? theme.accent.agenda : "transparent", color: selectedOption === 1 ? "#fff" : theme.text }}
            >
              Vista columnas
            </button>
            <button
              onClick={() => setSelectedOption(2)}
              className="rounded-lg px-4 py-2 text-sm"
              style={{ backgroundColor: selectedOption === 2 ? theme.accent.health : "transparent", color: selectedOption === 2 ? "#fff" : theme.text }}
            >
              Vista lista
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={newTask}
            onChange={(event) => setNewTask(event.target.value)}
            placeholder="Nueva tarea para agenda..."
            className="flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button onClick={handleCreate} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white">
            Crear
          </button>
        </div>
      </div>

      {selectedOption === 1 ? <AgendaSharedOption1 /> : <AgendaSharedOption2 />}
    </div>
  )
}
