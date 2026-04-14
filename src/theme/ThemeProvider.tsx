"use client"

/**
 * Contenedor histórico: el tema de color y la densidad viven en `AppProvider` (`useApp`).
 * Se mantiene para no romper el árbol del layout; no añade estado propio.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return children
}
