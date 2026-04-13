"use client"

import { useState } from "react"
import { useApp, themes } from "@/app/contexts/AppContext"
import { Activity, AlertCircle, CheckCircle2, Wind } from "lucide-react"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import type { OperationalHabit } from "@/lib/operational/types"

export default function HomeV3() {
  const { colorTheme } = useApp()
  const theme = themes[colorTheme]
  const [note, setNote] = useState("")
  const [period, setPeriod] = useState<"Dia" | "Semana" | "Mes">("Dia")
  const { data } = useOperationalContext()

  const clusters = [
    { id: "hoy", title: "Hoy (siguiente acción)" },
    { id: "habitos", title: "Hábitos y rachas" },
    { id: "foco", title: "Foco operativo" },
    { id: "checkin", title: "Check-in narrativo" },
  ]

  const nextAction = data?.next_action ?? "Sin accion prioritaria definida"
  const nextImpact = data?.next_impact ?? "-"
  const nextTimeRequired = data?.next_time_required ?? "-"
  const habits = data?.habits ?? []
  const energy = data?.score_salud ?? 0

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl tracking-tight">Órvita Control</h2>
          <p className="text-sm" style={{ color: theme.textMuted }}>
            Centro de mando adaptativo.
          </p>
        </div>

        <div
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2"
          style={{
            backgroundColor: theme.surfaceAlt,
            borderColor: `${theme.accent.health}66`,
          }}
        >
          <Wind
            className="h-4 w-4 animate-pulse"
            style={{ color: theme.accent.health }}
          />
          <span className="text-xs uppercase tracking-wider">
            Órvita adapta tu día según energía
          </span>
        </div>
      </div>

      <div
        className="flex w-max items-center rounded-xl border p-1"
        style={{
          backgroundColor: theme.surfaceAlt,
          borderColor: theme.border,
        }}
      >
        {(["Dia", "Semana", "Mes"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setPeriod(tab)}
            className="rounded-lg px-6 py-1.5 text-xs font-medium shadow-sm"
            style={{
              backgroundColor: tab === period ? theme.surface : "transparent",
              color: tab === period ? theme.text : theme.textMuted,
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {clusters.map((cluster) => (
          <div
            key={cluster.id}
            className="rounded-2xl border p-6 shadow-sm"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }}
          >
            <p
              className="mb-4 text-xs uppercase tracking-wider"
              style={{ color: theme.textMuted }}
            >
              {cluster.title}
            </p>

            {cluster.id === "hoy" && (
              <div className="flex items-center gap-4">
                <div
                  className="rounded-full p-3"
                  style={{
                    backgroundColor: `${theme.accent.agenda}22`,
                  }}
                >
                  <AlertCircle
                    className="h-6 w-6"
                    style={{ color: theme.accent.agenda }}
                  />
                </div>
                <div>
                  <p className="text-lg font-medium">
                    {data?.delta_global && data.delta_global < 0
                      ? "Recuperar foco operativo y bajar carga reactiva"
                      : nextAction}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: theme.textMuted }}
                  >
                    Impacto: {nextImpact} • {nextTimeRequired}
                  </p>
                </div>
              </div>
            )}

            {cluster.id === "habitos" && (
              <div className="grid gap-3 md:grid-cols-3">
                {habits.slice(0, 3).map((habit: OperationalHabit) => (
                  <div
                    key={habit.id}
                    className="rounded-xl border p-3"
                    style={{
                      borderColor: theme.border,
                      backgroundColor: theme.surfaceAlt,
                    }}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="truncate text-sm">
                        {habit.name}
                      </span>
                      {habit.completed ? (
                        <CheckCircle2
                          className="h-4 w-4"
                          style={{ color: theme.accent.health }}
                        />
                      ) : (
                        <Activity
                          className="h-4 w-4"
                          style={{ color: theme.textMuted }}
                        />
                      )}
                    </div>
                    <p
                      className="text-xs"
                      style={{ color: theme.textMuted }}
                    >
                      Dominio: {habit.domain}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {cluster.id === "foco" && (
              <div className="grid gap-4 md:grid-cols-2">
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: theme.surfaceAlt }}
                >
                  <p
                    className="text-xs"
                    style={{ color: theme.textMuted }}
                  >
                    Work Block (Actual)
                  </p>
                  <p className="text-lg">
                    {data?.current_block ?? "Sin bloque activo"}
                  </p>
                </div>
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: theme.surfaceAlt }}
                >
                  <p
                    className="text-xs"
                    style={{ color: theme.textMuted }}
                  >
                    Energía
                  </p>
                  <p
                    className="text-lg"
                    style={{ color: theme.accent.health }}
                  >
                    {energy}%
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
