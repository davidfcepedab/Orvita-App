"use client"

import Link from "next/link"
import { ChevronDown, Clock3 } from "lucide-react"
import { HEVY_INTEGRATION_LABEL } from "@/lib/health/appleHevyRelation"
import type { HrvPoint, RecoveryAdvisorProps } from "./RecoveryModule"
import { RecoveryModule } from "./RecoveryModule"
import { VisualGoalGenerator } from "./VisualGoalGenerator"
import type { NutritionPlanView } from "./WeeklyMealPlan"
import { WeeklyMealPlan } from "./WeeklyMealPlan"
import type { ZoneProgress } from "@/lib/training/effectiveSets"
import type { MealDayDisplay } from "@/lib/training/trainingPrefsTypes"
import type { ChangeEvent, RefObject } from "react"
import type { DeltaQuality } from "@/lib/training/trainingDashboardDerivations"

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
  hrvHasData: boolean
  recoveryLoading: boolean
  plannedSession: string
  sessionFocus: string
  onStartProtocol: () => void
  onOpenAgenda: () => void
  onReprogramSession: () => void
  onConfirmRestDay: () => void
  advisor: RecoveryAdvisorProps
  visual: {
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
    syncChips: { apple: boolean; hevy: boolean; manual: boolean }
    settingsHref: string
    goalImageGenerating: boolean
    onGenerateImage: () => void
    onPickReference: () => void
    onFileChange: (e: ChangeEvent<HTMLInputElement>) => void
    fileInputRef: RefObject<HTMLInputElement>
    notice?: string | null
  }
  nutritionPlan: NutritionPlanView
  mealDays: MealDayDisplay[]
  nutritionStatusLabel: string
  onRegenerateNutrition: () => void
  onScrollMealPlan: () => void
  onExportToast: (message: string) => void
  hevy: HevyStripProps
  statusChipLabel: string
}

export function TrainingDashboard({
  readinessScore,
  readinessLabel,
  sleepHours,
  hrvSeries,
  hrvHasData,
  recoveryLoading,
  plannedSession,
  sessionFocus,
  onStartProtocol,
  onOpenAgenda,
  onReprogramSession,
  onConfirmRestDay,
  advisor,
  visual,
  nutritionPlan,
  mealDays,
  nutritionStatusLabel,
  onRegenerateNutrition,
  onScrollMealPlan,
  onExportToast,
  hevy,
  statusChipLabel,
}: TrainingDashboardProps) {
  const hevySummary = hevy.hasHevy ? `Conectado · ${hevy.lastWorkoutLine}` : "Sin conexión activa"

  return (
    <div className="mx-auto w-full max-w-[min(100rem,calc(100vw-2rem))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Entrenamiento</h1>
        <span className="rounded-full border border-slate-200/90 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-sm">{statusChipLabel}</span>
      </div>

      <details className="group mb-5 rounded-2xl border border-slate-200/90 bg-white/90 shadow-sm open:shadow-md">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm text-slate-700 [&::-webkit-details-marker]:hidden sm:px-4 sm:py-3">
          <span className="font-semibold text-slate-900">Hevy</span>
          <span className="text-slate-400">·</span>
          <span className="min-w-0 flex-1 truncate text-xs text-slate-500">{hevySummary}</span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" aria-hidden />
        </summary>
        <div className="space-y-2 border-t border-slate-100 px-3 pb-3 pt-2 text-xs text-slate-600 sm:px-4">
          <p className="m-0">
            Fuente: <span className="font-medium text-slate-800">{hevy.sourceLabel || HEVY_INTEGRATION_LABEL}</span>
          </p>
          {hevy.latestTrainingAt ? (
            <p className="m-0">Recibido: {new Date(hevy.latestTrainingAt).toLocaleString("es-CO")}</p>
          ) : null}
          {hevy.lastSyncAt ? (
            <p className="m-0 inline-flex items-center gap-1 text-slate-500">
              <Clock3 className="h-3 w-3" aria-hidden />
              Sync: {new Date(hevy.lastSyncAt).toLocaleString("es-CO")}
            </p>
          ) : null}
          {hevy.showErrorHint ? <p className="m-0 text-slate-500">Aún no hay datos suficientes para estimar carga.</p> : null}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {!hevy.hasHevy ? (
              <button type="button" onClick={hevy.onConnect} className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
                Conectar
              </button>
            ) : (
              <button type="button" onClick={hevy.onOpenApp} className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
                Abrir app
              </button>
            )}
            <button type="button" onClick={hevy.onSync} className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
              Sync
            </button>
            <Link href="/configuracion#acordeon-config-hevy" className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 no-underline hover:bg-slate-50">
              Ajustes
            </Link>
            <Link href="/agenda" className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 no-underline hover:bg-slate-50">
              Agenda
            </Link>
          </div>
        </div>
      </details>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <div className="xl:col-span-3">
          <RecoveryModule
            readinessScore={readinessScore}
            readinessLabel={readinessLabel}
            sleepHours={sleepHours}
            hrvSeries={hrvSeries}
            hrvHasData={hrvHasData}
            plannedSession={plannedSession}
            sessionFocus={sessionFocus}
            onStartProtocol={onStartProtocol}
            onOpenAgenda={onOpenAgenda}
            onReprogramSession={onReprogramSession}
            onConfirmRestDay={onConfirmRestDay}
            loading={recoveryLoading}
            advisor={advisor}
          />
        </div>
        <div className="xl:col-span-5">
          <VisualGoalGenerator {...visual} />
        </div>
        <div className="xl:col-span-4">
          <WeeklyMealPlan
            plan={nutritionPlan}
            mealDays={mealDays}
            nutritionStatusLabel={nutritionStatusLabel}
            onRegenerateIa={onRegenerateNutrition}
            onScrollMealPlan={onScrollMealPlan}
            onExportToast={onExportToast}
          />
        </div>
      </div>
    </div>
  )
}
