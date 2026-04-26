"use client"

import { Card } from "@/src/components/ui/Card"
import type { TrainingReadiness } from "@/lib/training/trainingOperationalDerivations"

type Props = {
  readiness: TrainingReadiness
  sleepHours?: number | null
  hrvMs?: number | null
  restingHr?: number | null
}

export function TrainingReadinessCard({ readiness, sleepHours, hrvMs, restingHr }: Props) {
  return (
    <Card>
      <div className="p-[var(--spacing-lg)]">
        <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Preparación física</p>
        <div className="mt-2 flex items-end justify-between gap-3">
          <h3 className="m-0 text-lg font-semibold text-[var(--color-text-primary)]">{readiness.label}</h3>
          <p className="m-0 text-2xl font-semibold text-[var(--color-text-primary)]">{readiness.score}</p>
        </div>
        <p className="m-0 mt-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">{readiness.rationale}</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          <MetricChip label="Sueño" value={sleepHours != null ? `${sleepHours.toFixed(1)} h` : "—"} />
          <MetricChip label="HRV" value={hrvMs != null ? `${Math.round(hrvMs)} ms` : "—"} />
          <MetricChip label="FC reposo" value={restingHr != null ? `${Math.round(restingHr)} bpm` : "—"} />
        </div>
      </div>
    </Card>
  )
}

function MetricChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-2.5 py-2">
      <p className="m-0 text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-secondary)]">{label}</p>
      <p className="m-0 mt-1 text-xs font-semibold text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}
