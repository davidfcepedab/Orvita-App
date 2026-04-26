"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Card } from "@/src/components/ui/Card"
import { useTraining } from "@/src/modules/training/useTraining"
import { useHealthAutoMetrics } from "@/app/hooks/useHealthAutoMetrics"
import { useAppleHevyCorrelationNarrative } from "@/app/health/useAppleHevyCorrelationNarrative"
import { appleDaySignalsFromHealthMetric, HEVY_INTEGRATION_LABEL } from "@/lib/health/appleHevyRelation"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { TrainingHeroOperationalCard } from "@/app/training/components/TrainingHeroOperationalCard"
import { TrainingReadinessCard } from "@/app/training/components/TrainingReadinessCard"
import { TrainingExecutionCard } from "@/app/training/components/TrainingExecutionCard"
import { TrainingWeeklyTimeline } from "@/app/training/components/TrainingWeeklyTimeline"
import { TrainingGoalAlignmentCard } from "@/app/training/components/TrainingGoalAlignmentCard"
import { TrainingAgendaBridgeCard } from "@/app/training/components/TrainingAgendaBridgeCard"
import { TrainingFallbackState } from "@/app/training/components/TrainingFallbackState"
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
  const insight = useAppleHevyCorrelationNarrative({
    loading: loading || appleLoading,
    apple: appleSignals,
    hevyToday: today ?? null,
  })

  const hasHevy = days.some((d) => d.source === "hevy")

  const handleRegister = () => {
    router.push("/configuracion#acordeon-config-hevy")
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
      <div className="min-w-0 rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-accent-health)_5%,var(--color-surface))] px-4 py-4 shadow-[0_12px_40px_-16px_color-mix(in_srgb,var(--color-accent-health)_16%,transparent)] sm:px-6 sm:py-5">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">Entrenamiento operativo</h1>
        <p className="m-0 mt-1.5 max-w-[48rem] text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
          Decide qué hacer hoy cruzando plan, ejecución y recuperación. {HEVY_INTEGRATION_LABEL} manda en entrenamiento
          estructurado; Apple Health aporta señal física.
        </p>
      </div>

      <TrainingHeroOperationalCard
        plannedToday={planVsExecution.plannedToday}
        todayState={todayState}
        sourceLabel={dataMeta.sourceLabel}
        onRegister={handleRegister}
      />

      <div className="grid gap-3 lg:grid-cols-2">
        <TrainingReadinessCard
          readiness={readiness}
          sleepHours={appleSignals?.sleep_hours}
          hrvMs={appleSignals?.hrv_ms}
          restingHr={appleSignals?.resting_hr_bpm}
        />
        <TrainingExecutionCard session={lastSession} topExercises={topExercises} onRegister={handleRegister} />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <TrainingWeeklyTimeline timeline={timeline} suggestion={planVsExecution.suggestion} />
        <TrainingGoalAlignmentCard alignment={goalAlignment} />
      </div>

      <TrainingAgendaBridgeCard
        todayAgendaItems={agendaTasks ?? []}
        onSuggestBlock={() => {
          void handleSuggestBlock()
        }}
      />

      <Card>
        <div className="p-[var(--spacing-lg)]">
          <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Lectura integrada</p>
          {loading || appleLoading ? (
            <p className="m-0 mt-2 text-sm text-[var(--color-text-secondary)]">Cargando señales de hoy…</p>
          ) : (
            <p className="m-0 mt-2 text-sm leading-relaxed text-[var(--color-text-primary)]">{insight.paragraph}</p>
          )}
          {dataMeta.lastSyncAt ? (
            <p className="m-0 mt-2 text-[11px] text-[var(--color-text-secondary)]">
              Última sincronización Hevy: {new Date(dataMeta.lastSyncAt).toLocaleString("es-CO")}
            </p>
          ) : null}
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
          {error ? (
            <p className="m-0 mt-2 text-xs text-[var(--color-accent-finance)]">{error}</p>
          ) : null}
        </div>
      </Card>

      <Card>
        <div className="p-[var(--spacing-lg)]">
          <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Ajustes rápidos</p>
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
        </div>
      </Card>
    </main>
  )
}
