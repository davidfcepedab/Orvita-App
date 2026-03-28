"use client"

import { useMemo, useState, type FormEvent } from "react"
import { Card } from "@/src/components/ui/Card"
import { Activity, Check, CheckCircle2, Circle, Flame, Loader2, Plus, TrendingDown } from "lucide-react"
import { lettersToWeekdays, weekdaysToLetters } from "@/lib/habits/habitMetrics"
import { useHabits } from "@/app/hooks/useHabits"
import type { HabitWeekDayMark } from "@/lib/habits/habitMetrics"
import type { HabitWithMetrics, OperationalDomain } from "@/lib/operational/types"

const days = ["L", "M", "X", "J", "V", "S", "D"]

const DOMAIN_LABELS: Record<OperationalDomain, string> = {
  salud: "Salud",
  fisico: "Energía",
  profesional: "Capital",
  agenda: "Agenda",
}

function weekMarksForHabit(habit: HabitWithMetrics): HabitWeekDayMark[] {
  const w = habit.metrics.week_marks
  if (Array.isArray(w) && w.length === 7) return w
  return days.map(() => "off" as HabitWeekDayMark)
}

function rewardMessage(days: number) {
  if (days >= 120) return "Hito 120 días: consistencia de élite"
  if (days >= 90) return "Hito 90 días: sistema consolidado"
  if (days >= 60) return "Hito 60 días: constancia estratégica"
  if (days >= 45) return "Hito 45 días: momentum estable"
  if (days >= 30) return "Hito 30 días: disciplina consolidada"
  if (days >= 15) return "Hito 15 días: progreso consistente"
  if (days >= 7) return "Hito 7 días: primer bloque completado"
  return null
}

// ← V3 RECONSTRUIDO: fiel a captura + navegación preservada
export default function HabitosPage() {
  const {
    habits,
    summary,
    loading,
    error,
    togglingId,
    persistenceEnabled,
    mock,
    toggleCompleteToday,
    createHabit,
    updateHabit,
  } = useHabits()

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<HabitWithMetrics | null>(null)
  const [form, setForm] = useState({
    name: "",
    domainKey: "salud" as OperationalDomain,
    frequency: "diario" as "diario" | "semanal",
    days: ["L", "M", "X", "J", "V"] as string[],
    superhabit: false,
  })

  const superhabitCount = useMemo(
    () => habits.filter((h) => h.metadata?.is_superhabit).length,
    [habits]
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) return
    if (form.superhabit && !editing && superhabitCount >= 2) return

    if (!persistenceEnabled && !mock) {
      alert("Activa NEXT_PUBLIC_SUPABASE_ENABLED=true para crear o editar hábitos.")
      return
    }

    const metadata = {
      frequency: form.frequency,
      weekdays: lettersToWeekdays(form.days),
      display_days: form.days,
      is_superhabit: form.superhabit,
    }

    if (editing) {
      const r = await updateHabit(editing.id, {
        name: form.name.trim(),
        domain: form.domainKey,
        metadata,
      })
      if (!r.ok) {
        alert(r.error || "No se pudo guardar")
        return
      }
    } else {
      const r = await createHabit({
        name: form.name.trim(),
        domain: form.domainKey,
        metadata,
      })
      if (!r.ok) {
        alert(r.error || "No se pudo crear")
        return
      }
    }

    setFormOpen(false)
    setEditing(null)
    setForm({
      name: "",
      domainKey: "salud",
      frequency: "diario",
      days: ["L", "M", "X", "J", "V"],
      superhabit: false,
    })
  }

  const greeting = (() => {
    const hour = new Date().getHours()
    if (hour < 12) return "Buenos días"
    if (hour < 18) return "Buenas tardes"
    return "Buenas noches"
  })()

  return (
    <div style={{ display: "grid", gap: "var(--spacing-lg)" }}>
      {!persistenceEnabled && !mock && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: "12px",
            border: "0.5px solid var(--color-border)",
            background: "color-mix(in srgb, var(--color-accent-danger) 8%, var(--color-surface))",
            fontSize: "13px",
            color: "var(--color-text-primary)",
          }}
        >
          Mutaciones desactivadas: define <code style={{ fontSize: "12px" }}>NEXT_PUBLIC_SUPABASE_ENABLED=true</code>{" "}
          y reconstruye la app para crear hábitos o marcar &quot;Hecho hoy&quot; en base real.
        </p>
      )}

      {error && (
        <p
          role="alert"
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: "12px",
            border: "0.5px solid var(--color-border)",
            background: "var(--color-surface-alt)",
            fontSize: "13px",
            color: "var(--color-text-secondary)",
          }}
        >
          {error}
        </p>
      )}

      {loading && (
        <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary)" }}>Cargando hábitos…</p>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "var(--spacing-lg)" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "28px", fontWeight: 500 }}>Sistema de Hábitos</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
            Consistencia, tendencias y riesgo de ruptura
          </p>
          <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>
            {greeting}. Tu mayor racha actual en el stack es de {summary.current_streak_max} días.
          </p>
        </div>
        <button
          type="button"
          disabled={!persistenceEnabled && !mock}
          onClick={() => {
            setFormOpen(true)
            setEditing(null)
            setForm({
              name: "",
              domainKey: "salud",
              frequency: "diario",
              days: ["L", "M", "X", "J", "V"],
              superhabit: false,
            })
          }}
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
            opacity: !persistenceEnabled && !mock ? 0.5 : 1,
            cursor: !persistenceEnabled && !mock ? "not-allowed" : "pointer",
          }}
        >
          <Plus size={14} />
          Nuevo Hábito
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: "var(--layout-gap)" }}>
        <Card hover>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Activity size={12} />
              Consistencia 30D
            </p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: 600 }}>{summary.consistency_30d}%</p>
          </div>
        </Card>
        <Card hover>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <Flame size={12} />
              Mejor Streak
            </p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: 600 }}>{summary.best_streak}</p>
          </div>
        </Card>
        <Card hover>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "6px" }}>
            <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <TrendingDown size={12} />
              En riesgo hoy
            </p>
            <p style={{ margin: 0, fontSize: "28px", fontWeight: 600 }}>{summary.at_risk}</p>
          </div>
        </Card>
      </div>

      <div style={{ display: "grid", gap: "var(--spacing-sm)" }}>
        <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.14em", color: "var(--color-text-secondary)" }}>
          Stack actual
        </p>

        {habits.map((habit) => {
          const freq = habit.metadata?.frequency ?? "diario"
          const displayDays =
            habit.metadata?.display_days?.length ? habit.metadata.display_days : weekdaysToLetters(habit.metadata?.weekdays ?? [])
          const streakDays = habit.metrics.current_streak
          const doneToday = habit.metrics.completed_today
          const reward = habit.metadata?.is_superhabit ? rewardMessage(streakDays) : null
          const weekMarks = weekMarksForHabit(habit)

          return (
            <Card
              key={habit.id}
              hover
              style={{
                background: habit.metadata?.is_superhabit ? "color-mix(in srgb, var(--color-accent-warning) 8%, var(--color-surface))" : "var(--color-surface)",
                borderColor: habit.metrics.at_risk
                  ? "color-mix(in srgb, var(--color-accent-danger) 40%, var(--color-border))"
                  : habit.metadata?.is_superhabit
                    ? "color-mix(in srgb, var(--color-accent-warning) 30%, var(--color-border))"
                    : "var(--color-border)",
                borderWidth: "1px",
                borderStyle: "solid",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.07)",
              }}
            >
              <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-stretch">
                {/* Columna 1: título, badges, meta, reward */}
                <div className="min-w-0 flex-1 space-y-2 px-4 pb-4 pt-4 sm:px-5 sm:py-5 sm:pr-4">
                  {habit.metadata?.is_superhabit && (
                    <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", padding: "2px 8px", borderRadius: "999px", background: "color-mix(in srgb, var(--color-accent-warning) 12%, transparent)", color: "var(--color-accent-warning)" }}>
                      Superhabit
                    </span>
                  )}
                  <div className="flex flex-wrap items-center gap-2">
                    <p style={{ margin: 0, fontWeight: 600, fontSize: "15px", color: "var(--color-text-primary)" }}>{habit.name}</p>
                    {habit.metrics.at_risk && (
                      <span style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.12em", padding: "2px 8px", borderRadius: "999px", background: "color-mix(in srgb, var(--color-accent-danger) 12%, transparent)", color: "var(--color-accent-danger)" }}>
                        Riesgo ruptura
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", fontSize: "11px", color: "var(--color-text-secondary)" }}>
                    <span>{DOMAIN_LABELS[habit.domain] ?? habit.domain}</span>
                    <span>• {freq}</span>
                    <span>• {streakDays} días continuos</span>
                    {freq === "semanal" && (
                      <span style={{ padding: "2px 6px", borderRadius: "999px", background: "var(--color-surface-alt)" }}>
                        Frecuencia específica
                      </span>
                    )}
                  </div>
                  {reward && (
                    <p style={{ margin: 0, fontSize: "11px", color: "var(--color-accent-health)" }}>{reward}</p>
                  )}
                </div>

                <div className="hidden w-px shrink-0 self-stretch bg-[var(--color-border)] sm:mx-3 sm:block" aria-hidden />

                {/* Separador móvil entre bloque texto y semana */}
                <div className="mx-4 h-px shrink-0 bg-[var(--color-border)] sm:hidden" aria-hidden />

                <div
                  className="flex w-full max-w-full touch-manipulation items-stretch justify-center gap-1 px-4 pb-4 sm:w-auto sm:max-w-none sm:justify-start sm:gap-1.5 sm:px-3 sm:py-5"
                  role="list"
                  aria-label="Estado de la semana"
                >
                  {days.map((day, idx) => {
                    const mark = weekMarks[idx]
                    const neutralDay = mark === "off" || mark === "upcoming"
                    const letterMuted =
                      neutralDay
                        ? "color-mix(in srgb, var(--color-text-secondary) 45%, transparent)"
                        : "var(--color-text-secondary)"
                    const letterStrong = "var(--color-text-primary)"

                    return (
                      <div
                        key={`${habit.id}-${day}`}
                        role="listitem"
                        className="flex min-h-[48px] min-w-0 flex-1 max-w-[44px] flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1 sm:min-h-[52px] sm:max-w-[48px] sm:flex-none sm:px-1"
                        style={{
                          background: "transparent",
                          border: "none",
                        }}
                      >
                        <span
                          className="select-none text-[10px] font-semibold leading-none sm:text-[11px]"
                          style={{
                            color: neutralDay ? letterMuted : displayDays.includes(day) ? letterStrong : letterMuted,
                          }}
                          aria-hidden
                        >
                          {day}
                        </span>
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9"
                          style={
                            mark === "done"
                              ? {
                                  background: "var(--color-accent-health)",
                                  boxShadow: "0 1px 2px color-mix(in srgb, var(--color-accent-health) 35%, transparent)",
                                }
                              : mark === "missed"
                                ? {
                                    background: "color-mix(in srgb, var(--color-text-secondary) 6%, transparent)",
                                    border: "1px solid color-mix(in srgb, var(--color-border) 85%, transparent)",
                                  }
                                : {
                                    background: "transparent",
                                    border: "1px solid color-mix(in srgb, var(--color-border) 35%, transparent)",
                                  }
                          }
                          aria-label={
                            mark === "done"
                              ? `${day}: completado`
                              : mark === "missed"
                                ? `${day}: pendiente`
                                : `${day}: sin marca destacada`
                          }
                        >
                          {mark === "done" ? (
                            <Check className="h-4 w-4 text-white" strokeWidth={2.75} aria-hidden />
                          ) : null}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Separador móvil entre semana y acciones */}
                <div className="mx-4 h-px shrink-0 bg-[var(--color-border)] sm:hidden" aria-hidden />

                <div
                  className="hidden shrink-0 self-stretch sm:block"
                  aria-hidden
                  style={{ width: "1px", background: "var(--color-border)", margin: "0 0 0 12px" }}
                />

                {/* Columna 3: hecho hoy + editar (siempre visibles, icono a la derecha como referencia) */}
                <div className="flex flex-row items-center justify-end gap-3 px-4 pb-4 sm:w-auto sm:flex-col sm:items-stretch sm:justify-between sm:gap-3 sm:px-4 sm:py-5 sm:pl-2 sm:pr-5">
                  <button
                    type="button"
                    disabled={!persistenceEnabled && !mock}
                    onClick={() => {
                      setEditing(habit)
                      setForm({
                        name: habit.name,
                        domainKey: habit.domain,
                        frequency: habit.metadata?.frequency ?? "diario",
                        days:
                          habit.metadata?.display_days?.length ? [...habit.metadata.display_days] : weekdaysToLetters(habit.metadata?.weekdays ?? []),
                        superhabit: Boolean(habit.metadata?.is_superhabit),
                      })
                      setFormOpen(true)
                    }}
                    className="min-h-[40px] min-w-[56px] rounded-lg text-xs font-medium sm:min-h-0 sm:w-full sm:py-1"
                    style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: "11px" }}
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={(!persistenceEnabled && !mock) || loading || togglingId === habit.id}
                    aria-label={doneToday ? "Deshacer completado de hoy" : "Marcar hecho hoy"}
                    title={doneToday ? "Deshacer hoy" : "Hecho hoy"}
                    onClick={async () => {
                      const r = await toggleCompleteToday(habit.id)
                      if (!r.ok) alert(r.error || "No se pudo actualizar")
                    }}
                    className="h-[52px] w-[52px] shrink-0 self-stretch transition-[transform,opacity] active:scale-[0.98] sm:h-14 sm:w-14 sm:min-h-[56px] sm:min-w-[56px] sm:flex-1"
                    style={{
                      border: "0.5px solid var(--color-border)",
                      borderRadius: "14px",
                      background: doneToday
                        ? "color-mix(in srgb, var(--color-accent-health) 11%, var(--color-surface))"
                        : "color-mix(in srgb, var(--color-text-secondary) 5%, var(--color-surface))",
                      cursor: (!persistenceEnabled && !mock) || togglingId === habit.id ? "not-allowed" : "pointer",
                      opacity: (!persistenceEnabled && !mock) ? 0.45 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {togglingId === habit.id ? (
                      <Loader2 className="h-7 w-7 animate-spin text-[var(--color-accent-health)]" strokeWidth={2} aria-hidden />
                    ) : doneToday ? (
                      <CheckCircle2 className="h-7 w-7 text-[var(--color-accent-health)]" strokeWidth={1.75} aria-hidden />
                    ) : (
                      <Circle className="h-7 w-7 text-[var(--color-text-secondary)]" strokeWidth={1.75} aria-hidden />
                    )}
                  </button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

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
            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "12px", minWidth: "420px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: 0, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
                    {editing ? "Editar hábito" : "Nuevo hábito"}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: "14px", fontWeight: 600 }}>
                    Configuración y frecuencia
                  </p>
                </div>
                <button type="button" onClick={() => setFormOpen(false)} style={{ border: "none", background: "transparent", color: "var(--color-text-secondary)", fontSize: "12px" }}>
                  Cerrar
                </button>
              </div>

              <input
                placeholder="Nombre del hábito"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)" }}
              />
              <select
                value={form.domainKey}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, domainKey: event.target.value as OperationalDomain }))
                }
                style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)" }}
              >
                {(Object.keys(DOMAIN_LABELS) as OperationalDomain[]).map((key) => (
                  <option key={key} value={key}>
                    {DOMAIN_LABELS[key]}
                  </option>
                ))}
              </select>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "10px" }}>
                <select
                  value={form.frequency}
                  onChange={(event) => setForm((prev) => ({ ...prev, frequency: event.target.value as "diario" | "semanal" }))}
                  style={{ padding: "10px 12px", borderRadius: "10px", border: "0.5px solid var(--color-border)" }}
                >
                  <option value="diario">Diario</option>
                  <option value="semanal">Semanal</option>
                </select>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px" }}>
                  <input
                    type="checkbox"
                    checked={form.superhabit}
                    onChange={(event) => setForm((prev) => ({ ...prev, superhabit: event.target.checked }))}
                    disabled={!editing && superhabitCount >= 2 && !form.superhabit}
                  />
                  Superhabit (máx 2)
                </label>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {days.map((day) => (
                  <button
                    type="button"
                    key={day}
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        days: prev.days.includes(day)
                          ? prev.days.filter((d) => d !== day)
                          : [...prev.days, day],
                      }))
                    }
                    style={{
                      padding: "6px 10px",
                      borderRadius: "999px",
                      border: "0.5px solid var(--color-border)",
                      background: form.days.includes(day) ? "var(--color-surface)" : "var(--color-surface-alt)",
                      fontSize: "11px",
                    }}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={!persistenceEnabled && !mock}
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
                  opacity: !persistenceEnabled && !mock ? 0.5 : 1,
                }}
              >
                {editing ? "Guardar cambios" : "Crear hábito"}
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  )
}


