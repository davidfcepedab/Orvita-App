"use client"

import { motion } from "framer-motion"
import { Activity, Clock3, DollarSign, Flame } from "lucide-react"
import { ResponsiveContainer, Line, LineChart, Tooltip } from "recharts"

import { Card } from "@/src/components/ui/Card"
import type { OrbitaHomeModel } from "@/app/home/_lib/orbita-home-types"
import { ClientOnly } from "@/app/home/_components/ClientOnly"

type CapitalOperativoPanelProps = {
  model: OrbitaHomeModel
  formatCOP: (n: number) => string
  embedded?: boolean
}

export function CapitalOperativoPanel({ model, formatCOP, embedded }: CapitalOperativoPanelProps) {
  const { time, energy, money } = model.capital

  /** Cupo de horas del día (denominador del % usado en API). */
  const dayCapacityH = Math.max(0.25, time.availableHours)
  const timeUsedPct = Math.min(100, Math.round((time.consumedHours / dayCapacityH) * 100))
  const hoursLeftToday = Math.max(0, dayCapacityH - time.consumedHours)
  const focusPctRounded = Math.round(time.strategicFocusPct)

  const energySeries = energy.trend7d.map((v, i) => ({ i, v }))
  const burnoutRounded = Math.round(energy.burnoutRiskPct)
  const trendDelta = Math.round((energy.trend7d[6] ?? 0) - (energy.trend7d[0] ?? 0))

  const netTone =
    money.netMonthlyCOP >= 0
      ? "text-emerald-600 dark:text-emerald-400"
      : money.netMonthlyCOP <= -2000000
        ? "text-rose-600 dark:text-rose-400"
        : "text-amber-700 dark:text-amber-300"

  const tileIconBase = "h-9 w-9 rounded-xl border flex items-center justify-center"

  return (
    <section className={embedded ? "w-full min-w-0" : "mx-auto mt-6 max-w-6xl px-4"}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="orvita-overline-caps">Desglose</p>
          <h2 className="mt-1 text-lg font-semibold tracking-tight text-orbita-primary">Las tres palancas</h2>
          <p className="mt-1 text-sm text-orbita-secondary">
            Tiempo, energía y dinero — si uno cae, el sistema entero se nota.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="flex min-h-[19rem] min-w-0 flex-col p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={tileIconBase}
                    style={{
                      background:
                        "color-mix(in srgb, var(--color-accent-finance) 10%, var(--color-surface))",
                      borderColor:
                        "color-mix(in srgb, var(--color-accent-finance) 26%, var(--color-border))",
                    }}
                  >
                    <Clock3 className="h-4 w-4" style={{ color: "var(--color-accent-finance)" }} />
                  </span>
                  <div>
                    <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Tiempo</p>
                    <p className="text-sm text-orbita-primary/90 font-medium">Horas del día</p>
                  </div>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-orbita-border/80 bg-orbita-surface-alt/80 px-2 py-0.5 text-[11px] font-medium tabular-nums text-orbita-secondary">
                {timeUsedPct}% ocupado
              </span>
            </div>

            <div className="mt-4 flex flex-1 flex-col">
              <p className="text-2xl font-semibold tabular-nums text-orbita-primary sm:text-3xl">
                {hoursLeftToday.toFixed(1)} h
                <span className="ml-1.5 text-base font-medium text-orbita-secondary">libres ahora</span>
              </p>
              <p className="mt-1 text-sm text-orbita-secondary">
                Cupo hoy: <span className="font-semibold text-orbita-primary/90">{dayCapacityH.toFixed(1)} h</span>
                {" · "}
                Ya usaste <span className="font-semibold text-orbita-primary/90">{time.consumedHours.toFixed(1)} h</span>
              </p>
              <p className="mt-2 text-[11px] leading-snug text-orbita-secondary">
                La barra es cuánto del cupo ya está consumido (trabajo, reuniones, etc.).
              </p>
              <div className="mt-2 h-2 overflow-hidden rounded-full border border-orbita-border/60 bg-orbita-surface-alt">
                <div
                  className="h-full bg-gradient-to-r from-sky-500/80 to-sky-400/50 dark:from-sky-400/70 dark:to-sky-300/40"
                  style={{ width: `${Math.min(100, Math.max(0, timeUsedPct))}%` }}
                />
              </div>
              <div className="mt-4 space-y-1.5 border-t border-orbita-border/50 pt-3">
                <p className="text-xs text-orbita-secondary">
                  <span className="font-medium text-orbita-primary">Trabajo estratégico</span> ·{" "}
                  <span className="tabular-nums font-semibold text-orbita-primary/90">{focusPctRounded}%</span> del día
                  (estimado)
                </p>
                <p className="text-[11px] leading-snug text-orbita-secondary">
                  Consejo: reserva un bloque sin interrupciones para subir ese %.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
          <Card className="flex min-h-[19rem] min-w-0 flex-col p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={tileIconBase}
                  style={{
                    background:
                      "color-mix(in srgb, var(--color-accent-warning) 10%, var(--color-surface))",
                    borderColor:
                      "color-mix(in srgb, var(--color-accent-warning) 26%, var(--color-border))",
                  }}
                >
                  <Flame className="h-4 w-4" style={{ color: "var(--color-accent-warning)" }} />
                </span>
                <div>
                  <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Energía</p>
                  <p className="text-sm text-orbita-primary/90 font-medium">Nivel esta semana</p>
                </div>
              </div>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums ${
                  burnoutRounded >= 60
                    ? "border-rose-300/80 bg-rose-50 text-rose-800 dark:border-rose-500/40 dark:bg-rose-950/40 dark:text-rose-200"
                    : burnoutRounded >= 35
                      ? "border-amber-300/80 bg-amber-50 text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/30 dark:text-amber-100"
                      : "border-orbita-border/80 bg-orbita-surface-alt/80 text-orbita-secondary"
                }`}
                title="Probabilidad de agotamiento (modelo)"
              >
                Riesgo burnout {burnoutRounded}%
              </span>
            </div>

            <div className="mt-4 flex flex-1 items-end justify-between gap-3">
              <div>
                <p className="text-xl font-semibold tabular-nums text-orbita-primary sm:text-2xl">
                  {Math.round(energy.currentLevelPct)}%
                  <span className="ml-1.5 text-base font-medium text-orbita-secondary">de tu energía hoy</span>
                </p>
                <p className="mt-1 text-xs leading-snug text-orbita-secondary">
                  Si este nivel cae 5 días seguidos, conviene bajar carga y recuperar.
                </p>
              </div>
              <div className="h-14 w-28">
                <ClientOnly
                  fallback={<div className="h-full w-full rounded-xl border border-orbita-border/40 bg-orbita-surface/35" />}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={energySeries}>
                      <Tooltip
                        contentStyle={{
                          background: "rgba(17,17,17,0.9)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 12,
                          color: "rgba(255,255,255,0.9)",
                          fontSize: 12,
                        }}
                        labelFormatter={() => "Energía (7D)"}
                        formatter={(value) => [`${value}%`, "Nivel"]}
                      />
                      <Line type="monotone" dataKey="v" stroke="rgb(251 191 36)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </ClientOnly>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-orbita-border/50 pt-3">
              <div className="flex items-center gap-2 text-xs text-orbita-secondary">
                <Activity className="h-4 w-4 text-amber-600 dark:text-amber-300" aria-hidden />
                <span>
                  Últimos 7 días:{" "}
                  <span className="font-medium text-orbita-primary">
                    {trendDelta >= 0 ? "sube" : "baja"} {Math.abs(trendDelta)} pts
                  </span>
                </span>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="flex min-h-[19rem] min-w-0 flex-col p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className={tileIconBase}
                  style={{
                    background:
                      "color-mix(in srgb, var(--color-accent-health) 10%, var(--color-surface))",
                    borderColor:
                      "color-mix(in srgb, var(--color-accent-health) 26%, var(--color-border))",
                  }}
                >
                  <DollarSign className="h-4 w-4" style={{ color: "var(--color-accent-health)" }} />
                </span>
                <div>
                  <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Dinero</p>
                  <p className="text-sm text-orbita-primary/90 font-medium">Liquidez y presión</p>
                </div>
              </div>
              <span className="shrink-0 rounded-full border border-orbita-border/80 bg-orbita-surface-alt/80 px-2 py-0.5 text-[11px] font-medium tabular-nums text-orbita-secondary">
                Runway ~{money.runwayDays} d
              </span>
            </div>

            <div className="mt-4 flex flex-1 flex-col">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-orbita-secondary">
                Flujo neto mensual (estimado)
              </p>
              <p className={["mt-1 break-words text-xl font-semibold tabular-nums sm:text-2xl", netTone].join(" ")}>
                {formatCOP(money.netMonthlyCOP)}
              </p>
              <p className="mt-2 text-xs text-orbita-secondary">
                Presión sobre ingresos:{" "}
                <span className="tabular-nums font-semibold text-orbita-primary">{Math.round(money.financialPressurePct)}%</span>
              </p>

              <div className="mt-3 h-2 overflow-hidden rounded-full border border-orbita-border/60 bg-orbita-surface-alt">
                <div
                  className="h-full bg-gradient-to-r from-rose-500/70 via-amber-400/50 to-emerald-500/40"
                  style={{ width: `${Math.min(100, Math.max(0, money.financialPressurePct))}%` }}
                />
              </div>

              <div className="mt-3 space-y-1 border-t border-orbita-border/50 pt-3 text-[11px] leading-snug text-orbita-secondary">
                <p>
                  <span className="font-medium text-orbita-primary">Si el runway cae por debajo de ~21 días</span>, activa
                  modo caja: cobros primero y recorte mínimo de gasto.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}

