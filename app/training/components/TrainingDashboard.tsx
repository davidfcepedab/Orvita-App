"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { Clock3 } from "lucide-react"
import { HEVY_INTEGRATION_LABEL } from "@/lib/health/appleHevyRelation"
import type { HrvPoint } from "./RecoveryModule"
import { RecoveryModule } from "./RecoveryModule"
import { VisualGoalGenerator } from "./VisualGoalGenerator"
import type { NutritionPlanView } from "./WeeklyMealPlan"
import { WeeklyMealPlan } from "./WeeklyMealPlan"
import type { TrendRow } from "./VisualGoalGenerator"
import type { ZoneProgress } from "@/lib/training/effectiveSets"
import type { ChangeEvent, RefObject } from "react"

export type HevyStripProps = {
  hevyStatus: string
  hasHevy: boolean
  sourceLabel: string | null
  lastWorkoutLine: string
  latestTrainingAt: string | null
  lastSyncAt: string | null
  showErrorHint: boolean
  onConnect: () => void
  onOpenApp: () => void
  onSync: () => void
}

export type TrainingDashboardProps = {
  readinessScore: number
  readinessLabel: string
  sleepHours: number | null
  hrvSeries: HrvPoint[]
  recoveryLoading: boolean
  plannedSession: string
  sessionFocus: string
  hasHevy: boolean
  onStartProtocol: () => void
  onOpenAgenda: () => void
  onSkipSession: () => void
  onRestDay: () => void
  visual: {
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
  nutritionPlan: NutritionPlanView
  nutritionStatusLabel: string
  onRegenerateNutrition: () => void
  onScrollMealPlan: () => void
  hevy: HevyStripProps
  neuralBanner: string
  statusChipLabel: string
}

export function TrainingDashboard({
  readinessScore,
  readinessLabel,
  sleepHours,
  hrvSeries,
  recoveryLoading,
  plannedSession,
  sessionFocus,
  hasHevy,
  onStartProtocol,
  onOpenAgenda,
  onSkipSession,
  onRestDay,
  visual,
  nutritionPlan,
  nutritionStatusLabel,
  onRegenerateNutrition,
  onScrollMealPlan,
  hevy,
  neuralBanner,
  statusChipLabel,
}: TrainingDashboardProps) {
  return (
    <div className="mx-auto w-full max-w-[min(100rem,calc(100vw-2rem))] px-4 py-8 sm:px-6 lg:px-10">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">Órvita OS v4 · Training</p>
          <h1 className="m-0 mt-1 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Entrenamiento</h1>
          <p className="m-0 mt-1 text-sm text-slate-500">Visual-first · misión de hoy · nutrición táctica · Hevy + agenda</p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">{statusChipLabel}</span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="mb-6 rounded-[28px] border border-slate-200 bg-slate-900 px-5 py-4 text-sm text-slate-100 shadow-lg"
      >
        <span className="font-semibold uppercase tracking-[0.2em] text-blue-300">Neural insight · </span>
        {neuralBanner}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <RecoveryModule
            readinessScore={readinessScore}
            readinessLabel={readinessLabel}
            sleepHours={sleepHours}
            hrvSeries={hrvSeries}
            plannedSession={plannedSession}
            sessionFocus={sessionFocus}
            hasHevy={hasHevy}
            onStartProtocol={onStartProtocol}
            onOpenAgenda={onOpenAgenda}
            onSkipSession={onSkipSession}
            onRestDay={onRestDay}
            loading={recoveryLoading}
          />
        </div>
        <div className="xl:col-span-5">
          <VisualGoalGenerator {...visual} />
        </div>
        <div className="xl:col-span-4">
          <WeeklyMealPlan plan={nutritionPlan} nutritionStatusLabel={nutritionStatusLabel} onRegenerateIa={onRegenerateNutrition} onScrollMealPlan={onScrollMealPlan} />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="mt-6 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm"
      >
        <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-400">Hevy API · integración</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${
              hevy.hasHevy
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : hevy.hevyStatus === "pendiente"
                  ? "border-amber-200 bg-amber-50 text-amber-900"
                  : "border-slate-200 bg-slate-50 text-slate-600"
            }`}
          >
            Hevy: {hevy.hevyStatus}
          </span>
          <span className="text-xs text-slate-500">Fuente: {hevy.sourceLabel || HEVY_INTEGRATION_LABEL}</span>
        </div>
        <p className="m-0 mt-2 text-sm text-slate-800">{hevy.lastWorkoutLine}</p>
        {hevy.latestTrainingAt ? (
          <p className="m-0 mt-1 text-xs text-slate-500">Recibido: {new Date(hevy.latestTrainingAt).toLocaleString("es-CO")}</p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          {!hevy.hasHevy ? (
            <button
              type="button"
              onClick={hevy.onConnect}
              className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Conectar Hevy
            </button>
          ) : (
            <button
              type="button"
              onClick={hevy.onOpenApp}
              className="inline-flex min-h-10 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Abrir Hevy
            </button>
          )}
          <button
            type="button"
            onClick={hevy.onSync}
            className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            Sincronizar
          </button>
          <Link
            href="/configuracion#acordeon-config-hevy"
            className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 shadow-sm no-underline transition hover:bg-slate-50"
          >
            Revisar conexión
          </Link>
          <Link
            href="/agenda"
            className="inline-flex min-h-10 items-center justify-center rounded-2xl border border-slate-900 bg-slate-900 px-4 text-sm font-semibold text-white no-underline shadow-sm transition hover:bg-slate-800"
          >
            Abrir agenda (Google)
          </Link>
        </div>
        {hevy.lastSyncAt ? (
          <p className="m-0 mt-3 inline-flex items-center gap-1 text-[11px] text-slate-500">
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            Última sincronización Hevy: {new Date(hevy.lastSyncAt).toLocaleString("es-CO")}
          </p>
        ) : null}
        {hevy.showErrorHint ? <p className="m-0 mt-2 text-xs text-slate-500">Aún no hay datos suficientes para estimar carga.</p> : null}
      </motion.div>
    </div>
  )
}
