import type { CSSProperties } from "react"

/**
 * Paleta súper hábito «luxury»: oro champán / bronce, menos neón que amber arcade.
 * Usar con color-mix hacia var(--color-surface) para respetar tema claro/oscuro.
 */
export const SUPER_LUXURY_HEX = {
  /** Oro apagado */
  gold: "#c9a962",
  goldDeep: "#8b7340",
  goldLight: "#e8dcc8",
  bronze: "#78716c",
  violet: "#7c3aed",
  green: "#15803d",
} as const

/** Fondo tarjeta cuando un solo hábito es súper (hero). */
export function superHeroShellStyle(surfaceVar = "var(--color-surface)"): CSSProperties {
  const s = surfaceVar
  return {
    background: `linear-gradient(
      146deg,
      color-mix(in srgb, ${SUPER_LUXURY_HEX.gold} 11%, color-mix(in srgb, ${SUPER_LUXURY_HEX.violet} 12%, ${s})) 0%,
      ${s} 40%,
      color-mix(in srgb, ${SUPER_LUXURY_HEX.green} 11%, color-mix(in srgb, ${SUPER_LUXURY_HEX.goldDeep} 7%, ${s})) 100%
    )`,
    borderColor: `color-mix(in srgb, ${SUPER_LUXURY_HEX.gold} 38%, #a855f7)`,
    boxShadow: `0 0 0 1px color-mix(in srgb, ${SUPER_LUXURY_HEX.gold} 22%, transparent),
      0 18px 48px color-mix(in srgb, ${SUPER_LUXURY_HEX.violet} 14%, transparent),
      0 10px 28px color-mix(in srgb, ${SUPER_LUXURY_HEX.goldDeep} 10%, transparent),
      inset 0 1px 0 color-mix(in srgb, white 12%, transparent)`,
  }
}

/** Borde anillo cuando hay súper en un stack mixto (no hero único). */
export const superRingClass =
  "ring-1 ring-[color-mix(in_srgb,#c9a962_32%,transparent)]"

export const superHeroRingClass =
  "ring-2 ring-[color-mix(in_srgb,#c9a962_38%,transparent)] motion-safe:transition-[box-shadow] motion-safe:duration-300"
