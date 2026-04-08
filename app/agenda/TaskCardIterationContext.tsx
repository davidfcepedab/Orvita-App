"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { TASK_CARD_ITERATION_QUERY } from "@/app/agenda/taskCardConfig"

const TaskCardIterationContext = createContext(false)

/**
 * `iterationMode` explícito gana sobre la URL.
 * Añade `?taskCardDev=1` a /agenda para ver áreas del grid y etiquetas.
 */
export function TaskCardIterationProvider({
  children,
  iterationMode: controlled,
}: {
  children: ReactNode
  iterationMode?: boolean
}) {
  const [fromUrl, setFromUrl] = useState(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    const q = new URLSearchParams(window.location.search).get(TASK_CARD_ITERATION_QUERY)
    setFromUrl(q === "1")
  }, [])

  const value = useMemo(
    () => (controlled !== undefined ? controlled : fromUrl),
    [controlled, fromUrl],
  )

  return (
    <TaskCardIterationContext.Provider value={value}>{children}</TaskCardIterationContext.Provider>
  )
}

export function useTaskCardIterationMode(): boolean {
  return useContext(TaskCardIterationContext)
}
