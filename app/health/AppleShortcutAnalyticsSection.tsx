"use client"

import { formatLocalDateLabelEsCo } from "@/lib/agenda/localDateKey"
import { formatHoursMinutesFromSeconds } from "@/lib/health/shortcutHealthAnalytics"
import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import type { ShortcutHealthAnalyticsSnapshot } from "@/lib/health/shortcutHealthAnalytics"
import { Card } from "@/src/components/ui/Card"

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

type Props = {
  latest: AutoHealthMetric | null
  analytics: ShortcutHealthAnalyticsSnapshot | null
  loading: boolean
}

/** Resumen amable de lo último que mandó el atajo del iPhone — vista en /health. */
export function AppleShortcutAnalyticsSection({ latest, analytics, loading }: Props) {
  const sleepSec = latestToSeconds(latest)
  const sleepFmt = formatHoursMinutesFromSeconds(sleepSec)
  const wm = workoutMinutesFromLatest(latest)
  const hrv = hrvDisplay(latest)
  const wk = analytics?.weekly
  const rec = analytics?.recovery
  const sig = analytics?.signals

  return (
    <Card className="min-w-0 border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)]">
      <div className="space-y-3 p-4 sm:p-6">
        <div>
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
            Lo que llegó desde tu iPhone
          </p>
          <p className="m-0 mt-1 max-w-prose text-pretty text-[12px] leading-relaxed text-[var(--color-text-secondary)] sm:text-[13px]">
            Aquí ves el último envío del atajo y cómo se sitúa frente a tu semana anterior. Son lecturas orientativas para el día a día, no un diagnóstico médico.
          </p>
          {latest?.source === "apple_health_shortcut" && latest.observed_at ? (
            <p className="m-0 mt-2 inline-flex max-w-full items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--color-accent-health)_35%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-health)_10%,transparent)] px-2.5 py-1 text-[11px] font-medium text-[var(--color-text-primary)]">
              <span className="text-[var(--color-accent-health)]">●</span>
              Actualizado desde tu iPhone · {formatLocalDateLabelEsCo(latest.observed_at)}
            </p>
          ) : null}
        </div>
        <div className="grid gap-3 lg:grid-cols-3">
          <div
            className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_50%,transparent)] p-3.5"
            style={{ minHeight: 200 }}
          >
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">Última lectura</p>
            <p className="m-0 mt-1 text-[12px] text-[var(--color-text-secondary)]">Pasos, sueño, pulso y más</p>
            {loading ? (
              <p className="m-0 mt-3 text-[13px] text-[var(--color-text-secondary)]">Cargando…</p>
            ) : !latest ? (
              <p className="m-0 mt-3 text-[12px] text-[var(--color-accent-warning)]">
                Sin datos todavía. Ejecuta el atajo <span className="font-medium">Orvita-Importar-Salud-Hoy</span> en el
                iPhone.
              </p>
            ) : (
              <ul className="m-0 mt-3 list-none space-y-1.5 p-0 text-[13px] text-[var(--color-text-primary)]">
                <li>
                  Sueño: <span className="font-semibold tabular-nums">{sleepFmt?.label ?? "—"}</span>
                </li>
                <li>
                  HRV: <span className="font-semibold tabular-nums">{hrv != null ? `${hrv} ms` : "—"}</span>
                </li>
                <li>
                  RHR: <span className="font-semibold tabular-nums">{latest.resting_hr_bpm != null ? `${latest.resting_hr_bpm} bpm` : "—"}</span>
                </li>
                <li>
                  Pasos: <span className="font-semibold tabular-nums">{latest.steps != null ? latest.steps.toLocaleString("es-ES") : "—"}</span>
                </li>
                <li>
                  Entreno: <span className="font-semibold tabular-nums">{wm != null ? `${Math.round(wm)} min` : "—"}</span>
                </li>
                <li>
                  Energía activa: <span className="font-semibold tabular-nums">{latest.calories != null ? `${Math.round(latest.calories * 10) / 10} kcal` : "—"}</span>
                </li>
              </ul>
            )}
            {latest?.observed_at ? (
              <p className="m-0 mt-2 text-[10px] text-[var(--color-text-secondary)]">{latest.observed_at.slice(0, 10)}</p>
            ) : null}
          </div>

          <div
            className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_50%,transparent)] p-3.5"
            style={{ minHeight: 200 }}
          >
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">Tu ritmo hoy</p>
            <p className="m-0 mt-1 text-[12px] text-[var(--color-text-secondary)]">Energía frente al descanso</p>
            {!analytics || loading ? (
              <p className="m-0 mt-3 text-[13px] text-[var(--color-text-secondary)]">Cargando…</p>
            ) : (
              <>
                <p className="m-0 mt-2 text-lg font-semibold text-[var(--color-text-primary)]">
                  Listo: <span className="text-[var(--color-accent-health)]">{rec?.readiness_label ?? "—"}</span>
                </p>
                <p className="m-0 mt-1 text-[12px] text-[var(--color-text-primary)]">
                  Puntuación: <span className="font-semibold">{rec?.recovery_score ?? "—"}</span>
                </p>
                <p className="m-0 mt-1 text-[12px] text-[var(--color-text-primary)]">
                  Carga del día (estimada): <span className="font-semibold">{rec?.training_load != null ? rec.training_load.proxy : "—"}</span>
                </p>
                <ul className="m-0 mt-2 list-inside list-disc space-y-1 p-0 text-[11px] leading-snug text-[var(--color-text-secondary)] sm:text-[12px]">
                  {sig?.hrv_vs_load?.text ? <li>{sig.hrv_vs_load.text}</li> : null}
                  {sig?.energy_vs_sleep?.[0] ? <li>{sig.energy_vs_sleep[0]}</li> : null}
                  {sig?.energy_vs_sleep?.[1] ? <li>{sig.energy_vs_sleep[1]}</li> : null}
                </ul>
              </>
            )}
          </div>

          <div
            className="rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_50%,transparent)] p-3.5"
            style={{ minHeight: 200 }}
          >
            <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">Tendencia</p>
            <p className="m-0 mt-1 text-[12px] text-[var(--color-text-secondary)]">Esta semana frente a la anterior</p>
            {!wk ? (
              <p className="m-0 mt-3 text-[12px] text-[var(--color-text-secondary)]">Sin historial suficiente aún.</p>
            ) : (
              <ul className="m-0 mt-3 list-none space-y-1 p-0 text-[12px] text-[var(--color-text-primary)]">
                <li>
                  Sueño: <span className="font-medium">{wk.sleep_trend}</span>
                </li>
                <li>
                  HRV: <span className="font-medium">{wk.hrv_trend}</span>
                </li>
                <li>
                  FC reposo: <span className="font-medium">{wk.resting_hr_trend}</span>
                </li>
                <li>
                  Entreno: <span className="font-medium">{wk.training_trend}</span>
                </li>
                <li>
                  Pasos: <span className="font-medium">{wk.steps_trend}</span>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
