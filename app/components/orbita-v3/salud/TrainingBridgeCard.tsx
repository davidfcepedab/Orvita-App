"use client"

import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludDecisionBrief } from "@/lib/salud/saludDecisionBrief"
import type { PlanVsExecution } from "@/lib/training/trainingOperationalDerivations"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"
import { saludHexToRgba, saludPanelStyle } from "@/lib/salud/saludThemeStyles"

type Props = {
  brief: SaludDecisionBrief
  plan: PlanVsExecution
  hasHevy: boolean
}

export function TrainingBridgeCard({ brief, plan, hasHevy }: Props) {
  const theme = useOrbitaSkin()

  return (
    <section className="rounded-2xl border p-5 sm:p-6" style={{ ...saludPanelStyle(theme, 0.92), borderColor: theme.border }}>
      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
        Puente · Hevy
      </p>
      <p className="m-0 mt-3 text-lg font-bold" style={{ color: theme.text }}>
        {brief.trainingHeadline}
      </p>
      {!hasHevy ? (
        <p className="m-0 mt-2 text-sm" style={{ color: SALUD_SEM.warn }}>
          Sin sesiones Hevy recientes: el plan muestra la secuencia base. Conecta Hevy en configuración.
        </p>
      ) : null}
      <p className="m-0 mt-2 text-sm leading-snug" style={{ color: theme.textMuted }}>
        {brief.sequenceLine}
      </p>
      <p className="m-0 mt-2 text-xs leading-snug" style={{ color: theme.textMuted }}>
        {plan.suggestion}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/training"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-5 text-sm font-semibold no-underline"
          style={{
            borderColor: saludHexToRgba(SALUD_SEM.ok, 0.45),
            backgroundColor: saludHexToRgba(SALUD_SEM.ok, 0.1),
            color: theme.text,
          }}
        >
          <Dumbbell className="h-4 w-4 shrink-0" aria-hidden />
          Ir a entrenamiento
        </Link>
        {!hasHevy ? (
          <Link
            href="/configuracion#acordeon-config-hevy"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-medium no-underline"
            style={{ borderColor: theme.border, color: theme.textMuted }}
          >
            Conectar Hevy
          </Link>
        ) : null}
      </div>
    </section>
  )
}
