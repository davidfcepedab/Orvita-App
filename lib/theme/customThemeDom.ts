import { customPaletteToCssVars, type CustomPalette } from "@/lib/theme/customPalette"

const APPLIED_KEYS = new Set<string>()

export function applyCustomPaletteVars(palette: CustomPalette) {
  const el = document.documentElement
  const vars = customPaletteToCssVars(palette)
  for (const [k, v] of Object.entries(vars)) {
    el.style.setProperty(k, v)
    APPLIED_KEYS.add(k)
  }
}

export function clearCustomPaletteVars() {
  const el = document.documentElement
  for (const k of APPLIED_KEYS) {
    el.style.removeProperty(k)
  }
  APPLIED_KEYS.clear()
}

const META_THEME: Record<string, string> = {
  arctic: "#0d9488",
  carbon: "#1a1a1b",
  sand: "#78716c",
  midnight: "#111827",
  custom: "#0f9f7a",
}

export function updateThemeColorMeta(colorTheme: string, customAccent?: string | null) {
  const content =
    colorTheme === "custom" && customAccent?.trim()
      ? customAccent.trim().startsWith("#")
        ? customAccent.trim()
        : `#${customAccent.trim()}`
      : META_THEME[colorTheme] ?? META_THEME.arctic
  const metas = document.querySelectorAll('meta[name="theme-color"]')
  if (metas.length === 0) {
    const el = document.createElement("meta")
    el.setAttribute("name", "theme-color")
    el.setAttribute("content", content)
    document.head.appendChild(el)
  } else {
    metas.forEach((m) => m.setAttribute("content", content))
  }
}
