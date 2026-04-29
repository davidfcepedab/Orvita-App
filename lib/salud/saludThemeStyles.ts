import type { CSSProperties } from "react"
import type { OrbitaThemeSkin } from "@/app/contexts/AppContext"

/** Convierte #RRGGBB a rgba para overlays que respetan el tema Órvita. */
export function saludHexToRgba(hex: string, alpha: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim())
  if (!m) return hex
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  return `rgba(${r},${g},${b},${alpha})`
}

/** Fondo de página /salud: gradiente suave con acentos del tema. */
export function saludPageBackdropStyle(theme: OrbitaThemeSkin): CSSProperties {
  return {
    background: [
      `radial-gradient(120% 70% at 50% -10%, ${saludHexToRgba(theme.accent.agenda, 0.16)}, transparent 55%)`,
      `radial-gradient(90% 60% at 100% 0%, ${saludHexToRgba(theme.accent.health, 0.14)}, transparent 45%)`,
      `linear-gradient(180deg, ${theme.bg} 0%, ${theme.surface} 48%, ${theme.bg} 100%)`,
    ].join(","),
  }
}

/** Tarjeta / panel con borde del tema (reemplaza glass fijo “oscuro”). */
export function saludPanelStyle(theme: OrbitaThemeSkin, surfaceAlpha = 0.92): CSSProperties {
  return {
    backgroundColor: saludHexToRgba(theme.surface, surfaceAlpha),
    borderColor: theme.border,
    color: theme.text,
    boxShadow: `0 18px 48px ${saludHexToRgba(theme.bg, 0.35)}`,
  }
}

/** Luminancia aproximada (hex #RRGGBB) para elegir texto secundario legible sobre tintes. */
export function saludSurfaceIsLight(surfaceHex: string): boolean {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(surfaceHex.trim())
  if (!m) return true
  const r = parseInt(m[1], 16)
  const g = parseInt(m[2], 16)
  const b = parseInt(m[3], 16)
  const y = (r * 299 + g * 587 + b * 114) / 1000
  return y > 175
}

/**
 * Hero “Decisión del día”: toda la tarjeta con tinte semántico + sombra suave.
 * El texto principal sigue siendo `theme.text`; secundarios deben usar `saludDecisionCardMutedColor`.
 */
export function saludHeroDecisionCardStyle(theme: OrbitaThemeSkin, semanticHex: string): CSSProperties {
  const light = saludSurfaceIsLight(theme.surface)
  const tintPct = light ? 22 : 28
  return {
    background: `color-mix(in srgb, ${semanticHex} ${tintPct}%, ${theme.surface})`,
    color: theme.text,
    borderColor: saludHexToRgba(semanticHex, light ? 0.48 : 0.4),
    boxShadow: light
      ? `0 14px 44px ${saludHexToRgba(theme.bg, 0.28)}, inset 0 1px 0 ${saludHexToRgba(semanticHex, 0.22)}`
      : `0 16px 48px rgba(0,0,0,0.4), inset 0 1px 0 ${saludHexToRgba(semanticHex, 0.2)}`,
  }
}

/** Texto secundario legible sobre fondo tintado (evita gris claro sobre ámbar/verde suave). */
export function saludDecisionCardMutedColor(theme: OrbitaThemeSkin): string {
  return saludSurfaceIsLight(theme.surface) ? "#475569" : theme.textMuted
}

/** Semáforo 0–100: verde / ámbar / rojo (sin azul como estado). */
export function saludMetricTone(_theme: OrbitaThemeSkin, value: number): string {
  if (value >= 80) return "#22c55e"
  if (value >= 60) return "#eab308"
  return "#ef4444"
}
