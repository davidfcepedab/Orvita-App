"use client"

import { motion } from "framer-motion"
import type { ChangeEvent, RefObject } from "react"
import Link from "next/link"
import { Activity, Brain, Droplets, History, ImageIcon, Pencil, RefreshCw, Scale, Settings2, Sparkles } from "lucide-react"
import type { ZoneProgress, ZoneStatus } from "@/lib/training/effectiveSets"
import type { DeltaQuality } from "@/lib/training/trainingDashboardDerivations"
import { deltaQualityLabel } from "@/lib/training/trainingDashboardDerivations"
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type TrendRow = { label: string; progressPct: number }

type SyncChips = { apple: boolean; hevy: boolean; manual: boolean }

type Props = {
  visualDescription: string
  priorityTitle: string
  priorityLevelLabel: string
  deadlineYm: string | null
  deadlineDisplay: string | null
  goalImageUrl?: string | null
  zones: ZoneProgress[]
  objective: string
  weightLabel: string
  bodyFatLabel: string
  leanMassLabel: string
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
  settingsHref: string
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

function statusBarColor(s: ZoneStatus): string {
  if (s === "bien") return "bg-emerald-500"
  if (s === "en desarrollo") return "bg-blue-500"
  if (s === "sobrecarga") return "bg-rose-500"
  return "bg-amber-500"
}

function statusClasses(s: ZoneStatus): string {
  if (s === "bien") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (s === "en desarrollo") return "border-blue-200 bg-blue-50 text-blue-800"
  if (s === "sobrecarga") return "border-rose-200 bg-rose-50 text-rose-800"
  return "border-amber-200 bg-amber-50 text-amber-900"
}

function zoneHint(zone: ZoneProgress): string {
  if (zone.status === "bien") return "Mantén el ritmo y la técnica."
  if (zone.status === "en desarrollo") return `Añade un bloque extra de ${zone.label.toLowerCase()} esta semana.`
  if (zone.status === "sobrecarga") return `Baja un poco la carga en ${zone.label.toLowerCase()}.`
  return `Prioriza ${zone.label.toLowerCase()} en la próxima sesión.`
}

function deltaClass(q: DeltaQuality): string {
  if (q === "good") return "text-emerald-600"
  if (q === "warn") return "text-amber-600"
  return "text-slate-500"
}

export function VisualGoalGenerator({
  visualDescription,
  priorityTitle,
  priorityLevelLabel,
  deadlineYm,
  deadlineDisplay,
  goalImageUrl,
  zones,
  objective,
  weightLabel,
  bodyFatLabel,
  leanMassLabel,
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
  settingsHref,
  goalImageGenerating,
  onGenerateImage,
  onPickReference,
  onFileChange,
  fileInputRef,
  notice,
}: Props) {
  const _deadline = deadlineDisplay ?? (deadlineYm ? deadlineYm : "Sin fecha")
  const hasChart = chartPoints.length >= 2

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38 }}
      className="rounded-[36px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="h-1 w-6 rounded-full bg-blue-500" aria-hidden />
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Objetivo visual</p>
          </div>
          <h2 className="m-0 mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Physical <span className="text-blue-600">Vision.</span>
          </h2>
          <p className="m-0 mt-1 text-[11px] text-slate-500">
            Prioridad y meta temporal se definen en{" "}
            <Link href={settingsHref} className="font-semibold text-blue-600 underline-offset-2 hover:underline">
              preferencias
            </Link>
            .
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-800">
          Visible
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-0">
          <div className="sm:pr-4">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Prioridad</p>
            <p className="m-0 mt-1 text-lg font-bold text-slate-900">{priorityTitle}</p>
            <p className="m-0 mt-0.5 text-xs text-slate-500">{priorityLevelLabel}</p>
          </div>
          <div className="hidden w-px bg-slate-200 sm:block" aria-hidden />
          <div className="border-t border-slate-200 pt-4 sm:border-t-0 sm:pl-4 sm:pt-0">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Meta temporal</p>
            <p className="m-0 mt-1 text-lg font-bold text-slate-900">{_deadline}</p>
            {deadlineYm ? <p className="m-0 mt-0.5 text-xs text-slate-500">Referencia: {deadlineYm}</p> : null}
          </div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
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
              <p className="m-0 text-xs font-semibold text-white">{objective}</p>
            </div>
            <button
              type="button"
              aria-label="Subir referencia"
              onClick={onPickReference}
              className="absolute bottom-2.5 right-2.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/25 bg-white/15 text-white backdrop-blur transition hover:bg-white/25"
            >
              <Settings2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onGenerateImage}
              disabled={goalImageGenerating}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 text-blue-500" aria-hidden />
              {goalImageGenerating ? "Generando…" : "Imagen IA"}
            </button>
            <button
              type="button"
              onClick={onPickReference}
              className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-transparent px-3.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            >
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
              Subir foto
            </button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          {notice ? <p className="m-0 text-xs text-slate-500">{notice}</p> : null}

          <div className="rounded-2xl border border-slate-200 bg-blue-50/40 px-3 py-2.5">
            <div className="flex items-start gap-2">
              <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" aria-hidden />
              <p className="m-0 text-xs leading-relaxed text-slate-700">
                {(visualDescription ?? "").trim() || "Escribe aquí el prompt para la imagen IA (cuerpo, estilo, referencias)."}
              </p>
            </div>
          </div>
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
              <MetricPill icon="muscle" label="Masa magra" value={leanMassLabel} delta={leanDelta} deltaQuality={leanDeltaQuality} />
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
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartPoints} margin={{ top: 10, right: 10, left: 4, bottom: 4 }}>
                    <defs>
                      <linearGradient id="wAreaTraining" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="4 4" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="w"
                      orientation="left"
                      width={44}
                      tick={{ fontSize: 10, fill: "#3b82f6" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}kg`}
                      domain={["dataMin - 0.5", "dataMax + 0.5"]}
                    />
                    <YAxis
                      yAxisId="f"
                      orientation="right"
                      width={40}
                      tick={{ fontSize: 10, fill: "#fb923c" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={["dataMin - 0.4", "dataMax + 0.4"]}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 11 }}
                      formatter={(value, name) => {
                        const v = typeof value === "number" ? value : Number(value)
                        return [String(name) === "weight" ? `${v} kg` : `${v}%`, String(name) === "weight" ? "Peso" : "Grasa"]
                      }}
                    />
                    <Legend wrapperStyle={{ display: "none" }} />
                    <Area yAxisId="w" type="monotone" dataKey="weight" stroke="none" fill="url(#wAreaTraining)" />
                    <Line
                      yAxisId="w"
                      type="monotone"
                      dataKey="weight"
                      name="weight"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      strokeDasharray="4 3"
                      dot={{ r: 3, fill: "#3b82f6", strokeWidth: 0 }}
                    />
                    <Line
                      yAxisId="f"
                      type="monotone"
                      dataKey="fatPct"
                      name="fatPct"
                      stroke="#fb923c"
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#fb923c", stroke: "#fff", strokeWidth: 2 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <p className="m-0 flex h-full items-center justify-center px-2 text-center text-xs text-slate-500">
                  Añade peso y % grasa en tus métricas corporales para ver la tendencia.
                </p>
              )}
            </div>
          </div>

          <div>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Progreso por grupo</p>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {zones.map((zone) => (
                <ZoneCard key={zone.key} zone={zone} />
              ))}
            </div>
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
      Sync · {label}
      {!on ? " · —" : ""}
    </span>
  )
}

function ZoneCard({ zone }: { zone: ZoneProgress }) {
  const w = Math.min(100, Math.round(zone.progress))
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="m-0 text-sm font-semibold text-slate-900">{zone.label}</p>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${statusClasses(zone.status)}`}>
          {statusLabel(zone.status)}
        </span>
      </div>
      <p className="m-0 mt-1 text-[11px] tabular-nums text-slate-500">
        {zone.actualSets > 0 ? (
          <>
            {zone.actualSets.toFixed(1)} / {zone.targetSets} sets · {w}%
          </>
        ) : (
          "Sin datos esta semana"
        )}
      </p>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
        <motion.div
          className={`h-full rounded-full ${statusBarColor(zone.status)}`}
          initial={{ width: 0 }}
          animate={{ width: `${w}%` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
        />
      </div>
      <p className="m-0 mt-1.5 text-[11px] leading-snug text-slate-500">{zoneHint(zone)}</p>
    </motion.div>
  )
}

function MetricPill({
  icon,
  label,
  value,
  delta,
  deltaQuality,
}: {
  icon: "scale" | "drop" | "muscle"
  label: string
  value: string
  delta?: string
  deltaQuality: DeltaQuality
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <p className="m-0 text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="m-0 mt-0.5 text-base font-bold tracking-tight text-slate-900">{value}</p>
      {delta ? <p className={`m-0 mt-0.5 text-[10px] font-semibold ${deltaClass(deltaQuality)}`}>{delta}</p> : null}
      <p className="m-0 mt-0.5 text-[9px] text-slate-400">{deltaQualityLabel(deltaQuality)}</p>
      <div className="mt-1 flex justify-end text-slate-300">
        {icon === "scale" ? <Scale className="h-4 w-4" aria-hidden /> : null}
        {icon === "drop" ? <Droplets className="h-4 w-4" aria-hidden /> : null}
        {icon === "muscle" ? <Activity className="h-4 w-4" aria-hidden /> : null}
      </div>
    </div>
  )
}
