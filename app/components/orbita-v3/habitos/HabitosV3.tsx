"use client"

import { useApp, themes } from "@/app/contexts/AppContext"
import { systemData } from "@/app/data/mockData"
import { Activity, CheckCircle2, Circle, Flame, Plus, Target, TrendingDown } from "lucide-react"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"

export default function HabitosV3() {
  const { colorTheme } = useApp()
  const theme = themes[colorTheme]
  const { data } = useOperationalContext()

  return (
    <div className="mx-auto max-w-5xl space-y-10">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-3xl tracking-tight">Sistema de Habitos</h2>
          <p className="text-sm" style={{ color: theme.textMuted }}>
            Consistencia, tendencias y riesgo de ruptura
          </p>
        </div>
        <button
          className="flex w-max items-center gap-2 rounded-lg px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
          style={{ backgroundColor: theme.accent.health }}
        >
          <Plus className="h-4 w-4" />
          Nuevo Habito
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border p-6" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
            <Activity className="h-4 w-4" />
            Consistencia 30D
          </p>
          <p className="text-4xl">{data?.score_disciplina ?? 84}%</p>
        </div>
        <div className="rounded-2xl border p-6" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
            <Flame className="h-4 w-4 text-amber-500" />
            Mejor Streak
          </p>
          <p className="text-4xl">52</p>
        </div>
        <div className="rounded-2xl border p-6" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <p className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: theme.accent.finance }}>
            <TrendingDown className="h-4 w-4" />
            En Riesgo
          </p>
          <p className="text-4xl">1</p>
        </div>
      </div>

      <div className="space-y-4">
        {systemData.agenda.atomicHabits.map((habit, index) => {
          const isRisk = index === 2
          return (
            <div key={habit.id} className="flex flex-col gap-5 rounded-2xl border p-6 md:flex-row md:items-center" style={{ backgroundColor: theme.surface, borderColor: isRisk ? "#ef444466" : theme.border }}>
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <h3 className="text-base">{habit.habit}</h3>
                  {isRisk && (
                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-red-600">
                      Riesgo Ruptura
                    </span>
                  )}
                </div>
                <p className="flex items-center gap-4 text-xs" style={{ color: theme.textMuted }}>
                  <span className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    {habit.time}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className="h-3 w-3 text-amber-500" />
                    {habit.streak} dias seguidos
                  </span>
                </p>
              </div>
              <button className="rounded-xl p-3" style={{ backgroundColor: habit.completed ? `${theme.accent.health}33` : theme.surfaceAlt }}>
                {habit.completed ? (
                  <CheckCircle2 className="h-6 w-6" style={{ color: theme.accent.health }} />
                ) : (
                  <Circle className="h-6 w-6" style={{ color: theme.textMuted }} />
                )}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
