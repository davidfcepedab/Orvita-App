"use client"

import Link from "next/link"
import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { Clock3, Dumbbell } from "lucide-react"
import { useTraining } from "@/src/modules/training/useTraining"
import { useHealthAutoMetrics } from "@/app/hooks/useHealthAutoMetrics"
import { appleDaySignalsFromHealthMetric, HEVY_INTEGRATION_LABEL } from "@/lib/health/appleHevyRelation"
import { buildPlanVsExecution, buildTrainingReadiness, pickLastHevySession } from "@/lib/training/trainingOperationalDerivations"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"
import { useTrainingPreferences } from "@/app/hooks/useTrainingPreferences"
import { TrainingActionQuerySync } from "@/app/training/TrainingActionQuerySync"
import { Card } from "@/src/components/ui/Card"

export default function TrainingPage() {
  const router = useRouter()
  const todayIso = agendaTodayYmd()
  const { today, days, loading, error, setManualStatus, todayState, dataMeta } = useTraining()
  const { latest: appleHealth, loading: appleLoading } = useHealthAutoMetrics()
  const { bodyRows, prefs } = useTrainingPreferences()
  const appleSignals = useMemo(() => appleDaySignalsFromHealthMetric(appleHealth), [appleHealth])
  const readiness = useMemo(() => buildTrainingReadiness(appleSignals, days), [appleSignals, days])
  const planVsExecution = useMemo(() => buildPlanVsExecution(days, todayState, todayIso), [days, todayState, todayIso])
  const lastSession = useMemo(() => pickLastHevySession(days), [days])
  const hasHevy = days.some((day) => day.source === "hevy")
  const hs = appleSignals?.health_signals ?? null
  const weeklyDays = useMemo(() => days.filter((day) => day.date >= shiftDays(todayIso, -6)), [days, todayIso])
  const sessionStatus = todayState === "completed" ? "completada" : todayState === "moved" ? "omitida" : "pendiente"
  const plannedFocus = focusForPlan(planVsExecution.plannedToday)
  const statusChip = resolveTrainingStatusChip(readiness.score, hasHevy || !!appleSignals)
  const hevyStatus = hasHevy ? "conectado" : loading ? "pendiente" : "sin datos"
  const latestTrainingAt = lastSession?.startedAt ?? lastSession?.endedAt ?? null

  const trainingsWeek = weeklyDays.filter((day) => day.status === "trained" || day.status === "swim").length
  const minutesFromHevy = weeklyDays.reduce((sum, day) => sum + (day.duration ?? 0), 0)
  const volumeEstimated = weeklyDays.reduce((sum, day) => sum + (day.volumeScore ?? 0), 0)
  const exerciseMinutes = firstNumber(hs?.exercise_minutes, hs?.workout_minutes, hs?.workouts_minutes, appleSignals?.workout_minutes)
  const trainingLoad = firstNumber(hs?.training_load)

  const weightMetric = bodyRows.find((row) => /peso/i.test(row.label))
  const waistMetric = bodyRows.find((row) => /cintura/i.test(row.label))
  const objective = deriveObjective(prefs.visualGoalDescription)
  const trendRows = bodyRows.slice(0, 4)
  const hasLoadData =
    trainingsWeek > 0 ||
    minutesFromHevy > 0 ||
    trainingLoad != null ||
    exerciseMinutes != null ||
    volumeEstimated > 0

  return (
    <main className="orbita-page-stack mx-auto w-full max-w-[min(72rem,calc(100vw-1.5rem))]" aria-label="Entrenamiento operativo">
      <TrainingActionQuerySync setManualStatus={setManualStatus} />
      <div className="min-w-0 px-1 py-1 sm:px-2">
        <h1 className="m-0 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-[2rem]">Entrenamiento</h1>
        <p className="m-0 mt-1.5 text-sm leading-relaxed text-[var(--color-text-secondary)]">Carga, sesión y progreso físico</p>
        <div className="mt-3">
          <StatusChip label={statusChip.label} tone={statusChip.tone} />
        </div>
      </div>

      <Card>
        <div className="rounded-2xl border border-[color:color-mix(in_srgb,var(--color-accent-health)_35%,var(--color-border))] bg-[color:color-mix(in_srgb,var(--color-accent-health)_14%,var(--color-surface))] p-[var(--spacing-lg)] sm:p-[calc(var(--spacing-lg)+4px)]">
          <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Decisión del día</p>
          <p className="m-0 mt-1 text-base font-semibold text-[var(--color-text-primary)]">
            Hoy está planeado <strong>{planVsExecution.plannedToday}</strong>. Decide rápido según carga y agenda.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => (hasHevy ? window.open("https://hevy.com/app", "_blank", "noopener,noreferrer") : router.push("/configuracion#acordeon-config-hevy"))}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--color-accent-health)] bg-[var(--color-accent-health)] px-4 text-sm font-semibold text-white"
            >
              Ir a entrenamiento
            </button>
          </div>
          <div className="mt-2 grid grid-cols-1 gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
            <button
              type="button"
              onClick={() => setManualStatus("skip")}
              className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 text-xs font-medium text-[var(--color-text-secondary)] sm:w-auto"
            >
              Ajustar sesión
            </button>
            <button
              type="button"
              onClick={() => router.push("/agenda")}
              className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 text-xs font-medium text-[var(--color-text-secondary)] sm:w-auto"
            >
              Ajustar día
            </button>
            <button
              type="button"
              onClick={() => setManualStatus("rest")}
              className="inline-flex min-h-9 w-full items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 text-xs font-medium text-[var(--color-text-secondary)] sm:w-auto"
            >
              Descansar / movilidad
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-[var(--spacing-lg)]">
          <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Sesión de hoy</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <MetricMini label="Tipo" value={planVsExecution.plannedToday} />
            <MetricMini label="Duración estimada" value={`${estimateSessionMinutes(today?.duration, planVsExecution.plannedToday)} min`} />
            <MetricMini label="Enfoque muscular" value={plannedFocus} />
            <MetricMini label="Estado" value={sessionStatus} />
          </div>
          <div className="mt-3">
            <Link
              href={hasHevy ? "https://hevy.com/app" : "/configuracion#acordeon-config-hevy"}
              target={hasHevy ? "_blank" : undefined}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[var(--color-accent-health)] bg-[var(--color-accent-health)] px-4 text-sm font-semibold text-white no-underline"
            >
              <Dumbbell className="h-4 w-4" />
              {hasHevy ? (todayState === "completed" ? "Abrir Hevy" : "Iniciar en Hevy") : "Registrar entrenamiento"}
            </Link>
          </div>
        </div>
      </Card>

      <Card>
        <div className="p-[var(--spacing-lg)]">
          <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Carga semanal</p>
          {loading || appleLoading ? (
            <p className="m-0 mt-2 text-sm text-[var(--color-text-secondary)]">Cargando carga semanal…</p>
          ) : hasLoadData ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              <MetricMini label="Entrenamientos semana" value={String(trainingsWeek)} />
              <MetricMini label="Minutos entrenados" value={String(Math.round(firstNumber(minutesFromHevy, exerciseMinutes ?? 0) ?? 0))} />
              <MetricMini label="training_load" value={trainingLoad != null ? `${Math.round(trainingLoad)}` : "—"} />
            </div>
          ) : (
            <EmptyDataState />
          )}
        </div>
      </Card>

      <Card>
        <div className="p-[var(--spacing-lg)]">
          <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Progreso físico</p>
          {bodyRows.length > 0 ? (
            <>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <MetricMini label="Peso" value={weightMetric ? `${weightMetric.current}` : "—"} />
                <MetricMini label="Cintura" value={waistMetric ? `${waistMetric.current}` : "—"} />
                <MetricMini label="Objetivo actual" value={objective} />
              </div>
              <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
                <p className="m-0 text-[11px] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">Tendencia</p>
                <div className="mt-2 flex items-end gap-1">
                  {trendRows.map((row) => (
                    <div key={row.label} className="flex-1">
                      <div className="h-16 rounded-md bg-[var(--color-surface)] px-1 py-1">
                        <div
                          className="h-full rounded-sm bg-[var(--color-accent-health)]"
                          style={{ height: `${Math.max(8, Math.min(100, row.progressPct))}%` }}
                        />
                      </div>
                      <p className="m-0 mt-1 truncate text-[10px] text-[var(--color-text-secondary)]">{row.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-xl border border-[color:color-mix(in_srgb,var(--color-accent-health)_30%,var(--color-border))] bg-[color:color-mix(in_srgb,var(--color-accent-health)_10%,var(--color-surface-alt))] p-3">
                <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">Cómo me quiero ver</p>
                <p className="m-0 mt-1 text-sm font-medium text-[var(--color-text-primary)]">
                  {(prefs.visualGoalDescription ?? "").trim() || "Define tu objetivo visual para orientar el entrenamiento de la semana."}
                </p>
                <p className="m-0 mt-1 text-xs text-[var(--color-text-secondary)]">
                  Prioridad: {prefs.visualGoalPriority ?? "alta"} {prefs.visualGoalDeadlineYm ? `· Meta ${prefs.visualGoalDeadlineYm}` : ""}
                </p>
              </div>
            </>
          ) : (
            <EmptyDataState />
          )}
        </div>
      </Card>

      <Card>
        <div className="p-[var(--spacing-lg)]">
          <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Hevy / Integración</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusChip
              label={`Estado Hevy: ${hevyStatus}`}
              tone={hevyStatus === "conectado" ? "ok" : hevyStatus === "pendiente" ? "warn" : "muted"}
            />
            <span className="text-xs text-[var(--color-text-secondary)]">Fuente principal: {dataMeta.sourceLabel || HEVY_INTEGRATION_LABEL}</span>
          </div>
          <p className="m-0 mt-2 text-sm text-[var(--color-text-primary)]">
            {lastSession?.workoutName
              ? `Último entrenamiento: ${lastSession.workoutName}${lastSession.duration ? ` · ${Math.round(lastSession.duration)} min` : ""}`
              : "Aún no hay sesiones estructuradas recibidas."}
          </p>
          {latestTrainingAt ? (
            <p className="m-0 mt-1 text-xs text-[var(--color-text-secondary)]">
              Recibido: {new Date(latestTrainingAt).toLocaleString("es-CO")}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {!hasHevy ? (
              <button
                type="button"
                onClick={() => router.push("/configuracion#acordeon-config-hevy")}
                className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[var(--color-accent-health)] bg-[var(--color-accent-health)] px-3 text-xs font-semibold text-white"
              >
                Conectar Hevy
              </button>
            ) : (
              <a
                href="https://hevy.com/app"
                target="_blank"
                className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[var(--color-accent-health)] bg-[var(--color-accent-health)] px-3 text-xs font-semibold text-white no-underline"
              >
                Abrir Hevy
              </a>
            )}
            <button
              type="button"
              onClick={() => router.refresh()}
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 text-xs font-medium text-[var(--color-text-primary)]"
            >
              Sincronizar
            </button>
            <Link
              href="/configuracion#acordeon-config-hevy"
              className="inline-flex min-h-9 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 text-xs font-medium text-[var(--color-text-primary)] no-underline"
            >
              Revisar conexión
            </Link>
          </div>
          {dataMeta.lastSyncAt ? (
            <p className="m-0 mt-2 inline-flex items-center gap-1 text-[11px] text-[var(--color-text-secondary)]">
              <Clock3 className="h-3.5 w-3.5" />
              Última sincronización Hevy: {new Date(dataMeta.lastSyncAt).toLocaleString("es-CO")}
            </p>
          ) : null}
          {error ? (
            <p className="m-0 mt-2 text-xs text-[var(--color-text-secondary)]">Aún no hay datos suficientes para estimar carga.</p>
          ) : null}
        </div>
      </Card>
    </main>
  )
}

function MetricMini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-2">
      <p className="m-0 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">{label}</p>
      <p className="m-0 mt-1 text-xs font-semibold text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}

function resolveTrainingStatusChip(score: number, hasSignals: boolean) {
  if (!hasSignals) return { label: "Sin datos suficientes", tone: "muted" as const }
  if (score < 50) return { label: "Priorizar recuperación", tone: "risk" as const }
  if (score >= 74) return { label: "Listo para entrenar", tone: "ok" as const }
  return { label: "Carga moderada", tone: "warn" as const }
}

function StatusChip({ label, tone }: { label: string; tone: "ok" | "warn" | "risk" | "muted" }) {
  const styles =
    tone === "ok"
      ? "border-[color:color-mix(in_srgb,var(--color-accent-health)_60%,white)] bg-[color:color-mix(in_srgb,var(--color-accent-health)_15%,transparent)] text-[var(--color-text-primary)]"
      : tone === "warn"
        ? "border-[color:color-mix(in_srgb,var(--color-accent-warning,#f59e0b)_55%,white)] bg-[color:color-mix(in_srgb,var(--color-accent-warning,#f59e0b)_14%,transparent)] text-[var(--color-text-primary)]"
        : tone === "risk"
          ? "border-[color:color-mix(in_srgb,var(--color-accent-finance)_60%,white)] bg-[color:color-mix(in_srgb,var(--color-accent-finance)_14%,transparent)] text-[var(--color-text-primary)]"
          : "border-[var(--color-border)] bg-[var(--color-surface-alt)] text-[var(--color-text-secondary)]"
  return <span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-semibold ${styles}`}>{label}</span>
}

function firstNumber(...values: Array<number | null | undefined>) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value
  }
  return null
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

function estimateSessionMinutes(duration: number | undefined, plan: string) {
  if (typeof duration === "number" && duration > 0) return Math.round(duration)
  const lower = plan.toLowerCase()
  if (lower.includes("cardio")) return 35
  if (lower.includes("leg") || lower.includes("lower")) return 70
  return 55
}

function deriveObjective(description: string | undefined) {
  const text = (description ?? "").toLowerCase()
  if (text.includes("defin")) return "Definición"
  if (text.includes("manten")) return "Mantenimiento"
  return "Volumen limpio"
}

function EmptyDataState() {
  return (
    <div className="mt-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
      <p className="m-0 text-sm text-[var(--color-text-secondary)]">Aún no hay datos suficientes para estimar carga.</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Link
          href="/configuracion#acordeon-config-hevy"
          className="inline-flex min-h-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-text-primary)] no-underline"
        >
          Conectar Hevy
        </Link>
        <button
          type="button"
          onClick={() => window.open("https://hevy.com/app", "_blank", "noopener,noreferrer")}
          className="inline-flex min-h-8 items-center justify-center rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-xs font-medium text-[var(--color-text-primary)]"
        >
          Registrar entrenamiento
        </button>
      </div>
    </div>
  )
}
