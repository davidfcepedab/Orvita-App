"use client"

import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludDecisionBrief } from "@/lib/salud/saludDecisionBrief"
import type { PlanVsExecution } from "@/lib/training/trainingOperationalDerivations"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"
import { saludPanelStyle } from "@/lib/salud/saludThemeStyles"
import { entrenamientoCtaCompactClass, healthCtaDumbbellIconClass } from "@/lib/salud/healthCtaLinkClasses"

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
      <Link href="/training" className={`m-0 mt-4 inline-flex ${entrenamientoCtaCompactClass} py-2 text-xs`}>
        <Dumbbell className={healthCtaDumbbellIconClass} aria-hidden />
        Ver recomendación en entrenamiento
      </Link>
    </section>
  )
}
