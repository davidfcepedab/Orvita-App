"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

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
    bg: "#0F0F10",
    surface: "#1A1A1B",
    surfaceAlt: "#171719",
    border: "#262626",
    text: "#E5E5E5",
    textMuted: "#A3A3A3",
    accent: {
      health: "#34D399",
      finance: "#60A5FA",
      agenda: "#818CF8",
    },
  },
  arctic: {
    bg: "#F4F7F9",
    surface: "#FFFFFF",
    surfaceAlt: "#EDF1F5",
    border: "#E2E8F0",
    text: "#1E293B",
    textMuted: "#64748B",
    accent: {
      health: "#10B981",
      finance: "#38BDF8",
      agenda: "#6366F1",
    },
  },
  sand: {
    bg: "#FAF8F5",
    surface: "#FFFCF7",
    surfaceAlt: "#F5F1EA",
    border: "#E8E2D8",
    text: "#292524",
    textMuted: "#78716C",
    accent: {
      health: "#FCD34D",
      finance: "#FDBA74",
      agenda: "#FCA5A5",
    },
  },
} as const
