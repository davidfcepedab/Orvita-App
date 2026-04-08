"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import {
  TASK_CARD_GRID,
  mergeTaskCardVarOverrides,
  resolveTaskCardGridTemplate,
  taskCardDensityVars,
  type TaskCardDensity,
  type TaskCardGridKey,
} from "@/app/agenda/taskCardConfig"

const STORAGE_KEY = "orvita-task-card-studio-v1"

export type TaskCardDesignPersisted = {
  vars: Record<string, string>
  grids: Partial<Record<TaskCardGridKey, string>>
}

function readStorage(): TaskCardDesignPersisted {
  if (typeof window === "undefined") return { vars: {}, grids: {} }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { vars: {}, grids: {} }
    const p = JSON.parse(raw) as Partial<TaskCardDesignPersisted>
    return {
      vars: typeof p.vars === "object" && p.vars !== null ? p.vars : {},
      grids: typeof p.grids === "object" && p.grids !== null ? p.grids : {},
    }
  } catch {
    return { vars: {}, grids: {} }
  }
}

type TaskCardDesignApi = {
  hydrated: boolean
  varOverrides: Record<string, string>
  gridOverrides: Partial<Record<TaskCardGridKey, string>>
  setVarOverride: (key: string, value: string) => void
  clearVarOverride: (key: string) => void
  setGridOverride: (slot: TaskCardGridKey, value: string) => void
  clearGridOverride: (slot: TaskCardGridKey) => void
  resetAll: () => void
  getMergedVarStyle: (density: TaskCardDensity) => CSSProperties
  getResolvedGridTemplate: (slot: TaskCardGridKey) => string
}

const TaskCardDesignContext = createContext<TaskCardDesignApi | null>(null)

function defaultApi(): TaskCardDesignApi {
  return {
    hydrated: true,
    varOverrides: {},
    gridOverrides: {},
    setVarOverride: () => {},
    clearVarOverride: () => {},
    setGridOverride: () => {},
    clearGridOverride: () => {},
    resetAll: () => {},
    getMergedVarStyle: (density) => taskCardDensityVars(density),
    getResolvedGridTemplate: (slot) => TASK_CARD_GRID[slot],
  }
}

export function TaskCardDesignProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const [varOverrides, setVarOverrides] = useState<Record<string, string>>({})
  const [gridOverrides, setGridOverrides] = useState<Partial<Record<TaskCardGridKey, string>>>({})

  useEffect(() => {
    const { vars, grids } = readStorage()
    setVarOverrides(vars)
    setGridOverrides(grids)
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ vars: varOverrides, grids: gridOverrides }),
      )
    } catch {
      /* ignore quota */
    }
  }, [varOverrides, gridOverrides, hydrated])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue == null) return
      try {
        const p = JSON.parse(e.newValue) as TaskCardDesignPersisted
        setVarOverrides(p.vars ?? {})
        setGridOverrides(p.grids ?? {})
      } catch {
        /* ignore */
      }
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const setVarOverride = useCallback((key: string, value: string) => {
    setVarOverrides((prev) => ({ ...prev, [key]: value }))
  }, [])

  const clearVarOverride = useCallback((key: string) => {
    setVarOverrides((prev) => {
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  const setGridOverride = useCallback((slot: TaskCardGridKey, value: string) => {
    setGridOverrides((prev) => ({ ...prev, [slot]: value }))
  }, [])

  const clearGridOverride = useCallback((slot: TaskCardGridKey) => {
    setGridOverrides((prev) => {
      const next = { ...prev }
      delete next[slot]
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    setVarOverrides({})
    setGridOverrides({})
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const getMergedVarStyle = useCallback(
    (density: TaskCardDensity) =>
      mergeTaskCardVarOverrides(taskCardDensityVars(density), varOverrides),
    [varOverrides],
  )

  const getResolvedGridTemplate = useCallback(
    (slot: TaskCardGridKey) => resolveTaskCardGridTemplate(slot, gridOverrides[slot]),
    [gridOverrides],
  )

  const value = useMemo(
    () =>
      ({
        hydrated,
        varOverrides,
        gridOverrides,
        setVarOverride,
        clearVarOverride,
        setGridOverride,
        clearGridOverride,
        resetAll,
        getMergedVarStyle,
        getResolvedGridTemplate,
      }) satisfies TaskCardDesignApi,
    [
      hydrated,
      varOverrides,
      gridOverrides,
      setVarOverride,
      clearVarOverride,
      setGridOverride,
      clearGridOverride,
      resetAll,
      getMergedVarStyle,
      getResolvedGridTemplate,
    ],
  )

  return <TaskCardDesignContext.Provider value={value}>{children}</TaskCardDesignContext.Provider>
}

export function useTaskCardDesign(): TaskCardDesignApi {
  const ctx = useContext(TaskCardDesignContext)
  return ctx ?? defaultApi()
}
