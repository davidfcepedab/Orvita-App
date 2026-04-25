"use client"

import Link from "next/link"
import { useOperationalContext } from "@/app/hooks/useOperationalContext"
import { useHealthAutoMetrics } from "@/app/hooks/useHealthAutoMetrics"
import { formatHoursMinutesFromSeconds } from "@/lib/health/shortcutHealthAnalytics"
import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"

function numMeta(m: Record<string, unknown> | null | undefined, k: string) {
  const v = m?.[k]
  return typeof v === "number" && Number.isFinite(v) ? v : null
}

function latestToSeconds(latest: AutoHealthMetric | null) {
  if (!latest) return null
  const m = latest.metadata as Record<string, unknown> | undefined
  const s = numMeta(m, "apple_sleep_duration_seconds")
  if (s != null && s >= 0) return s
  if (latest.sleep_hours != null && latest.sleep_hours > 0) return latest.sleep_hours * 3600
  return null
}

function workoutMinutesFromLatest(latest: AutoHealthMetric | null) {
  if (!latest) return null
  const m = latest.metadata as Record<string, unknown> | undefined
  const wds = numMeta(m, "apple_workouts_duration_seconds")
  if (wds != null && wds > 0) return wds / 60
  if (latest.apple_workout_minutes != null) return latest.apple_workout_minutes
  return null
}

function hrvDisplay(latest: AutoHealthMetric | null) {
  if (!latest) return null
  const m = latest.metadata as Record<string, unknown> | undefined
  const p = m?.hrv_ms_precise
  if (typeof p === "number" && Number.isFinite(p)) return Math.round(p * 10) / 10
  if (latest.hrv_ms != null) return latest.hrv_ms
  return null
}

export default function Sistema() {
  const { data, loading, error } = useOperationalContext()
  const { latest: healthLatest, analytics, loading: healthLoading } = useHealthAutoMetrics()

  const sleepSec = latestToSeconds(healthLatest)
  const sleepFmt = formatHoursMinutesFromSeconds(sleepSec)
  const wm = workoutMinutesFromLatest(healthLatest)
  const hrv = hrvDisplay(healthLatest)

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Cargando sistema...</div>
  }

  if (error) {
    return <div className="p-6 text-center text-red-600">Error: {error}</div>
  }

  const wk = analytics?.weekly
  const rec = analytics?.recovery
  const sig = analytics?.signals

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Sistema</h1>

      <div className="card">
        <p className="text-sm text-gray-500">IA Readiness</p>
        <p className="text-4xl font-bold text-[#2DD4BF]">Preparado</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card">
          <p className="text-xs text-gray-500">Global</p>
          <p className="text-3xl font-bold">{data?.score_global ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Fisico</p>
          <p className="text-3xl font-bold">{data?.score_fisico ?? 0}</p>
        </div>
        <div className="card">
          <p className="text-xs text-gray-500">Salud</p>
          <p className="text-3xl font-bold">{data?.score_salud ?? 0}</p>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-gray-700">Salud (importación Atajo / Apple)</h2>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card border border-gray-200/80">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Operativo</p>
            <p className="mt-1 text-sm text-gray-600">Último día importado</p>
            {healthLoading ? (
              <p className="mt-3 text-sm text-gray-400">Cargando…</p>
            ) : !healthLatest ? (
              <p className="mt-3 text-sm text-amber-700">Sin datos todavía. Ejecuta el atajo &quot;Órvita – Importar Salud Hoy&quot;.</p>
            ) : (
              <ul className="mt-3 space-y-1.5 text-sm text-gray-800">
                <li>
                  Sueño: <span className="font-medium">{sleepFmt?.label ?? "—"}</span>
                </li>
                <li>
                  HRV: <span className="font-medium">{hrv != null ? `${hrv} ms` : "—"}</span>
                </li>
                <li>
                  RHR: <span className="font-medium">{healthLatest.resting_hr_bpm != null ? `${healthLatest.resting_hr_bpm} bpm` : "—"}</span>
                </li>
                <li>
                  Pasos:{" "}
                  <span className="font-medium">
                    {healthLatest.steps != null ? healthLatest.steps.toLocaleString("es-ES") : "—"}
                  </span>
                </li>
                <li>
                  Entreno:{" "}
                  <span className="font-medium">
                    {wm != null ? `${Math.round(wm)} min` : "—"}
                  </span>
                </li>
                <li>
                  Energía activa:{" "}
                  <span className="font-medium">
                    {healthLatest.calories != null ? `${Math.round(healthLatest.calories * 10) / 10} kcal` : "—"}
                  </span>
                </li>
              </ul>
            )}
            <p className="mt-2 text-xs text-gray-400">{healthLatest?.observed_at?.slice(0, 10)}</p>
          </div>

          <div className="card border border-gray-200/80">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Estratégico</p>
            <p className="mt-1 text-sm text-gray-600">Recuperación y carga</p>
            {!analytics || healthLoading ? (
              <p className="mt-3 text-sm text-gray-400">Cargando…</p>
            ) : (
              <>
                <p className="mt-2 text-lg font-semibold text-gray-900">
                  Listo: <span className="text-teal-600">{rec?.readiness_label ?? "—"}</span>
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  Puntuación recuperación: <span className="font-medium">{rec?.recovery_score ?? "—"}</span>
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  Carga (proxy):{" "}
                  <span className="font-medium">
                    {rec?.training_load != null ? rec.training_load.proxy : "—"}
                  </span>
                </p>
                <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-gray-600">
                  {sig?.hrv_vs_load?.text ? <li>{sig.hrv_vs_load.text}</li> : null}
                  {sig?.energy_vs_sleep?.[0] ? <li>{sig.energy_vs_sleep[0]}</li> : null}
                  {sig?.energy_vs_sleep?.[1] ? <li>{sig.energy_vs_sleep[1]}</li> : null}
                </ul>
              </>
            )}
          </div>

          <div className="card border border-gray-200/80">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Predictivo</p>
            <p className="mt-1 text-sm text-gray-600">Tendencia 7 vs 7 anteriores</p>
            {!wk ? (
              <p className="mt-3 text-sm text-gray-400">Sin historial suficiente aún.</p>
            ) : (
              <ul className="mt-3 space-y-1 text-sm text-gray-800">
                <li>
                  Sueño (h): <span className="font-medium">{wk.sleep_trend}</span>
                </li>
                <li>
                  HRV: <span className="font-medium">{wk.hrv_trend}</span>
                </li>
                <li>
                  FC reposo: <span className="font-medium">{wk.resting_hr_trend}</span>
                </li>
                <li>
                  Entrenamiento (s suma): <span className="font-medium">{wk.training_trend}</span>
                </li>
                <li>
                  Pasos: <span className="font-medium">{wk.steps_trend}</span>
                </li>
              </ul>
            )}
          </div>
        </div>
      </section>

      <div className="card">
        <p className="text-sm text-gray-500">Automatizaciones activas</p>
        <p className="mt-2 text-sm text-gray-600">
          `/api/cron/checkins/sync` protegido por `CRON_SECRET` o `INTERNAL_API_TOKEN`.
        </p>
        <Link href="/checkin" className="mt-4 inline-block text-sm font-medium text-indigo-600">
          Ir a check-in diario
        </Link>
      </div>
    </div>
  )
}
