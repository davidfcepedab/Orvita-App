"use client"

import { useMemo } from "react"
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import type { SaludContextSnapshot } from "@/app/salud/_hooks/useSaludContext"
import type { ShortcutHealthAnalyticsSnapshot } from "@/lib/health/shortcutHealthAnalytics"
import { saludHexToRgba, saludPanelStyle } from "@/lib/salud/saludThemeStyles"

type Props = {
  salud: SaludContextSnapshot
  latest: AutoHealthMetric | null
  timeline: AutoHealthMetric[]
  analytics: ShortcutHealthAnalyticsSnapshot | null
  loading: boolean
}

function statusTone(value: "ok" | "warn" | "risk") {
  if (value === "ok") return { label: "En línea", color: "var(--color-accent-health)" }
  if (value === "warn") return { label: "Atención", color: "var(--color-accent-warning)" }
  return { label: "Desbalance", color: "var(--color-accent-danger)" }
}

export function HealthCorrelationsPanel({ salud, latest, timeline, analytics, loading }: Props) {
  const theme = useOrbitaSkin()

  const sleepVsEnergySeries = useMemo(
    () =>
      timeline
        .filter((row) => row.sleep_hours != null || row.energy_index != null)
        .slice(-7)
        .map((row) => ({
          day: new Date(row.observed_at).toLocaleDateString("es-LA", { weekday: "short" }),
          sleep: row.sleep_hours ?? null,
          energy: row.energy_index ?? null,
        })),
    [timeline],
  )

  const hrvVsLoadSeries = useMemo(
    () =>
      timeline
        .filter((row) => row.hrv_ms != null || row.calories != null || row.apple_workout_minutes != null)
        .slice(-7)
        .map((row) => ({
          day: new Date(row.observed_at).toLocaleDateString("es-LA", { weekday: "short" }),
          hrv: row.hrv_ms ?? null,
          load: (row.calories ?? 0) + (row.apple_workout_minutes ?? 0),
        })),
    [timeline],
  )

  const sleepEnergyStatus = useMemo(() => {
    const s = latest?.sleep_hours
    const e = latest?.energy_index
    if (s == null || e == null) return { level: "warn" as const, text: "Falta una de las dos señales para comparar." }
    if (s < 6 && e < 45) return { level: "risk" as const, text: "Sueño corto y energía baja: conviene proteger descanso hoy." }
    if (s >= 7 && e >= 60) return { level: "ok" as const, text: "Buen acople entre horas de sueño y energía percibida." }
    return { level: "warn" as const, text: "Relación mixta: prioriza rutina de sueño y evita sobrecarga." }
  }, [latest?.sleep_hours, latest?.energy_index])

  const hrvLoadStatus = useMemo(() => {
    const hrv = latest?.hrv_ms
    const load = analytics?.recovery.training_load?.proxy ?? null
    if (hrv == null || load == null) return { level: "warn" as const, text: "Sin datos suficientes para cruzar HRV y carga." }
    if (hrv < 32 && load > 350) return { level: "risk" as const, text: "HRV bajo con carga alta: mejor sesión ligera." }
    if (hrv >= 40 && load <= 320) return { level: "ok" as const, text: "Carga en zona razonable para tu variabilidad." }
    return { level: "warn" as const, text: "Cruce intermedio: ajusta intensidad según sensaciones." }
  }, [latest?.hrv_ms, analytics?.recovery.training_load?.proxy])

  const activityRecoveryStatus = useMemo(() => {
    const steps = latest?.steps
    const readiness = latest?.readiness_score
    if (steps == null || readiness == null) {
      return { level: "warn" as const, text: "Sin pasos o readiness para estimar desbalance." }
    }
    if (steps > 8000 && readiness < 45) {
      return { level: "risk" as const, text: "Actividad alta con recuperación baja: baja volumen mañana." }
    }
    if (steps >= 5000 && readiness >= 55) {
      return { level: "ok" as const, text: "Movimiento y recuperación van en buena línea." }
    }
    return { level: "warn" as const, text: "Mantén actividad suave mientras recuperas." }
  }, [latest?.steps, latest?.readiness_score])

  const checkinVsAppleStatus = useMemo(() => {
    const readiness = latest?.readiness_score
    if (readiness == null) return { level: "warn" as const, text: "Falta import de Apple para contrastar check-in." }
    const delta = Math.round(salud.scoreSalud - readiness)
    if (Math.abs(delta) <= 8) return { level: "ok" as const, text: `Coincidencia alta entre check-in y Apple (Δ ${delta}).` }
    if (delta > 8) return { level: "warn" as const, text: `Te sientes mejor que Apple (Δ +${delta}). Cuida recuperación.` }
    return { level: "risk" as const, text: `Apple te ve mejor que tu check-in (Δ ${delta}). Revisa estrés/sueño.` }
  }, [latest?.readiness_score, salud.scoreSalud])

  const cards = [
    {
      title: "Sueño vs energía",
      source: "Apple Health",
      status: sleepEnergyStatus,
      chart: (
        <div className="mt-3 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={sleepVsEnergySeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={saludHexToRgba(theme.border, 0.75)} vertical={false} />
              <XAxis dataKey="day" stroke={theme.textMuted} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" hide />
              <YAxis yAxisId="right" hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{
                  backgroundColor: saludHexToRgba(theme.surface, 0.96),
                  border: `1px solid ${theme.border}`,
                  borderRadius: "12px",
                  color: theme.text,
                }}
              />
              <Area yAxisId="left" type="monotone" dataKey="sleep" fill={saludHexToRgba(theme.accent.agenda, 0.22)} stroke="none" />
              <Line yAxisId="right" type="monotone" dataKey="energy" stroke={theme.accent.health} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ),
    },
    {
      title: "HRV vs carga entrenamiento",
      source: "Apple + Atajo",
      status: hrvLoadStatus,
      chart: (
        <div className="mt-3 h-28">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={hrvVsLoadSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={saludHexToRgba(theme.border, 0.75)} vertical={false} />
              <XAxis dataKey="day" stroke={theme.textMuted} tick={{ fontSize: 10 }} />
              <YAxis yAxisId="left" hide />
              <YAxis yAxisId="right" hide />
              <Tooltip
                contentStyle={{
                  backgroundColor: saludHexToRgba(theme.surface, 0.96),
                  border: `1px solid ${theme.border}`,
                  borderRadius: "12px",
                  color: theme.text,
                }}
              />
              <Area yAxisId="left" type="monotone" dataKey="load" fill={saludHexToRgba(theme.accent.agenda, 0.2)} stroke="none" />
              <Line yAxisId="right" type="monotone" dataKey="hrv" stroke={theme.accent.health} strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ),
    },
    {
      title: "Actividad vs recuperación",
      source: "Apple Health",
      status: activityRecoveryStatus,
      chart: null,
    },
    {
      title: "Check-in vs Apple",
      source: "Check-in + Apple",
      status: checkinVsAppleStatus,
      chart: null,
    },
  ]

  return (
    <section className="space-y-4">
      <div className="rounded-[26px] border p-6 backdrop-blur-2xl" style={saludPanelStyle(theme, 0.84)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
          Correlaciones clave
        </p>
        <h3 className="mt-2 text-xl font-semibold">Datos -&gt; interpretación -&gt; acción</h3>
        <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>
          Cuatro cruces simples para decidir el día sin saturarte con métricas.
        </p>

        {loading ? (
          <p className="mt-4 text-sm" style={{ color: theme.textMuted }}>
            Preparando correlaciones…
          </p>
        ) : (
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {cards.map((item) => {
              const tone = statusTone(item.status.level)
              return (
                <div
                  key={item.title}
                  className="rounded-2xl border p-4"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.78),
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <span
                      className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em]"
                      style={{
                        borderColor: saludHexToRgba(tone.color, 0.4),
                        backgroundColor: saludHexToRgba(tone.color, 0.12),
                        color: tone.color,
                      }}
                    >
                      {tone.label}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px]" style={{ color: theme.textMuted }}>
                    Fuente: {item.source}
                  </p>
                  <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>
                    {item.status.text}
                  </p>
                  {item.chart}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
