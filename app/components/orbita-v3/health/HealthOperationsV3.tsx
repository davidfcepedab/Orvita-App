"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  BatteryCharging,
  CheckCircle2,
  Circle,
  Dumbbell,
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
import type { SaludContextSnapshot } from "@/app/salud/_hooks/useSaludContext"
import { useHealthAutoMetrics } from "@/app/hooks/useHealthAutoMetrics"
import { appleDaySignalsFromHealthMetric } from "@/lib/health/appleHevyRelation"

const metricTone = (value: number) => {
  if (value >= 80) return "#6ee7b7"
  if (value >= 60) return "#fcd34d"
  return "#fb7185"
}

type Props = {
  salud: SaludContextSnapshot
}

export default function HealthOperationsV3({ salud: health }: Props) {
  const { latest: autoHealth } = useHealthAutoMetrics()
  const appleSignals = useMemo(() => appleDaySignalsFromHealthMetric(autoHealth), [autoHealth])
  const [completedSupplements, setCompletedSupplements] = useState<number[]>([])

  if (health.loading) return null
  if (health.error) return null

  const completedCount = health.supplementStack.filter(
    (item, index) => item.taken || completedSupplements.includes(index),
  ).length

  const appleSleep =
    autoHealth?.sleep_hours != null ? Math.round(autoHealth.sleep_hours * 10) / 10 : null
  const appleSteps = autoHealth?.steps ?? null
  const appleHrv = autoHealth?.hrv_ms ?? null
  const appleReadiness = autoHealth?.readiness_score ?? null
  const appleEnergy = autoHealth?.energy_index ?? null

  return (
    <section className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-[28px] border border-white/10 bg-white/[0.04] p-7 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-9"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/45">Tu espacio de recuperación</p>
        <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-3xl bg-emerald-400/15 p-4 text-emerald-100 ring-1 ring-emerald-300/25">
              <HeartPulse className="h-7 w-7" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Cuerpo, energía y hábitos</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/65">
                Aquí conviven tus check-ins (lo que sientes y registras) con lo que Apple Health mide por ti. Nada de
                jerga: solo señales claras para decidir con más calma.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Apple Health (importado)</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7">
          {[
            { label: "HRV", value: appleHrv, meta: "ms", icon: Activity },
            { label: "Recuperación (proxy)", value: appleReadiness, meta: "/100", icon: HeartPulse },
            { label: "Sueño", value: appleSleep, meta: "h", icon: MoonStar },
            { label: "Pasos", value: appleSteps, meta: "", icon: Sparkles },
            { label: "Energía activa (kcal)", value: autoHealth?.calories ?? null, meta: "kcal", icon: BatteryCharging },
            { label: "Entrenos (Apple)", value: appleSignals.workoutsCount, meta: "", icon: Dumbbell },
            { label: "Min entreno (Apple)", value: appleSignals.workoutMinutes, meta: "min", icon: Dumbbell },
          ].map((metric, index) => {
            const Icon = metric.icon
            const hasValue = typeof metric.value === "number"
            const numeric = hasValue ? metric.value : 0
            const display =
              !hasValue
                ? "—"
                : metric.meta === "" && typeof metric.value === "number"
                  ? metric.value.toLocaleString("es-LA")
                  : `${metric.value}`

            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[22px] border border-white/10 bg-black/25 p-5 shadow-inner shadow-black/25"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                    {metric.label}
                  </span>
                  <Icon className="h-4 w-4 text-white/35" aria-hidden />
                </div>
                <p
                  className="mt-4 text-3xl font-semibold tracking-tight text-white"
                  style={{
                    color: hasValue ? metricTone(numeric) : "rgba(255,255,255,0.85)",
                  }}
                >
                  {display}
                  {metric.meta ? (
                    <span className="ml-1 text-sm font-medium text-white/45">{metric.meta}</span>
                  ) : null}
                </p>
              </motion.div>
            )
          })}
        </div>
        {autoHealth?.observed_at ? (
          <p className="mt-3 text-xs text-white/45">
            Fuente: {autoHealth.source ?? "apple_health_export"} · Última lectura{" "}
            {new Date(autoHealth.observed_at).toLocaleString("es-LA")}
          </p>
        ) : (
          <p className="mt-3 text-xs text-white/45">
            Aún no hay importación reciente. Usa el botón “Traer datos de hoy desde Apple Health” arriba.
          </p>
        )}
      </div>

      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">Tu check-in (órbita interna)</p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            { label: "Salud emocional", value: health.scoreSalud, meta: "/100", icon: Sparkles },
            { label: "Energía física", value: health.scoreFisico, meta: "/100", icon: Activity },
            { label: "Recuperación percibida", value: health.scoreRecuperacion, meta: "/100", icon: MoonStar },
            { label: "Índice de energía (narrativa)", value: health.bodyBattery, meta: "/100", icon: BatteryCharging },
          ].map((metric, index) => {
            const Icon = metric.icon
            return (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.04, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-[22px] border border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
                    {metric.label}
                  </span>
                  <Icon className="h-4 w-4 text-white/35" aria-hidden />
                </div>
                <p className="mt-4 text-3xl font-semibold tracking-tight" style={{ color: metricTone(metric.value) }}>
                  {metric.value}
                  <span className="ml-1 text-sm font-medium text-white/45">{metric.meta}</span>
                </p>
              </motion.div>
            )
          })}
        </div>
        <p className="mt-4 rounded-2xl border border-white/10 bg-black/25 p-4 text-sm leading-relaxed text-white/70">
          {appleReadiness != null && health.scoreSalud > 0
            ? `Apple sugiere una recuperación de ${appleReadiness}, mientras tu check-in de salud va en ${health.scoreSalud}. Si hay distancia, no es “fallar”: suele ser estrés acumulado, sueño irregular o un día intenso.`
            : "Cuando llegue tu importación de Apple, cruzaremos esas señales con tu check-in para que tengas una lectura más humana del día."}
          {appleEnergy != null ? ` Energía modelada desde Apple: ${appleEnergy}/100.` : ""}
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Bio-stack</p>
              <h3 className="mt-2 text-xl font-semibold text-white">Protocolos del día</h3>
            </div>
            <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">
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
                  className="min-h-[120px] rounded-2xl border border-white/10 bg-black/25 p-3 text-left text-white shadow-inner shadow-black/30 transition hover:-translate-y-0.5 hover:border-white/20 active:scale-[0.99]"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/10 p-2">
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      ) : (
                        <Circle className="h-4 w-4 text-white/35" />
                      )}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/40">
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-semibold leading-snug">{item.name}</p>
                  <p className="text-xs text-white/55">{item.dose}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Combustible</p>
          <div className="mt-5 flex items-start gap-3 rounded-2xl border border-sky-300/25 bg-sky-400/10 p-4">
            <Droplets className="mt-1 h-5 w-5 text-sky-200" />
            <div>
              <p className="text-sm font-semibold text-white">Hidratación</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
                {health.hydrationCurrent}
                <span className="ml-2 text-sm font-medium text-white/45">/ {health.hydrationTarget} L</span>
              </p>
              <div className="mt-4 h-2 rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-sky-300"
                  style={{ width: `${Math.min(100, (health.hydrationCurrent / health.hydrationTarget) * 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {health.macros.map((macro) => {
              const progress = Math.min(100, (macro.current / macro.target) * 100)

              return (
                <div key={macro.label}>
                  <div className="mb-1 flex items-center justify-between text-xs text-white/60">
                    <span>{macro.label}</span>
                    <span className="font-medium text-white">
                      {macro.current} / {macro.target}
                      {macro.unit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: progress >= 90 ? "#6ee7b7" : progress >= 70 ? "#fcd34d" : "#fb7185",
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="rounded-[26px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">Correlación suave</p>
        <h3 className="mt-2 text-xl font-semibold text-white">Energía vs fatiga (modelo del día)</h3>
        <p className="mt-2 text-sm text-white/55">
          No es un diagnóstico: es una visualización amable para ver cómo podría sentirse tu día si alineas sueño,
          carga y descanso.
        </p>
        <div className="mt-6 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={health.energyAudit}>
              <defs>
                <linearGradient id="saludEnergyFade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
              <XAxis dataKey="hour" stroke="rgba(255,255,255,0.45)" style={{ fontSize: "11px" }} />
              <YAxis yAxisId="left" hide />
              <YAxis
                yAxisId="right"
                orientation="right"
                domain={[0, 100]}
                stroke="rgba(255,255,255,0.45)"
                style={{ fontSize: "11px" }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(2,6,23,0.92)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "16px",
                  color: "#e2e8f0",
                }}
              />
              <Area yAxisId="left" type="monotone" dataKey="fatigue" fill="url(#saludEnergyFade)" stroke="none" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="energy"
                stroke="#6ee7b7"
                strokeWidth={2}
                dot={{ r: 3, fill: "#0f172a", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}
