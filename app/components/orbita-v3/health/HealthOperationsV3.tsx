"use client"

import { useId, useState } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  BatteryCharging,
  CheckCircle2,
  Circle,
  Droplets,
  HeartPulse,
  MoonStar,
  Sparkles,
} from "lucide-react"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludContextSnapshot } from "@/app/salud/_hooks/useSaludContext"
import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import { saludHexToRgba, saludMetricTone, saludPanelStyle } from "@/lib/salud/saludThemeStyles"

type Props = {
  salud: SaludContextSnapshot
  latest: AutoHealthMetric | null
}

export default function HealthOperationsV3({ salud: health, latest }: Props) {
  const theme = useOrbitaSkin()
  const [completedSupplements, setCompletedSupplements] = useState<number[]>([])
  const energyChartGradientId = useId().replace(/:/g, "")

  if (health.loading) return null
  if (health.error) return null

  const completedCount = health.supplementStack.filter(
    (item, index) => item.taken || completedSupplements.includes(index),
  ).length

  const appleReadiness = latest?.readiness_score ?? null
  const hydrationTarget = Math.max(health.hydrationTarget, 0.1)
  const hydrationProgress = Math.min(100, (health.hydrationCurrent / hydrationTarget) * 100)

  const gridStroke = saludHexToRgba(theme.border, 0.85)
  const chartTooltip = {
    backgroundColor: saludHexToRgba(theme.surface, 0.96),
    border: `1px solid ${theme.border}`,
    borderRadius: "16px",
    color: theme.text,
  }

  return (
    <section className="space-y-8" style={{ color: theme.text }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[28px] border p-7 backdrop-blur-2xl sm:p-9"
        style={saludPanelStyle(theme, 0.88)}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em]" style={{ color: theme.textMuted }}>
          Estratégico
        </p>
        <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="rounded-3xl p-4 ring-1"
              style={{
                backgroundColor: saludHexToRgba(theme.accent.health, 0.12),
                color: theme.accent.health,
                boxShadow: `0 0 0 1px ${saludHexToRgba(theme.accent.health, 0.25)}`,
              }}
            >
              <HeartPulse className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Cuerpo, energía y hábitos</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed" style={{ color: theme.textMuted }}>
                Aquí se interpreta tu check-in del día y se traduce en decisiones simples. Si Apple sugiere otra cosa,
                mostramos la diferencia para evitar autoengaños.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: theme.textMuted }}>
          Tu check-in (órbita interna)
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Salud emocional", value: health.scoreSalud, meta: "/100", icon: Sparkles },
            { label: "Energía física", value: health.scoreFisico, meta: "/100", icon: Activity },
            { label: "Recuperación percibida", value: health.scoreRecuperacion, meta: "/100", icon: MoonStar },
            { label: "Índice de energía", value: health.bodyBattery, meta: "/100", icon: BatteryCharging },
          ].map((metric, index) => {
            const Icon = metric.icon
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[22px] border p-5 backdrop-blur-xl"
                style={{
                  borderColor: theme.border,
                  backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.65),
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                    {metric.label}
                  </span>
                  <Icon className="h-4 w-4 shrink-0" style={{ color: theme.textMuted }} aria-hidden />
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight" style={{ color: saludMetricTone(theme, metric.value) }}>
                  {metric.value}
                  <span className="ml-1 text-sm font-medium" style={{ color: theme.textMuted }}>
                    {metric.meta}
                  </span>
                </p>
              </motion.div>
            )
          })}
        </div>
        <p
          className="mt-4 rounded-2xl border p-4 text-sm leading-relaxed"
          style={{
            borderColor: theme.border,
            backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.75),
            color: theme.textMuted,
          }}
        >
          {appleReadiness != null && health.scoreSalud > 0
            ? `Apple sugiere ${appleReadiness}/100 de disposición y tú reportas ${health.scoreSalud}/100 en salud. Si divergen, toma el día con más descanso y menos intensidad.`
            : "Cuando llegue tu importación de Apple, cruzaremos esas señales con tu check-in para darte una lectura más accionable."}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[26px] border p-6 backdrop-blur-2xl" style={saludPanelStyle(theme, 0.82)}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
                Operativo
              </p>
              <h3 className="mt-2 text-xl font-semibold">Protocolos del día</h3>
            </div>
            <div
              className="rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
              style={{
                borderColor: theme.border,
                backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.9),
                color: theme.textMuted,
              }}
            >
              {completedCount}/{health.supplementStack.length} listos
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {health.supplementStack.map((item, index) => {
              const isDone = item.taken || completedSupplements.includes(index)

              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() =>
                    setCompletedSupplements((current) =>
                      current.includes(index) ? current.filter((value) => value !== index) : [...current, index],
                    )
                  }
                  className="min-h-[120px] rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 active:scale-[0.99]"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: saludHexToRgba(theme.surfaceAlt, 0.85),
                    color: theme.text,
                    boxShadow: `inset 0 1px 0 ${saludHexToRgba(theme.border, 0.35)}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full p-2" style={{ backgroundColor: saludHexToRgba(theme.border, 0.35) }}>
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4" style={{ color: theme.accent.health }} />
                      ) : (
                        <Circle className="h-4 w-4" style={{ color: theme.textMuted }} />
                      )}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: theme.textMuted }}>
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-snug">{item.name}</p>
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    {item.dose}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
        <div className="rounded-[26px] border p-6 backdrop-blur-2xl" style={saludPanelStyle(theme, 0.82)}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
            Combustible
          </p>
          <div
            className="mt-5 flex items-start gap-3 rounded-2xl border p-4"
            style={{
              borderColor: saludHexToRgba(theme.accent.agenda, 0.35),
              backgroundColor: saludHexToRgba(theme.accent.agenda, 0.1),
            }}
          >
            <Droplets className="mt-1 h-5 w-5 shrink-0" style={{ color: theme.accent.agenda }} />
            <div>
              <p className="text-sm font-semibold">Hidratación</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight">
                {health.hydrationCurrent}
                <span className="ml-2 text-sm font-medium" style={{ color: theme.textMuted }}>
                  / {health.hydrationTarget} L
                </span>
              </p>
              <div className="mt-4 h-2 rounded-full" style={{ backgroundColor: saludHexToRgba(theme.border, 0.45) }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${hydrationProgress}%`,
                    backgroundColor: theme.accent.agenda,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {health.macros.map((macro) => {
              const progress = Math.min(100, (macro.current / macro.target) * 100)

              return (
                <div key={macro.label}>
                  <div className="mb-1 flex items-center justify-between text-xs" style={{ color: theme.textMuted }}>
                    <span>{macro.label}</span>
                    <span className="font-medium" style={{ color: theme.text }}>
                      {macro.current} / {macro.target}
                      {macro.unit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ backgroundColor: saludHexToRgba(theme.border, 0.45) }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: saludMetricTone(theme, progress),
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="rounded-[26px] border p-6 backdrop-blur-2xl" style={saludPanelStyle(theme, 0.82)}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
          Predictivo
        </p>
        <h3 className="mt-2 text-xl font-semibold">Energía vs fatiga (modelo del día)</h3>
        <p className="mt-2 text-sm" style={{ color: theme.textMuted }}>
          No es un diagnóstico: es una visualización amable para ver cómo podría sentirse tu día si alineas sueño,
          carga y descanso.
        </p>
        <div className="mt-6 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={health.energyAudit}>
              <defs>
                <linearGradient id={energyChartGradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={theme.accent.agenda} stopOpacity={0.22} />
                  <stop offset="95%" stopColor={theme.accent.agenda} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis dataKey="hour" stroke={theme.textMuted} style={{ fontSize: "11px" }} />
              <YAxis yAxisId="left" hide />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                stroke={theme.textMuted}
                style={{ fontSize: "11px" }}
              />
              <Tooltip contentStyle={chartTooltip} />
              <Area yAxisId="left" type="monotone" dataKey="fatigue" fill={`url(#${energyChartGradientId})`} stroke="none" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="energy"
                stroke={theme.accent.health}
                strokeWidth={2}
                dot={{ r: 3, fill: theme.surface, stroke: theme.accent.health, strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
