"use client"

import { useState } from "react"
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
import { useSaludContext } from "@/app/salud/_hooks/useSaludContext"

const metricTone = (value: number) => {
  if (value >= 80) return "var(--accent-health-strong)"
  if (value >= 60) return "var(--accent-warning)"
  return "var(--accent-danger)"
}

export default function HealthOperationsV3() {
  const health = useSaludContext()
  const [completedSupplements, setCompletedSupplements] = useState<number[]>([])

  if (health.loading) {
    return <div className="card">Cargando Health Operations...</div>
  }

  if (health.error) {
    return <div className="card text-sm text-red-500">{health.error}</div>
  }

  const completedCount = health.supplementStack.filter(
    (item, index) => item.taken || completedSupplements.includes(index)
  ).length

  return (
    <section className="space-y-6">
      <div className="card border border-[var(--border-soft)] bg-[var(--surface-card)]">
        <p className="text-xs uppercase tracking-[0.22em] text-[var(--text-muted)]">Health</p>
        <div className="mt-4 flex items-center gap-3">
          <div className="rounded-2xl bg-[var(--accent-health)] p-3 text-[var(--text-primary)]">
            <HeartPulse className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">
              Health Operations
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Bio-telemetria, fuel management y energia diaria con lenguaje visual Arctic Zen.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "HRV", value: health.hrv, meta: "ms", icon: Activity },
          { label: "Resting HR", value: health.restingHR, meta: "bpm", icon: HeartPulse },
          { label: "Sleep", value: health.sleepScore, meta: "score", icon: MoonStar },
          { label: "Recovery", value: health.scoreRecuperacion, meta: "%", icon: Sparkles },
          { label: "Body Battery", value: health.bodyBattery, meta: "%", icon: BatteryCharging },
        ].map((metric) => {
          const Icon = metric.icon

          return (
            <div key={metric.label} className="card border border-[var(--border-soft)] p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  {metric.label}
                </span>
                <Icon className="h-4 w-4" style={{ color: metricTone(metric.value) }} />
              </div>
              <p className="mt-4 text-3xl font-semibold tracking-tight" style={{ color: metricTone(metric.value) }}>
                {metric.value}
                <span className="ml-1 text-sm font-medium text-[var(--text-muted)]">{metric.meta}</span>
              </p>
            </div>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="card border border-[var(--border-soft)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Fuel Dashboard</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
                Bio-Hacking Stack
              </h3>
            </div>
            <div className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-secondary)]">
              {completedCount}/{health.supplementStack.length} protocolos
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
                      current.includes(index)
                        ? current.filter((value) => value !== index)
                        : [...current, index]
                    )
                  }
                  className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-muted)] p-3 text-left transition hover:-translate-y-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-white/80 p-2">
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-[var(--accent-health-strong)]" />
                      ) : (
                        <Circle className="h-4 w-4 text-[var(--text-muted)]" />
                      )}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-muted)]">
                      {item.time}
                    </span>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">{item.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{item.dose}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="card border border-[var(--border-soft)]">
          <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">Fuel Management</p>
          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[var(--accent-finance)]/40 p-4">
            <Droplets className="mt-1 h-5 w-5 text-[var(--accent-finance-strong)]" />
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">Hidratacion operativa</p>
              <p className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">
                {health.hydrationCurrent}
                <span className="ml-2 text-sm font-medium text-[var(--text-muted)]">
                  / {health.hydrationTarget} L
                </span>
              </p>
              <div className="mt-4 h-2 rounded-full bg-white/70">
                <div
                  className="h-full rounded-full bg-[var(--accent-finance-strong)]"
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
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-[var(--text-secondary)]">{macro.label}</span>
                    <span className="font-medium text-[var(--text-primary)]">
                      {macro.current} / {macro.target}
                      {macro.unit}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--border-soft)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: progress >= 90 ? "var(--accent-health-strong)" : progress >= 70 ? "var(--accent-warning)" : "var(--accent-danger)",
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div className="card border border-[var(--border-soft)]">
        <p className="text-xs uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Biometric Correlation
        </p>
        <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">
          Sleep vs Daily Energy
        </h3>
        <div className="mt-6 h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={health.energyAudit}>
              <defs>
                <linearGradient id="saludEnergyFade" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent-agenda-strong)" stopOpacity={0.16} />
                  <stop offset="95%" stopColor="var(--accent-agenda-strong)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-soft)" vertical={false} />
              <XAxis dataKey="hour" stroke="var(--text-muted)" style={{ fontSize: "11px" }} />
              <YAxis yAxisId="left" hide />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} stroke="var(--text-muted)" style={{ fontSize: "11px" }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--surface-card)",
                  border: "1px solid var(--border-soft)",
                  borderRadius: "16px",
                }}
              />
              <Area yAxisId="left" type="monotone" dataKey="fatigue" fill="url(#saludEnergyFade)" stroke="none" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="energy"
                stroke="var(--accent-health-strong)"
                strokeWidth={2}
                dot={{ r: 3, fill: "#fff", strokeWidth: 2 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  )
}