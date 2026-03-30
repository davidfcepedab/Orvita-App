"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { Card } from "@/src/components/ui/Card"
import { CalendarDays, CalendarRange, LayoutGrid, ListChecks, Plus, Search, UserPlus } from "lucide-react"
import { GoogleAgendaPanel } from "@/app/agenda/GoogleAgendaPanel"
import { AgendaGoogleCalendarLive } from "@/app/agenda/AgendaGoogleCalendarLive"
import { AgendaRemindersSection } from "@/app/agenda/AgendaRemindersSection"
import { AgendaColorLegend } from "@/app/agenda/AgendaColorLegend"
import { useAgendaTasks } from "@/app/hooks/useAgendaTasks"
import { mapAgendaTaskToUi, priorityFormToApi } from "@/app/agenda/mapAgendaTaskToUi"
import {
  AgendaSharedKanban,
  AgendaSharedList,
  AgendaSharedMonth,
  AgendaSharedWeek,
} from "@/app/agenda/AgendaSharedViews"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"

function todayDateInputValue() {
  return new Date().toISOString().slice(0, 10)
}

const tabs = [
  { key: "todas", label: "Todas" },
  { key: "recibida", label: "Recibidas" },
  { key: "asignada", label: "Asignadas" },
  { key: "personal", label: "Personales" },
]

const priorities = ["alta", "media", "baja"] as const

type Priority = typeof priorities[number]

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

/** Una sola vista principal a la vez (kanban = columnas por tipo). */
type AgendaMainView = "columns" | "list" | "week" | "month"

const viewOptions: {
  key: AgendaMainView
  label: string
  description: string
  icon: typeof LayoutGrid
  color: string
}[] = [
  {
    key: "columns",
    label: "Columnas",
    description: "Flujo por tipo",
    icon: LayoutGrid,
    color: "var(--color-accent-finance)",
  },
  {
    key: "list",
    label: "Lista",
    description: "Detalle en filas",
    icon: ListChecks,
    color: "var(--color-accent-health)",
  },
  {
    key: "week",
    label: "Semana",
    description: "7 días",
    icon: CalendarDays,
    color: "var(--color-accent-warning)",
  },
  {
    key: "month",
    label: "Mes",
    description: "Calendario mensual",
    icon: CalendarRange,
    color: "var(--color-accent-primary)",
  },
]

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
  const [view, setView] = useState<AgendaMainView>("list")
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
    filtered.forEach((task) => {
      if (task.due && map[task.due]) map[task.due].push(task)
    })
    return { weekDays: days, weekMap: map }
  }, [filtered])

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
  const monthLabel = useMemo(() => {
    const raw = new Date().toLocaleDateString("es-CO", { month: "long", year: "numeric" })
    return raw.charAt(0).toUpperCase() + raw.slice(1)
  }, [])
  const monthSummary = useMemo(() => {
    const total = filtered.length
    const completed = filtered.filter((t) => t.status === "completada").length
    const hours = Math.round(filtered.reduce((acc, t) => acc + t.duration, 0) / 60)
    return { total, completed, hours }
  }, [filtered])

  const dayDetails = selectedDay ? filtered.filter((t) => t.due === selectedDay) : []

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

  const toggleTaskComplete = (taskId: string, completed: boolean) => {
    void updateTask(taskId, { status: completed ? "completed" : "pending" })
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-8">
      {/* —— Cabecera: título, acciones —— */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-lg)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 500 }}>Tareas Compartidas</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
            Elige Columnas, Lista, Semana o Mes: la vista activa, el calendario en vivo y los recordatorios comparten el mismo panel
            (filtros y búsqueda aplican a las tareas compartidas).
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
              background: "var(--agenda-assigned)",
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

      <AgendaColorLegend />

      {/* —— Google Tasks & sync (sin cambiar comportamiento) —— */}
      <GoogleAgendaPanel
        livePullKey={googleLivePullKey}
        onAfterTasksSync={() => void refresh()}
      />
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

      {/* —— Sticky: selector de vista + filtros —— */}
      <div
        className="sticky z-10 pb-2"
        style={{
          top: "84px",
          background: "var(--color-background)",
        }}
      >
        <div className="flex flex-col gap-3">
          <div
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
            style={{ borderWidth: "0.5px" }}
          >
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {viewOptions.map((item) => {
                const Icon = item.icon
                const active = view === item.key
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setView(item.key)}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-[box-shadow,background-color,border-color] duration-150"
                    style={{
                      border: active ? `2px solid ${item.color}` : "1px solid var(--color-border)",
                      background: active ? `color-mix(in srgb, ${item.color} 14%, var(--color-surface))` : "var(--color-surface-alt)",
                      boxShadow: active ? "0 10px 22px rgba(15, 23, 42, 0.1)" : "none",
                    }}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]"
                      style={{
                        background: active ? `color-mix(in srgb, ${item.color} 22%, transparent)` : "var(--color-surface)",
                        color: item.color,
                      }}
                    >
                      <Icon size={18} strokeWidth={2} />
                    </span>
                    <div className="min-w-0">
                      <p
                        className="m-0 text-[13px] font-semibold leading-tight"
                        style={{ color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}
                      >
                        {item.label}
                      </p>
                      <p className="m-0 mt-0.5 text-[11px] leading-snug text-[var(--color-text-secondary)]">{item.description}</p>
                    </div>
                  </button>
                )
              })}
            </div>
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

      {/* —— Post-filtros: una sola card (Figma) — vista + Calendar + Recordatorios —— */}
      <section aria-label="Panel integrado de agenda" className="mt-6">
        <div
          className="unified-agenda-container flex flex-col rounded-3xl border bg-white p-6 shadow-sm lg:p-8"
          style={{ borderColor: "var(--color-border)" }}
        >
          {/* Vista principal — ocupa la mayor parte del espacio (flex-1 requiere flex flex-col en la card) */}
          <div className="flex-1 min-h-[min(420px,55dvh)]">
            {view === "columns" && <AgendaSharedKanban grouped={grouped} />}
            {view === "list" && (
              <AgendaSharedList
                filtered={filtered}
                onToggleComplete={(task, completed) => toggleTaskComplete(task.id, completed)}
              />
            )}
            {view === "week" && (
              <AgendaSharedWeek
                weekDays={weekDays}
                weekMap={weekMap}
                totalWeeklyTasks={totalWeeklyTasks}
                totalWeeklyCompleted={totalWeeklyCompleted}
                totalWeeklyPending={totalWeeklyPending}
                totalWeeklyMinutes={totalWeeklyMinutes}
                formatDateKey={formatDateKey}
                formatDayLabel={formatDayLabel}
              />
            )}
            {view === "month" && (
              <AgendaSharedMonth
                monthGrid={monthGrid}
                monthLabel={monthLabel}
                monthSummary={monthSummary}
                tasks={filtered}
                selectedDay={selectedDay}
                onSelectDay={setSelectedDay}
                dayDetails={dayDetails}
                formatDateKey={formatDateKey}
              />
            )}
          </div>

          {/* Google Calendar — separación suave dentro del mismo contenedor */}
          <div className="mt-10 border-t border-neutral-100 pt-8">
            <div className="border-l-4 pl-4" style={{ borderLeftColor: "#8B5CF6" }}>
              <h3 className="mb-1 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Google Calendar en vivo (próximos 14 días)
              </h3>
              <p className="mb-3 text-xs leading-snug text-[var(--color-text-secondary)]">
                Eventos conectados a tu cuenta; sincroniza desde el panel GOOGLE TASKS & SYNC.
              </p>
              <AgendaGoogleCalendarLive livePullKey={googleLivePullKey} embedded />
            </div>
          </div>

          {/* Recordatorios — separación suave dentro del mismo contenedor */}
          <div className="mt-8 border-t border-neutral-100 pt-8">
            <div className="border-l-4 pl-4" style={{ borderLeftColor: "#FBBC04" }}>
              <h3 className="mb-1 text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>
                Recordatorios
              </h3>
              <p className="mb-3 text-xs leading-snug text-[var(--color-text-secondary)]">
                Vencimientos en los próximos 14 días (Google Tasks, tono ámbar en la leyenda).
              </p>
              <AgendaRemindersSection livePullKey={googleLivePullKey} embedded />
            </div>
          </div>
        </div>
      </section>

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

