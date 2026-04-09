"use client"

import { motion } from "framer-motion"
import { Bot, CheckCircle2, Zap } from "lucide-react"

import { Card } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import type { OrbitaAlert } from "@/app/home/_lib/orbita-home-types"
import { impactClasses } from "@/app/home/_lib/orbita-home-format"

type CriticalAlertsProps = {
  alerts: OrbitaAlert[]
  onOneClickAction: (id: string) => Promise<void> | void
  onResolveWithAi: (id: string) => Promise<void> | void
}

export function CriticalAlerts({ alerts, onOneClickAction, onResolveWithAi }: CriticalAlertsProps) {
  const top = alerts.slice(0, 4)

  return (
    <section className="mx-auto max-w-6xl px-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Primero lo primero</p>
          <h2 className="mt-1 text-lg font-semibold text-orbita-primary">Alertas críticas</h2>
          <p className="mt-1 text-sm text-orbita-secondary">
            Son pocos puntos. Si los bajas, recuperas calma y control.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-orbita-secondary">
          <span className="inline-flex h-2 w-2 rounded-full bg-rose-400/80" />
          Presión
          <span className="inline-flex h-2 w-2 rounded-full bg-amber-400/80 ml-3" />
          Riesgo
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400/80 ml-3" />
          Oportunidad
        </div>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 md:items-stretch">
        {top.map((a, idx) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * idx }}
            className="h-full"
          >
            <Card className="group overflow-hidden h-full">
              <div className="p-4 sm:p-5 h-full flex flex-col">
                <div className="flex-1 flex flex-col gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={[
                          "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] tracking-[0.14em] uppercase",
                          impactClasses(a.impact),
                        ].join(" ")}
                      >
                        <Zap className="h-3.5 w-3.5" />
                        Impacto {a.impact}
                      </span>
                      <span className="text-xs text-orbita-secondary">Un paso y baja presión</span>
                    </div>
                    <h3 className="mt-2 text-base sm:text-lg font-semibold text-orbita-primary">{a.title}</h3>
                    <p className="mt-1 text-sm text-orbita-secondary max-w-3xl">{a.description}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      onClick={() => void onOneClickAction(a.id)}
                      className="h-10 rounded-xl !px-4 inline-flex items-center gap-2"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {a.oneClickActionLabel}
                    </Button>
                    <button
                      type="button"
                      onClick={() => void onResolveWithAi(a.id)}
                      className="h-10 rounded-xl px-4 border border-white/10 bg-orbita-surface hover:bg-white/5 transition text-sm font-semibold text-orbita-primary inline-flex items-center gap-2"
                    >
                      <Bot className="h-4 w-4 text-sky-200" />
                      Resolver con IA
                    </button>
                  </div>
                </div>
              </div>

              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
              <div className="px-4 sm:px-5 py-3 flex items-center justify-between gap-3">
                <p className="text-xs text-orbita-secondary">
                  Resultado: <span className="text-orbita-primary/90 font-medium">claridad</span> sin apuro.
                </p>
                <span className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">
                  Órbita: cierre &gt; volumen
                </span>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

