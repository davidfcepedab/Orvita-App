"use client"

import Link from "next/link"
import { CalendarClock, CheckCircle2, PauseCircle, Shuffle } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import type { TrainingTodayState } from "@/src/modules/training/types"

type Props = {
  plannedToday: string
  todayState: TrainingTodayState
  sourceLabel: string
  onRegister: () => void
}

const stateMeta: Record<TrainingTodayState, { label: string; tone: string; Icon: typeof CalendarClock }> = {
  pending: { label: "Pendiente", tone: "bg-amber-100 text-amber-700", Icon: CalendarClock },
  completed: { label: "Completado", tone: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
  moved: { label: "Movido", tone: "bg-sky-100 text-sky-700", Icon: Shuffle },
  rest: { label: "Descanso", tone: "bg-slate-200 text-slate-700", Icon: PauseCircle },
}

export function TrainingHeroOperationalCard({ plannedToday, todayState, sourceLabel, onRegister }: Props) {
  const meta = stateMeta[todayState]
  return (
    <Card>
      <div className="flex flex-col gap-4 p-[var(--spacing-lg)] sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Entrenamiento de hoy</p>
          <h2 className="m-0 mt-1 text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">{plannedToday}</h2>
          <p className="m-0 mt-1 text-xs text-[var(--color-text-secondary)]">Fuente principal: {sourceLabel}</p>
          <span className={`mt-2 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta.tone}`}>
            <meta.Icon className="h-3.5 w-3.5" />
            {meta.label}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="https://hevy.com/app"
            target="_blank"
            className="inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 text-xs font-medium text-[var(--color-text-primary)] no-underline transition hover:opacity-90"
          >
            Abrir Hevy
          </Link>
          <button
            type="button"
            onClick={onRegister}
            className="inline-flex min-h-9 items-center justify-center rounded-full border border-[var(--color-accent-health)] bg-[var(--color-accent-health)] px-3 text-xs font-semibold text-white transition hover:opacity-90"
          >
            Registrar entrenamiento
          </button>
        </div>
      </div>
    </Card>
  )
}
