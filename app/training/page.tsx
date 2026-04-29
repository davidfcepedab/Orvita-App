"use client"

import { useMemo, useRef, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { useTraining } from "@/src/modules/training/useTraining"
import { useHealthAutoMetrics } from "@/app/hooks/useHealthAutoMetrics"
import { appleDaySignalsFromHealthMetric } from "@/lib/health/appleHevyRelation"
import { buildPlanVsExecution, buildTrainingReadiness, pickLastHevySession } from "@/lib/training/trainingOperationalDerivations"
import { agendaTodayYmd, formatAgendaYmdDayMonthShortEsCo, localDateKeyFromIso } from "@/lib/agenda/localDateKey"
import { useTrainingPreferences } from "@/app/hooks/useTrainingPreferences"
import { TrainingActionQuerySync } from "@/app/training/TrainingActionQuerySync"
import { aggregateZoneProgress } from "@/lib/training/effectiveSets"
import { deriveNutritionStatus } from "@/lib/training/decisionEngine"
import { TrainingDashboard } from "@/app/training/components/TrainingDashboard"
import { buildAgendaSuggestTrainingUrl } from "@/lib/training/agendaTrainingLinks"
import type { HrvPoint } from "@/app/training/components/RecoveryModule"
import { advisorQuoteFromPlan, buildCoachInsightParagraph } from "@/lib/training/coachCopy"
import {
  advisorStatusLabel,
  bodyCompositionChartPoints,
  countWeeklySets,
  cnsFatigueLabel,
  deltaQualityFromTrend,
  estimateLeanMassKg,
  formatDeadlineYm,
  hypertrophyRateHint,
  intraWorkoutCarbsG,
  parseMetricNumber,
  trainingStreakDays,
} from "@/lib/training/trainingDashboardDerivations"
import { defaultVisualGoalMode, labelForVisualGoalMode } from "@/lib/training/visualGoalModeLabels"

export default function TrainingPage() {
  const router = useRouter()
  const todayIso = agendaTodayYmd()
  const { days, loading, error, setManualStatus, todayState, dataMeta } = useTraining()
  const { latest: appleHealth, loading: appleLoading, timeline } = useHealthAutoMetrics()
  const { bodyRows, mealDays, prefs, updatePrefs, setGoalImageUrl } = useTrainingPreferences()
  const appleSignals = useMemo(() => appleDaySignalsFromHealthMetric(appleHealth), [appleHealth])
  const readiness = useMemo(() => buildTrainingReadiness(appleSignals, days), [appleSignals, days])
  const planVsExecution = useMemo(() => buildPlanVsExecution(days, todayState, todayIso), [days, todayState, todayIso])
  const lastSession = useMemo(() => pickLastHevySession(days), [days])
  const hasHevy = days.some((day) => day.source === "hevy")
  const hasManualDay = days.some((d) => d.source === "manual")
  const weeklyDays = useMemo(() => days.filter((day) => day.date >= shiftDays(todayIso, -6)), [days, todayIso])
  const plannedFocus = focusForPlan(planVsExecution.plannedToday)
  const statusChip = resolveTrainingStatusChip(readiness.score, hasHevy || !!appleSignals)
  const hevyStatus = hasHevy ? "conectado" : loading ? "pendiente" : "sin datos"
  const latestTrainingAt = lastSession?.startedAt ?? lastSession?.endedAt ?? null

  const weightMetric = bodyRows.find((row) => /peso/i.test(row.label))
  const fatMetric = bodyRows.find((row) => /grasa|bf|body fat/i.test(row.label))
  const leanMetric = bodyRows.find((row) => /magr|lean|masa mag/i.test(row.label))
  const visualGoalMode = prefs.visualGoalMode ?? defaultVisualGoalMode()
  const objective = labelForVisualGoalMode(visualGoalMode)
  const bodyPartProgress = useMemo(() => aggregateZoneProgress(weeklyDays), [weeklyDays])
  const nutritionPlan = useMemo(() => deriveNutritionPlan(mealDays), [mealDays])
  const nutritionStatus = deriveNutritionStatus(weightMetric)
  const [goalImageGenerating, setGoalImageGenerating] = useState(false)
  const [trainingNotice, setTrainingNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hrvRaw = useMemo(() => {
    return timeline
      .filter((t) => typeof t.hrv_ms === "number" && (t.hrv_ms ?? 0) > 0)
      .slice(-7)
      .map((t) => {
        const k = localDateKeyFromIso(t.observed_at) ?? t.observed_at.slice(0, 10)
        return {
          label: formatAgendaYmdDayMonthShortEsCo(k),
          hrv: t.hrv_ms as number,
        }
      }) as HrvPoint[]
  }, [timeline])
  const hrvHasData = hrvRaw.length > 0
  const hrvSeries = hrvRaw

  const plannedSession = useMemo(() => prettifyPlanTitle(planVsExecution.plannedToday), [planVsExecution.plannedToday])
  const sessionFocus = useMemo(
    () => `${readiness.rationale} Enfoque: ${plannedFocus.toLowerCase()}.`,
    [readiness.rationale, plannedFocus],
  )

  const weightKgCur = parseMetricNumber(weightMetric?.current)
  const fatPctCur = parseMetricNumber(fatMetric?.current)
  const leanFromEstimate =
    !leanMetric && weightKgCur != null && fatPctCur != null ? estimateLeanMassKg(weightKgCur, fatPctCur) : null

  const weightLabel = weightMetric ? `${weightMetric.current} kg` : "—"
  const bodyFatLabel = fatMetric ? `${fatMetric.current}%` : "—"
  const leanMassLabel = leanMetric
    ? `${leanMetric.current} kg`
    : leanFromEstimate != null
      ? `${leanFromEstimate.toFixed(1)} kg`
      : "—"
  const leanMassFootnote = leanFromEstimate != null ? "Estimado a partir de peso y % grasa" : undefined

  const weightKgPrev = parseMetricNumber(weightMetric?.previous)
  const fatPctPrev = parseMetricNumber(fatMetric?.previous)
  const leanPrevEst =
    !leanMetric && weightKgPrev != null && fatPctPrev != null ? estimateLeanMassKg(weightKgPrev, fatPctPrev) : null

  const weightDelta = weightMetric
    ? weightMetric.trend === "down"
      ? "↓ respecto a la lectura anterior"
      : weightMetric.trend === "up"
        ? "↑ respecto a la lectura anterior"
        : "Sin cambio vs anterior"
    : undefined
  const fatDelta = fatMetric
    ? fatMetric.trend === "down"
      ? "↓ vs anterior"
      : fatMetric.trend === "up"
        ? "↑ vs anterior"
        : "Sin cambio"
    : undefined
  const leanDelta = leanMetric
    ? leanMetric.trend === "down"
      ? "↓ vs anterior"
      : leanMetric.trend === "up"
        ? "↑ vs anterior"
        : "Sin cambio"
    : leanFromEstimate != null && leanPrevEst != null
      ? leanFromEstimate - leanPrevEst > 0.1
        ? "↑ vs estimación anterior"
        : leanFromEstimate - leanPrevEst < -0.1
          ? "↓ vs estimación anterior"
          : "Sin cambio vs estimación anterior"
      : leanFromEstimate != null
        ? "Sin lectura anterior para comparar"
        : undefined

  const weightDeltaQuality = weightMetric ? deltaQualityFromTrend(weightMetric.trend, "weight") : "neutral"
  const fatDeltaQuality = fatMetric ? deltaQualityFromTrend(fatMetric.trend, "fat") : "neutral"
  const leanDeltaQuality = leanMetric
    ? deltaQualityFromTrend(leanMetric.trend, "weight")
    : leanFromEstimate != null && leanPrevEst != null
      ? leanFromEstimate - leanPrevEst > 0.1
        ? "good"
        : leanFromEstimate - leanPrevEst < -0.1
          ? "warn"
          : "neutral"
      : "neutral"

  const chartPoints = useMemo(() => {
    const pts = bodyCompositionChartPoints(weightMetric, fatMetric)
    if (pts.length >= 2) return pts
    const w = parseMetricNumber(weightMetric?.current)
    const f = parseMetricNumber(fatMetric?.current)
    if (w != null && f != null) return [{ label: "Hoy", weight: w, fatPct: f }]
    return []
  }, [weightMetric, fatMetric])

  const nutritionOk = !nutritionStatus.toLowerCase().includes("fuera")
  const coachInsight = useMemo(
    () =>
      buildCoachInsightParagraph({
        readiness,
        nutritionStatus,
        hasHevy,
      }),
    [readiness, nutritionStatus, hasHevy],
  )
  const coachQuote = useMemo(() => advisorQuoteFromPlan(planVsExecution.plannedToday, readiness), [planVsExecution.plannedToday, readiness])

  const zonesAvgProgress = useMemo(() => {
    const active = bodyPartProgress.filter((z) => z.actualSets > 0)
    const arr = active.length ? active : bodyPartProgress
    if (!arr.length) return 0
    return arr.reduce((s, z) => s + z.progress, 0) / arr.length
  }, [bodyPartProgress])

  const setsDoneWeek = useMemo(() => countWeeklySets(weeklyDays), [weeklyDays])
  const streakDays = useMemo(() => trainingStreakDays(days, todayIso), [days, todayIso])

  const advisor = useMemo(
    () => ({
      statusLabel: advisorStatusLabel(readiness.score, nutritionOk),
      cnsLevel: cnsFatigueLabel(readiness.score),
      intraChoG: String(intraWorkoutCarbsG(planVsExecution.plannedToday)),
      hypertrophyHint: hypertrophyRateHint(zonesAvgProgress),
      quote: coachQuote,
      setsDone: setsDoneWeek,
      streakDays,
    }),
    [readiness.score, nutritionOk, planVsExecution.plannedToday, zonesAvgProgress, coachQuote, setsDoneWeek, streakDays],
  )

  const priorityTitle = labelForVisualGoalMode(visualGoalMode)
  const deadlineDisplay = formatDeadlineYm(prefs.visualGoalDeadlineYm ?? null)

  const syncChips = useMemo(
    () => ({
      apple: Boolean(appleHealth && (timeline.length > 0 || appleSignals?.sleep_hours != null || appleSignals?.hrv_ms != null)),
      hevy: hasHevy,
      manual: hasManualDay,
    }),
    [appleHealth, timeline.length, appleSignals?.sleep_hours, appleSignals?.hrv_ms, hasHevy, hasManualDay],
  )

  const showTrainingNotice = (message: string) => {
    setTrainingNotice(message)
    window.setTimeout(() => setTrainingNotice(null), 6000)
  }

  const onPickImage = () => fileInputRef.current?.click()

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === "string") setGoalImageUrl(result)
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const onGenerateGoalWithAI = async () => {
    const prompt = (prefs.visualGoalDescription ?? "").trim()
    if (!prompt) {
      showTrainingNotice("Define primero tu objetivo físico para generar imagen.")
      return
    }
    setGoalImageGenerating(true)
    try {
      const res = await fetch("/api/training/goal-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, mode: "create" as const }),
      })
      const data = (await res.json()) as { ok?: boolean; imageDataUrl?: string; error?: string; detail?: string }
      if (!res.ok || !data.ok || !data.imageDataUrl) throw new Error(data.detail ?? data.error ?? "No se pudo generar imagen")
      setGoalImageUrl(data.imageDataUrl)
      showTrainingNotice("Imagen de referencia actualizada.")
    } catch (e) {
      showTrainingNotice(e instanceof Error ? e.message : "Error generando imagen")
    } finally {
      setGoalImageGenerating(false)
    }
  }

  const onStartProtocol = () => {
    if (hasHevy) window.open("https://hevy.com/app", "_blank", "noopener,noreferrer")
    else router.push("/configuracion#acordeon-config-hevy")
  }

  const lastWorkoutLine = lastSession?.workoutName
    ? `${lastSession.workoutName}${lastSession.duration ? ` · ${Math.round(lastSession.duration)} min` : ""}`
    : "Sin sesión reciente"

  return (
    <main className="min-h-0" aria-label="Entrenamiento operativo">
      <TrainingActionQuerySync setManualStatus={setManualStatus} />
      <TrainingDashboard
        readinessScore={readiness.score}
        readinessLabel={readiness.label}
        sleepHours={appleSignals?.sleep_hours ?? null}
        hrvSeries={hrvSeries}
        hrvHasData={hrvHasData}
        recoveryLoading={loading || appleLoading}
        plannedSession={plannedSession}
        sessionFocus={sessionFocus}
        onStartProtocol={onStartProtocol}
        onOpenAgenda={() => router.push(buildAgendaSuggestTrainingUrl({ origen: "calendario" }))}
        onOpenAgendaFromRestModal={() => router.push(buildAgendaSuggestTrainingUrl({ origen: "descanso" }))}
        onReprogramSession={() => setManualStatus("skip")}
        onConfirmRestDay={() => setManualStatus("rest")}
        advisor={advisor}
        visual={{
          visualDescription: prefs.visualGoalDescription ?? "",
          visualGoalPriority: prefs.visualGoalPriority ?? "alta",
          visualGoalMode,
          onVisualPrefsChange: updatePrefs,
          bodyMetricRows: bodyRows,
          priorityTitle,
          deadlineYm: prefs.visualGoalDeadlineYm ?? null,
          deadlineDisplay,
          goalImageUrl: prefs.goalImageUrl,
          zones: bodyPartProgress,
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
          coachExtras: [],
          syncChips,
          goalImageGenerating,
          onGenerateImage: () => void onGenerateGoalWithAI(),
          onPickReference: onPickImage,
          onFileChange,
          fileInputRef,
          notice: trainingNotice,
        }}
        nutritionPlan={nutritionPlan}
        mealDays={mealDays}
        nutritionStatusLabel={nutritionStatus}
        onRegenerateNutrition={() =>
          showTrainingNotice("Vista de comidas recalculada con tus kcal del día, macros registradas y tipo de objetivo.")
        }
        onExportToast={showTrainingNotice}
        hevy={{
          hevyStatus,
          hasHevy,
          sourceLabel: dataMeta.sourceLabel,
          lastWorkoutLine,
          latestTrainingAt,
          lastSyncAt: dataMeta.lastSyncAt,
          showErrorHint: Boolean(error),
          onConnect: () => router.push("/configuracion#acordeon-config-hevy"),
          onOpenApp: () => window.open("https://hevy.com/app", "_blank", "noopener,noreferrer"),
          onSync: () => router.refresh(),
        }}
        statusChip={statusChip}
        trainingDays={days}
        weekAnchorYmd={todayIso}
      />
    </main>
  )
}

function shiftDays(ymd: string, days: number) {
  const date = new Date(`${ymd}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

function focusForPlan(plan: string) {
  const lower = plan.toLowerCase()
  if (lower.includes("push")) return "Pecho, hombro y tríceps"
  if (lower.includes("pull")) return "Espalda y bíceps"
  if (lower.includes("leg") || lower.includes("lower") || lower.includes("pierna")) return "Pierna y cadena posterior"
  if (lower.includes("upper")) return "Tren superior"
  if (lower.includes("cardio")) return "Cardio y acondicionamiento"
  return "General"
}

function prettifyPlanTitle(plan: string) {
  const p = plan.trim()
  if (!p) return "Sesión del día"
  const lower = p.toLowerCase()
  if (lower.includes("push")) return "Hypertrophy · Push"
  if (lower.includes("pull")) return "Hypertrophy · Pull"
  if (lower.includes("leg") || lower.includes("lower") || lower.includes("pierna")) return "Hypertrophy · Legs"
  if (lower.includes("upper")) return "Hypertrophy · Upper"
  if (lower.includes("cardio")) return "Conditioning · Cardio"
  if (lower.includes("descanso")) return "Recovery · Descanso"
  return p.charAt(0).toUpperCase() + p.slice(1)
}

function deriveNutritionPlan(mealDays: Array<{ kcal: number; pro: number; carb: number; fat: number }>) {
  if (!mealDays.length) {
    return { available: false as const, kcalTarget: 0, protein: 0, carbs: 0, fats: 0 }
  }
  const total = mealDays.reduce(
    (acc, day) => ({
      kcal: acc.kcal + day.kcal,
      pro: acc.pro + day.pro,
      carb: acc.carb + day.carb,
      fat: acc.fat + day.fat,
    }),
    { kcal: 0, pro: 0, carb: 0, fat: 0 },
  )
  const len = mealDays.length
  return {
    available: true as const,
    kcalTarget: Math.round(total.kcal / len),
    protein: Math.round(total.pro / len),
    carbs: Math.round(total.carb / len),
    fats: Math.round(total.fat / len),
  }
}

function resolveTrainingStatusChip(score: number, hasSignals: boolean): {
  label: string
  tone: "ok" | "warn" | "risk" | "muted"
} {
  if (!hasSignals) return { label: "Sin datos suficientes", tone: "muted" }
  if (score < 50) return { label: "Priorizar recuperación", tone: "risk" }
  if (score >= 74) return { label: "Listo para entrenar", tone: "ok" }
  return { label: "Carga moderada", tone: "warn" }
}
