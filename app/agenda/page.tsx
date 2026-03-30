"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Card } from "@/src/components/ui/Card"
import {
  CalendarDays,
  CalendarRange,
  LayoutGrid,
  ListChecks,
  Plus,
  Search,
  UserPlus,
} from "lucide-react"
import { GoogleAgendaPanel } from "@/app/agenda/GoogleAgendaPanel"
import { useAgendaTasks } from "@/app/hooks/useAgendaTasks"
import { useGoogleCalendar } from "@/app/hooks/useGoogleCalendar"
import { mapAgendaTaskToUi, priorityFormToApi } from "@/app/agenda/mapAgendaTaskToUi"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10)
}

function AgendaGoogleCalendarLive() {
  const { events, loading, error, connected, notice } = useGoogleCalendar()
  return (
    <Card className="p-0">
      <div style={{ padding: "var(--spacing-md)" }}>
        <p
          style={{
            margin: 0,
            fontSize: "11px",
            textTransform: "uppercase",
            letterSpacing: "0.14em",
            color: "var(--color-text-secondary)",
          }}
        >
          Google Calendar (en vivo, próximos 14 días)
        </p>
        {notice && (
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>{notice}</p>
        )}
        {error && (
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-accent-danger)" }}>{error}</p>
        )}
        {loading ? (
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>Cargando eventos…</p>
        ) : connected ? (
          <ul style={{ margin: "8px 0 0", paddingLeft: "18px", fontSize: "12px", color: "var(--color-text-primary)" }}>
            {events.slice(0, 12).map((ev) => (
              <li key={ev.id} style={{ marginBottom: "4px" }}>
                {ev.summary}
                <span style={{ color: "var(--color-text-secondary)", marginLeft: "6px" }}>
                  {ev.startAt ? `${ev.startAt.slice(0, 10)}${ev.allDay ? "" : ` ${ev.startAt.slice(11, 16)}`}` : "—"}
                </span>
              </li>
            ))}
            {events.length === 0 && (
              <li style={{ color: "var(--color-text-secondary)" }}>Sin eventos en este periodo.</li>
            )}
          </ul>
        ) : (
          <p style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>
            Conecta Google en Configuración para ver tu calendario aquí.
          </p>
        )}
      </div>
    </Card>
  )
}

const tabs = [
  { key: "todas", label: "Todas" },
  { key: "recibida", label: "Recibidas" },
  { key: "asignada", label: "Asignadas" },
  { key: "personal", label: "Personales" },
]

const priorities = ["alta", "media", "baja"] as const

type Priority = typeof priorities[number]

type ViewKey = "kanban" | "list" | "week" | "month"

const views = [
  {
    key: "kanban" as ViewKey,
    label: "Columnas",
    description: "Flujo colaborativo por tipo",
    icon: LayoutGrid,
    color: "var(--color-accent-finance)",
  },
  {
    key: "list" as ViewKey,
    label: "Lista",
    description: "Búsqueda y filtros avanzados",
    icon: ListChecks,
    color: "var(--color-accent-health)",
  },
  {
    key: "week" as ViewKey,
    label: "Semana",
    description: "Planificación a 7 días",
    icon: CalendarDays,
    color: "var(--color-accent-warning)",
  },
  {
    key: "month" as ViewKey,
    label: "Mes",
    description: "Lectura estratégica mensual",
    icon: CalendarRange,
    color: "var(--color-accent-primary)",
  },
]

function getWeekDays(base = new Date()) {
  const date = new Date(base)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return Array.from({ length: 7 }).map((_, idx) => {
    const d = new Date(date)
    d.setDate(date.getDate() + idx)
    return d
  })
}

function formatDayLabel(date: Date) {
  return date.toLocaleDateString("es-CO", { weekday: "short" })
}

function formatDateKey(date: Date) {
  return date.toISOString().slice(0, 10)
}

function buildMonthGrid(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startOffset = (first.getDay() + 6) % 7
  const days = [] as { date: Date | null; key: string }[]
  for (let i = 0; i < startOffset; i += 1) {
    days.push({ date: null, key: `empty-${i}` })
  }
  for (let d = 1; d <= last.getDate(); d += 1) {
    const day = new Date(year, month, d)
    days.push({ date: day, key: formatDateKey(day) })
  }
  return days
}

function humanizeDueDate(dateStr: string) {
  if (!dateStr) return "Sin fecha"
  const today = new Date()
  const target = new Date(dateStr)
  const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const targetKey = new Date(target.getFullYear(), target.getMonth(), target.getDate()).getTime()
  const diffDays = Math.round((targetKey - todayKey) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Vence: Hoy"
  if (diffDays === 1) return "Vence: Mañana"
  if (diffDays === -1) return "Venció ayer"
  if (diffDays < -1) return "Overdue"

  const weekday = target.toLocaleDateString("es-CO", { weekday: "long" })
  if (diffDays <= 7) return `Vence el ${weekday}`
  return `Vence el ${weekday} de la próxima semana`
}

// ← V3 RECONSTRUIDO: fiel a captura + navegación preservada
export default function AgendaPage() {
  const { tasks: agendaTasks, loading, error, refresh, createTask, updateTask } = useAgendaTasks()
  const tasks = useMemo(() => agendaTasks.map(mapAgendaTaskToUi), [agendaTasks])
  const [googleLivePullKey, setGoogleLivePullKey] = useState(0)
  const lastVisibilityPullRef = useRef(0)

  useEffect(() => {
    if (isAppMockMode() || !isSupabaseEnabled()) return
    let cancelled = false
    const pull = async () => {
      try {
        const headers = await browserBearerHeaders(true)
        await Promise.all([
          fetch("/api/integrations/google/tasks/sync", { method: "POST", headers }),
          fetch("/api/integrations/google/calendar/sync", { method: "POST", headers }),
        ])
        if (cancelled) return
        await refresh()
        setGoogleLivePullKey((k) => k + 1)
      } catch {
        /* sin conexión o sesión: la UI sigue con datos locales */
      }
    }
    void pull()
    return () => {
      cancelled = true
    }
  }, [refresh])

  useEffect(() => {
    if (isAppMockMode() || !isSupabaseEnabled()) return
    const onVisible = () => {
      if (document.visibilityState !== "visible") return
      const now = Date.now()
      if (now - lastVisibilityPullRef.current < 120_000) return
      lastVisibilityPullRef.current = now
      void (async () => {
        try {
          const headers = await browserBearerHeaders(true)
          await Promise.all([
            fetch("/api/integrations/google/tasks/sync", { method: "POST", headers }),
            fetch("/api/integrations/google/calendar/sync", { method: "POST", headers }),
          ])
          await refresh()
          setGoogleLivePullKey((k) => k + 1)
        } catch {
          /* ignore */
        }
      })()
    }
    document.addEventListener("visibilitychange", onVisible)
    return () => document.removeEventListener("visibilitychange", onVisible)
  }, [refresh])

  const [tab, setTab] = useState("todas")
  const [priority, setPriority] = useState<Priority | "">("")
  const [view, setView] = useState<ViewKey>("list")
  const [query, setQuery] = useState("")
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formSubmitError, setFormSubmitError] = useState<string | null>(null)
  const [form, setForm] = useState({
    title: "",
    assignee: "",
    due: todayDateInputValue(),
    duration: 30,
    type: "recibida",
    priority: "media",
    status: "recibida",
    source: "",
    notes: "",
  })

  const filtered = useMemo(() => {
    return tasks.filter((task) => {
      const tabMatch = tab === "todas" || task.type === tab
      const priorityMatch = !priority || task.priority === priority
      const queryMatch = !query || task.title.toLowerCase().includes(query.toLowerCase())
      return tabMatch && priorityMatch && queryMatch
    })
  }, [tab, priority, query])

  const countByTab = (key: string) =>
    key === "todas" ? tasks.length : tasks.filter((task) => task.type === key).length

  const grouped = useMemo(() => {
    return {
      recibida: filtered.filter((task) => task.type === "recibida"),
      asignada: filtered.filter((task) => task.type === "asignada"),
      personal: filtered.filter((task) => task.type === "personal"),
    }
  }, [filtered])

  const { weekDays, weekMap } = useMemo(() => {
    const days = getWeekDays(new Date())
    const map: Record<string, typeof tasks> = {}
    days.forEach((day) => {
      map[formatDateKey(day)] = []
    })
    tasks.forEach((task) => {
      if (task.due && map[task.due]) map[task.due].push(task)
    })
    return { weekDays: days, weekMap: map }
  }, [tasks])

  const totalWeeklyTasks = weekDays.reduce((acc, day) => acc + (weekMap[formatDateKey(day)]?.length ?? 0), 0)
  const totalWeeklyMinutes = weekDays.reduce(
    (acc, day) => acc + (weekMap[formatDateKey(day)]?.reduce((sum, t) => sum + t.duration, 0) ?? 0),
    0
  )
  const totalWeeklyCompleted = weekDays.reduce(
    (acc, day) => acc + (weekMap[formatDateKey(day)]?.filter((t) => t.completed).length ?? 0),
    0
  )
  const totalWeeklyPending = totalWeeklyTasks - totalWeeklyCompleted

  const monthGrid = buildMonthGrid(new Date())
  const monthSummary = useMemo(() => {
    const total = tasks.length
    const completed = tasks.filter((t) => t.status === "completada").length
    const hours = Math.round(tasks.reduce((acc, t) => acc + t.duration, 0) / 60)
    return { total, completed, hours }
  }, [tasks])

  const dayDetails = selectedDay ? tasks.filter((t) => t.due === selectedDay) : []

  const handleCreateTask = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.title.trim()) return
    setFormSubmitError(null)
    try {
      await createTask({
        title: form.title.trim(),
        priority: priorityFormToApi(form.priority),
        estimatedMinutes: Number(form.duration) || 30,
        dueDate: form.due ? form.due : null,
        assigneeName: form.assignee.trim() ? form.assignee.trim() : null,
        assigneeId: null,
      })
      setFormOpen(false)
      setForm({
        title: "",
        assignee: "",
        due: todayDateInputValue(),
        duration: 30,
        type: "recibida",
        priority: "media",
        status: "recibida",
        source: "",
        notes: "",
      })
    } catch (e) {
      setFormSubmitError(e instanceof Error ? e.message : "No se pudo crear la tarea")
    }
  }

  return (
    <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
      <GoogleAgendaPanel
        livePullKey={googleLivePullKey}
        onAfterTasksSync={() => void refresh()}
      />
      <AgendaGoogleCalendarLive />
      {(loading || error) && (
        <div
          style={{
            padding: "10px 14px",
            borderRadius: "12px",
            border: "0.5px solid var(--color-border)",
            background: error ? "color-mix(in srgb, var(--color-accent-danger) 10%, var(--color-surface))" : "var(--color-surface-alt)",
            fontSize: "13px",
            color: error ? "var(--color-accent-danger)" : "var(--color-text-secondary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
          }}
        >
          <span>{error ?? "Cargando tareas compartidas…"}</span>
          {error && (
            <button
              type="button"
              onClick={() => void refresh()}
              style={{
                border: "0.5px solid var(--color-border)",
                background: "var(--color-surface)",
                borderRadius: "8px",
                padding: "6px 10px",
                fontSize: "12px",
                cursor: "pointer",
              }}
            >
              Reintentar
            </button>
          )}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-lg)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 500 }}>Tareas Compartidas</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
            Vista unificada con filtros: Todas • Recibidas • Asignadas • Personales
          </p>
        </div>
        <div style={{ display: "flex", gap: "var(--spacing-sm)" }}>
          <button
            onClick={() => setFormOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 14px",
              borderRadius: "10px",
              border: "0.5px solid var(--color-border)",
              background: "var(--color-accent-health)",
              color: "white",
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            <Plus size={14} />
            Nueva Tarea
          </button>
          <button
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "10px 16px",
              borderRadius: "10px",
              border: "0.5px solid var(--color-border)",
              background: "var(--color-surface)",
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              textTransform: "uppercase",
              letterSpacing: "0.12em",
            }}
          >
            <UserPlus size={14} />
            Asignar
          </button>
        </div>
      </div>

      <div
        style={{
          position: "sticky",
          top: "84px",
          zIndex: 10,
          background: "var(--color-background)",
          paddingBottom: "8px",
        }}
      >
        <div style={{ display: "grid", gap: "10px" }}>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {views.map((item) => {
              const Icon = item.icon
              const active = view === item.key
              return (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px",
                    borderRadius: "14px",
                    border: "0.5px solid var(--color-border)",
                    background: active ? "var(--color-surface)" : "var(--color-surface-alt)",
                    boxShadow: active ? "0 10px 18px rgba(15, 23, 42, 0.08)" : "none",
                  }}
                >
                  <span
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "10px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: active ? `color-mix(in srgb, ${item.color} 18%, transparent)` : "var(--color-surface)",
                      color: item.color,
                    }}
                  >
                    <Icon size={16} />
                  </span>
                  <div style={{ textAlign: "left" }}>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 600 }}>{item.label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>
                      {item.description}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-md)", flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {tabs.map((item) => (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "999px",
                    border: "0.5px solid var(--color-border)",
                    background: tab === item.key ? "var(--color-surface)" : "var(--color-surface-alt)",
                    fontSize: "11px",
                    color: tab === item.key ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {item.label}
                  <span style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>({countByTab(item.key)})</span>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: "6px" }}>
              {priorities.map((item) => (
                <button
                  key={item}
                  onClick={() => setPriority(priority === item ? "" : item)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "999px",
                    border: "0.5px solid var(--color-border)",
                    background: priority === item ? "var(--color-surface)" : "var(--color-surface-alt)",
                    fontSize: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.12em",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "var(--color-surface)", border: "0.5px solid var(--color-border)", borderRadius: "12px", padding: "10px 14px" }}>
            <Search size={16} color="var(--color-text-secondary)" />
            <input
              placeholder="Buscar tareas..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              style={{ border: "none", outline: "none", fontSize: "13px", width: "100%", background: "transparent", color: "var(--color-text-primary)" }}
            />
          </div>
        </div>
      </div>

      {view === "list" && (
        <Card className="p-0">
          <div style={{ display: "grid" }}>
            {filtered.map((task, index) => (
              <div
                key={task.id}
                style={{
                  padding: "14px 16px",
                  borderBottom: index === filtered.length - 1 ? "none" : "0.5px solid var(--color-border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !task.completed
                      void updateTask(task.id, { status: next ? "completed" : "pending" })
                    }}
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "999px",
                      border: "0.5px solid var(--color-border)",
                      background: task.completed ? "var(--color-accent-health)" : "var(--color-surface)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "10px",
                    }}
                  >
                    {task.completed ? "✓" : ""}
                  </button>
                  <div>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 500 }}>{task.title}</p>
                    <div style={{ display: "flex", gap: "10px", marginTop: "4px", fontSize: "11px", color: "var(--color-text-secondary)" }}>
                      <span>{task.duration} min</span>
                      <span>{humanizeDueDate(task.due)}</span>
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      background:
                        task.type === "recibida"
                          ? "color-mix(in srgb, var(--color-accent-agenda) 14%, transparent)"
                          : task.type === "asignada"
                          ? "color-mix(in srgb, var(--color-accent-health) 14%, transparent)"
                          : "color-mix(in srgb, var(--color-accent-finance) 14%, transparent)",
                      color:
                        task.type === "recibida"
                          ? "var(--color-accent-agenda)"
                          : task.type === "asignada"
                          ? "var(--color-accent-health)"
                          : "var(--color-accent-finance)",
                    }}
                  >
                    {task.type}
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      background:
                        task.priority === "alta"
                          ? "color-mix(in srgb, var(--color-accent-danger) 16%, transparent)"
                          : task.priority === "media"
                          ? "color-mix(in srgb, var(--color-accent-warning) 16%, transparent)"
                          : "color-mix(in srgb, var(--color-border) 40%, transparent)",
                      color:
                        task.priority === "alta"
                          ? "var(--color-accent-danger)"
                          : task.priority === "media"
                          ? "var(--color-accent-warning)"
                          : "var(--color-text-secondary)",
                    }}
                  >
                    {task.priority}
                  </span>
                  <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", background: "color-mix(in srgb, var(--color-accent-health) 12%, transparent)", color: "var(--color-accent-health)" }}>
                    {task.status}
                  </span>
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "999px",
                      background: "color-mix(in srgb, var(--color-text-primary) 85%, black)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "white",
                    }}
                  >
                    {task.owner}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {view === "kanban" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
          {[
            { label: "Tareas Recibidas", items: grouped.recibida },
            { label: "Asignadas por mí", items: grouped.asignada },
            { label: "Tareas Personales", items: grouped.personal },
          ].map((column) => (
            <div key={column.label} style={{ display: "grid", gap: "var(--spacing-sm)" }}>
              <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                {column.label}
              </p>
              {column.items.map((task) => (
                <Card key={task.id} hover className="p-4">
                  <div style={{ display: "grid", gap: "6px" }}>
                    <p style={{ margin: 0, fontSize: "13px", fontWeight: 500 }}>{task.title}</p>
                    <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "var(--color-text-secondary)" }}>
                      <span>{task.duration} min</span>
                      <span>{task.due}</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", background: "color-mix(in srgb, var(--color-accent-agenda) 12%, transparent)", color: "var(--color-accent-agenda)" }}>
                        {task.priority}
                      </span>
                      <span style={{ padding: "2px 8px", borderRadius: "999px", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", background: "color-mix(in srgb, var(--color-accent-health) 12%, transparent)", color: "var(--color-accent-health)" }}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ))}
        </div>
      )}

      {view === "week" && (
        <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
          <Card className="p-4">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                  Semana operativa
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "14px" }}>Distribución de tareas y carga semanal</p>
              </div>
              <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                <span>Total tareas: {totalWeeklyTasks}</span>
                <span>Completadas: {totalWeeklyCompleted}</span>
                <span>Pendientes: {totalWeeklyPending}</span>
                <span>Horas totales: {(totalWeeklyMinutes / 60).toFixed(1)}h</span>
              </div>
            </div>
          </Card>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "10px" }}>
            {weekDays.map((day) => {
              const key = formatDateKey(day)
              const isToday = key === new Date().toISOString().slice(0, 10)
              const dayTasks = weekMap[key] || []
              return (
                <Card
                  key={key}
                  className="p-3"
                  style={{
                    borderColor: isToday ? "color-mix(in srgb, var(--color-accent-primary) 45%, var(--color-border))" : "var(--color-border)",
                    background: isToday ? "color-mix(in srgb, var(--color-accent-primary) 6%, var(--color-surface))" : "var(--color-surface)",
                  }}
                >
                  <div style={{ display: "grid", gap: "10px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ display: "grid", gap: "2px" }}>
                        <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                          {formatDayLabel(day)}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>
                          {dayTasks.length} tareas
                        </span>
                      </div>
                      {isToday && (
                        <span style={{ fontSize: "10px", color: "var(--color-accent-health)", textTransform: "uppercase" }}>Hoy</span>
                      )}
                    </div>
                    <div style={{ display: "grid", gap: "6px" }}>
                      {dayTasks.map((task) => (
                        <div
                          key={task.id}
                          style={{
                            padding: "8px",
                            borderRadius: "10px",
                            background: "var(--color-surface-alt)",
                            borderLeft:
                              task.priority === "alta"
                                ? "3px solid var(--color-accent-danger)"
                                : task.priority === "media"
                                ? "3px solid var(--color-accent-warning)"
                                : "3px solid var(--color-border)",
                          }}
                        >
                          <p style={{ margin: 0, fontSize: "11px", fontWeight: 600 }}>{task.title}</p>
                          <p style={{ margin: "4px 0 0", fontSize: "10px", color: "var(--color-text-secondary)" }}>
                            {task.duration} min
                          </p>
                        </div>
                      ))}
                      {dayTasks.length === 0 && (
                        <p style={{ margin: 0, fontSize: "10px", color: "var(--color-text-secondary)" }}>Sin tareas</p>
                      )}
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {view === "month" && (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: "var(--layout-gap)" }}>
          <Card className="p-4">
            <div style={{ display: "grid", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                    Marzo 2026
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: "14px", fontWeight: 600 }}>Calendario operativo</p>
                </div>
                <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>Vista mensual</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: "8px" }}>
                {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
                  <span key={d} style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
                    {d}
                  </span>
                ))}
                {monthGrid.map((cell) => {
                  const day = cell.date
                  const tasksForDay =
                    day != null ? tasks.filter((t) => t.due === formatDateKey(day)) : []
                  const isSelected = day != null && selectedDay === formatDateKey(day)
                  return (
                    <button
                      key={cell.key}
                      onClick={() => {
                        if (day != null) setSelectedDay(formatDateKey(day))
                      }}
                      style={{
                        height: "62px",
                        borderRadius: "12px",
                        border: "0.5px solid var(--color-border)",
                        background: isSelected ? "var(--color-surface)" : "var(--color-surface-alt)",
                        padding: "8px",
                        textAlign: "left",
                        fontSize: "11px",
                        color: cell.date ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                        boxShadow: isSelected ? "0 8px 18px rgba(15,23,42,0.08)" : "none",
                      }}
                      disabled={!cell.date}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span>{cell.date ? cell.date.getDate() : ""}</span>
                        {tasksForDay.length > 0 && (
                          <span style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>
                            {tasksForDay.length}
                          </span>
                        )}
                      </div>
                      {tasksForDay.length > 0 && (
                        <div style={{ marginTop: "6px", display: "flex", gap: "4px" }}>
                          <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "var(--color-accent-health)" }} />
                          <span style={{ width: "6px", height: "6px", borderRadius: "999px", background: "var(--color-accent-warning)" }} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div style={{ display: "grid", gap: "12px" }}>
              <div>
                <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                  Resumen del mes
                </p>
                <p style={{ margin: "6px 0 0", fontSize: "18px", fontWeight: 600 }}>{monthSummary.total} tareas activas</p>
              </div>
              <div style={{ display: "grid", gap: "8px", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                <span>Completadas: {monthSummary.completed}</span>
                <span>Pendientes: {monthSummary.total - monthSummary.completed}</span>
                <span>Horas estimadas: {monthSummary.hours}h</span>
              </div>
              <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-border)" }}>
                <div
                  style={{
                    height: "100%",
                    width: monthSummary.total ? `${Math.round((monthSummary.completed / monthSummary.total) * 100)}%` : "0%",
                    borderRadius: "999px",
                    background: "var(--color-accent-health)",
                  }}
                />
              </div>
              <div style={{ marginTop: "6px" }}>
                <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
                  Detalle del día
                </p>
                {selectedDay ? (
                  <div style={{ marginTop: "8px", display: "grid", gap: "8px" }}>
                    {dayDetails.length === 0 && (
                      <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>Sin tareas</p>
                    )}
                    {dayDetails.map((task) => (
                      <div key={task.id} style={{ padding: "8px", borderRadius: "10px", background: "var(--color-surface-alt)" }}>
                        <p style={{ margin: 0, fontSize: "12px", fontWeight: 600 }}>{task.title}</p>
                        <p style={{ margin: "4px 0 0", fontSize: "10px", color: "var(--color-text-secondary)" }}>{task.duration} min</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                    Selecciona un día para ver detalle.
                  </p>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      {formOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.35)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <Card className="p-6" hover>
            <form onSubmit={(e) => void handleCreateTask(e)} style={{ display: "grid", gap: "12px", minWidth: "420px" }}>
              {formSubmitError && (
                <p style={{ margin: 0, fontSize: "12px", color: "var(--color-accent-danger)" }}>{formSubmitError}</p>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
                    Nueva tarea
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600 }}>Creación y asignación</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--color-text-secondary)",
                    fontSize: "12px",
                  }}
                >
                  Cerrar
                </button>
              </div>

              <input
                placeholder="Título de la tarea"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)" }}
              />
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
                <input
                  placeholder="Asignado a (iniciales)"
                  value={form.assignee}
                  onChange={(event) => setForm((prev) => ({ ...prev, assignee: event.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)" }}
                />
                <input
                  type="date"
                  value={form.due}
                  onChange={(event) => setForm((prev) => ({ ...prev, due: event.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)" }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "10px" }}>
                <select
                  value={form.type}
                  onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)" }}
                >
                  <option value="recibida">Recibida</option>
                  <option value="asignada">Asignada</option>
                  <option value="personal">Personal</option>
                </select>
                <select
                  value={form.priority}
                  onChange={(event) => setForm((prev) => ({ ...prev, priority: event.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)" }}
                >
                  <option value="alta">Alta</option>
                  <option value="media">Media</option>
                  <option value="baja">Baja</option>
                </select>
                <select
                  value={form.status}
                  onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)" }}
                >
                  <option value="recibida">Recibida</option>
                  <option value="asignada">Asignada</option>
                  <option value="en progreso">En progreso</option>
                  <option value="completada">Completada</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
                <input
                  type="number"
                  min={5}
                  value={form.duration}
                  onChange={(event) => setForm((prev) => ({ ...prev, duration: Number(event.target.value) }))}
                  style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)" }}
                />
                <input
                  placeholder="Origen / destino"
                  value={form.source}
                  onChange={(event) => setForm((prev) => ({ ...prev, source: event.target.value }))}
                  style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)" }}
                />
              </div>
              <textarea
                placeholder="Notas o contexto"
                value={form.notes}
                onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))}
                style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)", minHeight: "90px" }}
              />
              <button
                type="submit"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "0.5px solid var(--color-border)",
                  background: "var(--color-accent-health)",
                  color: "white",
                  fontSize: "12px",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                Crear tarea
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}

