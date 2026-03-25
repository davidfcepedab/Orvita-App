"use client"

import { useState } from "react"
import { useApp, themes } from "@/app/contexts/AppContext"
import { systemData } from "@/app/data/mockData"
import { Activity, AlertCircle, CheckCircle2, Wind } from "lucide-react"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"

export default function HomeV3() {
  const { colorTheme } = useApp()
  const theme = themes[colorTheme]
  const [note, setNote] = useState("")
  const { data } = useOperationalContext()

  const clusters = [
    { id: "hoy", title: "Hoy (Siguiente Accion)" },
    { id: "habitos", title: "Habitos & Streaks" },
    { id: "foco", title: "Foco Operativo" },
    { id: "checkin", title: "Check-in Narrativo" },
  ]

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl tracking-tight">Orbita Control</h2>
          <p className="text-sm" style={{ color: theme.textMuted }}>
            Centro de mando adaptativo.
          </p>
        </div>

        <div
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2"
          style={{ backgroundColor: theme.surfaceAlt, borderColor: `${theme.accent.health}66` }}
        >
          <Wind className="h-4 w-4 animate-pulse" style={{ color: theme.accent.health }} />
          <span className="text-xs uppercase tracking-wider">Orbita adapto tu dia por energia</span>
        </div>
      </div>

      <div className="flex w-max items-center rounded-xl border p-1" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
        {["Dia", "Semana", "Mes"].map((tab) => (
          <button
            key={tab}
            className="rounded-lg px-6 py-1.5 text-xs font-medium shadow-sm"
            style={{
              backgroundColor: tab === "Dia" ? theme.surface : "transparent",
              color: tab === "Dia" ? theme.text : theme.textMuted,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {clusters.map((cluster) => (
          <div key={cluster.id} className="rounded-2xl border p-6 shadow-sm" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
            <p className="mb-4 text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
              {cluster.title}
            </p>

            {cluster.id === "hoy" && (
              <div className="flex items-center gap-4">
                <div className="rounded-full p-3" style={{ backgroundColor: `${theme.accent.agenda}22` }}>
                  <AlertCircle className="h-6 w-6" style={{ color: theme.accent.agenda }} />
                </div>
                <div>
                  <p className="text-lg font-medium">
                    {data?.delta_global && data.delta_global < 0
                      ? "Recuperar foco operativo y bajar carga reactiva"
                      : systemData.nextActions[0].action}
                  </p>
                  <p className="text-sm" style={{ color: theme.textMuted }}>
                    Impacto: {systemData.nextActions[0].impact} • {systemData.nextActions[0].timeRequired}
                  </p>
                </div>
              </div>
            )}

            {cluster.id === "habitos" && (
              <div className="grid gap-3 md:grid-cols-3">
                {systemData.agenda.atomicHabits.slice(0, 3).map((habit) => (
                  <div key={habit.id} className="rounded-xl border p-3" style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="truncate text-sm">{habit.habit}</span>
                      {habit.completed ? (
                        <CheckCircle2 className="h-4 w-4" style={{ color: theme.accent.health }} />
                      ) : (
                        <Activity className="h-4 w-4" style={{ color: theme.textMuted }} />
                      )}
                    </div>
                    <p className="text-xs" style={{ color: theme.textMuted }}>{habit.streak} dias</p>
                  </div>
                ))}
              </div>
            )}

            {cluster.id === "foco" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl p-4" style={{ backgroundColor: theme.surfaceAlt }}>
                  <p className="text-xs" style={{ color: theme.textMuted }}>Work Block (Actual)</p>
                  <p className="text-lg">Deep Work (90m)</p>
                </div>
                <div className="rounded-xl p-4" style={{ backgroundColor: theme.surfaceAlt }}>
                  <p className="text-xs" style={{ color: theme.textMuted }}>Energia</p>
                  <p className="text-lg" style={{ color: theme.accent.health }}>
                    {data?.score_recuperacion ?? systemData.health.bioTelemetry.bodyBattery}%
                  </p>
                </div>
              </div>
            )}

            {cluster.id === "checkin" && (
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Como se siente la carga operativa hoy?"
                className="h-24 w-full resize-none rounded-xl border bg-transparent p-4 text-sm outline-none"
                style={{ borderColor: theme.border }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
