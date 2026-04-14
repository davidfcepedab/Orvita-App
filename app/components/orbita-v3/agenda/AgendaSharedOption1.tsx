"use client"

import { useMemo } from "react"
import { useAgendaTasks, type AgendaTask } from "@/app/hooks/useAgendaTasks"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import { CheckCircle2, Circle, UserPlus } from "lucide-react"

const assigneeOptions = [
  { id: "david", name: "Commander (Tu)" },
  { id: "ana", name: "Ana Garcia" },
  { id: "carlos", name: "Carlos Ruiz" },
  { id: "maria", name: "Maria Lopez" },
]

function TaskCard({
  task,
  onStatusToggle,
  onAssign,
}: {
  task: AgendaTask
  onStatusToggle: (task: AgendaTask) => void
  onAssign: (task: AgendaTask, assigneeId: string) => void
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">{task.title}</p>
          <p className="mt-1 text-xs text-gray-500">
            {task.priority} • {task.estimatedMinutes} min
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Responsable: {task.assigneeName || "Sin asignar"}
          </p>
        </div>
        <button onClick={() => onStatusToggle(task)} className="mt-0.5">
          {task.status === "completed" ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : (
            <Circle className="h-5 w-5 text-slate-400" />
          )}
        </button>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <UserPlus className="h-4 w-4 text-slate-500" />
        <select
          className="rounded-md border px-2 py-1 text-xs"
          value={task.assigneeId || ""}
          onChange={(event) => onAssign(task, event.target.value)}
        >
          <option value="">Sin asignar</option>
          {assigneeOptions.map((assignee) => (
            <option key={assignee.id} value={assignee.id}>
              {assignee.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}

export default function AgendaSharedOption1() {
  const theme = useOrbitaSkin()
  const { tasks, loading, error, updateTask } = useAgendaTasks()

  const myTasks = useMemo(() => tasks.filter((task) => task.type === "received"), [tasks])
  const assignedByMe = useMemo(() => tasks.filter((task) => task.type === "assigned"), [tasks])
  const personal = useMemo(() => tasks.filter((task) => task.type === "personal"), [tasks])

  const handleToggle = async (task: AgendaTask) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed"
    await updateTask(task.id, { status: nextStatus })
  }

  const handleAssign = async (task: AgendaTask, assigneeId: string) => {
    const assignee = assigneeOptions.find((item) => item.id === assigneeId)
    await updateTask(task.id, {
      assigneeId: assigneeId || null,
      assigneeName: assignee?.name || null,
    })
  }

  if (loading) return <div className="rounded-xl border p-6">Cargando agenda...</div>
  if (error) return <div className="rounded-xl border p-6 text-red-600">{error}</div>

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3" style={{ color: theme.text }}>
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-slate-500">Tareas Recibidas</h3>
        {myTasks.map((task) => (
          <TaskCard key={task.id} task={task} onStatusToggle={handleToggle} onAssign={handleAssign} />
        ))}
      </div>
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-slate-500">Asignadas por Mi</h3>
        {assignedByMe.map((task) => (
          <TaskCard key={task.id} task={task} onStatusToggle={handleToggle} onAssign={handleAssign} />
        ))}
      </div>
      <div className="space-y-3">
        <h3 className="text-xs uppercase tracking-wider text-slate-500">Personales</h3>
        {personal.map((task) => (
          <TaskCard key={task.id} task={task} onStatusToggle={handleToggle} onAssign={handleAssign} />
        ))}
      </div>
    </div>
  )
}
