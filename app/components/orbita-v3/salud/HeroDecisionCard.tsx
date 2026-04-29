"use client"

import Link from "next/link"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludDecisionBrief } from "@/lib/salud/saludDecisionBrief"
import type { AppleHeroSyncLine } from "@/lib/salud/appleHealthSyncToolbar"
import { SALUD_SEM, SALUD_SEM_STRONG } from "@/lib/salud/saludSemanticPalette"
import {
  saludDecisionCardMutedColor,
  saludHeroDecisionCardStyle,
} from "@/lib/salud/saludThemeStyles"

type Props = {
  brief: SaludDecisionBrief
  syncLine: AppleHeroSyncLine
}

function semanticBorder(s: SaludDecisionBrief["semantic"]) {
  if (s === "ok") return SALUD_SEM.ok
  if (s === "warn") return SALUD_SEM.warn
  return SALUD_SEM.risk
}

function semanticStrong(s: SaludDecisionBrief["semantic"]) {
  if (s === "ok") return SALUD_SEM_STRONG.ok
  if (s === "warn") return SALUD_SEM_STRONG.warn
  return SALUD_SEM_STRONG.risk
}

/** Misma semántica que la línea Apple; tonos más oscuros para leer sobre el tinte de la tarjeta. */
function syncStatusReadableColor(statusHex: string): string {
  if (statusHex === SALUD_SEM.ok) return SALUD_SEM_STRONG.ok
  if (statusHex === SALUD_SEM.warn) return SALUD_SEM_STRONG.warn
  if (statusHex === SALUD_SEM.risk) return SALUD_SEM_STRONG.risk
  return statusHex
}

export function HeroDecisionCard({ brief, syncLine }: Props) {
  const theme = useOrbitaSkin()
  const border = semanticBorder(brief.semantic)
  const strong = semanticStrong(brief.semantic)
  const muted = saludDecisionCardMutedColor(theme)

  return (
    <section
      className="rounded-2xl border-2 px-4 py-3.5 sm:px-5 sm:py-4"
      style={saludHeroDecisionCardStyle(theme, border)}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="m-0 text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: muted }}>
            Decisión del día
          </p>
          <h1 className="m-0 text-xl font-bold leading-tight tracking-tight sm:text-2xl" style={{ color: theme.text }}>
            {brief.dayStateLabel}
          </h1>
          <p className="m-0 flex flex-wrap items-baseline gap-x-1.5 gap-y-0">
            <span className="text-3xl font-bold tabular-nums leading-none sm:text-4xl" style={{ color: strong }}>
              {brief.energyScore}
            </span>
            <span className="text-xs font-semibold normal-case" style={{ color: muted }}>
              energía
            </span>
          </p>
          <p className="m-0 text-[13px] font-semibold leading-snug sm:text-sm" style={{ color: theme.text }}>
            {brief.causeLine}
          </p>
          <p className="m-0 text-[10px] leading-snug sm:text-[11px]">
            <span style={{ color: muted }}>Apple Health: </span>
            <span className="font-semibold" style={{ color: syncStatusReadableColor(syncLine.statusColor) }}>
              {syncLine.statusText}
            </span>
            <span style={{ color: muted }}>{syncLine.detailText}</span>
          </p>
        </div>
        <Link
          href="/training"
          className="text-[11px] font-semibold underline underline-offset-[3px] decoration-[color-mix(in_srgb,currentColor_35%,transparent)] transition-opacity hover:opacity-90"
          style={{ color: strong }}
        >
          Ver recomendación en entrenamiento
        </Link>
      </div>
    </section>
  )
}
