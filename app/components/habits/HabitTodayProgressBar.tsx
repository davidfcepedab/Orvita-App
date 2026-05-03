"use client"

import type { CSSProperties } from "react"
import type { HabitTodayProgressKind } from "@/lib/habits/habitTodayProgressUi"
import { cn } from "@/lib/utils"

type VisualVariant = "default" | "orbitaFlex"
type OrbitaTone = "standard" | "super"

type Props = {
  pct: number
  kind: HabitTodayProgressKind
  ariaLabel: string
  caption?: string
  className?: string
  /** Mega tarjeta flexible: gradiente, brillo y track más “game” (no afecta Hoy). */
  visualVariant?: VisualVariant
  /** En mega tarjeta: barra oro–violeta–verde para súper hábitos (solo con `orbitaFlex`). */
  orbitaTone?: OrbitaTone
}

function fillForKind(
  kind: HabitTodayProgressKind,
  pct: number,
  visualVariant: VisualVariant,
  orbitaTone: OrbitaTone,
): CSSProperties {
  if (pct <= 0) return { background: "transparent" }
  if (visualVariant === "orbitaFlex") {
    const superLux = orbitaTone === "super"
    if (kind === "water") {
      return {
        background: superLux
          ? "linear-gradient(90deg, #fde047 0%, #22d3ee 35%, #c4b5fd 62%, #34d399 100%)"
          : "linear-gradient(90deg, #22d3ee 0%, #a78bfa 48%, #34d399 100%)",
        boxShadow: superLux
          ? "0 0 20px color-mix(in srgb, #fbbf24 42%, transparent), 0 0 18px color-mix(in srgb, #22d3ee 32%, transparent), 0 0 10px color-mix(in srgb, #a855f7 22%, transparent)"
          : "0 0 16px color-mix(in srgb, #22d3ee 35%, transparent), 0 0 8px color-mix(in srgb, #a855f7 25%, transparent)",
      }
    }
    return {
      background: superLux
        ? "linear-gradient(90deg, #fde68a 0%, #f59e0b 20%, #a855f7 48%, #10b981 100%)"
        : "linear-gradient(90deg, #8b5cf6 0%, #d946ef 38%, #22c55e 100%)",
      boxShadow: superLux
        ? "0 0 22px color-mix(in srgb, #fbbf24 48%, transparent), 0 0 18px color-mix(in srgb, #a855f7 38%, transparent), 0 0 12px color-mix(in srgb, #22c55e 30%, transparent)"
        : "0 0 18px color-mix(in srgb, #a855f7 40%, transparent), 0 0 12px color-mix(in srgb, #22c55e 28%, transparent)",
    }
  }
  if (kind === "water") {
    return {
      background:
        "linear-gradient(90deg, color-mix(in srgb, #22d3ee 88%, var(--color-accent-health)), #0891b2)",
    }
  }
  return { background: "var(--color-accent-health)" }
}

/**
 * Progreso del día: variant por defecto discreta; `orbitaFlex` para la mega tarjeta violeta/verde.
 */
export function HabitTodayProgressBar({
  pct,
  kind,
  ariaLabel,
  caption,
  className,
  visualVariant = "default",
  orbitaTone = "standard",
}: Props) {
  const orbita = visualVariant === "orbitaFlex"
  const superLux = orbita && orbitaTone === "super"
  const fill = fillForKind(kind, pct, visualVariant, orbitaTone)
  const showShimmer = orbita && pct > 0
  const questPulse = orbita && pct < 100

  return (
    <div className={className ?? "mt-1.5 min-w-0 w-full"}>
      <div
        className={cn(
          "w-full overflow-hidden rounded-full",
          orbita
            ? cn(
                "relative bg-[linear-gradient(90deg,color-mix(in_srgb,#7c3aed_18%,transparent),color-mix(in_srgb,var(--color-border)_36%,transparent),color-mix(in_srgb,#15803d_14%,transparent))] p-[2px] shadow-[inset_0_1px_3px_rgba(0,0,0,0.1)]",
                superLux
                  ? "h-3 ring-2 ring-[color-mix(in_srgb,#fbbf24_42%,transparent)] ring-offset-1 ring-offset-[color-mix(in_srgb,var(--color-surface)_80%,transparent)]"
                  : "h-2.5 ring-1 ring-[color-mix(in_srgb,#a855f7_26%,transparent)]",
                questPulse && (superLux ? "orbita-flex-track-quest-super" : "orbita-flex-track-quest"),
              )
            : "h-1.5 bg-[color-mix(in_srgb,var(--color-border)_52%,transparent)]",
        )}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label={ariaLabel}
      >
        {orbita ? (
          <div
            className={cn(
              "relative h-full w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--color-surface)_55%,transparent)]",
              superLux && "orbita-flex-fill-sheen",
            )}
            style={{ minHeight: superLux ? 8 : 6 }}
          >
            <div
              className="relative h-full overflow-hidden rounded-full motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-out motion-reduce:transition-none"
              style={{ width: `${pct}%` }}
            >
              <div className="absolute inset-0 rounded-full" style={fill} />
              {showShimmer ? (
                <div
                  className={cn(
                    "pointer-events-none absolute inset-0 overflow-hidden rounded-full",
                    superLux ? "orbita-flex-progress-shimmer orbita-flex-progress-shimmer--super" : "orbita-flex-progress-shimmer",
                  )}
                  aria-hidden
                />
              ) : null}
            </div>
          </div>
        ) : (
          <div
            className="h-full max-w-full rounded-full motion-safe:transition-[width] motion-safe:duration-300 motion-reduce:transition-none"
            style={{ width: `${pct}%`, ...fill }}
          />
        )}
      </div>
      {caption ? (
        <p
          className={cn(
            "m-0 mt-1 truncate leading-tight text-[var(--color-text-secondary)]",
            orbita
              ? cn(
                  "text-[10px] font-semibold tabular-nums tracking-tight",
                  superLux
                    ? "bg-gradient-to-r from-amber-800/90 via-violet-700/90 to-emerald-700/90 bg-clip-text text-transparent dark:from-amber-200/95 dark:via-violet-200/90 dark:to-emerald-200/90"
                    : "text-[color-mix(in_srgb,var(--color-text-secondary)_88%,#7c3aed)] dark:text-violet-200/90",
                )
              : "text-[9px] tabular-nums",
          )}
        >
          {caption}
        </p>
      ) : null}
    </div>
  )
}
