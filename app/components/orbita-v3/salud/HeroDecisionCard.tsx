"use client"

import Link from "next/link"
import { Dumbbell } from "lucide-react"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { AutoHealthMetric } from "@/app/hooks/useHealthAutoMetrics"
import type { SaludDecisionBrief } from "@/lib/salud/saludDecisionBrief"
import { SALUD_SEM } from "@/lib/salud/saludSemanticPalette"
import { saludHexToRgba, saludPanelStyle } from "@/lib/salud/saludThemeStyles"
import { AppleHealthSyncCollapsible } from "@/app/components/orbita-v3/salud/AppleHealthSyncCollapsible"

type Props = {
  brief: SaludDecisionBrief
  syncSummary: string
  onRefreshApple: () => Promise<void>
  latest: AutoHealthMetric | null
}

function semanticBorder(s: SaludDecisionBrief["semantic"]) {
  if (s === "ok") return SALUD_SEM.ok
  if (s === "warn") return SALUD_SEM.warn
  return SALUD_SEM.risk
}

export function HeroDecisionCard({ brief, syncSummary, onRefreshApple, latest }: Props) {
  const theme = useOrbitaSkin()
  const border = semanticBorder(brief.semantic)

  return (
    <section
      className="rounded-2xl border-2 p-5 sm:p-6"
      style={{
        ...saludPanelStyle(theme, 0.95),
        borderColor: saludHexToRgba(border, 0.55),
      }}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: theme.textMuted }}>
            Decisión del día
          </p>
          <h1 className="m-0 mt-2 text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: theme.text }}>
            {brief.dayStateLabel}
          </h1>
          <p className="m-0 mt-3 text-4xl font-bold tabular-nums leading-none" style={{ color: border }}>
            {brief.energyScore}
            <span className="ml-2 text-sm font-semibold normal-case" style={{ color: theme.textMuted }}>
              energía
            </span>
          </p>
          <p className="m-0 mt-3 text-sm font-medium leading-snug" style={{ color: theme.text }}>
            Causa: {brief.causeLine}
          </p>
          <p className="m-0 mt-2 text-[11px]" style={{ color: theme.textMuted }}>
            {syncSummary}
          </p>
        </div>
        <div className="flex w-full shrink-0 flex-col gap-2 sm:max-w-xs">
          <Link
            href="/training"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold no-underline"
            style={{ backgroundColor: theme.text, color: theme.bg }}
          >
            <Dumbbell className="h-4 w-4 shrink-0" aria-hidden />
            Ir a entrenamiento
          </Link>
          <Link
            href="/training?action=rest"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border px-4 text-sm font-semibold no-underline"
            style={{ borderColor: saludHexToRgba(border, 0.45), color: theme.text }}
          >
            Descansar
          </Link>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/training?action=adjust"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border px-2 text-center text-xs font-semibold no-underline leading-tight"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              Ajustar sesión
            </Link>
            <Link
              href="/hoy"
              className="inline-flex min-h-10 items-center justify-center rounded-xl border px-2 text-center text-xs font-semibold no-underline leading-tight"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              Ajustar día
            </Link>
          </div>
          <AppleHealthSyncCollapsible onRefresh={onRefreshApple} latest={latest} />
        </div>
      </div>
    </section>
  )
}
