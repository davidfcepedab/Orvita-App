"use client"

import type { CSSProperties } from "react"
import type { HabitTodayProgressKind } from "@/lib/habits/habitTodayProgressUi"

type Props = {
  pct: number
  kind: HabitTodayProgressKind
  ariaLabel: string
  caption?: string
  className?: string
}

function fillForKind(kind: HabitTodayProgressKind, pct: number): CSSProperties {
  if (pct <= 0) return { background: "transparent" }
  if (kind === "water") {
    return {
      background:
        "linear-gradient(90deg, color-mix(in srgb, #22d3ee 88%, var(--color-accent-health)), #0891b2)",
    }
  }
  return { background: "var(--color-accent-health)" }
}

/**
 * Misma pista de progreso que Hoy: ancho, aria, leyenda opcional; agua e intraday comparten layout.
 */
export function HabitTodayProgressBar({ pct, kind, ariaLabel, caption, className }: Props) {
  return (
    <div className={className ?? "mt-1.5 min-w-0 w-full"}>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-border)_52%,transparent)]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={ariaLabel}
      >
        <div
          className="h-full max-w-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-reduce:transition-none"
          style={{ width: `${pct}%`, ...fillForKind(kind, pct) }}
        />
      </div>
      {caption ? (
        <p className="m-0 mt-1 truncate text-[9px] tabular-nums leading-tight text-[var(--color-text-secondary)]">
          {caption}
        </p>
      ) : null}
    </div>
  )
}
