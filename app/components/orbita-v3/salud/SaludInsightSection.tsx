"use client"

import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludDecisionBrief } from "@/lib/salud/saludDecisionBrief"
import { saludPanelStyle } from "@/lib/salud/saludThemeStyles"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"

type Props = {
  brief: SaludDecisionBrief
}

function semanticAccent(s: SaludDecisionBrief["semantic"]) {
  if (s === "ok") return SALUD_SEM.ok
  if (s === "warn") return SALUD_SEM.warn
  return SALUD_SEM.risk
}

export function SaludInsightSection({ brief }: Props) {
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
      aria-labelledby="salud-insight-heading"
    >
      <h2
        id="salud-insight-heading"
        className="m-0 text-[11px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: theme.textMuted }}
      >
        Insight
      </h2>
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
      <p className="m-0 mt-3 text-sm font-medium leading-snug" style={{ color: theme.text }}>
        {brief.directAction}
      </p>
    </section>
  )
}
