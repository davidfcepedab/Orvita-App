"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  CartesianGrid,
  ComposedChart,
  Bar,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Card } from "@/src/components/ui/Card"
import { useTraining } from "@/src/modules/training/useTraining"
import type { TrainingStatus } from "@/src/modules/training/types"
import { TRAINING_MILESTONES } from "@/app/data/training/visualSeeds"
import { useTrainingPreferences } from "@/app/hooks/useTrainingPreferences"
import { buildAdjustmentHints } from "@/lib/training/adjustmentHints"
import {
  buildMilestoneViews,
  buildWeeklyVolumeIntensity,
  deriveStrainRecovery,
  weeklyVolumeSum,
} from "@/lib/training/deriveFromHevyDays"
import { rechartsDefaultMargin, rechartsTooltipContentStyle } from "@/lib/charts/rechartsShared"
import { isAppMockMode, isSupabaseEnabled, UI_TRAINING_PREFS_LOCAL } from "@/lib/checkins/flags"
import { TrainingVisualBodySection } from "./TrainingVisualBodySection"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"
import { useHealthAutoMetrics } from "@/app/hooks/useHealthAutoMetrics"
import {
  appleDaySignalsFromHealthMetric,
  describeAppleHealthVersusHevy,
  HEVY_INTEGRATION_LABEL,
} from "@/lib/health/appleHevyRelation"

function formatStatus(status: TrainingStatus) {
  if (status === "trained") return "Zona óptima de entrenamiento"
  if (status === "rest") return "Enfoque de recuperación"
  if (status === "skip") return "Sesión pausada"
  return "Sesión de natación"
}

export default function TrainingPage() {
  const { today, days, loading, error, manualStatus, setManualStatus } = useTraining()
  const { latest: appleHealth } = useHealthAutoMetrics()
  const {
    bodyRows,
    mealDays,
    prefs,
    setGoalImageUrl,
    setMealNotes,
    loading: prefsLoading,
    updatePrefs,
  } = useTrainingPreferences()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [trainingNotice, setTrainingNotice] = useState<string | null>(null)
  const [goalImageGenerating, setGoalImageGenerating] = useState(false)
  const [goalImageDisplayKey, setGoalImageDisplayKey] = useState(0)
  /** `create` = DALL·E 3 solo texto (cambios fuertes). `edit` = DALL·E 2 sobre imagen (cambios leves). */
  const [goalImageAiMode, setGoalImageAiMode] = useState<"create" | "edit">("create")
  const trainingNoticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showTrainingNotice = useCallback((message: string) => {
    if (trainingNoticeTimerRef.current) clearTimeout(trainingNoticeTimerRef.current)
    setTrainingNotice(message)
    trainingNoticeTimerRef.current = setTimeout(() => {
      setTrainingNotice(null)
      trainingNoticeTimerRef.current = null
    }, 10_000)
  }, [])

  useEffect(() => {
    return () => {
      if (trainingNoticeTimerRef.current) clearTimeout(trainingNoticeTimerRef.current)
    }
  }, [])

  const todayIso = agendaTodayYmd()
  const weekPoints = useMemo(() => buildWeeklyVolumeIntensity(days, todayIso), [days, todayIso])
  const weekSum = useMemo(() => weeklyVolumeSum(weekPoints), [weekPoints])
  const todayVol = today?.volumeScore ?? 0
  const { strain, recoveryPct, hasSignal: strainHasSignal } = useMemo(
    () => deriveStrainRecovery(todayVol, weekSum),
    [todayVol, weekSum],
  )

  const chartRows = useMemo(
    () => weekPoints.map((p) => ({ name: p.label, volumen: p.volume, intensidad: p.intensity })),
    [weekPoints],
  )

  const milestones = useMemo(() => buildMilestoneViews(days, TRAINING_MILESTONES), [days])
  const hints = useMemo(() => buildAdjustmentHints(bodyRows), [bodyRows])

  const maxKcal = useMemo(
    () => (mealDays.length > 0 ? Math.max(1, ...mealDays.map((d) => d.kcal)) : 0),
    [mealDays],
  )
  const avgKcal = useMemo(
    () =>
      mealDays.length > 0
        ? Math.round(mealDays.reduce((s, d) => s + d.kcal, 0) / mealDays.length)
        : 0,
    [mealDays],
  )

  const showManual = !today || today.source !== "hevy"
  const goalUrl = prefs.goalImageUrl ?? ""
  const remotePrefs = isSupabaseEnabled() && !isAppMockMode()

  const onPickImage = () => fileInputRef.current?.click()

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => {
      const r = reader.result
      if (typeof r === "string") {
        setGoalImageDisplayKey((k) => k + 1)
        setGoalImageUrl(r)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const onAdjustNutritionWithAI = () => {
    showTrainingNotice(
      "Ajuste nutricional con IA (placeholder Bloque 3): propondremos kcal y macros según carga en Hevy y medidas corporales.",
    )
  }

  const onGenerateGoalWithAI = async () => {
    const prompt = (prefs.visualGoalDescription ?? "").trim()
    if (!prompt) {
      showTrainingNotice("Escribe un prompt en «Prompt para la IA» antes de generar.")
      return
    }
    setGoalImageGenerating(true)
    try {
      const payload: { prompt: string; mode: "create" | "edit"; imageBase64?: string } = {
        prompt,
        mode: goalImageAiMode,
      }
      if (goalImageAiMode === "edit" && goalUrl.startsWith("data:")) {
        payload.imageBase64 = goalUrl
      }
      const res = await fetch("/api/training/goal-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as {
        ok?: boolean
        imageDataUrl?: string
        error?: string
        detail?: string
        code?: string
        mode?: "create" | "edit"
      }
      if (!data.ok) {
        if (data.code === "NO_AI_KEY") {
          showTrainingNotice(
            [
              "Falta la variable de entorno OPENAI_API_KEY en el servidor (Next.js solo la lee al arrancar).",
              "",
              "• Local: en la raíz del repo crea .env.local con una línea OPENAI_API_KEY=sk-… (claves en platform.openai.com/api-keys). Guarda y reinicia npm run dev. Puedes partir de .env.example.",
              "",
              "• Producción: en Vercel/Render/etc. añade OPENAI_API_KEY en Environment Variables y vuelve a desplegar.",
            ].join("\n"),
          )
        } else if (data.code === "CONTENT_POLICY") {
          showTrainingNotice(
            [
              data.error ??
                "La generación fue rechazada por el filtro de seguridad del proveedor de IA.",
              "",
              "Puedes probar: generar sin subir foto (solo referencia por defecto), acortar o suavizar el prompt, o usar otra imagen. También puedes crear la imagen fuera de la app y subirla con «Agregar imagen».",
            ].join("\n"),
          )
        } else {
          showTrainingNotice(data.detail || data.error || "No se pudo generar la imagen.")
        }
        return
      }
      if (data.imageDataUrl) {
        setGoalImageDisplayKey((k) => k + 1)
        setGoalImageUrl(data.imageDataUrl)
        const usedMode = data.mode ?? goalImageAiMode
        if (usedMode === "create") {
          showTrainingNotice(
            "Imagen nueva generada con DALL·E 3 a partir de tu prompt y guardada como objetivo visual (WebP optimizado).",
          )
        } else {
          showTrainingNotice(
            [
              "Imagen guardada como objetivo visual (edición con DALL·E 2 sobre tu referencia).",
              "",
              "Este modo suele parecerse mucho a la foto base. Para escenas claramente distintas, elige «Imagen nueva desde el prompt».",
            ].join("\n"),
          )
        }
      }
    } catch {
      showTrainingNotice("Error de red al generar. Revisa la conexión e inténtalo de nuevo.")
    } finally {
      setGoalImageGenerating(false)
    }
  }

  const chartEmpty = chartRows.every((r) => r.volumen === 0)

  const appleSignals = useMemo(() => appleDaySignalsFromHealthMetric(appleHealth), [appleHealth])
  const appleHevyBridge = useMemo(
    () => describeAppleHealthVersusHevy(today ?? null, appleSignals),
    [today, appleSignals],
  )

  return (
    <div className="orbita-page-stack">
      <div className="min-w-0">
        <h1 className="m-0 text-2xl font-medium tracking-tight text-[var(--color-text-primary)] phone:text-[1.75rem]">
          Operaciones de Entrenamiento
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--color-text-secondary)" }}>
          Mantenimiento físico, carga y objetivos de rendimiento. Los entrenos vienen de{" "}
          <span style={{ fontWeight: 600 }}>{HEVY_INTEGRATION_LABEL}</span>; Apple Health refuerza gasto energético y
          sueño cuando importas con el Atajo.
        </p>
        {!remotePrefs && !isAppMockMode() && (
          <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>
            {UI_TRAINING_PREFS_LOCAL}
          </p>
        )}
        {isAppMockMode() && (
          <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>
            Modo mock: datos de Hevy simulados; preferencias solo en localStorage.
          </p>
        )}
      </div>

      <Card>
        <div className="flex min-w-0 flex-col gap-5 p-[var(--spacing-lg)] sm:flex-row sm:items-center sm:justify-between sm:gap-[var(--spacing-lg)]">
          <div className="min-w-0 flex-1" style={{ display: "grid", gap: "var(--spacing-sm)" }}>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.18em",
                color: "var(--color-text-secondary)",
              }}
            >
              Capacidad diaria
            </p>
            <h2 className="text-xl font-medium sm:text-[22px]" style={{ margin: 0 }}>
              {formatStatus(today?.status ?? manualStatus ?? "rest")}
            </h2>
            <p className="max-w-prose text-pretty" style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>
              {strainHasSignal && recoveryPct != null && strain != null ? (
                <>
                  Recuperación estimada ~{recoveryPct}% · Carga (strain) {strain} (heurística a partir del volumen Hevy
                  últimos 7 días y hoy; no es dato clínico).
                </>
              ) : (
                <>
                  Sin volumen Hevy en los últimos 7 días ni hoy: no mostramos strain ni % de recuperación para no
                  inventar números. Tras registrar entrenos en Hevy verás la estimación aquí.
                </>
              )}
            </p>
            {showManual && (
              <div className="flex flex-wrap gap-2 pt-1 sm:gap-2.5" style={{ marginTop: "var(--spacing-sm)" }}>
                {[
                  { label: "Descanso", value: "rest" },
                  { label: "Pausar", value: "skip" },
                  { label: "Natación", value: "swim" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setManualStatus(item.value as TrainingStatus)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "10px",
                      border: "0.5px solid var(--color-border)",
                      background: "var(--color-accent-health)",
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "white",
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
            {(error || loading) && (
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "11px" }}>
                {loading ? "Sincronizando con Hevy…" : "Sin conexión con Hevy. Operando en modo manual o con datos locales."}
              </p>
            )}
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: "0.5px solid var(--color-border)",
                display: "grid",
                gap: 8,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "var(--color-text-secondary)",
                }}
              >
                Apple Health + {HEVY_INTEGRATION_LABEL}
              </p>
              <p className="max-w-prose text-pretty" style={{ margin: 0, fontSize: "12px", lineHeight: 1.55, color: "var(--color-text-primary)" }}>
                {appleHevyBridge}
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 14px", fontSize: "11px", color: "var(--color-text-secondary)" }}>
                <span>Apple · entrenos: {appleSignals.workoutsCount ?? "—"}</span>
                <span>Apple · min entreno: {appleSignals.workoutMinutes ?? "—"}</span>
                <span>Apple · kcal activas: {appleSignals.activeEnergyKcal != null ? Math.round(appleSignals.activeEnergyKcal) : "—"}</span>
                <span>Apple · sueño: {appleSignals.sleepHours != null ? `${appleSignals.sleepHours.toFixed(1)} h` : "—"}</span>
              </div>
            </div>
          </div>
          <div
            className="mx-auto shrink-0 sm:mx-0"
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              border: "6px solid color-mix(in srgb, var(--color-accent-health) 40%, transparent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                width: "92px",
                height: "92px",
                borderRadius: "50%",
                border: "6px solid color-mix(in srgb, var(--color-accent-warning) 40%, transparent)",
              }}
            />
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: "22px", fontWeight: 600 }}>{strainHasSignal && strain != null ? strain : "—"}</p>
              <p
                style={{
                  margin: 0,
                  fontSize: "10px",
                  color: "var(--color-text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.12em",
                }}
              >
                Strain
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-[var(--layout-gap)] lg:grid-cols-2">
        <Card>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--color-text-secondary)",
              }}
            >
              Volumen e intensidad (7 días, Hevy)
            </p>
            <div className="w-full min-w-0 overflow-x-auto overscroll-x-contain">
              <div style={{ height: "200px", width: "100%", minWidth: "280px" }}>
              {chartEmpty ? (
                <div
                  style={{
                    height: "100%",
                    borderRadius: "14px",
                    border: "0.5px solid var(--color-border)",
                    background: "var(--color-surface-alt)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "12px",
                    color: "var(--color-text-secondary)",
                    textAlign: "center",
                    padding: "12px",
                  }}
                >
                  Sin volumen registrado en Hevy en la última semana. Completa entrenos o revisa la integración.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartRows} margin={rechartsDefaultMargin}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.5} />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="var(--color-text-secondary)" interval="preserveStartEnd" />
                    <YAxis yAxisId="v" width={36} tick={{ fontSize: 10 }} stroke="var(--color-text-secondary)" />
                    <YAxis yAxisId="i" orientation="right" width={36} tick={{ fontSize: 10 }} stroke="var(--color-text-secondary)" domain={[0, 100]} />
                    <Tooltip contentStyle={rechartsTooltipContentStyle} />
                    <Bar yAxisId="v" dataKey="volumen" name="Volumen (score)" fill="var(--color-accent-health)" radius={[6, 6, 0, 0]} />
                    <Line yAxisId="i" type="monotone" dataKey="intensidad" name="Intensidad relativa" stroke="var(--color-accent-warning)" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px 14px",
                fontSize: "11px",
                color: "var(--color-text-secondary)",
              }}
            >
              <span>● Volumen (score Hevy: series × 10)</span>
              <span>● Intensidad relativa (0–100)</span>
            </div>
          </div>
        </Card>
        <Card>
          <div style={{ padding: "var(--spacing-md)", display: "grid", gap: "var(--spacing-sm)" }}>
            <p
              style={{
                margin: 0,
                fontSize: "11px",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                color: "var(--color-text-secondary)",
              }}
            >
              Hitos estratégicos
            </p>
            {milestones.map((item) => (
              <div key={item.id} style={{ padding: "12px", borderRadius: "14px", background: "var(--color-surface-alt)" }}>
                <p style={{ margin: 0, fontSize: "13px", fontWeight: 500 }}>{item.title}</p>
                <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--color-text-secondary)" }}>{item.progressLabel}</p>
                <p style={{ margin: "4px 0 0", fontSize: "10px", color: "var(--color-text-secondary)" }}>{item.subtitle}</p>
                <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-border)", marginTop: "10px" }}>
                  <div style={{ height: "6px", borderRadius: "999px", width: `${item.barPct}%`, background: "#0F172A" }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {trainingNotice ? (
        <div
          role="status"
          className="flex flex-wrap items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm leading-snug"
          style={{
            borderColor: "color-mix(in srgb, var(--color-accent-primary) 32%, var(--color-border))",
            background: "color-mix(in srgb, var(--color-accent-primary) 8%, var(--color-surface))",
            color: "var(--color-text-primary)",
          }}
        >
          <p className="m-0 min-w-0 flex-1 whitespace-pre-line">{trainingNotice}</p>
          <button
            type="button"
            className="shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-alt)]"
            onClick={() => {
              if (trainingNoticeTimerRef.current) clearTimeout(trainingNoticeTimerRef.current)
              trainingNoticeTimerRef.current = null
              setTrainingNotice(null)
            }}
          >
            Cerrar
          </button>
        </div>
      ) : null}

      <TrainingVisualBodySection
        goalImageUrl={goalUrl}
        goalImageDisplayKey={goalImageDisplayKey}
        goalImageAiMode={goalImageAiMode}
        onGoalImageAiModeChange={setGoalImageAiMode}
        placeholderImageSrc="/training/visual-goal-placeholder.png"
        visualGoalDescription={
          isAppMockMode()
            ? (prefs.visualGoalDescription ??
                "Cuerpo atlético con 12% grasa, hombros y brazos marcados, postura fuerte y energía sostenida todo el día.")
            : (prefs.visualGoalDescription ?? "")
        }
        visualGoalDeadlineYm={isAppMockMode() ? (prefs.visualGoalDeadlineYm ?? "2026-10") : (prefs.visualGoalDeadlineYm ?? "")}
        visualGoalPriority={prefs.visualGoalPriority ?? "alta"}
        bodyRows={bodyRows}
        hints={hints}
        prefsLoading={prefsLoading}
        remotePrefs={remotePrefs}
        fileInputRef={fileInputRef}
        onPickImage={onPickImage}
        onFileChange={onFileChange}
        onVisualGoalDescriptionChange={(v) => updatePrefs({ visualGoalDescription: v })}
        goalImageGenerating={goalImageGenerating}
        onGenerateGoalWithAI={onGenerateGoalWithAI}
      />

      <Card>
        <div style={{ padding: "var(--spacing-lg)", display: "grid", gap: "var(--spacing-md)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "11px",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  color: "var(--color-text-secondary)",
                }}
              >
                Plan de alimentación semanal
              </p>
              <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                Nutrición táctica alineada a recomposición corporal
              </p>
            </div>
            <button
              type="button"
              onClick={onAdjustNutritionWithAI}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 14px",
                borderRadius: "10px",
                border: "0.5px solid var(--color-border)",
                background: "var(--color-accent-health)",
                color: "white",
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.12em",
              }}
            >
              Ajustar con IA
            </button>
          </div>

          {mealDays.length === 0 ? (
            <div
              style={{
                borderRadius: "14px",
                border: "0.5px solid var(--color-border)",
                background: "var(--color-surface-alt)",
                padding: "16px",
                fontSize: "12px",
                color: "var(--color-text-secondary)",
              }}
            >
              No hay plan semanal guardado. Añade objetivos de kcal y macros en tus preferencias de entreno (o en modo
              demostración verás un ejemplo).
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-[var(--spacing-sm)] min-[380px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-7">
              {mealDays.map((day) => (
                <div
                  key={day.day}
                  className="min-w-0"
                  style={{
                    padding: "12px",
                    borderRadius: "14px",
                    background: "var(--color-surface-alt)",
                    display: "grid",
                    gap: "8px",
                    border: "0.5px solid var(--color-border)",
                  }}
                >
                  <div className="flex min-w-0 flex-wrap items-center justify-between gap-1">
                    <span className="text-xs font-semibold sm:text-[12px]">{day.day}</span>
                    <span className="shrink-0 text-[10px] text-[var(--color-text-secondary)]">{day.kcal} kcal</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 text-[10px] sm:flex sm:flex-col sm:gap-1 sm:text-[11px]">
                    <span className="truncate text-center sm:text-left" style={{ color: "var(--color-accent-health)" }}>
                      P {day.pro}g
                    </span>
                    <span className="truncate text-center sm:text-left" style={{ color: "var(--color-accent-warning)" }}>
                      C {day.carb}g
                    </span>
                    <span className="truncate text-center sm:text-left" style={{ color: "var(--color-accent-primary)" }}>
                      G {day.fat}g
                    </span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "999px", background: "var(--color-border)" }}>
                    <div
                      style={{
                        height: "6px",
                        borderRadius: "999px",
                        width: `${Math.round((day.kcal / maxKcal) * 100)}%`,
                        background: "var(--color-accent-health)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          <div
            className="grid grid-cols-1 gap-4 sm:gap-[var(--spacing-sm)] md:grid-cols-3"
            style={{
              background: "#FFF3ED",
              border: "0.5px solid #FDE5DA",
              borderRadius: "12px",
              padding: "12px",
            }}
          >
            <div className="min-w-0">
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
                Resumen semanal
              </p>
              <p className="text-pretty" style={{ margin: "6px 0 0", fontSize: "12px" }}>
                {mealDays.length > 0
                  ? `${avgKcal} kcal promedio · según el plan guardado en preferencias`
                  : "Sin días de plan guardados todavía."}
              </p>
            </div>
            <div className="min-w-0">
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
                Recomendación actual
              </p>
              <p className="text-pretty" style={{ margin: "6px 0 0", fontSize: "12px" }}>
                Mantener. Si el peso no baja en varios días, usa &quot;Ajustar con IA&quot; (próximo) o −150 kcal en días suaves.
              </p>
            </div>
            <div className="min-w-0 md:min-h-0">
              <p style={{ margin: 0, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--color-text-secondary)" }}>
                Notas
              </p>
              <label className="mt-1.5 block min-w-0">
                <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
                  Notas semanales
                </span>
                <textarea
                  value={prefs.mealNotes ?? ""}
                  onChange={(e) => setMealNotes(e.target.value)}
                  rows={2}
                  placeholder="Cheat meal, eventos, sensaciones…"
                  style={{
                    width: "100%",
                    fontSize: "12px",
                    borderRadius: "8px",
                    border: "0.5px solid var(--color-border)",
                    padding: "8px",
                    resize: "vertical",
                    background: "var(--color-surface)",
                    color: "var(--color-text-primary)",
                  }}
                />
              </label>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
