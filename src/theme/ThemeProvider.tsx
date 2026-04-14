"use client"

import { createContext, useContext, useEffect, useMemo, useState } from "react"
import type { LayoutMode } from "@/src/theme/design-tokens"

const THEME_KEY = "orbita:theme"
const LAYOUT_KEY = "orbita:layout"

type ThemeName = "arctic" | "carbon" | "sand" | "midnight"

type ThemeContextValue = {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
}

type LayoutContextValue = {
  layoutMode: LayoutMode
  setLayoutMode: (mode: LayoutMode) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)
const LayoutContext = createContext<LayoutContextValue | undefined>(undefined)

function isThemeName(value: string): value is ThemeName {
  return value === "arctic" || value === "carbon" || value === "sand" || value === "midnight"
}

function isLayoutMode(value: string): value is LayoutMode {
  return value === "compact" || value === "balanced" || value === "zen"
}

/** Barra de estado / PWA en Safari: alineada a tokens (sin Swift; solo meta theme-color). */
const THEME_COLOR_HEX: Record<ThemeName, string> = {
  arctic: "#0d9488",
  carbon: "#1a1a1b",
  sand: "#78716c",
  midnight: "#111827",
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>("arctic")
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("balanced")

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(THEME_KEY)
    const storedLayout = window.localStorage.getItem(LAYOUT_KEY)

    if (storedTheme && isThemeName(storedTheme)) {
      setTheme(storedTheme)
    }

    if (storedLayout && isLayoutMode(storedLayout)) {
      setLayoutMode(storedLayout)
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme)
    document.documentElement.dataset.theme = theme
    const content = THEME_COLOR_HEX[theme]
    const metas = document.querySelectorAll('meta[name="theme-color"]')
    if (metas.length === 0) {
      const el = document.createElement("meta")
      el.setAttribute("name", "theme-color")
      el.setAttribute("content", content)
      document.head.appendChild(el)
    } else {
      metas.forEach((m) => m.setAttribute("content", content))
    }
  }, [theme])

  useEffect(() => {
    window.localStorage.setItem(LAYOUT_KEY, layoutMode)
    document.documentElement.dataset.layout = layoutMode
  }, [layoutMode])

  const themeValue = useMemo(() => ({ theme, setTheme }), [theme])
  const layoutValue = useMemo(() => ({ layoutMode, setLayoutMode }), [layoutMode])

  return (
    <ThemeContext.Provider value={themeValue}>
      <LayoutContext.Provider value={layoutValue}>{children}</LayoutContext.Provider>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}

export function useLayoutMode() {
  const context = useContext(LayoutContext)
  if (!context) {
    throw new Error("useLayoutMode must be used within ThemeProvider")
  }
  return context
}
