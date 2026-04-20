"use client"

import { motion } from "framer-motion"
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts"
import { CalendarClock, Gauge, Gavel, Timer } from "lucide-react"

import { Card } from "@/src/components/ui/Card"
import type { CriticalDecision, DayAgendaBlock, HabitTrend } from "@/app/home/_lib/orbita-home-types"
import { energyWindowDot, pressureClasses } from "@/app/home/_lib/orbita-home-format"
import { ClientOnly } from "@/app/home/_components/ClientOnly"

type MiniWidgetsProps = {
  decisions: CriticalDecision[]
  agendaToday: DayAgendaBlock[]
  habits: HabitTrend[]
  /** Solo panel de hábitos (pestaña Zen). */
  variant?: "default" | "habitsOnly"
}

export function MiniWidgets({ decisions, agendaToday, habits, variant = "default" }: MiniWidgetsProps) {
  const widgetIconBase = "h-9 w-9 rounded-xl border flex items-center justify-center"

  const habitsCard = (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 }}>
      <Card className="h-full p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <span
            className={widgetIconBase}
            style={{
              background: "color-mix(in srgb, var(--color-accent-health) 10%, var(--color-surface))",
              borderColor: "color-mix(in srgb, var(--color-accent-health) 26%, var(--color-border))",
            }}
          >
            <Gauge className="h-4 w-4" style={{ color: "var(--color-accent-health)" }} />
          </span>
          <div>
            <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Hábitos clave</p>
            <p className="text-sm text-orbita-primary/90 font-medium">Cómo vas esta semana</p>
          </div>
        </div>

        <p className="mt-2 text-[11px] leading-snug text-orbita-secondary">
          Cada barra es un día (L–D). Altura ≈ cumplimiento del hábito (0–100).
        </p>

        <div className="mt-3 grid gap-3">
          {habits.slice(0, 3).map((h) => (
            <div key={h.id} className="rounded-2xl border border-orbita-border/60 bg-orbita-surface-alt/40 p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-orbita-primary">{h.name}</p>
                  <p className="mt-0.5 text-[11px] text-orbita-secondary">Ventana: últimos 7 días</p>
                </div>
                <span className="shrink-0 rounded-md border border-orbita-border/70 bg-orbita-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orbita-secondary">
                  7D
                </span>
              </div>
              <div className="mt-3 h-16">
                <ClientOnly
                  fallback={<div className="h-full w-full rounded-xl border border-orbita-border/40 bg-orbita-surface/35" />}
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={h.week}>
                      <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          background: "rgba(17,17,17,0.92)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          borderRadius: 14,
                          color: "rgba(255,255,255,0.92)",
                          fontSize: 12,
                        }}
                        formatter={(value) => [`${Math.round(Number(value))}%`, "Cumplimiento"]}
                      />
                      <Bar dataKey="score" fill="rgba(52, 211, 153, 0.35)" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ClientOnly>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  )

  if (variant === "habitsOnly") {
    return (
      <section className="mx-auto max-w-6xl pb-6">
        <div className="max-w-xl">{habitsCard}</div>
      </section>
    )
  }

  return (
    <section className="mx-auto max-w-6xl px-4 mt-6 pb-10">
      <div>
        <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Mini-widgets rápidos</p>
        <h2 className="mt-1 text-lg font-semibold text-orbita-primary">Señales rápidas</h2>
        <p className="mt-1 text-sm text-orbita-secondary">
          Tres paneles para ver lo importante sin perder tiempo.
        </p>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-3">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card className="p-4 sm:p-5 h-full">
            <div className="flex items-center gap-2">
              <span
                className={widgetIconBase}
                style={{
                  background: "color-mix(in srgb, var(--color-accent-danger) 10%, var(--color-surface))",
                  borderColor: "color-mix(in srgb, var(--color-accent-danger) 26%, var(--color-border))",
                }}
              >
                <Gavel className="h-4 w-4" style={{ color: "var(--color-accent-danger)" }} />
              </span>
              <div>
                <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Decisiones críticas</p>
                <p className="text-sm text-orbita-primary/90 font-medium">Las 3 que cambian la semana</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {decisions.slice(0, 3).map((d) => (
                <div key={d.id} className="rounded-2xl border border-orbita-border/40 bg-orbita-surface/35 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-orbita-primary">{d.title}</p>
                    <span
                      className={[
                        "shrink-0 inline-flex items-center rounded-full border px-2 py-1 text-[11px] tracking-[0.14em] uppercase",
                        pressureClasses(d.pressure),
                      ].join(" ")}
                    >
                      {d.pressure}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 text-xs text-orbita-secondary">
                    <span className="inline-flex items-center gap-1">
                      <Timer className="h-3.5 w-3.5" />
                      {d.deadline}
                    </span>
                    <span className="text-orbita-secondary">Regla: cierre &gt; perfección</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
        >
          <Card className="p-4 sm:p-5 h-full">
            <div className="flex items-center gap-2">
              <span
                className={widgetIconBase}
                style={{
                  background: "color-mix(in srgb, var(--color-accent-agenda) 10%, var(--color-surface))",
                  borderColor: "color-mix(in srgb, var(--color-accent-agenda) 26%, var(--color-border))",
                }}
              >
                <CalendarClock className="h-4 w-4" style={{ color: "var(--color-accent-agenda)" }} />
              </span>
              <div>
                <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">Agenda de hoy</p>
                <p className="text-sm text-orbita-primary/90 font-medium">En tu mejor hora</p>
              </div>
            </div>

            <div className="mt-4 grid gap-2">
              {agendaToday.slice(0, 4).map((b) => (
                <div key={b.id} className="rounded-2xl border border-orbita-border/40 bg-orbita-surface/35 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-orbita-primary">{b.title}</p>
                    <span className="inline-flex items-center gap-2 text-xs text-orbita-secondary">
                      <span className={["h-2 w-2 rounded-full", energyWindowDot(b.energyWindow)].join(" ")} />
                      {b.energyWindow}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-orbita-secondary">{b.time}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>

        {habitsCard}
      </div>
    </section>
  )
}

