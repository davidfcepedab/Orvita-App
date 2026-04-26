"use client"

import { Card } from "@/src/components/ui/Card"
import type { WeeklyTimelineItem } from "@/lib/training/trainingOperationalDerivations"

type Props = {
  timeline: WeeklyTimelineItem[]
  suggestion: string
}

const statusCopy: Record<WeeklyTimelineItem["status"], string> = {
  done: "Completado",
  pending: "Pendiente",
  moved: "Movido",
  rest: "Descanso",
}

export function TrainingWeeklyTimeline({ timeline, suggestion }: Props) {
  return (
    <Card>
      <div className="p-[var(--spacing-lg)]">
        <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Plan semanal</p>
        <div className="mt-3 space-y-2">
          {timeline.map((item) => (
            <div key={item.date} className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-2.5 py-2">
              <p className="m-0 w-14 text-xs font-medium text-[var(--color-text-secondary)]">{item.label}</p>
              <p className="m-0 min-w-0 flex-1 text-xs text-[var(--color-text-primary)]">
                {item.plan}
                {item.executed ? <span className="text-[var(--color-text-secondary)]"> · {item.executed}</span> : null}
              </p>
              <span className="rounded-full bg-[var(--color-surface-alt)] px-2 py-0.5 text-[10px] font-semibold text-[var(--color-text-secondary)]">
                {statusCopy[item.status]}
              </span>
            </div>
          ))}
        </div>
        <p className="m-0 mt-3 text-xs leading-relaxed text-[var(--color-text-secondary)]">{suggestion}</p>
      </div>
    </Card>
  )
}
