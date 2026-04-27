"use client"

import Link from "next/link"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludDecisionBrief } from "@/lib/salud/saludDecisionBrief"
import type { AppleHeroSyncLine } from "@/lib/salud/appleHealthSyncToolbar"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"
import { saludHexToRgba, saludPanelStyle } from "@/lib/salud/saludThemeStyles"

type Props = {
  brief: SaludDecisionBrief
  syncLine: AppleHeroSyncLine
}

function semanticBorder(s: SaludDecisionBrief["semantic"]) {
  if (s === "ok") return SALUD_SEM.ok
  if (s === "warn") return SALUD_SEM.warn
  return SALUD_SEM.risk
}

export function HeroDecisionCard({ brief, syncLine }: Props) {
  const theme = useOrbitaSkin()
  const border = semanticBorder(brief.semantic)

  return (
    <section
      className="rounded-2xl border-2 px-4 py-3.5 sm:px-5 sm:py-4"
      style={{
        ...saludPanelStyle(theme, 0.95),
        borderColor: saludHexToRgba(border, brief.semantic === "ok" ? 0.65 : 0.55),
      }}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
            Decisión del día
          </p>
          <h1 className="m-0 text-xl font-bold leading-tight tracking-tight sm:text-2xl" style={{ color: theme.text }}>
            {brief.dayStateLabel}
          </h1>
          <p className="m-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
            <span className="text-3xl font-bold tabular-nums leading-none sm:text-4xl" style={{ color: border }}>
              {brief.energyScore}
            </span>
            <span className="text-xs font-semibold normal-case" style={{ color: theme.textMuted }}>
              energía
            </span>
          </p>
          <p className="m-0 text-[13px] font-medium leading-snug sm:text-sm" style={{ color: theme.text }}>
            {brief.causeLine}
          </p>
          <p className="m-0 text-[10px] leading-snug sm:text-[11px]">
            <span style={{ color: theme.textMuted }}>Apple Health: </span>
            <span className="font-semibold" style={{ color: syncLine.statusColor }}>
              {syncLine.statusText}
            </span>
            <span style={{ color: theme.textMuted }}>{syncLine.detailText}</span>
          </p>
        </div>
        <Link
          href="/training"
          className="text-[11px] font-semibold no-underline"
          style={{ color: theme.textMuted }}
        >
          Ver recomendación en entrenamiento
        </Link>
      </div>
    </section>
  )
}
