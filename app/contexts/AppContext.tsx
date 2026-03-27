"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { designTokens } from "@/src/theme/design-tokens"

export type ColorTheme = "carbon" | "arctic" | "sand"
export type LayoutMode = "compact" | "balanced" | "zen"

interface AppContextType {
  colorTheme: ColorTheme
  layoutMode: LayoutMode
  setColorTheme: (theme: ColorTheme) => void
  setLayoutMode: (mode: LayoutMode) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

const THEME_KEY = "orbita:v3:theme"
const LAYOUT_KEY = "orbita:v3:layout"

export function AppProvider({ children }: { children: ReactNode }) {
  const [colorTheme, setColorTheme] = useState<ColorTheme>("arctic")
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("balanced")

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_KEY) as ColorTheme | null
    const storedLayout = window.localStorage.getItem(LAYOUT_KEY) as LayoutMode | null
    if (storedTheme && storedTheme in themes) {
      setColorTheme(storedTheme)
    }
    if (storedLayout && (storedLayout === "compact" || storedLayout === "balanced" || storedLayout === "zen")) {
      setLayoutMode(storedLayout)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, colorTheme)
  }, [colorTheme])

  useEffect(() => {
    window.localStorage.setItem(LAYOUT_KEY, layoutMode)
  }, [layoutMode])

  const value = useMemo(
    () => ({ colorTheme, layoutMode, setColorTheme, setLayoutMode }),
    [colorTheme, layoutMode]
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

export const themes = {
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
} as const
