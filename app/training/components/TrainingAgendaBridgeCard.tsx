"use client"

import { Card } from "@/src/components/ui/Card"
import { TrainingFallbackState } from "@/app/training/components/TrainingFallbackState"

type AgendaItem = {
  id: string
  title: string
  dueDate: string | null
  status: "pending" | "in-progress" | "completed"
}

type Props = {
  todayAgendaItems: AgendaItem[]
  onSuggestBlock: () => void
}

export function TrainingAgendaBridgeCard({ todayAgendaItems, onSuggestBlock }: Props) {
  return (
    <Card>
      <div className="p-[var(--spacing-lg)]">
        <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Agenda</p>
        {todayAgendaItems.length === 0 ? (
          <div className="mt-2">
            <TrainingFallbackState
              title="No hay bloque de entrenamiento en agenda"
              detail="Podemos sugerir una franja hoy sin crear eventos automáticamente."
              ctaLabel="Sugerir bloque"
              onAction={onSuggestBlock}
            />
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {todayAgendaItems.slice(0, 3).map((task) => (
              <div key={task.id} className="rounded-xl border border-[var(--color-border)] px-2.5 py-2">
                <p className="m-0 text-xs font-medium text-[var(--color-text-primary)]">{task.title}</p>
                <p className="m-0 mt-1 text-[11px] text-[var(--color-text-secondary)]">
                  {task.dueDate ?? "Sin hora definida"} · {task.status}
                </p>
              </div>
            ))}
            <p className="m-0 text-xs text-[var(--color-text-secondary)]">
              Si omites la sesión, te sugeriremos moverla al siguiente día disponible con confirmación.
            </p>
          </div>
        )}
      </div>
    </Card>
  )
}
