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
  embedded?: boolean
}

function actionIcon(a: SmartAction["primaryAction"]) {
  if (a === "Ejecutar") return <PlayCircle className="h-4 w-4" />
  if (a === "Agendar") return <CalendarPlus className="h-4 w-4" />
  return <Slash className="h-4 w-4" />
}

/** Convierte copy largo "ROI estratégico: …" en título + detalle escaneable. */
function parseRoiLine(roi: string): { label: string; detail: string } {
  const t = roi.trim()
  const strippedRoi = t.replace(/^ROI estratégico:\s*/i, "").trim()
  if (strippedRoi !== t) {
    return { label: "Retorno esperado", detail: strippedRoi }
  }
  const strippedPorQue = t.replace(/^Por qué ahora:\s*/i, "").trim()
  if (strippedPorQue !== t) {
    return { label: "Por qué ahora", detail: strippedPorQue }
  }
  return { label: "Por qué ahora", detail: t }
}

export function SmartActionsSection({ actions, onAction, pendingActionId, embedded }: SmartActionsSectionProps) {
  return (
    <section className={embedded ? "w-full min-w-0" : "mx-auto mt-6 max-w-6xl px-4"}>
      <div>
        <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Sugerencias con IA</p>
        <h2 className="mt-1 text-lg font-semibold text-orbita-primary">Próximos pasos sugeridos</h2>
        <p className="mt-1 text-sm text-orbita-secondary">
          Menos tareas sueltas: más decisiones que sí mueven tu semana.
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
                <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Sugerencia</p>
                <h3 className="mt-1.5 text-base font-semibold leading-snug text-orbita-primary">{a.title}</h3>
                {(() => {
                  const { label, detail } = parseRoiLine(a.roi)
                  return (
                    <div className="mt-3 rounded-xl border border-orbita-border/70 bg-orbita-surface-alt/50 p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">{label}</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-orbita-primary/95">{detail}</p>
                    </div>
                  )
                })()}
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-orbita-border/70 bg-orbita-surface-alt/60 p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Tiempo</p>
                    <p className="mt-1 text-base font-semibold tabular-nums text-orbita-primary">{a.timeRequiredMin} min</p>
                    <p className="mt-0.5 text-[10px] text-orbita-secondary">Solo esta vez</p>
                  </div>
                  <div
                    className="rounded-xl border p-3"
                    style={{
                      background: "color-mix(in srgb, var(--color-accent-health) 8%, var(--color-surface))",
                      borderColor: "color-mix(in srgb, var(--color-accent-health) 22%, var(--color-border))",
                    }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Impacto</p>
                    <p className="mt-1 text-base font-semibold" style={{ color: "var(--color-accent-health)" }}>
                      Alto
                    </p>
                    <p className="mt-0.5 text-[10px] text-orbita-secondary">En los próximos días</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <Button
                  size="sm"
                  onClick={() => void onAction(a.id, a.primaryAction)}
                  disabled={pendingActionId === a.id}
                  className="rounded-xl !min-h-10 !px-4"
                >
                  {actionIcon(a.primaryAction)}
                  {a.primaryAction}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void onAction(a.id, "Ignorar")}
                  disabled={pendingActionId === a.id}
                  className="rounded-xl !min-h-10 !px-4 border border-orbita-border/80"
                >
                  Ignorar
                </Button>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

