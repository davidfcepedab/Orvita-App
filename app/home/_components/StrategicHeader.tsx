"use client"

import { useMemo } from "react"
import { motion } from "framer-motion"
import { Sparkles, TrendingUp } from "lucide-react"
import { CircularProgressbar, buildStyles } from "react-circular-progressbar"
import "react-circular-progressbar/dist/styles.css"

import { flowToneClasses, formatBogotaDateParts, greetingForWeekday } from "@/app/home/_lib/orbita-home-format"
import type { OrbitaHomeModel } from "@/app/home/_lib/orbita-home-types"

type StrategicHeaderProps = {
  model: OrbitaHomeModel
  onGenerateAi: () => Promise<void> | void
  isGenerating?: boolean
}

export function StrategicHeader({ model, onGenerateAi, isGenerating }: StrategicHeaderProps) {
  const now = useMemo(() => new Date(), [])
  const parts = useMemo(() => formatBogotaDateParts(now), [now])
  const greeting = useMemo(() => greetingForWeekday(parts.weekday.toLowerCase()), [parts.weekday])

  const tone = flowToneClasses(model.flow.color)

  return (
    <div
      className="sticky top-0 z-20 -mx-4 px-4 pt-4 pb-3 backdrop-blur"
      style={{
        background: "color-mix(in srgb, var(--color-surface) 88%, transparent)",
        borderBottom: "0.5px solid var(--color-border)",
      }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary"
            >
              {parts.weekday} · {parts.day} · {model.user.city}
            </motion.p>
            <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-[22px] sm:text-[26px] font-semibold text-orbita-primary">
                Órbita — Centro de Control
              </h1>
              <p className="text-sm text-orbita-secondary">
                <span className="text-orbita-primary/90 font-medium">
                  {greeting}, {model.user.firstName}
                </span>
                <span className="hidden sm:inline">. Mantén el rumbo. Reduce fricción. Compra claridad.</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={[
                "hidden sm:flex items-center gap-3 rounded-2xl border px-3 py-2",
                tone.glow,
              ].join(" ")}
              style={{
                background: "var(--color-surface)",
                borderColor: "color-mix(in srgb, var(--color-border) 85%, transparent)",
              }}
            >
              <div className="h-10 w-10">
                <CircularProgressbar
                  value={model.flow.score}
                  text={`${model.flow.score}`}
                  styles={buildStyles({
                    textColor: "var(--color-text-primary)",
                    pathColor:
                      model.flow.color === "green"
                        ? "rgb(52 211 153)"
                        : model.flow.color === "yellow"
                          ? "rgb(251 191 36)"
                          : "rgb(251 113 133)",
                    trailColor: "color-mix(in srgb, var(--color-border) 55%, transparent)",
                    textSize: "32px",
                  })}
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={[
                      "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] tracking-[0.14em] uppercase",
                      tone.chip,
                    ].join(" ")}
                  >
                    <TrendingUp className="h-3.5 w-3.5" />
                    {model.flow.label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-orbita-secondary max-w-[260px] truncate">{model.flow.microcopy}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onGenerateAi()}
              disabled={isGenerating}
              className="h-10 rounded-xl px-3 sm:px-4 inline-flex items-center gap-2 text-sm font-semibold whitespace-nowrap shrink-0 min-w-[168px] justify-center"
              style={{
                background: "var(--color-accent-health)",
                color: "white",
                border: "0.5px solid color-mix(in srgb, var(--color-accent-health) 35%, var(--color-border))",
                opacity: isGenerating ? 0.75 : 1,
                cursor: isGenerating ? "wait" : "pointer",
              }}
            >
              <Sparkles className="h-4 w-4" />
              {isGenerating ? "Generando…" : "Generar Análisis IA"}
            </button>
          </div>
        </div>

        <div className="sm:hidden mt-3 flex items-center justify-between gap-3">
          <div
            className={["flex-1 rounded-2xl border px-3 py-2", tone.glow].join(" ")}
            style={{
              background: "var(--color-surface)",
              borderColor: "color-mix(in srgb, var(--color-border) 85%, transparent)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] tracking-[0.14em] uppercase text-orbita-secondary">{model.flow.label}</p>
                <p className="mt-1 text-xs text-orbita-secondary truncate">{model.flow.microcopy}</p>
              </div>
              <div className="h-10 w-10 shrink-0">
                <CircularProgressbar
                  value={model.flow.score}
                  text={`${model.flow.score}`}
                  styles={buildStyles({
                    textColor: "var(--color-text-primary)",
                    pathColor:
                      model.flow.color === "green"
                        ? "rgb(52 211 153)"
                        : model.flow.color === "yellow"
                          ? "rgb(251 191 36)"
                          : "rgb(251 113 133)",
                    trailColor: "color-mix(in srgb, var(--color-border) 55%, transparent)",
                    textSize: "32px",
                  })}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

