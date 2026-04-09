"use client"

import { motion } from "framer-motion"
import { CalendarPlus, PlayCircle, Slash } from "lucide-react"

import { Card } from "@/src/components/ui/Card"
import { Button } from "@/src/components/ui/Button"
import type { SmartAction } from "@/app/home/_lib/orbita-home-types"

type SmartActionsSectionProps = {
  actions: SmartAction[]
  onAction: (id: string, action: SmartAction["primaryAction"]) => Promise<void> | void
  pendingActionId?: string | null
}

function actionIcon(a: SmartAction["primaryAction"]) {
  if (a === "Ejecutar") return <PlayCircle className="h-4 w-4" />
  if (a === "Agendar") return <CalendarPlus className="h-4 w-4" />
  return <Slash className="h-4 w-4" />
}

export function SmartActionsSection({ actions, onAction, pendingActionId }: SmartActionsSectionProps) {
  return (
    <section className="mx-auto max-w-6xl px-4 mt-6">
      <div>
        <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Inputs generados con IA</p>
        <h2 className="mt-1 text-lg font-semibold text-orbita-primary">Acciones sugeridas</h2>
        <p className="mt-1 text-sm text-orbita-secondary">
          Menos tareas. Más decisiones que cambian tu semana.
        </p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        {actions.slice(0, 3).map((a, idx) => (
          <motion.div
            key={a.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * idx }}
            className="h-full"
          >
            <Card className="p-4 sm:p-5 h-full flex flex-col">
              <div className="flex-1">
                <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Acción sugerida</p>
                <h3 className="mt-2 text-base font-semibold text-orbita-primary">{a.title}</h3>
                <p className="mt-2 text-sm text-orbita-secondary">{a.roi}</p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Tiempo</p>
                    <p className="mt-1 text-sm font-semibold text-orbita-primary">{a.timeRequiredMin} min</p>
                  </div>
                  <div
                    className="rounded-2xl border p-3"
                    style={{
                      background: "color-mix(in srgb, var(--color-accent-health) 8%, var(--color-surface))",
                      borderColor: "color-mix(in srgb, var(--color-accent-health) 22%, var(--color-border))",
                    }}
                  >
                    <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Impacto</p>
                    <p className="mt-1 text-sm font-semibold" style={{ color: "var(--color-accent-health)" }}>
                      Alto
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between gap-2">
                <Button
                  onClick={() => void onAction(a.id, a.primaryAction)}
                  disabled={pendingActionId === a.id}
                  className="rounded-xl inline-flex items-center gap-2 !px-4"
                >
                  {actionIcon(a.primaryAction)}
                  {a.primaryAction}
                </Button>

                <button
                  type="button"
                  onClick={() => void onAction(a.id, "Ignorar")}
                  disabled={pendingActionId === a.id}
                  className="h-10 rounded-xl px-4 border border-white/10 bg-orbita-surface hover:bg-white/5 transition text-sm font-semibold text-orbita-primary"
                >
                  Ignorar
                </button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

