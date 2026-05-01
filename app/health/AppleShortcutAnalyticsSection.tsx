"use client"

import clsx from "clsx"
import { Minus, TrendingDown, TrendingUp } from "lucide-react"
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

type WeeklySnap = NonNullable<ShortcutHealthAnalyticsSnapshot["weekly"]>

function magnitudePhrase(absPct: number | null): string {
  if (absPct == null || !Number.isFinite(absPct)) return "sin porcentaje claro"
  if (absPct < 4) return "cambio ligero"
  if (absPct < 12) return "cambio moderado"
  return "cambio marcado"
}

function DualCompareBars({
  leftLabel,
  rightLabel,
  leftVal,
  rightVal,
  format,
}: {
  leftLabel: string
  rightLabel: string
  leftVal: number
  rightVal: number
  format: (n: number) => string
}) {
  const max = Math.max(leftVal, rightVal, 1e-9)
  const lPct = Math.min(100, (leftVal / max) * 100)
  const rPct = Math.min(100, (rightVal / max) * 100)
  return (
    <div className="mt-2.5 space-y-2.5">
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 text-[10px] leading-tight text-[var(--color-text-secondary)]">
          <span className="min-w-0">{leftLabel}</span>
          <span className="shrink-0 font-semibold tabular-nums text-[var(--color-text-primary)]">{format(leftVal)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-border)_48%,transparent)]">
          <div
            className="h-full rounded-full bg-[color-mix(in_srgb,var(--color-text-secondary)_42%,transparent)]"
            style={{ width: `${lPct}%` }}
          />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-2 text-[10px] leading-tight text-[var(--color-text-secondary)]">
          <span className="min-w-0">{rightLabel}</span>
          <span className="shrink-0 font-semibold tabular-nums text-[var(--color-accent-health)]">{format(rightVal)}</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-border)_48%,transparent)]">
          <div className="h-full rounded-full bg-[var(--color-accent-health)]" style={{ width: `${rPct}%` }} />
        </div>
      </div>
    </div>
  )
}

function TrendDirectionPill({
  trend,
  goodWhenUp,
}: {
  trend: string
  goodWhenUp: boolean
}) {
  if (trend === "sin dato") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_90%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]">
        <Minus className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        Sin dato
      </span>
    )
  }
  if (trend === "estable") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--color-border)_65%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_90%,transparent)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]">
        <Minus className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
        Estable
      </span>
    )
  }
  const up = trend === "sube"
  const good = goodWhenUp ? up : !up
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold",
        good
          ? "border-[color-mix(in_srgb,var(--color-accent-health)_45%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-health)_12%,var(--color-surface))] text-[var(--color-accent-health)]"
          : "border-[color-mix(in_srgb,var(--color-accent-warning)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-warning)_10%,var(--color-surface))] text-[var(--color-accent-warning)]",
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
      {up ? "Sube" : "Baja"}
    </span>
  )
}

function deltaExplanation(
  recent: number | null,
  prev: number | null,
  unit: string,
  decimals: number,
): string | null {
  if (recent == null || prev == null) return null
  const d = recent - prev
  const pct = prev !== 0 ? (d / Math.abs(prev)) * 100 : null
  const absPct = pct != null ? Math.abs(pct) : null
  const mag = magnitudePhrase(absPct)
  const sign = d === 0 ? "" : d > 0 ? "+" : "−"
  const body = `${sign}${Math.abs(d).toFixed(decimals)} ${unit} vs semana anterior`
  const pctPart =
    pct != null && Number.isFinite(pct) ? ` (${pct >= 0 ? "+" : ""}${pct.toFixed(0)}% respecto al promedio previo)` : ""
  return `${body}${pctPart}. Magnitud: ${mag}.`
}

function LuxuryTrendMetric({
  label,
  trendKey,
  weekly,
  recent,
  prev,
  format,
  decimals,
  unit,
  goodWhenUp,
}: {
  label: string
  trendKey: keyof Pick<
    WeeklySnap,
    "sleep_trend" | "hrv_trend" | "resting_hr_trend" | "training_trend" | "steps_trend"
  >
  weekly: WeeklySnap
  recent: number | null
  prev: number | null
  format: (n: number) => string
  decimals: number
  unit: string
  goodWhenUp: boolean
}) {
  const trend = String(weekly[trendKey] ?? "sin dato")
  const explain = deltaExplanation(recent, prev, unit, decimals)
  const bars =
    recent != null && prev != null && trend !== "sin dato" ? (
      <DualCompareBars
        leftLabel="Promedio semana anterior (7 días)"
        rightLabel="Últimos 7 días"
        leftVal={prev}
        rightVal={recent}
        format={format}
      />
    ) : null

  return (
    <li className="list-none rounded-xl border border-[color-mix(in_srgb,var(--color-border)_42%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_60%,transparent)] p-3 sm:p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1.5">
        <p className="m-0 text-[12px] font-semibold text-[var(--color-text-primary)]">{label}</p>
        <TrendDirectionPill trend={trend} goodWhenUp={goodWhenUp} />
      </div>
      {explain ? (
        <p className="m-0 mt-2 text-[11px] leading-snug text-[var(--color-text-secondary)] sm:text-[12px]">{explain}</p>
      ) : (
        <p className="m-0 mt-2 text-[11px] text-[var(--color-text-secondary)]">Aún no hay dos ventanas de 7 días con datos para comparar.</p>
      )}
      {bars}
    </li>
  )
}

function LuxuryWeeklyTrendBlock({ weekly }: { weekly: WeeklySnap }) {
  const wr = weekly.workout_seconds_sum_recent
  const wp = weekly.workout_seconds_sum_prev
  const trainRecentMin = wr != null ? wr / 60 : null
  const trainPrevMin = wp != null ? wp / 60 : null

  return (
    <ul className="m-0 mt-3 grid list-none gap-3 p-0 sm:grid-cols-2 sm:gap-3.5">
      <LuxuryTrendMetric
        label="Sueño (media diaria)"
        trendKey="sleep_trend"
        weekly={weekly}
        recent={weekly.sleep_hours_avg_recent}
        prev={weekly.sleep_hours_avg_prev}
        format={(n) => `${n.toFixed(1)} h`}
        decimals={1}
        unit="h"
        goodWhenUp
      />
      <LuxuryTrendMetric
        label="HRV (media diaria)"
        trendKey="hrv_trend"
        weekly={weekly}
        recent={weekly.hrv_ms_avg_recent}
        prev={weekly.hrv_ms_avg_prev}
        format={(n) => `${Math.round(n)} ms`}
        decimals={0}
        unit="ms"
        goodWhenUp
      />
      <LuxuryTrendMetric
        label="FC en reposo (media diaria)"
        trendKey="resting_hr_trend"
        weekly={weekly}
        recent={weekly.resting_hr_bpm_avg_recent}
        prev={weekly.resting_hr_bpm_avg_prev}
        format={(n) => `${Math.round(n)} lpm`}
        decimals={0}
        unit="lpm"
        goodWhenUp={false}
      />
      <LuxuryTrendMetric
        label="Entreno (min totales en la ventana)"
        trendKey="training_trend"
        weekly={weekly}
        recent={trainRecentMin}
        prev={trainPrevMin}
        format={(n) => `${Math.round(n)} min`}
        decimals={0}
        unit="min"
        goodWhenUp
      />
      <LuxuryTrendMetric
        label="Pasos (media diaria)"
        trendKey="steps_trend"
        weekly={weekly}
        recent={weekly.steps_avg_recent}
        prev={weekly.steps_avg_prev}
        format={(n) => `${Math.round(n).toLocaleString("es-CO")}`}
        decimals={0}
        unit="pasos"
        goodWhenUp
      />
      <li className="sm:col-span-2">
        <p className="m-0 text-[10px] leading-snug text-[var(--color-text-secondary)]">
          Ventanas: últimos{" "}
          <span className="font-medium text-[var(--color-text-primary)]">{weekly.current_window_n}</span> días con lectura
          frente a los{" "}
          <span className="font-medium text-[var(--color-text-primary)]">{weekly.previous_window_n}</span> anteriores
          (promedios diarios sobre días con dato).
        </p>
      </li>
    </ul>
  )
}

type Props = {
  latest: AutoHealthMetric | null
  analytics: ShortcutHealthAnalyticsSnapshot | null
  loading: boolean
  /**
   * `luxury`: solo ritmo + tendencia (la snapshot numérica ya va en el grid de tarjetas arriba).
   * `default`: tres columnas incl. lista «Última lectura».
   */
  layout?: "default" | "luxury"
}

/** Solo la rejilla de métricas (última lectura, ritmo, tendencia) — se incrusta en el panel principal de /salud. */
export function AppleShortcutAnalyticsPanels({ latest, analytics, loading, layout = "default" }: Props) {
  const sleepSec = latestToSeconds(latest)
  const sleepFmt = formatHoursMinutesFromSeconds(sleepSec)
  const wm = workoutMinutesFromLatest(latest)
  const hrv = hrvDisplay(latest)
  const wk = analytics?.weekly
  const rec = analytics?.recovery
  const sig = analytics?.signals

  const luxury = layout === "luxury"
  const panelShell = luxury
    ? "rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_38%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_82%,var(--color-surface-alt))] p-4 sm:p-5"
    : "rounded-2xl border border-[color-mix(in_srgb,var(--color-border)_55%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_50%,transparent)] p-3.5"

  return (
    <div className={luxury ? "grid gap-4 sm:grid-cols-2" : "grid gap-3 lg:grid-cols-3"}>
      {!luxury ? (
        <div className={panelShell} style={luxury ? undefined : { minHeight: 200 }}>
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
      ) : null}

      <div className={panelShell} style={luxury ? undefined : { minHeight: 200 }}>
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

      <div className={panelShell} style={luxury ? undefined : { minHeight: 200 }}>
        <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">Tendencia</p>
        <p className="m-0 mt-1 text-[12px] text-[var(--color-text-secondary)]">Esta semana frente a la anterior</p>
        {!wk ? (
          <p className="m-0 mt-3 text-[12px] text-[var(--color-text-secondary)]">Sin historial suficiente aún.</p>
        ) : (
          <LuxuryWeeklyTrendBlock weekly={wk} />
        )}
      </div>
    </div>
  )
}

/**
 * Bloque autónomo con marco (p. ej. otras rutas). En /salud se usa `AppleShortcutAnalyticsPanels` dentro del hero Apple.
 * @deprecated Preferir incrustar `AppleShortcutAnalyticsPanels` en el panel principal para evitar duplicar copy.
 */
export function AppleShortcutAnalyticsSection({ latest, analytics, loading }: Props) {
  return (
    <Card className="min-w-0 border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)]">
      <div className="space-y-3 p-4 sm:p-6">
        <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
          Resumen del atajo
        </p>
        <AppleShortcutAnalyticsPanels latest={latest} analytics={analytics} loading={loading} />
      </div>
    </Card>
  )
}
