"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { designTokens } from "@/src/theme/design-tokens"
import {
  CUSTOM_PALETTE_STORAGE_KEY,
  defaultCustomPalette,
  expandCustomPalette,
  parseStoredCustomPalette,
  type CustomPalette,
} from "@/lib/theme/customPalette"
import { applyCustomPaletteVars, clearCustomPaletteVars, updateThemeColorMeta } from "@/lib/theme/customThemeDom"

export type ColorTheme = "carbon" | "arctic" | "sand" | "midnight" | "custom"
export type LayoutMode = "compact" | "balanced" | "zen"

export type OrbitaThemeSkin = (typeof orbitaThemes)["arctic"]

const orbitaThemes = {
  carbon: {
    bg: designTokens.colors.carbon.background,
    surface: designTokens.colors.carbon.surface,
    surfaceAlt: designTokens.colors.carbon["surface-alt"],
    border: designTokens.colors.carbon.border,
    text: designTokens.colors.carbon["text-primary"],
    textMuted: designTokens.colors.carbon["text-secondary"],
    accent: {
      health: designTokens.colors.carbon["accent-health"],
      finance: designTokens.colors.carbon["accent-finance"],
      agenda: designTokens.colors.carbon["accent-agenda"],
    },
  },
  arctic: {
    bg: designTokens.colors.arctic.background,
    surface: designTokens.colors.arctic.surface,
    surfaceAlt: designTokens.colors.arctic["surface-alt"],
    border: designTokens.colors.arctic.border,
    text: designTokens.colors.arctic["text-primary"],
    textMuted: designTokens.colors.arctic["text-secondary"],
    accent: {
      health: designTokens.colors.arctic["accent-health"],
      finance: designTokens.colors.arctic["accent-finance"],
      agenda: designTokens.colors.arctic["accent-agenda"],
    },
  },
  sand: {
    bg: designTokens.colors.sand.background,
    surface: designTokens.colors.sand.surface,
    surfaceAlt: designTokens.colors.sand["surface-alt"],
    border: designTokens.colors.sand.border,
    text: designTokens.colors.sand["text-primary"],
    textMuted: designTokens.colors.sand["text-secondary"],
    accent: {
      health: designTokens.colors.sand["accent-health"],
      finance: designTokens.colors.sand["accent-finance"],
      agenda: designTokens.colors.sand["accent-agenda"],
    },
  },
  midnight: {
    bg: "#0B1120",
    surface: "#111827",
    surfaceAlt: "#0B1120",
    border: "#1F2937",
    text: "#E5E7EB",
    textMuted: "#94A3B8",
    accent: {
      health: "#22C55E",
      finance: "#60A5FA",
      agenda: "#818CF8",
    },
  },
  custom: {
    bg: designTokens.colors.arctic.background,
    surface: designTokens.colors.arctic.surface,
    surfaceAlt: designTokens.colors.arctic["surface-alt"],
    border: designTokens.colors.arctic.border,
    text: designTokens.colors.arctic["text-primary"],
    textMuted: designTokens.colors.arctic["text-secondary"],
    accent: {
      health: designTokens.colors.arctic["accent-health"],
      finance: designTokens.colors.arctic["accent-finance"],
      agenda: designTokens.colors.arctic["accent-agenda"],
    },
  },
} as const

/** Presets + entrada «custom» para tipos; la piel real en custom viene de `resolveOrbitaSkin`. */
export const themes = orbitaThemes

export function resolveOrbitaSkin(colorTheme: ColorTheme, custom: CustomPalette | null): OrbitaThemeSkin {
  if (colorTheme !== "custom") {
    return orbitaThemes[colorTheme]
  }
  const base = custom ?? defaultCustomPalette()
  const x = expandCustomPalette(base)
  return {
    bg: x.background,
    surface: x.surface,
    surfaceAlt: x.surfaceAlt,
    border: x.border,
    text: x.text,
    textMuted: x.textMuted,
    accent: {
      health: x.accentHealth,
      finance: x.accentFinance,
      agenda: x.accentAgenda,
    },
  }
}

interface AppContextType {
  colorTheme: ColorTheme
  layoutMode: LayoutMode
  customPalette: CustomPalette
  setColorTheme: (theme: ColorTheme) => void
  setLayoutMode: (mode: LayoutMode) => void
  setCustomPalette: (palette: CustomPalette) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const THEME_KEY = "orbita:v3:theme"
const LAYOUT_KEY = "orbita:v3:layout"
const LEGACY_THEME_KEY = "orbita:theme"
const LEGACY_LAYOUT_KEY = "orbita:layout"

function isPresetTheme(s: string): s is Exclude<ColorTheme, "custom"> {
  return s === "arctic" || s === "carbon" || s === "sand" || s === "midnight"
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorTheme] = useState<ColorTheme>("arctic")
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("balanced")
  const [customPalette, setCustomPaletteState] = useState<CustomPalette>(() => defaultCustomPalette())

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_KEY)
    const storedLayout = window.localStorage.getItem(LAYOUT_KEY) ?? window.localStorage.getItem(LEGACY_LAYOUT_KEY)

    if (storedTheme === "custom") {
      setColorTheme("custom")
    } else if (storedTheme && isPresetTheme(storedTheme)) {
      setColorTheme(storedTheme)
    }

    const rawCustom = window.localStorage.getItem(CUSTOM_PALETTE_STORAGE_KEY)
    const parsed = parseStoredCustomPalette(rawCustom)
    if (parsed) {
      setCustomPaletteState(parsed)
    }

    if (storedLayout === "compact" || storedLayout === "balanced" || storedLayout === "zen") {
      setLayoutMode(storedLayout)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, colorTheme)
    window.localStorage.setItem(LEGACY_THEME_KEY, colorTheme)
    document.documentElement.dataset.theme = colorTheme

    if (colorTheme === "custom") {
      applyCustomPaletteVars(customPalette)
      updateThemeColorMeta("custom", customPalette.accentHealth)
    } else {
      clearCustomPaletteVars()
      updateThemeColorMeta(colorTheme, null)
    }
  }, [colorTheme, customPalette])

  useEffect(() => {
    window.localStorage.setItem(LAYOUT_KEY, layoutMode)
    window.localStorage.setItem(LEGACY_LAYOUT_KEY, layoutMode)
    document.documentElement.dataset.layout = layoutMode
  }, [layoutMode])

  const setCustomPalette = (palette: CustomPalette) => {
    setCustomPaletteState(palette)
    try {
      window.localStorage.setItem(CUSTOM_PALETTE_STORAGE_KEY, JSON.stringify(palette))
    } catch {
      /* ignore */
    }
  }

  const value = useMemo(
    () => ({
      colorTheme,
      layoutMode,
      customPalette,
      setColorTheme,
      setLayoutMode,
      setCustomPalette,
    }),
    [colorTheme, layoutMode, customPalette],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error("useApp must be used within AppProvider")
  }
  return context
}

export function useOrbitaSkin(): OrbitaThemeSkin {
  const { colorTheme, customPalette } = useApp()
  return useMemo(() => resolveOrbitaSkin(colorTheme, customPalette), [colorTheme, customPalette])
}
