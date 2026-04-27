"use client"

import Link from "next/link"
import { ChevronDown, Clock3 } from "lucide-react"
import { HEVY_INTEGRATION_LABEL } from "@/lib/health/appleHevyRelation"
import { buildAgendaSuggestTrainingUrl } from "@/lib/training/agendaTrainingLinks"
import type { HrvPoint, RecoveryAdvisorProps } from "./RecoveryModule"
import { RecoveryModule } from "./RecoveryModule"
import { VisualGoalGenerator } from "./VisualGoalGenerator"
import type { NutritionPlanView } from "./WeeklyMealPlan"
import { WeeklyMealPlan } from "./WeeklyMealPlan"
import type { ZoneProgress } from "@/lib/training/effectiveSets"
import type {
  BodyMetricDisplayRow,
  MealDayDisplay,
  TrainingPreferencesPayload,
  VisualGoalMode,
  VisualGoalPriority,
} from "@/lib/training/trainingPrefsTypes"
import type { TrainingDay } from "@/src/modules/training/types"
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

export type TrainingStatusChip = { label: string; tone: "ok" | "warn" | "risk" | "muted" }

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
  onOpenAgendaFromRestModal?: () => void
  onReprogramSession: () => void
  onConfirmRestDay: () => void
  advisor: RecoveryAdvisorProps
  visual: {
    visualDescription: string
    visualGoalPriority: VisualGoalPriority
    visualGoalMode: VisualGoalMode
    onVisualPrefsChange: (
      patch: Partial<
        Pick<
          TrainingPreferencesPayload,
          "visualGoalDescription" | "visualGoalDeadlineYm" | "visualGoalPriority" | "visualGoalMode"
        >
      >,
    ) => void
    bodyMetricRows: BodyMetricDisplayRow[]
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
  onExportToast: (message: string) => void
  hevy: HevyStripProps
  statusChip: TrainingStatusChip
  trainingDays: TrainingDay[]
  weekAnchorYmd: string
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
  onOpenAgendaFromRestModal,
  onReprogramSession,
  onConfirmRestDay,
  advisor,
  visual,
  nutritionPlan,
  mealDays,
  nutritionStatusLabel,
  onRegenerateNutrition,
  onExportToast,
  hevy,
  statusChip,
  trainingDays,
  weekAnchorYmd,
}: TrainingDashboardProps) {
  const hevySummary = hevy.hasHevy ? `Conectado · ${hevy.lastWorkoutLine}` : "Sin conexión activa"
  const chipToneClass =
    statusChip.tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : statusChip.tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : statusChip.tone === "risk"
          ? "border-rose-200 bg-rose-50 text-rose-900"
          : "border-slate-200/90 bg-white/80 text-slate-600"

  return (
    <div className="mx-auto w-full max-w-[min(100rem,calc(100vw-2rem))] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="m-0 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Entrenamiento</h1>
        <span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold shadow-sm ${chipToneClass}`}>{statusChip.label}</span>
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
            <Link
              href={buildAgendaSuggestTrainingUrl({ origen: "calendario" })}
              className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 no-underline hover:bg-slate-50"
            >
              Agenda
            </Link>
          </div>
        </div>
      </details>

      <div className="grid grid-cols-1 gap-5">
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
          onOpenAgendaFromRestModal={onOpenAgendaFromRestModal}
          onReprogramSession={onReprogramSession}
          onConfirmRestDay={onConfirmRestDay}
          loading={recoveryLoading}
          advisor={advisor}
          syncChips={visual.syncChips}
        />
        <VisualGoalGenerator {...visual} />
        <WeeklyMealPlan
          plan={nutritionPlan}
          mealDays={mealDays}
          nutritionStatusLabel={nutritionStatusLabel}
          onRegenerateIa={onRegenerateNutrition}
          onExportToast={onExportToast}
          trainingDays={trainingDays}
          weekAnchorYmd={weekAnchorYmd}
          visualGoalSummary={visual.priorityTitle}
          visualGoalMode={visual.visualGoalMode}
        />
      </div>
    </div>
  )
}
