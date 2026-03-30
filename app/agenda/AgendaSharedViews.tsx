"use client"

import { Card } from "@/src/components/ui/Card"
import type { UiAgendaTask } from "@/app/agenda/mapAgendaTaskToUi"
import { TaskSourceBadge } from "@/app/agenda/TaskSourceBadge"
import { taskChipStyle, taskLeftBorder, taskTypeAccentVar } from "@/app/agenda/taskTypeVisual"

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

function monthDayTypeMarkers(dayTasks: UiAgendaTask[]) {
  const order: UiAgendaTask["type"][] = ["recibida", "asignada", "personal"]
  const seen = new Set<UiAgendaTask["type"]>()
  dayTasks.forEach((t) => seen.add(t.type))
  return order.filter((k) => seen.has(k))
}

export type GroupedTasks = {
  recibida: UiAgendaTask[]
  asignada: UiAgendaTask[]
  personal: UiAgendaTask[]
}

export function AgendaSharedKanban({ grouped }: { grouped: GroupedTasks }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
      {[
        { label: "Tareas recibidas", items: grouped.recibida, accent: "var(--agenda-received)" },
        { label: "Asignadas por mí", items: grouped.asignada, accent: "var(--agenda-assigned)" },
        { label: "Tareas personales", items: grouped.personal, accent: "var(--agenda-personal)" },
      ].map((column) => (
        <div key={column.label} style={{ display: "grid", gap: "var(--spacing-sm)" }}>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              color: "var(--color-text-secondary)",
              borderLeft: `3px solid ${column.accent}`,
              paddingLeft: "10px",
            }}
          >
            {column.label}
          </p>
          {column.items.map((task) => (
            <Card key={task.id} hover className="p-4" style={{ borderLeft: taskLeftBorder(task.type) }}>
              <div style={{ display: "grid", gap: "6px" }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 500 }}>{task.title}</p>
                <div style={{ display: "flex", gap: "8px", fontSize: "11px", color: "var(--color-text-secondary)" }}>
                  <span>{task.duration} min</span>
                  <span>{task.due}</span>
                </div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      ...taskChipStyle(task.type),
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
                      background: "color-mix(in srgb, var(--color-accent-danger) 12%, transparent)",
                      color: "var(--color-accent-danger)",
                    }}
                  >
                    {task.priority}
                  </span>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "999px",
                      fontSize: "10px",
                      textTransform: "uppercase",
                      letterSpacing: "0.12em",
                      background: "color-mix(in srgb, var(--agenda-assigned) 14%, transparent)",
                      color: "var(--agenda-assigned)",
                    }}
                  >
                    {task.status}
                  </span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ))}
    </div>
  )
}

export function AgendaSharedList({
  filtered,
  onToggleComplete,
}: {
  filtered: UiAgendaTask[]
  onToggleComplete: (task: UiAgendaTask, completed: boolean) => void
}) {
  const accent = (type: UiAgendaTask["type"]) => taskTypeAccentVar(type)

  return (
    <div className="grid gap-3 sm:gap-4">
      {filtered.map((task) => (
        <Card
          key={task.id}
          hover
          className="p-0 overflow-hidden"
          style={{
            borderLeft: taskLeftBorder(task.type, 4),
            borderRadius: "16px",
            boxShadow: "0 1px 3px rgba(15, 23, 42, 0.06)",
          }}
        >
          <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex min-w-0 flex-1 gap-3">
              <button
                type="button"
                onClick={() => onToggleComplete(task, !task.completed)}
                className="mt-0.5 flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] text-[11px] text-white transition-colors"
                style={{
                  background: task.completed ? "var(--agenda-assigned)" : "var(--color-surface-alt)",
                  color: task.completed ? "white" : "transparent",
                }}
                aria-label={task.completed ? "Marcar pendiente" : "Marcar completada"}
              >
                {task.completed ? "✓" : ""}
              </button>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[15px] font-semibold leading-snug tracking-tight text-[var(--color-text-primary)]">{task.title}</p>
                <p className="m-0 mt-1.5 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">{task.assigneeLine}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[var(--color-text-secondary)]">
                  <span>{task.duration} min</span>
                  <span>{humanizeDueDate(task.due)}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <TaskSourceBadge type={task.type} />
                  <span
                    className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                    style={taskChipStyle(task.type)}
                  >
                    {task.type}
                  </span>
                  <span
                    className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                    style={{
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
                  <span
                    className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]"
                    style={{
                      background: "color-mix(in srgb, var(--agenda-assigned) 12%, transparent)",
                      color: "var(--agenda-assigned)",
                    }}
                  >
                    {task.status}
                  </span>
                </div>
              </div>
            </div>
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center self-end rounded-full text-[12px] font-bold text-white sm:self-start"
              style={{
                background: `color-mix(in srgb, ${accent(task.type)} 88%, #0f172a)`,
                boxShadow: `0 0 0 2px color-mix(in srgb, ${accent(task.type)} 25%, transparent)`,
              }}
              aria-hidden
            >
              {task.owner}
            </div>
          </div>
        </Card>
      ))}
      {filtered.length === 0 && (
        <p className="m-0 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)] px-4 py-8 text-center text-[13px] text-[var(--color-text-secondary)]">
          No hay tareas con los filtros actuales.
        </p>
      )}
    </div>
  )
}

export function AgendaSharedWeek({
  weekDays,
  weekMap,
  totalWeeklyTasks,
  totalWeeklyCompleted,
  totalWeeklyPending,
  totalWeeklyMinutes,
  formatDateKey,
  formatDayLabel,
}: {
  weekDays: Date[]
  weekMap: Record<string, UiAgendaTask[]>
  totalWeeklyTasks: number
  totalWeeklyCompleted: number
  totalWeeklyPending: number
  totalWeeklyMinutes: number
  formatDateKey: (d: Date) => string
  formatDayLabel: (d: Date) => string
}) {
  return (
    <div style={{ display: "grid", gap: "var(--spacing-md)" }}>
      <Card className="p-4">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
              Semana operativa
            </p>
            <p style={{ margin: "6px 0 0", fontSize: "14px" }}>Carga semanal de tareas operativas</p>
          </div>
          <div style={{ display: "flex", gap: "12px", fontSize: "12px", color: "var(--color-text-secondary)", flexWrap: "wrap" }}>
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
                borderColor: isToday ? "color-mix(in srgb, var(--agenda-personal) 45%, var(--color-border))" : "var(--color-border)",
                background: isToday ? "color-mix(in srgb, var(--agenda-personal) 8%, var(--color-surface))" : "var(--color-surface)",
              }}
            >
              <div style={{ display: "grid", gap: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "grid", gap: "2px" }}>
                    <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                      {formatDayLabel(day)}
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--color-text-secondary)" }}>{dayTasks.length} tareas</span>
                  </div>
                  {isToday && (
                    <span style={{ fontSize: "10px", color: "var(--agenda-personal)", textTransform: "uppercase", fontWeight: 600 }}>Hoy</span>
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
                        borderLeft: taskLeftBorder(task.type),
                      }}
                    >
                      <p style={{ margin: 0, fontSize: "11px", fontWeight: 600 }}>{task.title}</p>
                      <p style={{ margin: "4px 0 0", fontSize: "10px", color: "var(--color-text-secondary)" }}>{task.duration} min</p>
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
  )
}

export function AgendaSharedMonth({
  monthGrid,
  monthLabel,
  monthSummary,
  tasks,
  selectedDay,
  onSelectDay,
  dayDetails,
  formatDateKey,
}: {
  monthGrid: { date: Date | null; key: string }[]
  monthLabel: string
  monthSummary: { total: number; completed: number; hours: number }
  tasks: UiAgendaTask[]
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
  dayDetails: UiAgendaTask[]
  formatDateKey: (d: Date) => string
}) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: "var(--layout-gap)" }}>
      <Card className="p-4">
        <div style={{ display: "grid", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
                {monthLabel}
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
              const tasksForDay = day != null ? tasks.filter((t) => t.due === formatDateKey(day)) : []
              const isSelected = day != null && selectedDay === formatDateKey(day)
              const markers = monthDayTypeMarkers(tasksForDay)
              return (
                <button
                  key={cell.key}
                  type="button"
                  onClick={() => {
                    if (day != null) onSelectDay(formatDateKey(day))
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
                      <span style={{ fontSize: "10px", color: "var(--color-text-secondary)" }}>{tasksForDay.length}</span>
                    )}
                  </div>
                  {markers.length > 0 && (
                    <div style={{ marginTop: "6px", display: "flex", gap: "3px", flexWrap: "wrap" }}>
                      {markers.map((tp) => (
                        <span
                          key={tp}
                          title={tp}
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "999px",
                            background: taskTypeAccentVar(tp),
                          }}
                        />
                      ))}
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
                background: "var(--agenda-assigned)",
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
                  <div
                    key={task.id}
                    style={{
                      padding: "8px",
                      borderRadius: "10px",
                      background: "var(--color-surface-alt)",
                      borderLeft: taskLeftBorder(task.type),
                    }}
                  >
                    <p style={{ margin: 0, fontSize: "12px", fontWeight: 600 }}>{task.title}</p>
                    <p style={{ margin: "4px 0 0", fontSize: "10px", color: "var(--color-text-secondary)" }}>{task.duration} min</p>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>Selecciona un día para ver detalle.</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
