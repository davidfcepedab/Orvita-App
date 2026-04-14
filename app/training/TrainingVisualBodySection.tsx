"use client"

import type { ChangeEvent, Ref, RefObject } from "react"
import { useMemo } from "react"
import Image from "next/image"
import { Activity, ArrowDown, ArrowUp, Calendar, Loader2, Sparkles, Zap } from "lucide-react"
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
  /** Sube en cada generación con IA para forzar remount del visor (evita que la miniatura quede «congelada» con data URLs). */
  goalImageDisplayKey?: number
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
  onVisualGoalDescriptionChange: (value: string) => void
  goalImageGenerating: boolean
  goalImageAiMode: "create" | "edit"
  onGoalImageAiModeChange: (mode: "create" | "edit") => void
  onGenerateGoalWithAI: () => void | Promise<void>
}

function priorityLabel(p: VisualGoalPriority): string {
  if (p === "alta") return "PRIORIDAD ALTA"
  if (p === "media") return "PRIORIDAD MEDIA"
  return "PRIORIDAD BAJA"
}

export function TrainingVisualBodySection({
  goalImageUrl,
  goalImageDisplayKey = 0,
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
  onVisualGoalDescriptionChange,
  goalImageGenerating,
  goalImageAiMode,
  onGoalImageAiModeChange,
  onGenerateGoalWithAI,
}: TrainingVisualBodySectionProps) {
  const deadlineBadge = useMemo(() => formatDeadlineBadge(visualGoalDeadlineYm), [visualGoalDeadlineYm])
  const nextCheck = useMemo(() => nextSundayShortLabel(), [])
  const imageSrc = goalImageUrl || placeholderImageSrc
  const useUserImage = Boolean(goalImageUrl)
  const heroImageKey =
    useUserImage && imageSrc.startsWith("data:") ? `goal-${goalImageDisplayKey}` : imageSrc

  const ghostActionClass =
    "rounded px-0 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-orbita-secondary underline-offset-2 transition hover:text-orbita-primary hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orbita-border"

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
          className="text-lg font-semibold tracking-tight text-orbita-primary sm:text-xl"
        >
          Objetivo Visual & Seguimiento Corporal
        </h2>
        <p className="flex flex-wrap items-baseline gap-x-1 text-[10px] uppercase tracking-[0.12em] text-orbita-secondary">
          <button type="button" onClick={onPickImage} className={ghostActionClass}>
            Agregar imagen
          </button>
          <span className="select-none text-orbita-border" aria-hidden>
            {" "}
            -{" "}
          </span>
          <button
            type="button"
            disabled={goalImageGenerating || !visualGoalDescription.trim()}
            onClick={() => void onGenerateGoalWithAI()}
            className={`${ghostActionClass} disabled:pointer-events-none disabled:opacity-40`}
          >
            {goalImageGenerating ? (
              <span className="inline-flex items-center gap-1.5 normal-case tracking-normal">
                <Loader2 className="h-3 w-3 animate-spin" strokeWidth={2.5} aria-hidden />
                Generando…
              </span>
            ) : (
              "Generar con IA"
            )}
          </button>
        </p>
        {prefsLoading && remotePrefs && (
          <p className="text-[10px] text-orbita-secondary">Cargando preferencias…</p>
        )}
        <div className="mt-3 space-y-1.5">
          <label className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary" htmlFor="training-visual-ai-prompt">
            Prompt para la IA
          </label>
          <textarea
            id="training-visual-ai-prompt"
            value={visualGoalDescription}
            onChange={(e) => onVisualGoalDescriptionChange(e.target.value)}
            maxLength={900}
            rows={3}
            placeholder="Describe el objetivo visual: musculatura, composición corporal, iluminación, estilo de foto…"
            className="w-full resize-y rounded-xl border border-orbita-border bg-orbita-surface px-3 py-2.5 text-sm leading-relaxed text-orbita-primary shadow-sm placeholder:text-orbita-secondary focus:border-[color-mix(in_srgb,var(--color-accent-primary)_38%,var(--color-border))] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-accent-primary)_26%,transparent)]"
          />
          <fieldset className="mt-2 space-y-1.5 border-0 p-0">
            <legend className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
              Modo IA
            </legend>
            <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-snug text-orbita-secondary">
              <input
                type="radio"
                name="training-goal-ai-mode"
                className="mt-0.5"
                checked={goalImageAiMode === "create"}
                onChange={() => onGoalImageAiModeChange("create")}
              />
              <span>
                <span className="font-medium text-orbita-primary">Imagen nueva desde el prompt</span> (DALL·E 3) — escena distinta,
                recomendado para objetivos visuales llamativos. No usa tu foto.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-2 text-[11px] leading-snug text-orbita-secondary">
              <input
                type="radio"
                name="training-goal-ai-mode"
                className="mt-0.5"
                checked={goalImageAiMode === "edit"}
                onChange={() => onGoalImageAiModeChange("edit")}
              />
              <span>
                <span className="font-medium text-orbita-primary">Editar referencia</span> (DALL·E 2) — ajuste sobre tu imagen o el
                placeholder; suele cambiar poco.
              </span>
            </label>
          </fieldset>
          <p className="text-[10px] text-orbita-secondary">
            {visualGoalDescription.length}/900 · En modo edición, la base es tu imagen o el placeholder si no hay foto.
          </p>
        </div>
      </header>

      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8 lg:items-stretch">
        <div className="flex min-h-0 min-w-0 flex-col lg:col-span-5">
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
                key={heroImageKey}
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

        <div className="flex min-h-0 min-w-0 flex-col lg:col-span-7">
          <Card className="h-full min-h-0 min-w-0 flex-1 border-orbita-border/80 bg-orbita-surface/90 p-5 shadow-sm backdrop-blur-sm sm:p-7">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-orbita-secondary" strokeWidth={2.2} />
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orbita-secondary">
                  Estado actual vs objetivo
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm">
                <span className="text-orbita-secondary">
                  Última: <span className="font-medium text-orbita-primary">Ayer</span>
                </span>
                <span className="text-orbita-secondary">·</span>
                <span className="text-orbita-secondary">
                  Próxima:{" "}
                  <span className="font-semibold" style={{ color: MINT }}>
                    {nextCheck}
                  </span>
                </span>
              </div>
            </div>

            <div className="mb-2 hidden grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,1.35fr)] gap-2 text-[9px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary lg:grid">
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
                const barPct = Math.min(100, Math.max(0, row.progressPct))
                const barFillStyle = {
                  width: `${barPct}%`,
                  background: `linear-gradient(90deg, ${MINT} 0%, color-mix(in srgb, ${MINT} 75%, #22C55E) 100%)`,
                  boxShadow: `0 0 12px color-mix(in srgb, ${MINT} 40%, transparent)`,
                } as const

                return (
                  <div
                    key={row.label}
                    className="rounded-2xl bg-orbita-surface-alt/90 p-3.5 sm:p-4"
                    style={{ border: "0.5px solid color-mix(in srgb, var(--color-border) 45%, transparent)" }}
                  >
                    <div className="space-y-3 lg:hidden">
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0 text-sm font-semibold leading-snug text-orbita-primary">{row.label}</span>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <span className="text-sm tabular-nums text-orbita-primary">
                            {row.current}
                            {row.label === "% de Grasa" ? "%" : ""}
                          </span>
                          <Arrow className="h-4 w-4 shrink-0" strokeWidth={2.5} style={{ color: arrowColor }} aria-hidden />
                        </div>
                      </div>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-sm">
                        <div className="min-w-0">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-orbita-secondary">Previo</dt>
                          <dd className="mt-0.5 tabular-nums text-orbita-primary">{row.previous}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-orbita-secondary">Objetivo</dt>
                          <dd className="mt-0.5 font-medium tabular-nums text-orbita-primary">{targetUnitLabel(row)}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-orbita-secondary">Proyección</dt>
                          <dd className="mt-0.5 text-orbita-secondary">{row.projection}</dd>
                        </div>
                        <div className="min-w-0">
                          <dt className="text-[10px] font-semibold uppercase tracking-wide text-orbita-secondary">Progreso</dt>
                          <dd className="mt-0.5 font-semibold tabular-nums text-orbita-secondary">{row.progressPct}%</dd>
                        </div>
                      </dl>
                      <div className="flex items-center gap-3">
                        <span className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums text-orbita-secondary">
                          {row.progressPct}%
                        </span>
                        <div
                          className="h-2 min-w-0 flex-1 overflow-hidden rounded-full"
                          style={{
                            background: "color-mix(in srgb, var(--color-border) 55%, transparent)",
                          }}
                        >
                          <div className="h-full rounded-full transition-all" style={barFillStyle} />
                        </div>
                      </div>
                    </div>

                    <div className="hidden gap-2 lg:grid lg:grid-cols-[minmax(0,1.5fr)_minmax(0,0.85fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,0.75fr)_minmax(0,1.35fr)] lg:items-center">
                      <span className="text-sm font-semibold text-orbita-primary">{row.label}</span>
                      <div className="flex items-center gap-1.5 lg:justify-start">
                        <span className="text-sm tabular-nums text-orbita-primary">
                          {row.current}
                          {row.label === "% de Grasa" ? "%" : ""}
                        </span>
                        <Arrow className="h-4 w-4 shrink-0" strokeWidth={2.5} style={{ color: arrowColor }} aria-hidden />
                      </div>
                      <span className="text-xs text-orbita-secondary lg:text-sm">{row.previous}</span>
                      <span className="text-sm font-medium tabular-nums text-orbita-primary">{targetUnitLabel(row)}</span>
                      <span className="text-xs text-orbita-secondary lg:text-sm">{row.projection}</span>
                      <div className="flex items-center gap-3 lg:col-span-2">
                        <span className="w-9 shrink-0 text-right text-xs font-semibold tabular-nums text-orbita-secondary">
                          {row.progressPct}%
                        </span>
                        <div
                          className="h-2 min-w-0 flex-1 overflow-hidden rounded-full"
                          style={{
                            background: "color-mix(in srgb, var(--color-border) 55%, transparent)",
                          }}
                        >
                          <div className="h-full rounded-full transition-all" style={barFillStyle} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              className="mt-6 rounded-2xl px-4 py-4 sm:px-5 sm:py-5"
              style={{
                background:
                  "linear-gradient(180deg, color-mix(in srgb, var(--color-accent-warning) 14%, var(--color-surface)) 0%, color-mix(in srgb, var(--color-accent-warning) 9%, var(--color-surface-alt)) 100%)",
                border: "0.5px solid color-mix(in srgb, var(--color-accent-warning) 38%, var(--color-border))",
                boxShadow: "0 1px 0 color-mix(in srgb, var(--color-surface) 65%, transparent) inset",
              }}
            >
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-accent-warning)]">
                <Sparkles className="h-3.5 w-3.5 text-[var(--color-accent-warning)]" strokeWidth={2.4} />
                Qué debo ajustar esta semana
              </div>
              <ul className="list-disc space-y-2 pl-4 text-sm leading-snug text-pretty text-[color-mix(in_srgb,var(--color-accent-danger)_88%,var(--color-text-primary))] marker:text-[var(--color-accent-warning)]">
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
