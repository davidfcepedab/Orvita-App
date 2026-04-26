"use client"

import { Card } from "@/src/components/ui/Card"
import type { GoalAlignmentResult } from "@/lib/training/trainingOperationalDerivations"

type Props = {
  alignment: GoalAlignmentResult
}

export function TrainingGoalAlignmentCard({ alignment }: Props) {
  return (
    <Card>
      <div className="p-[var(--spacing-lg)]">
        <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Objetivo físico</p>
        <h3 className="m-0 mt-2 text-lg font-semibold text-[var(--color-text-primary)]">
          {alignment.aligned ? "Plan alineado" : "Plan con desalineaciones"}
        </h3>
        <p className="m-0 mt-1.5 text-xs leading-relaxed text-[var(--color-text-secondary)]">{alignment.insight}</p>
        <div className="mt-3 space-y-2">
          <ActionLine text={alignment.actionables[0]} />
          <ActionLine text={alignment.actionables[1]} />
          {alignment.risk ? (
            <p className="m-0 rounded-xl bg-[color-mix(in_srgb,var(--color-accent-finance)_10%,white)] px-2.5 py-2 text-xs text-[var(--color-text-primary)]">
              Riesgo: {alignment.risk}
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

function ActionLine({ text }: { text: string }) {
  return <p className="m-0 rounded-xl bg-[var(--color-surface-alt)] px-2.5 py-2 text-xs text-[var(--color-text-primary)]">{text}</p>
}
