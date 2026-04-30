"use client"

import Link from "next/link"
import { ArrowRight, Sparkles } from "lucide-react"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import type { SaludDecisionBrief } from "@/lib/salud/saludDecisionBrief"
import type { AppleHeroSyncLine } from "@/lib/salud/appleHealthSyncToolbar"
import { SALUD_SEM, SALUD_SEM_STRONG } from "@/lib/salud/saludSemanticPalette"
import {
  saludDecisionCardMutedColor,
  saludHeroDecisionCardStyle,
  saludHexToRgba,
  saludSurfaceIsLight,
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
  const energy = Math.min(100, Math.max(0, Math.round(brief.energyScore)))
  const ringDeg = (energy / 100) * 360
  const lightSurface = saludSurfaceIsLight(theme.surface)

  return (
    <section
      className="relative overflow-hidden rounded-2xl border-2 px-4 py-4 sm:px-6 sm:py-5"
      style={saludHeroDecisionCardStyle(theme, border)}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full opacity-[0.14] blur-2xl"
        style={{ background: strong }}
        aria-hidden
      />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-stretch lg:justify-between lg:gap-8">
        <div className="min-w-0 flex-1 space-y-2.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.16em]" style={{ borderColor: saludHexToRgba(strong, 0.35), color: strong }}>
            <Sparkles className="h-3 w-3 shrink-0 opacity-90" aria-hidden />
            Decisión del día
          </div>
          <h1 className="m-0 text-[1.35rem] font-bold leading-[1.15] tracking-tight sm:text-2xl lg:text-[1.75rem]" style={{ color: theme.text }}>
            {brief.dayStateLabel}
          </h1>
          <p className="m-0 line-clamp-2 text-[13px] font-semibold leading-snug sm:text-sm" style={{ color: theme.text }}>
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

        <div className="relative flex shrink-0 flex-row items-center justify-between gap-4 border-t border-[color-mix(in_srgb,var(--color-border)_45%,transparent)] pt-4 sm:flex-col sm:items-stretch sm:justify-center sm:border-t-0 sm:pl-6 sm:pt-0 sm:before:pointer-events-none sm:before:absolute sm:before:left-0 sm:before:top-2 sm:before:bottom-2 sm:before:w-px sm:before:bg-[color-mix(in_srgb,var(--color-border)_45%,transparent)] sm:before:content-[''] lg:min-w-[11.5rem] lg:pl-8">
          <div
            className="flex items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-sm sm:flex-col sm:px-4 sm:py-3"
            style={{
              borderColor: saludHexToRgba(strong, 0.28),
              backgroundColor: saludHexToRgba(theme.surface, lightSurface ? 0.55 : 0.22),
            }}
          >
            <div
              className="relative h-[3.25rem] w-[3.25rem] shrink-0 rounded-full p-[3px] sm:h-16 sm:w-16 sm:p-[3.5px]"
              style={{
                background: `conic-gradient(from -90deg, ${strong} ${ringDeg}deg, color-mix(in srgb, var(--color-border) 42%, transparent) 0deg)`,
              }}
              aria-hidden
            >
              <div
                className="flex h-full w-full flex-col items-center justify-center rounded-full leading-none"
                style={{ backgroundColor: theme.surface }}
              >
                <span className="text-xl font-black tabular-nums sm:text-2xl" style={{ color: strong }}>
                  {brief.energyScore}
                </span>
              </div>
            </div>
            <div className="min-w-0 sm:text-center">
              <p className="m-0 text-[9px] font-bold uppercase tracking-[0.14em]" style={{ color: muted }}>
                Tu nivel hoy
              </p>
              <p className="m-0 mt-0.5 text-[11px] font-semibold leading-tight" style={{ color: theme.text }}>
                Energía (0–100)
              </p>
            </div>
          </div>

          <Link
            href="/training"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border-2 px-4 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.1em] no-underline transition-[transform,opacity,box-shadow] active:scale-[0.98] sm:min-h-10 sm:text-[10px]"
            style={{
              borderColor: saludHexToRgba(strong, 0.45),
              backgroundColor: saludHexToRgba(strong, lightSurface ? 0.14 : 0.22),
              color: strong,
              boxShadow: `0 6px 20px -6px ${saludHexToRgba(strong, 0.45)}`,
            }}
          >
            Entrenamiento
            <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  )
}
