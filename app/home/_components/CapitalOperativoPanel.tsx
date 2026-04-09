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
}

export function CapitalOperativoPanel({ model, formatCOP }: CapitalOperativoPanelProps) {
  const { time, energy, money } = model.capital

  const timeUsedPct = Math.round((time.consumedHours / Math.max(1, time.availableHours)) * 100)

  const energySeries = energy.trend7d.map((v, i) => ({ i, v }))

  const netTone =
    money.netMonthlyCOP >= 0 ? "text-emerald-200" : money.netMonthlyCOP <= -2000000 ? "text-rose-200" : "text-amber-200"

  return (
    <section className="mx-auto max-w-6xl px-4 mt-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Capital operativo</p>
          <h2 className="mt-1 text-lg font-semibold text-orbita-primary">Tus 3 palancas hoy</h2>
          <p className="mt-1 text-sm text-orbita-secondary">
            Tiempo, energía y dinero no son estados: son <span className="text-orbita-primary/90 font-medium">palancas</span>.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Clock3 className="h-4 w-4 text-sky-200" />
                  </span>
                  <div>
                    <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Tiempo</p>
                    <p className="text-sm text-orbita-primary/90 font-medium">Horas disponibles vs consumidas</p>
                  </div>
                </div>
              </div>
              <span className="text-xs text-orbita-secondary">{timeUsedPct}% usado</span>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <p className="text-2xl font-semibold text-orbita-primary">
                  {time.availableHours.toFixed(1)}h <span className="text-orbita-secondary text-sm font-medium">hoy</span>
                </p>
                <p className="text-sm text-orbita-secondary">
                  Consumidas: <span className="text-orbita-primary/90 font-semibold">{time.consumedHours.toFixed(1)}h</span>
                </p>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-sky-400/70 to-sky-200/40"
                  style={{ width: `${Math.min(100, Math.max(0, timeUsedPct))}%` }}
                />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-xs text-orbita-secondary">
                  % foco estratégico: <span className="text-orbita-primary/90 font-semibold">{time.strategicFocusPct}%</span>
                </p>
                <p className="text-xs text-orbita-secondary">Regla: protege 1 bloque profundo.</p>
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 }}>
          <Card className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <Flame className="h-4 w-4 text-amber-200" />
                </span>
                <div>
                  <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Energía</p>
                  <p className="text-sm text-orbita-primary/90 font-medium">Tendencia 7D + riesgo burnout</p>
                </div>
              </div>
              <span className="text-xs text-orbita-secondary">Burnout {energy.burnoutRiskPct}%</span>
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-semibold text-orbita-primary">
                  {energy.currentLevelPct}% <span className="text-orbita-secondary text-sm font-medium">actual</span>
                </p>
                <p className="mt-1 text-xs text-orbita-secondary">
                  Señal: si &lt; 65% por 5 días, reduce reuniones y sube recuperación.
                </p>
              </div>
              <div className="h-14 w-28">
                <ClientOnly
                  fallback={<div className="h-full w-full rounded-xl border border-white/10 bg-white/5" />}
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

            <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
              <div className="flex items-center gap-2 text-xs text-orbita-secondary">
                <Activity className="h-4 w-4 text-amber-200" />
                Tendencia: {Math.round(energy.trend7d[6] - energy.trend7d[0]) >= 0 ? "sube" : "cae"} en 7D
              </div>
              <p className="text-xs text-orbita-secondary">Predicción: {energy.burnoutRiskPct}%</p>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
          <Card className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                  <DollarSign className="h-4 w-4 text-emerald-200" />
                </span>
                <div>
                  <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Dinero</p>
                  <p className="text-sm text-orbita-primary/90 font-medium">Flujo neto + runway + presión</p>
                </div>
              </div>
              <span className="text-xs text-orbita-secondary">Runway {money.runwayDays} días</span>
            </div>

            <div className="mt-4">
              <p className={["text-2xl font-semibold", netTone].join(" ")}>
                {formatCOP(money.netMonthlyCOP)}
                <span className="ml-2 text-orbita-secondary text-sm font-medium">/ mes</span>
              </p>
              <p className="mt-1 text-xs text-orbita-secondary">
                Presión financiera: <span className="text-orbita-primary/90 font-semibold">{money.financialPressurePct}%</span>
              </p>

              <div className="mt-3 h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
                <div
                  className="h-full bg-gradient-to-r from-rose-400/70 via-amber-300/40 to-emerald-400/30"
                  style={{ width: `${Math.min(100, Math.max(0, money.financialPressurePct))}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                <p className="text-xs text-orbita-secondary">Regla: runway &lt; 21 días → modo caja.</p>
                <p className="text-xs text-orbita-secondary">Acción: cobro + recorte mínimo.</p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </section>
  )
}

