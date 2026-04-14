"use client"

import { useEffect, useMemo, useState } from "react"
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
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [])
  const parts = useMemo(() => formatBogotaDateParts(now, model.user.tz), [now, model.user.tz])
  const greeting = useMemo(() => greetingForWeekday(parts.weekday.toLowerCase()), [parts.weekday])

  const tone = flowToneClasses(model.flow.color)

  /** Legibilidad del saludo sobre el lienzo (sticky sin panel de fondo). */
  const greetingLiftStyle = {
    textShadow:
      "0 1px 0 color-mix(in srgb, var(--color-surface) 88%, var(--color-background)), 0 0 18px color-mix(in srgb, var(--color-background) 22%, transparent)",
  } as const

  return (
    <div className="sticky top-0 z-20 -mx-4 bg-transparent px-4 pt-4 pb-3">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p
              className="m-0 text-sm leading-snug text-orbita-secondary sm:text-[15px]"
              style={greetingLiftStyle}
            >
              <span className="font-semibold tracking-tight text-orbita-primary">
                {greeting}, {model.user.firstName}
              </span>
              <span className="hidden text-orbita-primary/85 sm:inline">
                {" "}
                · Mantén el rumbo, reduce fricción y compra claridad.
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={[
                "hidden sm:flex items-center gap-3 rounded-2xl border px-3 py-2 shadow-card ring-1 ring-orbita-border/35",
                tone.glow,
              ].join(" ")}
              style={{
                background: "var(--color-surface)",
                borderColor: "color-mix(in srgb, var(--color-border) 72%, var(--color-text-primary))",
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
                <p className="mt-1 max-w-[260px] truncate text-[13px] leading-snug text-orbita-primary/90">
                  {model.flow.microcopy}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => void onGenerateAi()}
              disabled={isGenerating}
              className="inline-flex h-10 min-w-[168px] shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-sm font-semibold shadow-card ring-1 ring-orbita-border/25 sm:px-4"
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

        <div className="mt-3 flex items-center justify-between gap-3 sm:hidden">
          <div
            className={["flex-1 rounded-2xl border px-3 py-2 shadow-card ring-1 ring-orbita-border/35", tone.glow].join(
              " ",
            )}
            style={{
              background: "var(--color-surface)",
              borderColor: "color-mix(in srgb, var(--color-border) 72%, var(--color-text-primary))",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-orbita-primary">
                  {model.flow.label}
                </p>
                <p className="mt-1 truncate text-[13px] leading-snug text-orbita-primary/90">{model.flow.microcopy}</p>
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

