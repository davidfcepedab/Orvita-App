"use client"

import { Clock3, Dumbbell } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import type { TrainingDay } from "@/src/modules/training/types"
import { TrainingFallbackState } from "@/app/training/components/TrainingFallbackState"

type Props = {
  session: TrainingDay | null
  topExercises: string[]
  onRegister: () => void
}

export function TrainingExecutionCard({ session, topExercises, onRegister }: Props) {
  return (
    <Card>
      <div className="p-[var(--spacing-lg)]">
        <p className="m-0 text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)]">Ejecución real</p>
        {!session ? (
          <div className="mt-2">
            <TrainingFallbackState
              title="Sin sesión registrada en Hevy"
              detail="No encontramos sesiones recientes para mostrar ejecución real."
              ctaLabel="Registrar sesión"
              onAction={onRegister}
            />
          </div>
        ) : (
          <>
            <h3 className="m-0 mt-2 text-lg font-semibold text-[var(--color-text-primary)]">
              {session.workoutName ?? "Sesión Hevy"}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-2.5 text-xs text-[var(--color-text-secondary)]">
              <span className="inline-flex items-center gap-1">
                <Clock3 className="h-3.5 w-3.5" />
                {session.duration ? `${Math.round(session.duration)} min` : "Duración no disponible"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Dumbbell className="h-3.5 w-3.5" />
                {session.totalSets ?? 0} sets · vol {Math.round(session.volumeScore ?? 0)}
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              {topExercises.length > 0 ? (
                topExercises.map((line) => (
                  <p key={line} className="m-0 rounded-lg bg-[var(--color-surface-alt)] px-2.5 py-1.5 text-xs text-[var(--color-text-primary)]">
                    {line}
                  </p>
                ))
              ) : (
                <p className="m-0 text-xs text-[var(--color-text-secondary)]">La API no devolvió detalle de ejercicios para esta sesión.</p>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  )
}
