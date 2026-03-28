"use client"

import type { ChangeEvent, Ref, RefObject } from "react"
import { useMemo } from "react"
import Image from "next/image"
import { Activity, ArrowDown, ArrowUp, Calendar, Sparkles, Zap } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import type { BodyMetricDisplayRow, VisualGoalPriority } from "@/lib/training/trainingPrefsTypes"

const HERO_BG = "#0A0A0A"
const MINT = "#2DD4BF"
const GOOD = "#22C55E"
const BAD = "#F87171"

const SHRINK_GOOD_DOWN = new Set(["Peso Corporal", "% de Grasa", "Cintura", "Cadera"])

function isTrendPositive(label: string, trend: "up" | "down") {
  if (SHRINK_GOOD_DOWN.has(label)) return trend === "down"
  return trend === "up"
}

function formatDeadlineBadge(ym: string): string {
  const [y, m] = ym.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) return ym.toUpperCase()
  const mon = ["ENE", "FEB", "MAR", "ABR", "MAY", "JUN", "JUL", "AGO", "SEP", "OCT", "NOV", "DIC"][m - 1]
  return `${mon} ${y}`
}

function targetUnitLabel(row: BodyMetricDisplayRow): string {
  if (row.label === "Peso Corporal") return `${row.target} KG`
  if (row.label === "% de Grasa") return `${row.target} %`
  return `${row.target} CM`
}

function nextSundayShortLabel(): string {
  const short = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
  const d = new Date().getDay()
  if (d === 0) return "Hoy"
  return short[0]!
}

export type TrainingVisualBodySectionProps = {
  goalImageUrl: string
  /** Imagen por defecto si no hay foto del usuario (p. ej. `/training/visual-goal-placeholder.png`). */
  placeholderImageSrc: string
  visualGoalDescription: string
  visualGoalDeadlineYm: string
  visualGoalPriority: VisualGoalPriority
  bodyRows: BodyMetricDisplayRow[]
  hints: string[]
  prefsLoading: boolean
  remotePrefs: boolean
  fileInputRef: RefObject<HTMLInputElement | null> | Ref<HTMLInputElement>
  onPickImage: () => void
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  onGenerateGoalWithAI: () => void
}

function priorityLabel(p: VisualGoalPriority): string {
  if (p === "alta") return "PRIORIDAD ALTA"
  if (p === "media") return "PRIORIDAD MEDIA"
  return "PRIORIDAD BAJA"
}

export function TrainingVisualBodySection({
  goalImageUrl,
  placeholderImageSrc,
  visualGoalDescription,
  visualGoalDeadlineYm,
  visualGoalPriority,
  bodyRows,
  hints,
  prefsLoading,
  remotePrefs,
  fileInputRef,
  onPickImage,
  onFileChange,
  onGenerateGoalWithAI,
}: TrainingVisualBodySectionProps) {
  const deadlineBadge = useMemo(() => formatDeadlineBadge(visualGoalDeadlineYm), [visualGoalDeadlineYm])
  const nextCheck = useMemo(() => nextSundayShortLabel(), [])
  const imageSrc = goalImageUrl || placeholderImageSrc
  const useUserImage = Boolean(goalImageUrl)

  const ghostActionClass =
    "rounded px-0 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400 underline-offset-2 transition hover:text-slate-700 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-300"

  return (
    <section aria-labelledby="training-visual-body-heading" className="grid gap-6">
      <input
        ref={fileInputRef as Ref<HTMLInputElement>}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      <header className="space-y-1">
        <h2
          id="training-visual-body-heading"
          className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl"
        >
          Objetivo Visual & Seguimiento Corporal
        </h2>
        <p className="flex flex-wrap items-baseline gap-x-1 text-[10px] uppercase tracking-[0.12em] text-slate-400">
          <button type="button" onClick={onPickImage} className={ghostActionClass}>
            Agregar imagen
          </button>
          <span className="select-none text-slate-300" aria-hidden>
            {" "}
            -{" "}
          </span>
          <button type="button" onClick={onGenerateGoalWithAI} className={ghostActionClass}>
            Generar con IA
          </button>
        </p>
        {prefsLoading && remotePrefs && (
          <p className="text-[10px] text-slate-400">Cargando preferencias…</p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 lg:items-stretch">
        <div className="flex min-h-0 flex-col lg:col-span-5">
          <div
            className="relative flex min-h-0 w-full flex-1 overflow-hidden rounded-3xl"
            style={{
              background: HERO_BG,
              border: "0.5px solid rgba(255,255,255,0.12)",
              boxShadow: "0 24px 48px -12px rgba(0,0,0,0.18), 0 12px 24px -8px rgba(0,0,0,0.12)",
            }}
          >
            {/* Móvil: 4:5 · Desktop: misma altura que la tarjeta (stretch) */}
            <div className="relative aspect-[4/5] w-full lg:absolute lg:inset-0 lg:aspect-auto lg:h-full">
              <Image
                src={imageSrc}
                alt={useUserImage ? "Tu imagen de objetivo corporal" : "Referencia visual de objetivo corporal"}
                fill
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 42vw"
                priority={false}
                unoptimized={useUserImage && imageSrc.startsWith("data:")}
              />
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0) 52%, rgba(10,10,10,0.12) 72%, rgba(10,10,10,0.38) 100%)",
                }}
              />

              <div className="absolute inset-x-0 bottom-0 z-[1] space-y-3 px-4 pb-5 pt-12 sm:px-6 sm:pb-6">
                <div
                  className="rounded-2xl px-4 py-3.5 text-sm leading-relaxed text-white sm:text-[15px]"
                  style={{
                    background: "rgba(0,0,0,0.52)",
                    backdropFilter: "blur(10px)",
                    WebkitBackdropFilter: "blur(10px)",
                    border: `0.5px solid rgba(255,255,255,0.14)`,
                    boxShadow: "0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)",
                  }}
                >
                  {visualGoalDescription}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white"
                    style={{
                      border: "0.5px solid rgba(255,255,255,0.28)",
                      background: "rgba(0,0,0,0.5)",
                      backdropFilter: "blur(8px)",
                    }}
                  >
                    <Calendar className="h-3.5 w-3.5 opacity-95" strokeWidth={2} />
                    {deadlineBadge}
                  </span>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.14em]"
                    style={{
                      color: GOOD,
                      border: `0.5px solid color-mix(in srgb, ${GOOD} 50%, transparent)`,
                      background: "rgba(22,101,52,0.55)",
                      backdropFilter: "blur(8px)",
                      boxShadow: `0 0 0 1px color-mix(in srgb, ${GOOD} 15%, transparent)`,
                    }}
                  >
                    <Zap className="h-3.5 w-3.5" strokeWidth={2.4} />
                    {priorityLabel(visualGoalPriority)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col lg:col-span-7">
          <Card className="h-full min-h-0 flex-1 border-slate-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:p-7">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-500" strokeWidth={2.2} />
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Estado actual vs objetivo
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                <span className="text-slate-500">
                  Última: <span className="font-medium text-slate-700">Ayer</span>
                </span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">
                  Próxima:{" "}
                  <span className="font-semibold" style={{ color: MINT }}>
                    {nextCheck}
                  </span>
                </span>
              </div>
            </div>

            <div className="mb-2 hidden grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,1.35fr)] gap-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-400 lg:grid">
              <span>Medida clave</span>
              <span>Hoy</span>
              <span>Previo</span>
              <span>Objetivo</span>
              <span>Proyección</span>
              <span className="col-span-2 pl-1">Progreso hacia meta</span>
            </div>

            <div className="flex flex-col gap-2.5">
              {bodyRows.map((row) => {
                const positive = isTrendPositive(row.label, row.trend)
                const arrowColor = positive ? GOOD : BAD
                const Arrow = row.trend === "up" ? ArrowUp : ArrowDown
                return (
                  <div
                    key={row.label}
                    className="grid gap-3 rounded-2xl bg-slate-50/90 p-3.5 sm:p-4 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,1.35fr)] lg:items-center lg:gap-2"
                    style={{ border: "0.5px solid rgba(148,163,184,0.2)" }}
                  >
                    <span className="text-sm font-semibold text-slate-800">{row.label}</span>
                    <div className="flex items-center gap-1.5 lg:justify-start">
                      <span className="text-sm tabular-nums text-slate-700">
                        {row.current}
                        {row.label === "% de Grasa" ? "%" : ""}
                      </span>
                      <Arrow className="h-4 w-4 shrink-0" strokeWidth={2.5} style={{ color: arrowColor }} aria-hidden />
                    </div>
                    <span className="text-xs text-slate-500 lg:text-sm">{row.previous}</span>
                    <span className="text-sm font-medium tabular-nums text-slate-700">{targetUnitLabel(row)}</span>
                    <span className="text-xs text-slate-500 lg:text-sm">{row.projection}</span>
                    <div className="flex items-center gap-3 lg:col-span-2">
                      <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-slate-600">
                        {row.progressPct}%
                      </span>
                      <div
                        className="h-2 min-w-0 flex-1 overflow-hidden rounded-full"
                        style={{ background: "rgba(148,163,184,0.35)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(100, Math.max(0, row.progressPct))}%`,
                            background: `linear-gradient(90deg, ${MINT} 0%, color-mix(in srgb, ${MINT} 75%, #22C55E) 100%)`,
                            boxShadow: `0 0 12px color-mix(in srgb, ${MINT} 40%, transparent)`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              className="mt-6 rounded-2xl px-4 py-4 sm:px-5 sm:py-5"
              style={{
                background: "linear-gradient(180deg, #FFF7ED 0%, #FFEDD5 100%)",
                border: "0.5px solid rgba(251, 146, 60, 0.35)",
                boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset",
              }}
            >
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-orange-700">
                <Sparkles className="h-3.5 w-3.5 text-orange-500" strokeWidth={2.4} />
                Qué debo ajustar esta semana
              </div>
              <ul className="list-disc space-y-2 pl-4 text-sm leading-snug text-red-700/90 marker:text-orange-400">
                {hints.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </section>
  )
}
