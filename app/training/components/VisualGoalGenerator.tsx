"use client"

import { motion } from "framer-motion"
import dynamic from "next/dynamic"
import { useEffect, useState, type ChangeEvent, type RefObject } from "react"
import { Activity, Brain, Droplets, History, ImageIcon, RefreshCw, Scale, Settings2, Sparkles } from "lucide-react"
import type { ZoneProgress, ZoneStatus } from "@/lib/training/effectiveSets"
import type { DeltaQuality } from "@/lib/training/trainingDashboardDerivations"
import { deltaQualityLabel } from "@/lib/training/trainingDashboardDerivations"
import type { BodyMetricDisplayRow, TrainingPreferencesPayload, VisualGoalMode, VisualGoalPriority } from "@/lib/training/trainingPrefsTypes"
import { VISUAL_GOAL_MODE_OPTIONS } from "@/lib/training/visualGoalModeLabels"

const BodyCompositionChart = dynamic(() => import("./charts/BodyCompositionChart").then((m) => m.BodyCompositionChart), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-[10px] text-slate-400">Cargando gráfico…</div>
  ),
})

type SyncChips = { apple: boolean; hevy: boolean; manual: boolean }

type VisualPrefsPatch = Partial<
  Pick<TrainingPreferencesPayload, "visualGoalDescription" | "visualGoalDeadlineYm" | "visualGoalPriority" | "visualGoalMode">
>

type Props = {
  visualDescription: string
  visualGoalPriority: VisualGoalPriority
  visualGoalMode: VisualGoalMode
  onVisualPrefsChange: (patch: VisualPrefsPatch) => void
  bodyMetricRows: BodyMetricDisplayRow[]
  deadlineYm: string | null
  deadlineDisplay: string | null
  goalImageUrl?: string | null
  zones: ZoneProgress[]
  objective: string
  weightLabel: string
  bodyFatLabel: string
  leanMassLabel: string
  leanMassFootnote?: string
  weightDelta?: string
  fatDelta?: string
  leanDelta?: string
  weightDeltaQuality: DeltaQuality
  fatDeltaQuality: DeltaQuality
  leanDeltaQuality: DeltaQuality
  chartPoints: { label: string; weight: number; fatPct: number }[]
  coachInsight: string
  coachExtras?: string[]
  syncChips: SyncChips
  goalImageGenerating: boolean
  onGenerateImage: () => void
  onPickReference: () => void
  onFileChange: (e: ChangeEvent<HTMLInputElement>) => void
  fileInputRef: RefObject<HTMLInputElement>
  notice?: string | null
}

function statusLabel(s: ZoneStatus): string {
  if (s === "bien") return "Bien"
  if (s === "en desarrollo") return "En desarrollo"
  if (s === "sobrecarga") return "Sobrecarga"
  return "Rezagado"
}

/** Semántica: bien = verde, desarrollo = ámbar, rezagado/sobrecarga = rojo. */
function statusBarColor(s: ZoneStatus): string {
  if (s === "bien") return "bg-emerald-500"
  if (s === "en desarrollo") return "bg-amber-500"
  if (s === "sobrecarga") return "bg-rose-500"
  return "bg-rose-500"
}

function statusClasses(s: ZoneStatus): string {
  if (s === "bien") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (s === "en desarrollo") return "border-amber-200 bg-amber-50 text-amber-900"
  if (s === "sobrecarga") return "border-rose-200 bg-rose-50 text-rose-800"
  return "border-rose-200 bg-rose-50 text-rose-900"
}

function deltaClass(q: DeltaQuality): string {
  if (q === "good") return "text-emerald-600"
  if (q === "warn") return "text-amber-600"
  return "text-slate-500"
}

function trendGlyph(trend: "up" | "down"): { symbol: string; className: string } {
  if (trend === "down") return { symbol: "↓", className: "text-emerald-600" }
  return { symbol: "↑", className: "text-emerald-600" }
}

export function VisualGoalGenerator({
  visualDescription,
  visualGoalPriority,
  visualGoalMode,
  onVisualPrefsChange,
  bodyMetricRows,
  deadlineYm,
  deadlineDisplay,
  goalImageUrl,
  zones,
  objective,
  weightLabel,
  bodyFatLabel,
  leanMassLabel,
  leanMassFootnote,
  weightDelta,
  fatDelta,
  leanDelta,
  weightDeltaQuality,
  fatDeltaQuality,
  leanDeltaQuality,
  chartPoints,
  coachInsight,
  coachExtras,
  syncChips,
  goalImageGenerating,
  onGenerateImage,
  onPickReference,
  onFileChange,
  fileInputRef,
  notice,
}: Props) {
  const _deadline = deadlineDisplay ?? (deadlineYm ? deadlineYm : "Sin fecha")
  const hasChart = chartPoints.length >= 2
  const [descDraft, setDescDraft] = useState(visualDescription)

  useEffect(() => {
    setDescDraft(visualDescription)
  }, [visualDescription])

  const priorityOptions: { id: VisualGoalPriority; label: string }[] = [
    { id: "alta", label: "Alta" },
    { id: "media", label: "Media" },
    { id: "baja", label: "Baja" },
  ]

  const modeMeta = VISUAL_GOAL_MODE_OPTIONS.find((o) => o.id === visualGoalMode)
  const overlayCaption = (() => {
    const t = (visualDescription ?? "").trim()
    if (!t) return objective
    if (t.length <= 120) return t
    return `${t.slice(0, 117)}…`
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38 }}
      className="rounded-[36px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="space-y-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <div>
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Descripción del objetivo</p>
          <textarea
            value={descDraft}
            onChange={(e) => setDescDraft(e.target.value)}
            onBlur={() => onVisualPrefsChange({ visualGoalDescription: descDraft.trim() })}
            rows={3}
            className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Ej. cuerpo atlético, % grasa objetivo, estilo de vida…"
          />
          <p className="m-0 mt-1.5 text-[10px] leading-snug text-slate-500">
            Este texto alimenta la imagen de referencia (IA) y el contexto del plan. Una sola fuente: edítalo aquí.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Prioridad</p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {priorityOptions.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => onVisualPrefsChange({ visualGoalPriority: o.id })}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 ${
                    visualGoalPriority === o.id
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <div className="mt-3 min-w-0">
              <label htmlFor="visual-goal-mode" className="block min-w-0">
                <span className="mb-1 block text-[11px] font-medium leading-normal tracking-normal text-slate-500">
                  Tipo de objetivo
                </span>
                <select
                  id="visual-goal-mode"
                  value={visualGoalMode}
                  onChange={(e) => onVisualPrefsChange({ visualGoalMode: e.target.value as VisualGoalMode })}
                  className="w-full min-w-0 rounded-lg border border-slate-200/90 bg-slate-50/60 py-1.5 pl-2.5 pr-8 text-xs font-medium text-slate-700 shadow-none transition-colors hover:bg-slate-50 hover:border-slate-300/90 focus:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-200/80"
                >
                  {VISUAL_GOAL_MODE_OPTIONS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {modeMeta ? <p className="m-0 mt-1.5 text-[11px] leading-snug text-slate-500">{modeMeta.short}</p> : null}
          </div>
          <div>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Meta temporal</p>
            <input
              type="month"
              value={deadlineYm ?? ""}
              onChange={(e) => onVisualPrefsChange({ visualGoalDeadlineYm: e.target.value })}
              className="mt-1.5 w-full max-w-[14rem] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            {deadlineYm ? (
              <p className="m-0 mt-1 text-[11px] leading-snug text-slate-600">
                <span className="font-semibold text-slate-800">{_deadline ?? deadlineYm}</span>
                <span className="text-slate-500"> · guardado en preferencias como </span>
                <span className="font-mono text-[10px] text-slate-500">{deadlineYm}</span>
              </p>
            ) : (
              <p className="m-0 mt-1 text-[11px] text-slate-500">Sin fecha objetivo (elige mes/año arriba).</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="h-1 w-6 rounded-full bg-blue-500" aria-hidden />
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Objetivo visual</p>
          </div>
          <h2 className="m-0 mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Physical <span className="text-blue-600">Vision.</span>
          </h2>
          <p className="m-0 mt-1 text-[11px] text-slate-500">
            Referencia visual, métricas corporales de preferencias y lecturas automáticas (Apple / Hevy / check-in).
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 lg:gap-8">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100">
            {goalImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={goalImageUrl} alt="Proyección física de referencia" className="aspect-[3/4] w-full object-cover" />
            ) : (
              <div className="flex aspect-[3/4] min-h-[240px] flex-col items-center justify-center gap-2 px-5 text-center text-sm text-slate-500">
                <ImageIcon className="h-9 w-9 text-slate-300" aria-hidden />
                <p className="m-0">Genera o sube una referencia (3:4) para anclar tu objetivo.</p>
              </div>
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/88 to-transparent px-3 py-3">
              <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-300">Proyección IA</p>
              <p className="m-0 text-xs font-semibold text-white">{overlayCaption}</p>
            </div>
            <button
              type="button"
              aria-label="Subir referencia"
              onClick={onPickReference}
              className="absolute bottom-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white backdrop-blur transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            >
              <Settings2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGenerateImage}
              disabled={goalImageGenerating}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-500" aria-hidden />
              {goalImageGenerating ? "Generando…" : "Imagen IA"}
            </button>
            <button
              type="button"
              onClick={onPickReference}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-transparent px-3.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Subir foto
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          {notice ? <p className="m-0 text-xs text-slate-500">{notice}</p> : null}
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <div>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">Métricas automáticas</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <SyncChip on={syncChips.apple} label="Apple Health" />
              <SyncChip on={syncChips.hevy} label="Hevy" />
              <SyncChip on={syncChips.manual} label="Check-in manual" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <MetricPill
                icon="scale"
                label="Peso"
                value={weightLabel}
                delta={weightDelta}
                deltaQuality={weightDeltaQuality}
              />
              <MetricPill icon="drop" label="% grasa" value={bodyFatLabel} delta={fatDelta} deltaQuality={fatDeltaQuality} />
              <MetricPill
                icon="muscle"
                label="Masa magra"
                value={leanMassLabel}
                delta={leanDelta}
                deltaQuality={leanDeltaQuality}
                footnote={leanMassFootnote}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-slate-400">
                <History className="h-3.5 w-3.5" aria-hidden />
                <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Peso / % grasa</p>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-blue-500" aria-hidden />
                  Peso
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-orange-400" aria-hidden />
                  Grasa
                </span>
              </div>
            </div>
            <div className="mt-2 h-[168px]">
              {hasChart ? (
                <BodyCompositionChart chartPoints={chartPoints} />
              ) : (
                <p className="m-0 flex h-full items-center justify-center px-2 text-center text-xs text-slate-500">
                  Añade peso y % grasa en tus métricas corporales para ver la tendencia.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Estado actual vs objetivo</p>
            <p className="m-0 mt-1 max-w-2xl text-[10px] leading-snug text-slate-500">
              Objetivo, proyección y % de meta vienen del listado guardado en preferencias de entrenamiento (
              <span className="font-mono text-[9px] text-slate-600">bodyMetrics</span>
              ), el mismo JSON que persiste imagen y plan de comidas (local y, con sesión,{" "}
              <span className="font-mono text-[9px] text-slate-600">/api/training/preferences</span>). La página Configuración
              general no edita esta tabla.
            </p>
            {bodyMetricRows.length ? (
              <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full min-w-[520px] border-collapse text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/90 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                      <th className="px-2 py-2">Medida</th>
                      <th className="px-2 py-2">Hoy</th>
                      <th className="px-2 py-2">Previo</th>
                      <th className="px-2 py-2">Objetivo</th>
                      <th className="px-2 py-2">Proyección</th>
                      <th className="px-2 py-2">Meta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bodyMetricRows.map((row) => {
                      const tg = trendGlyph(row.trend)
                      return (
                        <tr key={row.label} className="border-b border-slate-50 last:border-0">
                          <td className="px-2 py-2 font-semibold text-slate-900">{row.label}</td>
                          <td className="px-2 py-2 tabular-nums text-slate-800">
                            <span className="inline-flex items-center gap-0.5">
                              {row.current} <span className={`text-xs font-bold ${tg.className}`}>{tg.symbol}</span>
                            </span>
                          </td>
                          <td className="px-2 py-2 tabular-nums text-slate-600">{row.previous}</td>
                          <td className="px-2 py-2 tabular-nums text-slate-600">{row.target}</td>
                          <td className="px-2 py-2 tabular-nums text-slate-600">{row.projection}</td>
                          <td className="px-2 py-2">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 min-w-[48px] flex-1 overflow-hidden rounded-full bg-slate-100">
                                <div
                                  className="h-full rounded-full bg-teal-500"
                                  style={{ width: `${Math.min(100, Math.max(0, row.progressPct))}%` }}
                                />
                              </div>
                              <span className="shrink-0 tabular-nums text-[10px] font-semibold text-slate-600">{row.progressPct}%</span>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="m-0 mt-2 text-xs leading-snug text-slate-500">
                Sin filas en <span className="font-mono text-[10px]">bodyMetrics</span>. En modo demo se muestran datos de ejemplo;
                en producción el listado llega vacío hasta que se rellene vía preferencias de entrenamiento.
              </p>
            )}
          </div>

          <div>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Volumen por grupo (Hevy · esta semana)</p>
            <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
              <table className="w-full min-w-[400px] border-collapse text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/90 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-2 py-2">Grupo</th>
                    <th className="px-2 py-2">Sets hechos</th>
                    <th className="px-2 py-2">Meta sets</th>
                    <th className="px-2 py-2">Avance</th>
                    <th className="px-2 py-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {zones.map((zone) => {
                    const w = Math.min(100, Math.round(zone.progress))
                    return (
                      <tr key={zone.key} className="border-b border-slate-50 last:border-0">
                        <td className="px-2 py-2 font-semibold text-slate-900">{zone.label}</td>
                        <td className="px-2 py-2 tabular-nums text-slate-800">{zone.actualSets > 0 ? zone.actualSets.toFixed(1) : "—"}</td>
                        <td className="px-2 py-2 tabular-nums text-slate-600">{zone.targetSets}</td>
                        <td className="px-2 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 min-w-[56px] flex-1 overflow-hidden rounded-full bg-slate-100">
                              <motion.div
                                className={`h-full rounded-full ${statusBarColor(zone.status)}`}
                                initial={{ width: 0 }}
                                animate={{ width: `${w}%` }}
                                transition={{ type: "spring", stiffness: 120, damping: 18 }}
                              />
                            </div>
                            <span className="shrink-0 tabular-nums text-[10px] font-semibold text-slate-600">{w}%</span>
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${statusClasses(zone.status)}`}>
                            {statusLabel(zone.status)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {zones.length ? (
              <p className="m-0 mt-2 text-[10px] leading-snug text-slate-400">
                Colores: verde = en rango, ámbar = puedes sumar volumen, rojo = rezagado o sobrecarga.
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl bg-slate-900 px-4 py-3.5 text-white">
            <div className="flex flex-wrap items-start gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/25 text-blue-300">
                <Brain className="h-4 w-4" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[9px] font-semibold uppercase tracking-[0.2em] text-blue-300/95">Guía del día</p>
                <p className="m-0 mt-1 text-sm leading-relaxed text-slate-100">{coachInsight}</p>
                {coachExtras && coachExtras.length > 0 ? (
                  <ul className="m-0 mt-2 list-none space-y-1 p-0 text-xs text-slate-300">
                    {coachExtras.slice(0, 2).map((line) => (
                      <li key={line}>· {line}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function SyncChip({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
        on ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-slate-50 text-slate-400"
      }`}
    >
      {label}
      {!on ? " · —" : ""}
    </span>
  )
}

function MetricPill({
  icon,
  label,
  value,
  delta,
  deltaQuality,
  footnote,
}: {
  icon: "scale" | "drop" | "muscle"
  label: string
  value: string
  delta?: string
  deltaQuality: DeltaQuality
  footnote?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-3.5">
      <p className="m-0 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="m-0 mt-1 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{value}</p>
      {delta ? <p className={`m-0 mt-1 text-[11px] font-semibold ${deltaClass(deltaQuality)}`}>{delta}</p> : null}
      <p className="m-0 mt-1 text-[10px] text-slate-500">{deltaQualityLabel(deltaQuality)}</p>
      {footnote ? <p className="m-0 mt-1.5 text-[10px] leading-snug text-slate-500">{footnote}</p> : null}
      <div className="mt-1 flex justify-end text-slate-300">
        {icon === "scale" ? <Scale className="h-4 w-4" aria-hidden /> : null}
        {icon === "drop" ? <Droplets className="h-4 w-4" aria-hidden /> : null}
        {icon === "muscle" ? <Activity className="h-4 w-4" aria-hidden /> : null}
      </div>
    </div>
  )
}
