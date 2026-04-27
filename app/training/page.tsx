"use client"

import { useMemo, useRef, useState, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import { useTraining } from "@/src/modules/training/useTraining"
import { useHealthAutoMetrics } from "@/app/hooks/useHealthAutoMetrics"
import { appleDaySignalsFromHealthMetric } from "@/lib/health/appleHevyRelation"
import { buildPlanVsExecution, buildTrainingReadiness, pickLastHevySession } from "@/lib/training/trainingOperationalDerivations"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"
import { useTrainingPreferences } from "@/app/hooks/useTrainingPreferences"
import { TrainingActionQuerySync } from "@/app/training/TrainingActionQuerySync"
import { aggregateZoneProgress } from "@/lib/training/effectiveSets"
import { buildAiRecommendations, deriveNutritionStatus } from "@/lib/training/decisionEngine"
import { TrainingDashboard } from "@/app/training/components/TrainingDashboard"
import type { HrvPoint } from "@/app/training/components/RecoveryModule"
import type { TrendRow } from "@/app/training/components/VisualGoalGenerator"

const MOCK_HRV_SERIES: HrvPoint[] = [
  { label: "Lun", hrv: 48 },
  { label: "Mar", hrv: 52 },
  { label: "Mié", hrv: 46 },
  { label: "Jue", hrv: 55 },
  { label: "Vie", hrv: 51 },
  { label: "Sáb", hrv: 58 },
  { label: "Dom", hrv: 54 },
]

const MOCK_PHYSIQUE_CHART = [
  { label: "01 Mar", weight: 77.0, fatPct: 12.8 },
  { label: "15 Mar", weight: 76.6, fatPct: 12.5 },
  { label: "01 Abr", weight: 76.4, fatPct: 12.35 },
  { label: "15 Abr", weight: 76.3, fatPct: 12.25 },
  { label: "Hoy", weight: 76.2, fatPct: 12.2 },
]

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
  const weeklyDays = useMemo(() => days.filter((day) => day.date >= shiftDays(todayIso, -6)), [days, todayIso])
  const plannedFocus = focusForPlan(planVsExecution.plannedToday)
  const statusChip = resolveTrainingStatusChip(readiness.score, hasHevy || !!appleSignals)
  const hevyStatus = hasHevy ? "conectado" : loading ? "pendiente" : "sin datos"
  const latestTrainingAt = lastSession?.startedAt ?? lastSession?.endedAt ?? null

  const weightMetric = bodyRows.find((row) => /peso/i.test(row.label))
  const fatMetric = bodyRows.find((row) => /grasa|bf|body fat/i.test(row.label))
  const objective = deriveObjective(prefs.visualGoalDescription)
  const trendRows: TrendRow[] = useMemo(() => bodyRows.slice(0, 4).map((r) => ({ label: r.label, progressPct: r.progressPct })), [bodyRows])
  const bodyPartProgress = useMemo(() => aggregateZoneProgress(weeklyDays), [weeklyDays])
  const nutritionPlan = useMemo(() => deriveNutritionPlan(mealDays), [mealDays])
  const nutritionStatus = deriveNutritionStatus(weightMetric)
  const aiRecommendations = buildAiRecommendations({ bodyPartProgress, nutritionStatus, hasHevy })
  const [goalImageGenerating, setGoalImageGenerating] = useState(false)
  const [trainingNotice, setTrainingNotice] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hrvSeries = useMemo(() => {
    const pts = timeline
      .filter((t) => typeof t.hrv_ms === "number" && (t.hrv_ms ?? 0) > 0)
      .slice(-7)
      .map((t) => ({
        label: new Date(t.observed_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" }),
        hrv: t.hrv_ms as number,
      }))
    return pts.length ? pts : MOCK_HRV_SERIES
  }, [timeline])

  const plannedSession = useMemo(() => prettifyPlanTitle(planVsExecution.plannedToday), [planVsExecution.plannedToday])
  const sessionFocus = useMemo(
    () => `${readiness.rationale} Enfoque muscular: ${plannedFocus.toLowerCase()}.`,
    [readiness.rationale, plannedFocus],
  )

  const weightLabel = weightMetric ? `${weightMetric.current} kg` : "76.2 kg"
  const bodyFatLabel = fatMetric ? `${fatMetric.current}%` : "12.2%"
  const leanMassLabel = "66.9 kg"
  const weightDelta = weightMetric ? (weightMetric.trend === "down" ? "−0.4 kg esta semana" : weightMetric.trend === "up" ? "+0.2 kg esta semana" : "Estable") : "−0.4 kg esta semana (ref.)"
  const fatDelta = fatMetric ? (fatMetric.trend === "down" ? "−0.2 pts esta semana" : "Estable") : "−0.2 pts esta semana (ref.)"
  const leanDelta = "+0.1 kg esta semana (ref.)"

  const neuralBanner = useMemo(() => {
    const first = aiRecommendations[0]
    if (first) return `${first} ${planVsExecution.suggestion ? `· ${planVsExecution.suggestion}` : ""}`
    return `${readiness.rationale} ${planVsExecution.suggestion ? `· ${planVsExecution.suggestion}` : ""}`
  }, [aiRecommendations, planVsExecution.suggestion, readiness.rationale])

  const priorityBadge = priorityFromPrefs(prefs.visualGoalPriority)

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

  const onScrollMealPlan = () => {
    document.getElementById("plan-nutricion")?.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const lastWorkoutLine = lastSession?.workoutName
    ? `Último entrenamiento: ${lastSession.workoutName}${lastSession.duration ? ` · ${Math.round(lastSession.duration)} min` : ""}`
    : "Aún no hay sesiones estructuradas recibidas."

  return (
    <main className="min-h-screen bg-[#F8FAFC]" aria-label="Entrenamiento operativo">
      <TrainingActionQuerySync setManualStatus={setManualStatus} />
      <TrainingDashboard
        readinessScore={readiness.score}
        readinessLabel={readiness.label}
        sleepHours={appleSignals?.sleep_hours ?? null}
        hrvSeries={hrvSeries}
        recoveryLoading={loading || appleLoading}
        plannedSession={plannedSession}
        sessionFocus={sessionFocus}
        hasHevy={hasHevy}
        onStartProtocol={onStartProtocol}
        onOpenAgenda={() => router.push("/agenda")}
        onSkipSession={() => setManualStatus("skip")}
        onRestDay={() => setManualStatus("rest")}
        visual={{
          visualDescription: prefs.visualGoalDescription ?? "",
          priority: priorityBadge,
          deadlineYm: prefs.visualGoalDeadlineYm ?? null,
          goalImageUrl: prefs.goalImageUrl,
          zones: bodyPartProgress,
          objective,
          trendRows,
          weightLabel,
          bodyFatLabel,
          leanMassLabel,
          weightDelta,
          fatDelta,
          leanDelta,
          chartPoints: MOCK_PHYSIQUE_CHART,
          aiBullets: aiRecommendations,
          goalImageGenerating,
          onGenerateImage: () => void onGenerateGoalWithAI(),
          onPickReference: onPickImage,
          onFileChange,
          fileInputRef,
          notice: trainingNotice,
        }}
        nutritionPlan={nutritionPlan}
        nutritionStatusLabel={nutritionStatus}
        onRegenerateNutrition={() =>
          updatePrefs({
            visualGoalDescription:
              (prefs.visualGoalDescription ?? "").trim() + " Ajusta macros para mejorar adherencia al objetivo.",
          })
        }
        onScrollMealPlan={onScrollMealPlan}
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
        neuralBanner={neuralBanner}
        statusChipLabel={statusChip.label}
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

function deriveObjective(description: string | undefined) {
  const text = (description ?? "").toLowerCase()
  if (text.includes("defin")) return "Definición"
  if (text.includes("manten")) return "Mantenimiento"
  return "Hipertrofia magra"
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

function resolveTrainingStatusChip(score: number, hasSignals: boolean) {
  if (!hasSignals) return { label: "Sin datos suficientes", tone: "muted" as const }
  if (score < 50) return { label: "Priorizar recuperación", tone: "risk" as const }
  if (score >= 74) return { label: "Listo para entrenar", tone: "ok" as const }
  return { label: "Carga moderada", tone: "warn" as const }
}

function priorityFromPrefs(p: "alta" | "media" | "baja" | undefined) {
  if (p === "media") return "Hipertrofia magra · prioridad media"
  if (p === "baja") return "Hipertrofia magra · prioridad baja"
  return "Hipertrofia magra · prioridad alta"
}
