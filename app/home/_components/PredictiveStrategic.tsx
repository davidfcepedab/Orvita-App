"use client"

import { motion } from "framer-motion"
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Bot, ShieldAlert, Target, TriangleAlert } from "lucide-react"

import { Card } from "@/src/components/ui/Card"
import type { OrbitaInsight, PredictivePoint } from "@/app/home/_lib/orbita-home-types"
import { ClientOnly } from "@/app/home/_components/ClientOnly"

type PredictiveStrategicProps = {
  points: PredictivePoint[]
  insights: OrbitaInsight[]
  onRequestAiRefresh: () => Promise<void> | void
}

function insightIcon(sev: OrbitaInsight["severity"]) {
  if (sev === "oportunidad") return <Target className="h-4 w-4 text-emerald-200" />
  if (sev === "presion") return <ShieldAlert className="h-4 w-4 text-rose-200" />
  return <TriangleAlert className="h-4 w-4 text-amber-200" />
}

export function PredictiveStrategic({ points, insights, onRequestAiRefresh }: PredictiveStrategicProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 mt-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Análisis predictivo</p>
          <h2 className="mt-1 text-lg font-semibold text-orbita-primary">Predicción + estrategia (IA)</h2>
          <p className="mt-1 text-sm text-orbita-secondary">
            Proyección de 30 días: presión, energía y carga de tiempo. Objetivo: decidir antes de que el sistema te obligue.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void onRequestAiRefresh()}
          className="h-10 rounded-xl px-4 border border-white/10 bg-orbita-surface hover:bg-white/5 transition text-sm font-semibold text-orbita-primary inline-flex items-center gap-2 w-fit"
        >
          <Bot className="h-4 w-4 text-sky-200" />
          Recalcular insights IA
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[1.4fr_0.6fr]">
        <Card className="p-4 sm:p-5 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Próximos 30 días</p>
              <p className="mt-1 text-sm text-orbita-secondary">
                Barras: presión (tiempo + dinero) · Línea: energía · Línea fina: score de flujo
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-orbita-secondary">
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-400/80" />
                Presión
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-300/80" />
                Carga tiempo
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sky-300/80" />
                Energía
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-300/80" />
                Flujo
              </span>
            </div>
          </div>

          <div className="mt-4 h-[280px] sm:h-[320px]">
            <ClientOnly fallback={<div className="h-full w-full rounded-2xl border border-white/10 bg-white/5" />}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={points}>
                  <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} interval={4} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "rgba(17,17,17,0.92)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 14,
                      color: "rgba(255,255,255,0.92)",
                      fontSize: 12,
                    }}
                    formatter={(value: unknown, name: unknown) => {
                      const label =
                        name === "moneyPressure"
                          ? "Presión dinero"
                          : name === "timeLoad"
                            ? "Carga tiempo"
                            : name === "energy"
                              ? "Energía"
                              : name === "flowScore"
                                ? "Flujo"
                                : String(name)
                      return [`${value}%`, label]
                    }}
                  />

                  <Bar dataKey="moneyPressure" fill="rgba(251, 113, 133, 0.35)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="timeLoad" fill="rgba(252, 211, 77, 0.22)" radius={[6, 6, 0, 0]} />
                  <Line type="monotone" dataKey="energy" stroke="rgb(125 211 252)" strokeWidth={2.2} dot={false} />
                  <Line type="monotone" dataKey="flowScore" stroke="rgb(52 211 153)" strokeWidth={1.6} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </ClientOnly>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Señal dominante</p>
              <p className="mt-1 text-sm font-semibold text-orbita-primary">Presión financiera empujando decisiones</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Punto de quiebre</p>
              <p className="mt-1 text-sm font-semibold text-orbita-primary">Energía &lt; 60% + agenda fragmentada</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Mejor palanca</p>
              <p className="mt-1 text-sm font-semibold text-orbita-primary">Cierre + caja (runway primero)</p>
            </div>
          </div>
        </Card>

        <div className="grid gap-3">
          {insights.slice(0, 3).map((ins, idx) => (
            <motion.div
              key={ins.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 * idx }}
            >
              <Card className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2">
                    <span className="h-9 w-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      {insightIcon(ins.severity)}
                    </span>
                    <div>
                      <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Insight IA</p>
                      <h3 className="mt-1 text-base font-semibold text-orbita-primary">{ins.title}</h3>
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-orbita-secondary leading-relaxed">{ins.body}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

