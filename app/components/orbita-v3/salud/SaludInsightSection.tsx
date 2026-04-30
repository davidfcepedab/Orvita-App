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
      className="rounded-xl border px-4 py-3 sm:px-4 sm:py-3.5"
      style={{
        ...saludPanelStyle(theme, 0.92),
        borderColor: theme.border,
        boxShadow: "none",
      }}
      aria-labelledby="salud-insight-heading"
    >
      <h2
        id="salud-insight-heading"
        className="m-0 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em]"
        style={{ color: theme.textMuted }}
      >
        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} aria-hidden />
        Insight
      </h2>
      <p className="m-0 mt-2 text-sm font-semibold leading-snug sm:text-[15px]" style={{ color: theme.text }}>
        {brief.executiveInsight}
      </p>
      <p className="m-0 mt-1.5 text-xs leading-snug sm:text-[13px]" style={{ color: theme.textMuted }}>
        {brief.evidenceBullets[0]}
        {brief.evidenceBullets[1] ? ` · ${brief.evidenceBullets[1]}` : ""}
      </p>
      <p className="m-0 mt-2 text-xs font-medium leading-snug sm:text-sm" style={{ color: theme.text }}>
        {brief.directAction}
      </p>
    </section>
  )
}
