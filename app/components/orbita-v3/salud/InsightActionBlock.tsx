"use client"

import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludDecisionBrief } from "@/lib/salud/saludDecisionBrief"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"
import { saludHexToRgba, saludPanelStyle } from "@/lib/salud/saludThemeStyles"

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
      className="rounded-2xl border-l-4 p-5 sm:p-6"
      style={{
        ...saludPanelStyle(theme, 0.92),
        borderColor: theme.border,
        borderLeftColor: accent,
      }}
    >
      <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
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
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold no-underline"
          style={{ backgroundColor: theme.text, color: theme.bg }}
        >
          <Dumbbell className="h-3.5 w-3.5 shrink-0" aria-hidden />
          Ir a Entrenamiento
        </Link>
      </div>
    </section>
  )
}
