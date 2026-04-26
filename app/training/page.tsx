"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown, Clock3, Dumbbell, Sparkles } from "lucide-react"
import { useTraining } from "@/src/modules/training/useTraining"
import { useHealthAutoMetrics } from "@/app/hooks/useHealthAutoMetrics"
import { useAppleHevyCorrelationNarrative } from "@/app/health/useAppleHevyCorrelationNarrative"
import { appleDaySignalsFromHealthMetric, HEVY_INTEGRATION_LABEL } from "@/lib/health/appleHevyRelation"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { TrainingFallbackState } from "@/app/training/components/TrainingFallbackState"
import { TrainingVisualBodySection } from "@/app/training/TrainingVisualBodySection"
import {
  buildGoalAlignment,
  buildInconsistencies,
  buildPlanVsExecution,
  buildTrainingReadiness,
  buildWeeklyTimeline,
  pickLastHevySession,
  summarizeTopExercises,
} from "@/lib/training/trainingOperationalDerivations"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"
import { useTrainingPreferences } from "@/app/hooks/useTrainingPreferences"
import { buildAdjustmentHints } from "@/lib/training/adjustmentHints"
import { Card } from "@/src/components/ui/Card"

type AgendaApiTask = {
  id: string
  title: string
  dueDate: string | null
  status: "pending" | "in-progress" | "completed"
}

export default function TrainingPage() {
  const router = useRouter()
  const todayIso = agendaTodayYmd()
  const { today, days, loading, error, setManualStatus, todayState, dataMeta } = useTraining()
  const { latest: appleHealth, loading: appleLoading } = useHealthAutoMetrics()
  const [agendaTasks, setAgendaTasks] = useState<AgendaApiTask[] | null>(null)
  const [agendaLoading, setAgendaLoading] = useState(false)
  const [agendaNotice, setAgendaNotice] = useState<string | null>(null)
  const [showSessionDetail, setShowSessionDetail] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [trainingNotice, setTrainingNotice] = useState<string | null>(null)
  const [goalImageGenerating, setGoalImageGenerating] = useState(false)
  const [goalImageDisplayKey, setGoalImageDisplayKey] = useState(0)
  const [goalImageAiMode, setGoalImageAiMode] = useState<"create" | "edit">("create")
  const {
    bodyRows,
    prefs,
    loading: prefsLoading,
    updatePrefs,
    setGoalImageUrl,
  } = useTrainingPreferences()
  const appleSignals = useMemo(() => appleDaySignalsFromHealthMetric(appleHealth), [appleHealth])
  const readiness = useMemo(() => buildTrainingReadiness(appleSignals, days), [appleSignals, days])
  const planVsExecution = useMemo(() => buildPlanVsExecution(days, todayState, todayIso), [days, todayState, todayIso])
  const timeline = useMemo(() => buildWeeklyTimeline(days, todayIso), [days, todayIso])
  const lastSession = useMemo(() => pickLastHevySession(days), [days])
  const topExercises = useMemo(() => summarizeTopExercises(lastSession?.exercises), [lastSession?.exercises])
  const inconsistencies = useMemo(
    () => buildInconsistencies(appleSignals, planVsExecution, lastSession),
    [appleSignals, planVsExecution, lastSession],
  )
  const goalAlignment = useMemo(
    () => buildGoalAlignment(readiness, planVsExecution, days),
    [readiness, planVsExecution, days],
  )
  const hints = useMemo(() => buildAdjustmentHints(bodyRows), [bodyRows])
  const insight = useAppleHevyCorrelationNarrative({
    loading: loading || appleLoading,
    apple: appleSignals,
    hevyToday: today ?? null,
  })

  const hasHevy = days.some((d) => d.source === "hevy")

  const handleRegister = () => {
    router.push("/configuracion#acordeon-config-hevy")
  }

  const onPickImage = () => fileInputRef.current?.click()

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result === "string") {
        setGoalImageDisplayKey((k) => k + 1)
        setGoalImageUrl(result)
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const showTrainingNotice = useCallback((message: string) => {
    setTrainingNotice(message)
    window.setTimeout(() => setTrainingNotice(null), 7000)
  }, [])

  useEffect(() => {
    if (agendaTasks !== null) return
    void handleSuggestBlock()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onGenerateGoalWithAI = async () => {
    const prompt = (prefs.visualGoalDescription ?? "").trim()
    if (!prompt) {
      showTrainingNotice("Escribe una descripción del objetivo para generar la imagen.")
      return
    }
    setGoalImageGenerating(true)
    try {
      const payload: { prompt: string; mode: "create" | "edit"; imageBase64?: string } = { prompt, mode: goalImageAiMode }
      if (goalImageAiMode === "edit" && (prefs.goalImageUrl ?? "").startsWith("data:")) {
        payload.imageBase64 = prefs.goalImageUrl
      }
      const res = await fetch("/api/training/goal-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = (await res.json()) as { ok?: boolean; imageDataUrl?: string; error?: string; detail?: string }
      if (!res.ok || !data.ok || !data.imageDataUrl) {
        throw new Error(data.detail ?? data.error ?? "No se pudo generar la imagen")
      }
      setGoalImageDisplayKey((k) => k + 1)
      setGoalImageUrl(data.imageDataUrl)
      showTrainingNotice("Imagen de objetivo actualizada.")
    } catch (e) {
      showTrainingNotice(e instanceof Error ? e.message : "Error generando imagen")
    } finally {
      setGoalImageGenerating(false)
    }
  }

  const handleSuggestBlock = async () => {
    setAgendaLoading(true)
    setAgendaNotice(null)
    try {
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/agenda", { cache: "no-store", headers })
      const payload = (await res.json()) as { success?: boolean; data?: AgendaApiTask[]; error?: string }
      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? "No pudimos leer agenda")
      }
      const todayItems = (payload.data ?? []).filter((task) => task.dueDate === todayIso)
      setAgendaTasks(todayItems)
      if (todayItems.length === 0) {
        setAgendaNotice("No hay bloque hoy. Sugerencia: agenda 45-60 min entre 6:00 y 8:00 p. m. (con confirmación).")
      }
    } catch (e) {
      setAgendaNotice(e instanceof Error ? e.message : "No pudimos conectar agenda")
    } finally {
      setAgendaLoading(false)
    }
  }

  return (
    <main className="orbita-page-stack mx-auto w-full max-w-[min(72rem,calc(100vw-1.5rem))]" aria-label="Entrenamiento operativo">
      <div className="min-w-0 px-1 py-1 sm:px-2">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[2rem]">Entrenamiento operativo</h1>
        <p className="m-0 mt-1.5 max-w-[48rem] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
          Decide qué hacer hoy cruzando plan, ejecución y recuperación. {HEVY_INTEGRATION_LABEL} manda en entrenamiento
          estructurado; Apple Health aporta señal física.
        </p>
      </div>

      <Card>
        <div className="relative overflow-hidden p-[var(--spacing-lg)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,color-mix(in_srgb,var(--color-accent-health)_14%,transparent),transparent_55%)]" />
          <div className="relative grid gap-4 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Entrenamiento de hoy</p>
              <h2 className="m-0 mt-1.5 text-2xl font-semibold text-[var(--color-text-primary)]">{planVsExecution.plannedToday}</h2>
              <p className="m-0 mt-1 text-xs text-[var(--color-text-secondary)]">Fuente principal: {dataMeta.sourceLabel}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleRegister}
                  className="inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--color-accent-health)] bg-[var(--color-accent-health)] px-3 text-xs font-semibold text-white"
                >
                  Registrar entrenamiento
                </button>
                <a
                  href="https://hevy.com/app"
                  target="_blank"
                  className="inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 text-xs font-medium text-[var(--color-text-primary)] no-underline"
                >
                  Abrir Hevy
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 lg:col-span-4">
              <p className="m-0 text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">Cómo me encuentro para entrenar</p>
              <div className="mt-2 flex items-end justify-between">
                <h3 className="m-0 text-lg font-semibold text-[var(--color-text-primary)]">{readiness.label}</h3>
                <p className="m-0 text-2xl font-bold text-[var(--color-text-primary)]">{readiness.score}</p>
              </div>
              <p className="m-0 mt-1.5 text-xs text-[var(--color-text-secondary)]">{readiness.rationale}</p>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <MetricMini label="Sueño" value={appleSignals?.sleep_hours != null ? `${appleSignals.sleep_hours.toFixed(1)} h` : "—"} />
                <MetricMini label="HRV" value={appleSignals?.hrv_ms != null ? `${Math.round(appleSignals.hrv_ms)} ms` : "—"} />
                <MetricMini label="FC reposo" value={appleSignals?.resting_hr_bpm != null ? `${Math.round(appleSignals.resting_hr_bpm)} bpm` : "—"} />
              </div>
            </div>

            <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 lg:col-span-4">
              <div className="flex items-center justify-between gap-2">
                <p className="m-0 text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">Registro reciente</p>
                <button
                  type="button"
                  onClick={() => setShowSessionDetail((v) => !v)}
                  className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]"
                >
                  {showSessionDetail ? "Ocultar" : "Ver"}
                  <ChevronDown className={`h-3.5 w-3.5 transition ${showSessionDetail ? "rotate-180" : ""}`} />
                </button>
              </div>
              {lastSession ? (
                <>
                  <h3 className="m-0 mt-2 text-sm font-semibold text-[var(--color-text-primary)]">{lastSession.workoutName ?? "Sesión Hevy"}</h3>
                  <p className="m-0 mt-1 text-xs text-[var(--color-text-secondary)]">
                    {lastSession.duration ? `${Math.round(lastSession.duration)} min` : "Duración no disponible"} · {lastSession.totalSets ?? 0} sets · vol{" "}
                    {Math.round(lastSession.volumeScore ?? 0)}
                  </p>
                  {showSessionDetail ? (
                    <div className="mt-2 space-y-1.5">
                      {topExercises.length > 0 ? (
                        topExercises.map((line) => (
                          <p key={line} className="m-0 rounded-lg bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text-primary)]">
                            {line}
                          </p>
                        ))
                      ) : (
                        <p className="m-0 text-xs text-[var(--color-text-secondary)]">Sin detalle de ejercicios en esta sesión.</p>
                      )}
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="m-0 mt-2 text-xs text-[var(--color-text-secondary)]">
                  Si esto te aporta como historial, lo mantenemos. Si prefieres, lo movemos a una vista de sesiones.
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-[var(--spacing-lg)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Semana + agenda</p>
              <p className="m-0 mt-1 text-sm text-[var(--color-text-secondary)]">Vista semanal inicia en lunes. Plan y agenda se coordinan aquí.</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void handleSuggestBlock()
              }}
              className="inline-flex min-h-8 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 text-xs font-medium text-[var(--color-text-primary)]"
            >
              Actualizar agenda
            </button>
          </div>
          <div className="mt-3 overflow-x-auto">
            <div className="min-w-[720px] grid-cols-7 gap-2 sm:grid">
              {timeline.map((item) => (
                <div key={item.date} className="mb-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-2.5 sm:mb-0">
                  <p className="m-0 text-[11px] font-semibold text-[var(--color-text-primary)]">{item.label}</p>
                  <p className="m-0 mt-1 text-xs text-[var(--color-text-primary)]">{item.plan}</p>
                  <p className="m-0 mt-1 text-[11px] text-[var(--color-text-secondary)]">{item.executed ?? "Sin sesión"}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
            <p className="m-0 text-[11px] uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">Agenda de hoy</p>
            {agendaLoading ? (
              <p className="m-0 mt-1.5 text-xs text-[var(--color-text-secondary)]">Comprobando agenda…</p>
            ) : (agendaTasks ?? []).length > 0 ? (
              <div className="mt-2 space-y-1.5">
                {(agendaTasks ?? []).map((task) => (
                  <p key={task.id} className="m-0 rounded-lg bg-[var(--color-surface)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)]">
                    {task.title} · {task.status}
                  </p>
                ))}
              </div>
            ) : (
              <p className="m-0 mt-1.5 text-xs text-[var(--color-text-secondary)]">
                No hay bloque de entreno en agenda. Sugerencia: 45–60 min hoy con confirmación.
              </p>
            )}
            <p className="m-0 mt-2 text-xs text-[var(--color-text-secondary)]">{planVsExecution.suggestion}</p>
          </div>
        </div>
      </Card>

      <TrainingVisualBodySection
        goalImageUrl={prefs.goalImageUrl ?? ""}
        goalImageDisplayKey={goalImageDisplayKey}
        placeholderImageSrc="/training/visual-goal-placeholder.png"
        visualGoalDescription={prefs.visualGoalDescription ?? ""}
        visualGoalDeadlineYm={prefs.visualGoalDeadlineYm ?? ""}
        visualGoalPriority={prefs.visualGoalPriority ?? "alta"}
        bodyRows={bodyRows}
        hints={hints}
        prefsLoading={prefsLoading}
        remotePrefs
        fileInputRef={fileInputRef}
        onPickImage={onPickImage}
        onFileChange={onFileChange}
        onVisualGoalDescriptionChange={(value) => updatePrefs({ visualGoalDescription: value })}
        goalImageGenerating={goalImageGenerating}
        goalImageAiMode={goalImageAiMode}
        onGoalImageAiModeChange={setGoalImageAiMode}
        onGenerateGoalWithAI={onGenerateGoalWithAI}
      />

      <Card>
        <div className="p-[var(--spacing-lg)]">
          <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Lectura integrada + acciones</p>
          {loading || appleLoading ? (
            <p className="m-0 mt-2 text-sm text-[var(--color-text-secondary)]">Cargando señales de hoy…</p>
          ) : (
            <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--color-text-primary)]">{insight.paragraph}</p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setManualStatus("rest")}
              className="inline-flex min-h-8 items-center justify-center rounded-full border border-[var(--color-border)] px-3 text-xs text-[var(--color-text-primary)]"
            >
              Marcar descanso
            </button>
            <button
              type="button"
              onClick={() => setManualStatus("skip")}
              className="inline-flex min-h-8 items-center justify-center rounded-full border border-[var(--color-border)] px-3 text-xs text-[var(--color-text-primary)]"
            >
              Reprogramar para mañana
            </button>
            <button
              type="button"
              onClick={() => {
                void handleSuggestBlock()
              }}
              className="inline-flex min-h-8 items-center justify-center rounded-full border border-[var(--color-border)] px-3 text-xs text-[var(--color-text-primary)]"
            >
              Ver agenda de hoy
            </button>
          </div>
          <div className="mt-3 space-y-2">
            <p className="m-0 rounded-xl bg-[var(--color-surface-alt)] px-2.5 py-2 text-xs text-[var(--color-text-primary)]">
              <strong>Alineación:</strong> {goalAlignment.insight}
            </p>
            <p className="m-0 rounded-xl bg-[var(--color-surface-alt)] px-2.5 py-2 text-xs text-[var(--color-text-primary)]">
              <Sparkles className="mr-1 inline h-3.5 w-3.5" />
              {goalAlignment.actionables[0]}
            </p>
          </div>
          {!hasHevy ? (
            <div className="mt-3">
              <TrainingFallbackState
                title="Sin sesiones recientes de Hevy"
                detail="No encontramos sesiones estructuradas en los últimos días."
                ctaLabel="Conectar o revisar Hevy"
                onAction={handleRegister}
              />
            </div>
          ) : null}
          {inconsistencies.length > 0 ? (
            <div className="mt-3 space-y-2">
              {inconsistencies.map((item) => (
                <p key={item.id} className="m-0 rounded-xl bg-[var(--color-surface-alt)] px-2.5 py-2 text-xs text-[var(--color-text-primary)]">
                  {item.message}
                </p>
              ))}
            </div>
          ) : null}
          {agendaLoading ? (
            <p className="m-0 mt-2 text-xs text-[var(--color-text-secondary)]">Comprobando agenda…</p>
          ) : agendaNotice ? (
            <p className="m-0 mt-2 text-xs text-[var(--color-text-secondary)]">{agendaNotice}</p>
          ) : null}
          {trainingNotice ? <p className="m-0 mt-2 text-xs text-[var(--color-text-secondary)]">{trainingNotice}</p> : null}
          {dataMeta.lastSyncAt ? (
            <p className="m-0 mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)]">
              <Clock3 className="h-3.5 w-3.5" />
              Última sincronización Hevy: {new Date(dataMeta.lastSyncAt).toLocaleString("es-CO")}
            </p>
          ) : null}
          {error ? (
            <p className="m-0 mt-2 text-xs text-[var(--color-accent-finance)]">{error}</p>
          ) : null}
        </div>
      </Card>
    </main>
  )
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5">
      <p className="m-0 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">{label}</p>
      <p className="m-0 mt-1 text-xs font-semibold text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}
