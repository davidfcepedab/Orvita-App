"use client"

import { motion } from "framer-motion"
import type { ChangeEvent, RefObject } from "react"
import { Activity, Brain, Droplets, ImageIcon, RefreshCw, Scale, Settings2, Sparkles } from "lucide-react"
import type { ZoneProgress, ZoneStatus } from "@/lib/training/effectiveSets"
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

export type TrendRow = { label: string; progressPct: number }

type Props = {
  visualDescription: string
  priority: string
  deadlineYm: string | null
  goalImageUrl?: string | null
  zones: ZoneProgress[]
  objective: string
  trendRows: TrendRow[]
  weightLabel: string
  bodyFatLabel: string
  leanMassLabel: string
  weightDelta?: string
  fatDelta?: string
  leanDelta?: string
  chartPoints: { label: string; weight: number; fatPct: number }[]
  aiBullets: string[]
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

function statusClasses(s: ZoneStatus): string {
  if (s === "bien") return "border-emerald-200 bg-emerald-50 text-emerald-800"
  if (s === "en desarrollo") return "border-blue-200 bg-blue-50 text-blue-800"
  if (s === "sobrecarga") return "border-rose-200 bg-rose-50 text-rose-800"
  return "border-amber-200 bg-amber-50 text-amber-900"
}

function zoneHint(zone: ZoneProgress): string {
  if (zone.status === "bien") return "Mantén el ritmo actual y consolida técnica."
  if (zone.status === "en desarrollo") return `Refuerza ${zone.label.toLowerCase()} con 1 bloque extra esta semana.`
  if (zone.status === "sobrecarga") return `Baja carga en ${zone.label.toLowerCase()} y prioriza recuperación.`
  return `Prioriza ${zone.label.toLowerCase()} en la próxima sesión para activar progreso.`
}

export function VisualGoalGenerator({
  visualDescription,
  priority,
  deadlineYm,
  goalImageUrl,
  zones,
  objective,
  trendRows,
  weightLabel,
  bodyFatLabel,
  leanMassLabel,
  weightDelta,
  fatDelta,
  leanDelta,
  chartPoints,
  aiBullets,
  goalImageGenerating,
  onGenerateImage,
  onPickReference,
  onFileChange,
  fileInputRef,
  notice,
}: Props) {
  const insight = aiBullets[0] ?? "Sincroniza Hevy y Apple Health para afinar la proyección física."

  return (
    <div className="flex flex-col gap-5">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38 }}
        className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Órvita OS · Physical Vision</p>
            <h2 className="m-0 mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Physical Vision</h2>
            <p className="m-0 mt-1 text-xs uppercase tracking-widest text-slate-400">
              Prioridad: <span className="font-semibold text-slate-600">{priority}</span>
              {deadlineYm ? (
                <>
                  {" "}
                  · Meta temporal: <span className="font-semibold text-slate-600">{deadlineYm}</span>
                </>
              ) : null}
            </p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
            Visible
          </span>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
          <div className="flex flex-col gap-3">
            <div className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-inner">
              {goalImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={goalImageUrl} alt="Proyección física de referencia" className="aspect-[3/4] w-full object-cover sm:max-h-[420px]" />
              ) : (
                <div className="flex aspect-[3/4] min-h-[280px] flex-col items-center justify-center gap-2 px-6 text-center text-sm text-slate-500">
                  <ImageIcon className="h-10 w-10 text-slate-300" aria-hidden />
                  <p className="m-0">Genera o sube una referencia visual para anclar tu hipertrofia magra.</p>
                </div>
              )}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/85 to-transparent px-4 py-4">
                <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-300">Proyección IA</p>
                <p className="m-0 mt-1 text-sm font-semibold text-white">{objective}</p>
              </div>
              <button
                type="button"
                aria-label="Ajustes de referencia"
                onClick={onPickReference}
                className="absolute bottom-3 right-3 inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur transition hover:bg-white/20"
              >
                <Settings2 className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={onGenerateImage}
                disabled={goalImageGenerating}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
              >
                <Sparkles className="h-4 w-4" aria-hidden />
                {goalImageGenerating ? "Generando…" : "Generar imagen IA"}
              </button>
              <button
                type="button"
                onClick={onPickReference}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
              >
                <RefreshCw className="h-4 w-4" aria-hidden />
                Actualizar referencia
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
            {notice ? <p className="m-0 text-xs text-slate-500">{notice}</p> : null}
            <p className="m-0 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
              {(visualDescription ?? "").trim() || "Describe tu objetivo visual para orientar volumen, déficit y frecuencia."}
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <MetricPill icon="scale" label="Peso" value={weightLabel} delta={weightDelta} />
              <MetricPill icon="drop" label="% grasa" value={bodyFatLabel} delta={fatDelta} />
              <MetricPill icon="muscle" label="Masa magra" value={leanMassLabel} delta={leanDelta} />
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Tendencia peso / grasa</p>
              <div className="mt-2 h-[160px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartPoints} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="w" hide domain={["dataMin - 1", "dataMax + 1"]} />
                    <YAxis yAxisId="f" orientation="right" hide domain={["dataMin - 0.5", "dataMax + 0.5"]} />
                    <Tooltip
                      contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", fontSize: 12 }}
                      formatter={(value, name) => {
                        const v = typeof value === "number" ? value : Number(value)
                        const n = String(name)
                        return [n === "weight" ? `${v} kg` : `${v}%`, n === "weight" ? "Peso" : "Grasa"]
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line yAxisId="w" type="monotone" dataKey="weight" name="Peso" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    <Line yAxisId="f" type="monotone" dataKey="fatPct" name="Grasa %" stroke="#f97316" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div>
              <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Progreso por zonas</p>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {zones.map((zone) => (
                  <div key={zone.key} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <p className="m-0 text-sm font-semibold text-slate-900">{zone.label}</p>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${statusClasses(zone.status)}`}>
                        {statusLabel(zone.status)}
                      </span>
                    </div>
                    <p className="m-0 mt-1 text-xs tabular-nums text-slate-500">
                      {zone.actualSets > 0 ? (
                        <>
                          {zone.actualSets.toFixed(1)} / {zone.targetSets} sets · {Math.round(zone.progress)}%
                        </>
                      ) : (
                        "Sin señal esta semana"
                      )}
                    </p>
                    {zone.actualSets > 0 ? (
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.min(100, zone.progress)}%` }} />
                      </div>
                    ) : null}
                    <p className="m-0 mt-2 text-[11px] leading-snug text-slate-500">{zoneHint(zone)}</p>
                  </div>
                ))}
              </div>
            </div>
            {trendRows.length > 0 ? (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3">
                <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Sparkline métricas</p>
                <div className="mt-2 flex items-end gap-1">
                  {trendRows.map((row) => (
                    <div key={row.label} className="min-w-0 flex-1">
                      <div className="flex h-14 items-end rounded-lg border border-slate-200 bg-white px-1 py-1">
                        <div className="w-full rounded-md bg-blue-500/90" style={{ height: `${Math.max(10, Math.min(100, row.progressPct))}%` }} />
                      </div>
                      <p className="m-0 mt-1 truncate text-[10px] text-slate-500">{row.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.06 }}
        className="rounded-[28px] bg-slate-900 px-5 py-4 text-white shadow-xl"
      >
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/20 text-blue-300">
            <Brain className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.24em] text-blue-300">Neural insight</p>
            <p className="m-0 mt-1 text-sm leading-relaxed text-slate-200">{insight}</p>
            {aiBullets.length > 1 ? (
              <ul className="m-0 mt-2 list-disc space-y-1 pl-4 text-xs text-slate-400">
                {aiBullets.slice(1, 4).map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  )
}

function MetricPill({
  icon,
  label,
  value,
  delta,
}: {
  icon: "scale" | "drop" | "muscle"
  label: string
  value: string
  delta?: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="m-0 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="m-0 mt-1 text-lg font-bold tracking-tighter text-slate-900">{value}</p>
      {delta ? (
        <p className="m-0 mt-0.5 text-[11px] font-semibold text-emerald-600">{delta}</p>
      ) : (
        <p className="m-0 mt-0.5 text-[11px] text-slate-400">Referencia perfil</p>
      )}
      <div className="mt-2 flex justify-end text-slate-300">
        {icon === "scale" ? <Scale className="h-[18px] w-[18px]" aria-hidden /> : null}
        {icon === "drop" ? <Droplets className="h-[18px] w-[18px]" aria-hidden /> : null}
        {icon === "muscle" ? <Activity className="h-[18px] w-[18px]" aria-hidden /> : null}
      </div>
    </div>
  )
}
