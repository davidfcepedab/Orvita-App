"use client"

import { useState } from "react"
import { Activity, ArrowDown, ArrowUp, Dumbbell, Flame, Target, Trophy, Utensils } from "lucide-react"
import { Bar, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludContextSnapshot } from "@/app/salud/_hooks/useSaludContext"
import { saludHexToRgba, saludPanelStyle } from "@/lib/salud/saludThemeStyles"

type Props = {
  salud: SaludContextSnapshot
}

export default function TrainingOperationsV3({ salud: health }: Props) {
  const theme = useOrbitaSkin()
  const [showAllBody, setShowAllBody] = useState(false)
  const [showAllMeals, setShowAllMeals] = useState(false)
  const [showAllMilestones, setShowAllMilestones] = useState(false)

  if (health.loading) return null
  if (health.error) return null

  const isOverreaching = health.strain > health.scoreRecuperacion + 10
  const gridStroke = saludHexToRgba(theme.border, 0.85)
  const chartTooltip = {
    backgroundColor: saludHexToRgba(theme.surface, 0.96),
    border: `1px solid ${theme.border}`,
    borderRadius: "16px",
    color: theme.text,
  }
  const ringTrack = saludHexToRgba(theme.border, 0.55)

  return (
    <section className="space-y-8" style={{ color: theme.text }}>
      <div className="rounded-[26px] border p-6 backdrop-blur-2xl" style={saludPanelStyle(theme, 0.82)}>
        <div className="flex items-center gap-3">
          <div
            className="rounded-3xl p-3 ring-1"
            style={{
              backgroundColor: saludHexToRgba(theme.accent.agenda, 0.14),
              color: theme.accent.agenda,
              boxShadow: `0 0 0 1px ${saludHexToRgba(theme.accent.agenda, 0.28)}`,
            }}
          >
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
              Entrenamiento
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Ritmo, volumen y metas</h2>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: theme.textMuted }}>
              Señales de entreno para decidir carga semanal. Donde no hay integración activa, mostramos referencia base.
            </p>
            <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>
              Fuente actual: indicadores de referencia (seed) + tu check-in.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-[26px] border p-6 backdrop-blur-2xl" style={saludPanelStyle(theme, 0.82)}>
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
              Capacidad del día
            </p>
            <h3 className="mt-3 text-2xl font-semibold">
              {isOverreaching ? "Carga alta vs recuperación" : "Zona de entrenamiento equilibrada"}
            </h3>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: theme.textMuted }}>
              {isOverreaching
                ? `Tu esfuerzo percibido (${health.strain}) está por encima de tu recuperación (${health.scoreRecuperacion}). Hoy conviene bajar volumen o priorizar sueño.`
                : `Tu recuperación va en ${health.scoreRecuperacion}%. Hay margen para exigirte con cabeza, sin castigar el cuerpo.`}
            </p>
          </div>

          <div className="relative flex h-48 w-48 items-center justify-center self-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 192 192">
              <circle cx="96" cy="96" r="80" stroke={ringTrack} strokeWidth="6" fill="none" />
              <circle cx="96" cy="96" r="60" stroke={ringTrack} strokeWidth="6" fill="none" />
              <circle
                cx="96"
                cy="96"
                r="60"
                stroke={theme.accent.health}
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
                stroke={theme.accent.agenda}
                strokeWidth="6"
                fill="none"
                strokeDasharray={String(2 * Math.PI * 80)}
                strokeDashoffset={String((2 * Math.PI * 80) * (1 - health.strain / 100))}
                strokeLinecap="round"
              />
            </svg>

            <div className="text-center">
              <p className="text-3xl font-semibold leading-none" style={{ color: theme.accent.agenda }}>
                {health.strain}
              </p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
                Esfuerzo
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-[26px] border p-6 backdrop-blur-2xl" style={saludPanelStyle(theme, 0.82)}>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 shrink-0" style={{ color: theme.accent.agenda }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
              Volumen e intensidad
            </p>
          </div>
          <div className="mt-5 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={health.weeklyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                <XAxis dataKey="day" stroke={theme.textMuted} style={{ fontSize: "11px" }} />
                <YAxis
                  yAxisId="left"
                  stroke={theme.textMuted}
                  style={{ fontSize: "11px" }}
                  tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
                />
                <YAxis yAxisId="right" orientation="right" hide domain={[0, 100]} />
                <Tooltip contentStyle={chartTooltip} />
                <Bar
                  yAxisId="left"
                  dataKey="volume"
                  fill={theme.accent.agenda}
                  radius={[4, 4, 0, 0]}
                  barSize={24}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="intensity"
                  stroke={theme.text}
                  strokeWidth={2}
                  dot={{ r: 3, fill: theme.surface, stroke: theme.text, strokeWidth: 1.5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-[26px] border p-6 backdrop-blur-2xl" style={saludPanelStyle(theme, 0.82)}>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 shrink-0" style={{ color: theme.accent.health }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
              Hitos estratégicos
            </p>
          </div>

          <div className="mt-5 space-y-4">
            {(showAllMilestones ? health.milestones : health.milestones.slice(0, 2)).map((milestone) => {
              const progress = milestone.reverse
                ? Math.max(0, 100 - ((milestone.current - milestone.target) / milestone.target) * 100)
                : Math.min(100, (milestone.current / milestone.target) * 100)

              return (
                <div
                  key={milestone.id}
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.85),
                  }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{milestone.title}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
                        {milestone.current} / {milestone.target} {milestone.unit}
                      </p>
                    </div>
                    <div className="h-8 w-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={milestone.history.map((value, index) => ({ value, index }))}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke={theme.accent.finance}
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 rounded-full" style={{ backgroundColor: saludHexToRgba(theme.border, 0.45) }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: progress >= 100 ? theme.accent.health : theme.textMuted,
                      }}
                    />
                  </div>
                </div>
              )
            })}
            {health.milestones.length > 2 ? (
              <button
                type="button"
                onClick={() => setShowAllMilestones((v) => !v)}
                className="rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
                style={{ borderColor: theme.border, color: theme.textMuted }}
              >
                {showAllMilestones ? "Ver menos" : "Ver todos"}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[26px] border p-6 backdrop-blur-2xl" style={saludPanelStyle(theme, 0.82)}>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 shrink-0" style={{ color: theme.accent.finance }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
              Seguimiento corporal
            </p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(showAllBody ? health.bodyMetrics : health.bodyMetrics.slice(0, 3)).map((metric) => {
              const TrendIcon = metric.trend === "up" ? ArrowUp : ArrowDown

              return (
                <div
                  key={metric.label}
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.85),
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{metric.label}</p>
                    <TrendIcon className="h-4 w-4 shrink-0" style={{ color: theme.accent.finance }} />
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">
                    {metric.current}
                    <span className="ml-1 text-sm font-medium" style={{ color: theme.textMuted }}>
                      {metric.unit}
                    </span>
                  </p>
                  <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>
                    Objetivo {metric.target} {metric.unit}
                  </p>
                  <div className="mt-4 h-1.5 rounded-full" style={{ backgroundColor: saludHexToRgba(theme.border, 0.45) }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${metric.progress}%`, backgroundColor: theme.accent.finance }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {health.bodyMetrics.length > 3 ? (
            <button
              type="button"
              onClick={() => setShowAllBody((v) => !v)}
              className="mt-4 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ borderColor: theme.border, color: theme.textMuted }}
            >
              {showAllBody ? "Ver menos" : "Ver más métricas"}
            </button>
          ) : null}
        </div>

        <div className="rounded-[26px] border p-6 backdrop-blur-2xl" style={saludPanelStyle(theme, 0.82)}>
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 shrink-0" style={{ color: theme.accent.agenda }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
              Plan semanal de comida
            </p>
          </div>
          <div className="mt-5 space-y-3">
            {(showAllMeals ? health.weeklyMealPlan : health.weeklyMealPlan.slice(0, 3)).map((day) => (
              <div
                key={day.day}
                className="rounded-2xl border p-4"
                style={{
                  borderColor: theme.border,
                  backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.85),
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{day.day}</p>
                    <p className="text-xs" style={{ color: theme.textMuted }}>
                      {day.cals} kcal
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
                    style={{
                      borderColor: theme.border,
                      backgroundColor: saludHexToRgba(theme.surface, 0.6),
                      color: theme.textMuted,
                    }}
                  >
                    <Flame className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accent.agenda }} />
                    energía
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p style={{ color: theme.textMuted }}>P</p>
                    <p className="font-semibold">{day.protein} g</p>
                  </div>
                  <div>
                    <p style={{ color: theme.textMuted }}>C</p>
                    <p className="font-semibold">{day.carbs} g</p>
                  </div>
                  <div>
                    <p style={{ color: theme.textMuted }}>F</p>
                    <p className="font-semibold">{day.fats} g</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {health.weeklyMealPlan.length > 3 ? (
            <button
              type="button"
              onClick={() => setShowAllMeals((v) => !v)}
              className="mt-4 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ borderColor: theme.border, color: theme.textMuted }}
            >
              {showAllMeals ? "Ver menos" : "Ver semana completa"}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
