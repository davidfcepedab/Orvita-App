"use client"

import { Activity, ArrowDown, ArrowUp, Dumbbell, Flame, Target, Trophy, Utensils } from "lucide-react"
import { Bar, CartesianGrid, ComposedChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import type { SaludContextSnapshot } from "@/app/salud/_hooks/useSaludContext"

type Props = {
  salud: SaludContextSnapshot
}

const panel =
  "rounded-[26px] border border-white/10 bg-white/[0.04] p-6 text-white shadow-[0_18px_60px_rgba(0,0,0,0.28)] backdrop-blur-2xl"

export default function TrainingOperationsV3({ salud: health }: Props) {
  if (health.loading) return null
  if (health.error) return null

  const isOverreaching = health.strain > health.scoreRecuperacion + 10

  return (
    <section className="space-y-8">
      <div className={panel}>
        <div className="flex items-center gap-3">
          <div className="rounded-3xl bg-amber-300/15 p-3 text-amber-100 ring-1 ring-amber-200/25">
            <Dumbbell className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Entrenamiento</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Ritmo, volumen y metas</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/65">
              Una lectura sobria de tu semana: intensidad, recuperación y combustible. Piensa en esto como tablero de
              apoyo, no como exigencia.
            </p>
          </div>
        </div>
      </div>

      <div className={panel}>
        <div className="flex flex-col gap-8 md:flex-row md:items-center">
          <div className="flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Capacidad del día</p>
            <h3 className="mt-3 text-2xl font-semibold">
              {isOverreaching ? "Carga alta vs recuperación" : "Zona de entrenamiento equilibrada"}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              {isOverreaching
                ? `Tu esfuerzo percibido (${health.strain}) está por encima de tu recuperación (${health.scoreRecuperacion}). Hoy conviene bajar volumen o priorizar sueño.`
                : `Tu recuperación va en ${health.scoreRecuperacion}%. Hay margen para exigirte con cabeza, sin castigar el cuerpo.`}
            </p>
          </div>

          <div className="relative flex h-48 w-48 items-center justify-center self-center">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 192 192">
              <circle cx="96" cy="96" r="80" stroke="rgba(255,255,255,0.12)" strokeWidth="6" fill="none" />
              <circle cx="96" cy="96" r="60" stroke="rgba(255,255,255,0.12)" strokeWidth="6" fill="none" />
              <circle
                cx="96"
                cy="96"
                r="60"
                stroke="#6ee7b7"
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
                stroke="#fcd34d"
                strokeWidth="6"
                fill="none"
                strokeDasharray={String(2 * Math.PI * 80)}
                strokeDashoffset={String((2 * Math.PI * 80) * (1 - health.strain / 100))}
                strokeLinecap="round"
              />
            </svg>

            <div className="text-center">
              <p className="text-3xl font-semibold leading-none text-amber-200">{health.strain}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Esfuerzo</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className={panel}>
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-sky-200" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Volumen e intensidad</p>
          </div>
          <div className="mt-5 h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={health.weeklyVolume}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.45)" style={{ fontSize: "11px" }} />
                <YAxis
                  yAxisId="left"
                  stroke="rgba(255,255,255,0.45)"
                  style={{ fontSize: "11px" }}
                  tickFormatter={(value: number) => `${Math.round(value / 1000)}k`}
                />
                <YAxis yAxisId="right" orientation="right" hide domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(2,6,23,0.92)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: "16px",
                    color: "#e2e8f0",
                  }}
                />
                <Bar yAxisId="left" dataKey="volume" fill="#38bdf8" radius={[4, 4, 0, 0]} barSize={24} />
                <Line yAxisId="right" type="monotone" dataKey="intensity" stroke="#e2e8f0" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={panel}>
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-200" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Hitos estratégicos</p>
          </div>

          <div className="mt-5 space-y-4">
            {health.milestones.map((milestone) => {
              const progress = milestone.reverse
                ? Math.max(0, 100 - ((milestone.current - milestone.target) / milestone.target) * 100)
                : Math.min(100, (milestone.current / milestone.target) * 100)

              return (
                <div key={milestone.id} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold">{milestone.title}</p>
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
                        {milestone.current} / {milestone.target} {milestone.unit}
                      </p>
                    </div>
                    <div className="h-8 w-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={milestone.history.map((value, index) => ({ value, index }))}>
                          <Line
                            type="monotone"
                            dataKey="value"
                            stroke="#cbd5f5"
                            strokeWidth={1.5}
                            dot={false}
                            isAnimationActive={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="mt-4 h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: progress >= 100 ? "#6ee7b7" : "#e2e8f0",
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
        <div className={panel}>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-200" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Seguimiento corporal</p>
          </div>
          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {health.bodyMetrics.map((metric) => {
              const TrendIcon = metric.trend === "up" ? ArrowUp : ArrowDown

              return (
                <div key={metric.label} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">{metric.label}</p>
                    <TrendIcon className="h-4 w-4 text-indigo-200" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold tracking-tight">
                    {metric.current}
                    <span className="ml-1 text-sm font-medium text-white/45">{metric.unit}</span>
                  </p>
                  <p className="mt-1 text-xs text-white/55">
                    Objetivo {metric.target} {metric.unit}
                  </p>
                  <div className="mt-4 h-1.5 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-indigo-300" style={{ width: `${metric.progress}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className={panel}>
          <div className="flex items-center gap-2">
            <Utensils className="h-4 w-4 text-amber-200" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Plan semanal de comida</p>
          </div>
          <div className="mt-5 space-y-3">
            {health.weeklyMealPlan.map((day) => (
              <div key={day.day} className="rounded-2xl border border-white/10 bg-black/25 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{day.day}</p>
                    <p className="text-xs text-white/55">{day.cals} kcal</p>
                  </div>
                  <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/55">
                    <Flame className="h-3.5 w-3.5 text-amber-200" />
                    energía
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-white/45">P</p>
                    <p className="font-semibold">{day.protein} g</p>
                  </div>
                  <div>
                    <p className="text-white/45">C</p>
                    <p className="font-semibold">{day.carbs} g</p>
                  </div>
                  <div>
                    <p className="text-white/45">F</p>
                    <p className="font-semibold">{day.fats} g</p>
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
