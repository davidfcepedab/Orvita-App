"use client"

import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludDecisionBrief } from "@/lib/salud/saludDecisionBrief"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"
import { saludHexToRgba, saludPanelStyle } from "@/lib/salud/saludThemeStyles"
import { entrenamientoCtaCompactClass, healthCtaDumbbellIconClass } from "@/lib/salud/healthCtaLinkClasses"

type Props = {
  brief: SaludDecisionBrief
}

function semanticAccent(s: SaludDecisionBrief["semantic"]) {
  if (s === "ok") return SALUD_SEM.ok
  if (s === "warn") return SALUD_SEM.warn
  return SALUD_SEM.risk
}

export function InsightActionBlock({ brief }: Props) {
  const theme = useOrbitaSkin()
  const accent = semanticAccent(brief.semantic)

  return (
    <section
      className="rounded-2xl border p-5 sm:p-6"
      style={{
        ...saludPanelStyle(theme, 0.92),
        borderColor: theme.border,
      }}
    >
      <p className="m-0 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
        Interpretación
      </p>
      <p className="m-0 mt-3 text-base font-semibold leading-snug sm:text-lg" style={{ color: theme.text }}>
        {brief.executiveInsight}
      </p>
      <ul className="m-0 mt-3 list-none space-y-2 p-0">
        {brief.evidenceBullets.map((line) => (
          <li key={line} className="flex gap-2 text-sm" style={{ color: theme.textMuted }}>
            <span className="mt-2 h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
            {line}
          </li>
        ))}
      </ul>
      <div
        className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between"
        style={{
          borderColor: saludHexToRgba(theme.border, 0.65),
          backgroundColor: saludHexToRgba(accent, 0.06),
        }}
      >
        <p className="m-0 text-sm font-medium" style={{ color: theme.text }}>
          Acción: {brief.directAction}
        </p>
        <Link
          href="/training"
          className={`${entrenamientoCtaCompactClass} min-h-10 px-4 text-xs`}
        >
          <Dumbbell className={healthCtaDumbbellIconClass} aria-hidden />
          Ir a Entrenamiento
        </Link>
      </div>
    </section>
  )
}
