"use client"

import { Activity, ArrowDown, ArrowUp, Dumbbell, Flame, Target, Trophy, Utensils } from "lucide-react"
import { Bar, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useSaludContext } from "@/app/salud/_hooks/useSaludContext"

export default function TrainingOperationsV3() {
  const health = useSaludContext()

  if (health.loading) {
    return <div className="card">Cargando Training Operations...</div>
  }

  if (health.error) {
    return <div className="card text-sm text-red-500">{health.error}</div>
  }

  const isOverreaching = health.strain > health.scoreRecuperacion + 10

  return (
    <section className="space-y-6">
      <div className="card border border-[var(--border-soft)] bg-[var(--surface-card)]">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--accent-finance)] p-3 text-[var(--text-primary)]">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Training</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Training Operations
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Strain, volumen e hitos fisicos con referencia visual de la version adjunta.
            </p>
          </div>
        </div>
      </div>

      <div className="card border border-[var(--border-soft)]">
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Daily Capacity</p>
            <h3 className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">
              {isOverreaching ? "Overreaching State" : "Optimal Training Zone"}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
              {isOverreaching
                ? `El strain (${health.strain}) supera la recuperacion (${health.scoreRecuperacion}%). Hoy conviene descargar o bajar intensidad.`
                : `Recuperacion al ${health.scoreRecuperacion}%. Hay margen para sostener una carga fisica exigente sin comprometer el sistema.`}
            </p>
          </div>

          <div className="relative flex h-48 w-48 items-center justify-center self-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 192 192">
              <circle cx="96" cy="96" r="80" stroke="var(--border-soft)" strokeWidth="6" fill="none" />
              <circle cx="96" cy="96" r="60" stroke="var(--border-soft)" strokeWidth="6" fill="none" />
              <circle
                cx="96"
                cy="96"
                r="60"
                stroke="var(--accent-health-strong)"
                strokeWidth="6"
                fill="none"
                strokeDasharray={String(2 * Math.PI * 60)}
                strokeDashoffset={String((2 * Math.PI * 60) * (1 - health.scoreRecuperacion / 100))}
                strokeLinecap="round"
              />
              <circle
                cx="96"
                cy="96"
                r="80"
                stroke="var(--accent-finance-strong)"
                strokeWidth="6"
                fill="none"
                strokeDasharray={String(2 * Math.PI * 80)}
                strokeDashoffset={String((2 * Math.PI * 80) * (1 - health.strain / 100))}
                strokeLinecap="round"
              />
            </svg>

            <div className="text-center">
              <p className="text-3xl font-semibold leading-none text-[var(--accent-finance-strong)]">
                {health.strain}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-[var(--text-muted)]">Strain</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card border border-[var(--border-soft)]">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[var(--accent-finance-strong)]" />
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Volume & Intensity</p>
          </div>
          <div className="mt-5 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={health.weeklyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--text-muted)" style={{ fontSize: "11px" }} />
                <YAxis yAxisId="left" stroke="var(--text-muted)" style={{ fontSize: "11px" }} tickFormatter={(value: number) => `${Math.round(value / 1000)}k`} />
                <YAxis yAxisId="right" orientation="right" hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--surface-card)",
                    border: "1px solid var(--border-soft)",
                    borderRadius: "16px",
                  }}
                />
                <Bar yAxisId="left" dataKey="volume" fill="var(--accent-finance-strong)" radius={[4, 4, 0, 0]} barSize={24} />
                <Line yAxisId="right" type="monotone" dataKey="intensity" stroke="var(--text-primary)" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card border border-[var(--border-soft)]">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-[var(--accent-health-strong)]" />
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Strategic Milestones</p>
          </div>

          <div className="mt-5 space-y-4">
            {health.milestones.map((milestone) => {
              const progress = milestone.reverse
                ? Math.max(0, 100 - ((milestone.current - milestone.target) / milestone.target) * 100)
                : Math.min(100, (milestone.current / milestone.target) * 100)

              return (
                <div key={milestone.id} className="rounded-2xl bg-[var(--surface-muted)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{milestone.title}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[var(--text-muted)]">
                        {milestone.current} / {milestone.target} {milestone.unit}
                      </p>
                    </div>
                    <div className="h-8 w-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={milestone.history.map((value, index) => ({ value, index }))}>
                          <Line type="monotone" dataKey="value" stroke="var(--text-primary)" strokeWidth={1.5} dot={false} isAnimationActive={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-[var(--border-soft)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: progress >= 100 ? "var(--accent-health-strong)" : "var(--text-primary)",
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="card border border-[var(--border-soft)]">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-[var(--accent-agenda-strong)]" />
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Body Tracking</p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {health.bodyMetrics.map((metric) => {
              const TrendIcon = metric.trend === "up" ? ArrowUp : ArrowDown

              return (
                <div key={metric.label} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{metric.label}</p>
                    <TrendIcon className="h-4 w-4 text-[var(--accent-agenda-strong)]" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
                    {metric.current}
                    <span className="ml-1 text-sm font-medium text-[var(--text-muted)]">{metric.unit}</span>
                  </p>
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Objetivo {metric.target} {metric.unit}
                  </p>
                  <div className="mt-4 h-1.5 rounded-full bg-[var(--border-soft)]">
                    <div className="h-full rounded-full bg-[var(--accent-agenda-strong)]" style={{ width: `${metric.progress}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card border border-[var(--border-soft)]">
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-[var(--accent-warning)]" />
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Weekly Meal Plan</p>
          </div>
          <div className="mt-5 space-y-3">
            {health.weeklyMealPlan.map((day) => (
              <div key={day.day} className="rounded-2xl bg-[var(--surface-muted)] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{day.day}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{day.cals} kcal</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    <Flame className="h-3.5 w-3.5 text-[var(--accent-warning)]" />
                    fuel
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-[var(--text-muted)]">P</p>
                    <p className="font-semibold text-[var(--text-primary)]">{day.protein} g</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">C</p>
                    <p className="font-semibold text-[var(--text-primary)]">{day.carbs} g</p>
                  </div>
                  <div>
                    <p className="text-[var(--text-muted)]">F</p>
                    <p className="font-semibold text-[var(--text-primary)]">{day.fats} g</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
