"use client"

import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"
import { saludHexToRgba, saludPanelStyle } from "@/lib/salud/saludThemeStyles"

type Props = {
  latest: AutoHealthMetric | null
  loading: boolean
}

function Cell({
  label,
  value,
  theme,
}: {
  label: string
  value: string
  theme: ReturnType<typeof useOrbitaSkin>
}) {
  return (
    <div
      className="min-w-0 flex-1 rounded-xl px-2 py-2.5 sm:min-w-[5.5rem] sm:px-3"
      style={{
        backgroundColor: saludHexToRgba(SALUD_SEM.neutral, 0.1),
      }}
    >
      <p className="m-0 truncate text-[10px] font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textMuted }}>
        {label}
      </p>
      <p className="m-0 mt-1 truncate text-sm font-bold tabular-nums sm:text-base" style={{ color: theme.text }}>
        {value}
      </p>
    </div>
  )
}

export function SignalsStrip({ latest, loading }: Props) {
  const theme = useOrbitaSkin()
  const hrv = latest?.hrv_ms != null ? `${Math.round(latest.hrv_ms)} ms` : "—"
  const sleep = latest?.sleep_hours != null ? `${latest.sleep_hours.toFixed(1)} h` : "—"
  const steps = latest?.steps != null ? latest.steps.toLocaleString("es-LA") : "—"
  const rec = latest?.readiness_score != null ? `${Math.round(latest.readiness_score)}` : "—"

  return (
    <section className="rounded-2xl border p-4 sm:p-5" style={{ ...saludPanelStyle(theme, 0.92), borderColor: theme.border }}>
      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
        Señales Apple · última lectura
      </p>
      {loading ? (
        <p className="m-0 mt-3 text-sm" style={{ color: theme.textMuted }}>
          Cargando…
        </p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2 sm:flex-nowrap sm:gap-2">
          <Cell label="HRV" value={hrv} theme={theme} />
          <Cell label="Sueño" value={sleep} theme={theme} />
          <Cell label="Pasos" value={steps} theme={theme} />
          <Cell label="Recuperación" value={rec} theme={theme} />
        </div>
      )}
    </section>
  )
}
