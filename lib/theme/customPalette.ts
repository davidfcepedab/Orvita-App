/** Paleta editable en Configuración → tema «personalizado». */

export type CustomPalette = {
  background: string
  surface: string
  text: string
  textMuted: string
  accentHealth: string
}

export const CUSTOM_PALETTE_STORAGE_KEY = "orbita:v3:custom-palette"

export function normalizeHex(input: string): string | null {
  const t = input.trim()
  const m = t.replace("#", "").match(/^([0-9a-fA-F]{6})$/)
  if (!m) return null
  return `#${m[1].toUpperCase()}`
}

function parseRgb(hex: string): { r: number; g: number; b: number } | null {
  const n = normalizeHex(hex)
  if (!n) return null
  const v = parseInt(n.slice(1), 16)
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255 }
}

function rgbToHex(r: number, g: number, b: number) {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n)))
  return `#${[c(r), c(g), c(b)]
    .map((x) => x.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`
}

export function mixHex(a: string, b: string, t: number): string {
  const pa = parseRgb(a)
  const pb = parseRgb(b)
  if (!pa || !pb) return a
  return rgbToHex(
    pa.r * (1 - t) + pb.r * t,
    pa.g * (1 - t) + pb.g * t,
    pa.b * (1 - t) + pb.b * t,
  )
}

export function defaultCustomPalette(): CustomPalette {
  return {
    background: "#F2F2F7",
    surface: "#FFFFFF",
    text: "#1C1C1E",
    textMuted: "#636366",
    accentHealth: "#0F9F7A",
  }
}

export function expandCustomPalette(p: CustomPalette) {
  const surfaceAlt = mixHex(p.surface, p.background, 0.38)
  const border = mixHex(p.text, p.surface, 0.12)
  const accentFinance = "#0EA5E9"
  const accentAgenda = "#6366F1"
  return {
    ...p,
    surfaceAlt,
    border,
    accentFinance,
    accentAgenda,
    accentPrimary: p.accentHealth,
  }
}

export function customPaletteToCssVars(p: CustomPalette): Record<string, string> {
  const x = expandCustomPalette(p)
  return {
    "--color-background": x.background,
    "--color-surface": x.surface,
    "--color-surface-alt": x.surfaceAlt,
    "--color-border": x.border,
    "--color-text-primary": x.text,
    "--color-text-secondary": x.textMuted,
    "--color-accent-primary": x.accentPrimary,
    "--color-accent-health": x.accentHealth,
    "--color-accent-finance": x.accentFinance,
    "--color-accent-agenda": x.accentAgenda,
    "--color-accent-warning": "#F97316",
    "--color-accent-danger": "#EF4444",
    "--agenda-personal": x.accentFinance,
    "--agenda-received": "#EA580C",
    "--agenda-assigned": x.accentHealth,
    "--agenda-calendar": "#7C3AED",
    "--agenda-reminder": "#D97706",
    "--agenda-shell-bg": `color-mix(in srgb, ${x.surfaceAlt} 68%, ${x.background})`,
    "--agenda-inset-bg": `color-mix(in srgb, ${x.surfaceAlt} 52%, ${x.background})`,
    "--agenda-elevated-bg": `color-mix(in srgb, ${x.surface} 58%, ${x.surfaceAlt})`,
  }
}

export function parseStoredCustomPalette(raw: string | null): CustomPalette | null {
  if (!raw) return null
  try {
    const o = JSON.parse(raw) as Record<string, unknown>
    const base = defaultCustomPalette()
    const next: CustomPalette = {
      background: normalizeHex(String(o.background ?? base.background)) ?? base.background,
      surface: normalizeHex(String(o.surface ?? base.surface)) ?? base.surface,
      text: normalizeHex(String(o.text ?? base.text)) ?? base.text,
      textMuted: normalizeHex(String(o.textMuted ?? base.textMuted)) ?? base.textMuted,
      accentHealth: normalizeHex(String(o.accentHealth ?? base.accentHealth)) ?? base.accentHealth,
    }
    return next
  } catch {
    return null
  }
}
