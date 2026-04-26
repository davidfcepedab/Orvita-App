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

/** Semáforo 0–100: verde / ámbar / rojo (sin azul como estado). */
export function saludMetricTone(_theme: OrbitaThemeSkin, value: number): string {
  if (value >= 80) return "#22c55e"
  if (value >= 60) return "#eab308"
  return "#ef4444"
}
