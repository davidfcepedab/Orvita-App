"use client"

import { useMemo, useState } from "react"
import { Activity, Dumbbell, Flame, Target, Trophy, Utensils } from "lucide-react"
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludContextSnapshot } from "@/app/salud/_hooks/useSaludContext"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"
import { saludHexToRgba, saludPanelStyle } from "@/lib/salud/saludThemeStyles"

const MEAL_DAY_FULL: Record<string, string> = {
  Lun: "Lunes",
  Mar: "Martes",
  Mie: "Miércoles",
  Jue: "Jueves",
  Vie: "Viernes",
  Sab: "Sábado",
  Dom: "Domingo",
}

function mealDayCalorieStatus(cals: number, weekAvg: number): "ok" | "under" | "over" {
  if (!Number.isFinite(weekAvg) || weekAvg <= 0) return "ok"
  const delta = (cals - weekAvg) / weekAvg
  if (delta < -0.06) return "under"
  if (delta > 0.06) return "over"
  return "ok"
}

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

  const mealStats = useMemo(() => {
    const plan = health.weeklyMealPlan
    if (!plan.length) return { avg: 0, maxCals: 1 }
    const sum = plan.reduce((acc, d) => acc + d.cals, 0)
    const avg = sum / plan.length
    const maxCals = Math.max(...plan.map((d) => d.cals), 1)
    return { avg, maxCals }
  }, [health.weeklyMealPlan])

  return (
    <section className="mt-12" style={{ color: theme.text }}>
      <div className="rounded-[28px] border p-6 backdrop-blur-2xl sm:p-8" style={saludPanelStyle(theme, 0.82)}>
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
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Ritmo y carga</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: theme.textMuted }}>
              Volumen semanal y sensación de esfuerzo frente a recuperación. Sin Hevy activo, ves referencia base alineada a tu check-in.
            </p>
          </div>
        </div>

        <div className="mt-8 space-y-8 border-t pt-8" style={{ borderColor: theme.border }}>
          <div
            className="rounded-[26px] border border-dashed p-6 sm:border-solid"
            style={{
              borderColor: theme.border,
              backgroundColor: "transparent",
              boxShadow: "none",
            }}
          >
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
                ? `Esfuerzo percibido ${health.strain} vs recuperación ${health.scoreRecuperacion}: baja volumen o prioriza sueño.`
                : `Recuperación ${health.scoreRecuperacion}%: puedes exigir con cabeza sin castigar el cuerpo.`}
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
              <p className="text-4xl font-bold leading-none tabular-nums sm:text-5xl" style={{ color: theme.accent.agenda }}>
                {health.strain}
              </p>
              <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
                Esfuerzo percibido
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
                      <p className="text-base font-semibold">{milestone.title}</p>
                      <p className="mt-1 text-xs font-semibold tabular-nums uppercase tracking-[0.12em]" style={{ color: theme.textMuted }}>
                        {milestone.current} / {milestone.target} {milestone.unit}
                      </p>
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[26px] border p-6 backdrop-blur-2xl" style={saludPanelStyle(theme, 0.82)}>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 shrink-0" style={{ color: theme.accent.finance }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
              Seguimiento corporal
            </p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {(showAllBody ? health.bodyMetrics : health.bodyMetrics.slice(0, 3)).map((metric) => {
              return (
                <div
                  key={metric.label}
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: "transparent",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{metric.label}</p>
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
            <Utensils className="h-5 w-5 shrink-0" style={{ color: SALUD_SEM.energy }} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
              Plan semanal de comida
            </p>
          </div>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
            Stack diario vs promedio semanal de calorías. Estado solo visual (sin cambiar tu plan).
          </p>
          <div
            className="mt-5 flex flex-col divide-y"
            style={{ borderColor: saludHexToRgba(theme.border, 0.55) }}
          >
            {(showAllMeals ? health.weeklyMealPlan : health.weeklyMealPlan.slice(0, 3)).map((day) => {
              const calStatus = mealDayCalorieStatus(day.cals, mealStats.avg)
              const statusUi =
                calStatus === "ok"
                  ? { label: "OK", fg: SALUD_SEM.ok, bg: saludHexToRgba(SALUD_SEM.ok, 0.14) }
                  : calStatus === "under"
                    ? { label: "Bajo", fg: SALUD_SEM.warn, bg: saludHexToRgba(SALUD_SEM.warn, 0.14) }
                    : { label: "Alto", fg: SALUD_SEM.risk, bg: saludHexToRgba(SALUD_SEM.risk, 0.14) }
              const calBar = Math.round((day.cals / mealStats.maxCals) * 100)
              return (
                <div key={day.day} className="flex flex-col gap-3 py-4 first:pt-0">
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold sm:text-lg" style={{ color: theme.text }}>
                        {MEAL_DAY_FULL[day.day] ?? day.day}
                      </p>
                      <p className="mt-2 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums">
                        <Flame className="h-6 w-6 shrink-0 self-center sm:h-7 sm:w-7" style={{ color: SALUD_SEM.energy }} aria-hidden />
                        <span className="text-2xl font-bold sm:text-3xl" style={{ color: theme.text }}>
                          {day.cals}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: theme.textMuted }}>
                          kcal
                        </span>
                      </p>
                    </div>
                    <span
                      className="inline-flex w-fit max-w-full shrink-0 items-center gap-1.5 self-start rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] sm:self-auto"
                      style={{ backgroundColor: statusUi.bg, color: statusUi.fg }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-90" aria-hidden />
                      {statusUi.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold tabular-nums sm:text-[15px]" style={{ color: theme.text }}>
                    <span style={{ color: SALUD_SEM.ok }}>P</span> {day.protein}g
                    <span className="mx-2 font-normal opacity-40" aria-hidden>
                      |
                    </span>
                    <span style={{ color: SALUD_SEM.energy }}>C</span> {day.carbs}g
                    <span className="mx-2 font-normal opacity-40" aria-hidden>
                      |
                    </span>
                    <span style={{ color: SALUD_SEM.recovery }}>F</span> {day.fats}g
                  </p>
                  <div className="h-2 overflow-hidden rounded-full" style={{ backgroundColor: saludHexToRgba(theme.border, 0.4) }}>
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{
                        width: `${calBar}%`,
                        backgroundColor: SALUD_SEM.energy,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          {health.weeklyMealPlan.length > 3 ? (
            <button
              type="button"
              onClick={() => setShowAllMeals((v) => !v)}
              className="mt-4 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ backgroundColor: saludHexToRgba(theme.border, 0.22), color: theme.textMuted }}
            >
              {showAllMeals ? "Ver menos" : "Ver semana completa"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  </div>
    </section>
  )
}
