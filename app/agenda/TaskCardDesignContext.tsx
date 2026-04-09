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
  buildGridTemplateFromRows,
  defaultRowOrderForGrid,
  mergeTaskCardVarOverrides,
  taskCardDensityVars,
  type TaskCardDensity,
  type TaskCardGridKey,
} from "@/app/agenda/taskCardConfig"

const STORAGE_KEY = "orvita-task-card-studio-v1"

export type TaskCardDesignPersisted = {
  vars: Record<string, string>
  grids: Partial<Record<TaskCardGridKey, string>>
  /** Orden de filas por plantilla (sustituye a `grids[slot]` si existe). */
  rowOrder?: Partial<Record<TaskCardGridKey, string[]>>
}

function readStorage(): TaskCardDesignPersisted {
  if (typeof window === "undefined") return { vars: {}, grids: {}, rowOrder: {} }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { vars: {}, grids: {}, rowOrder: {} }
    const p = JSON.parse(raw) as Partial<TaskCardDesignPersisted>
    return {
      vars: typeof p.vars === "object" && p.vars !== null ? p.vars : {},
      grids: typeof p.grids === "object" && p.grids !== null ? p.grids : {},
      rowOrder: typeof p.rowOrder === "object" && p.rowOrder !== null ? p.rowOrder : {},
    }
  } catch {
    return { vars: {}, grids: {}, rowOrder: {} }
  }
}

function persistToDisk(payload: TaskCardDesignPersisted) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota */
  }
}

type TaskCardDesignApi = {
  hydrated: boolean
  varOverrides: Record<string, string>
  gridOverrides: Partial<Record<TaskCardGridKey, string>>
  rowOrder: Partial<Record<TaskCardGridKey, string[]>>
  setVarOverride: (key: string, value: string) => void
  clearVarOverride: (key: string) => void
  setGridOverride: (slot: TaskCardGridKey, value: string) => void
  clearGridOverride: (slot: TaskCardGridKey) => void
  setRowOrderForSlot: (slot: TaskCardGridKey, rows: string[]) => void
  moveRowInSlot: (slot: TaskCardGridKey, fromIndex: number, toIndex: number) => void
  resetRowOrderForSlot: (slot: TaskCardGridKey) => void
  resetAll: () => void
  /** Fuerza escritura a localStorage (además del autosave). */
  saveNow: () => void
  exportJson: () => string
  getMergedVarStyle: (density: TaskCardDensity) => CSSProperties
  getResolvedGridTemplate: (slot: TaskCardGridKey) => string
  getRowOrder: (slot: TaskCardGridKey) => string[]
}

const TaskCardDesignContext = createContext<TaskCardDesignApi | null>(null)

function defaultApi(): TaskCardDesignApi {
  return {
    hydrated: true,
    varOverrides: {},
    gridOverrides: {},
    rowOrder: {},
    setVarOverride: () => {},
    clearVarOverride: () => {},
    setGridOverride: () => {},
    clearGridOverride: () => {},
    setRowOrderForSlot: () => {},
    moveRowInSlot: () => {},
    resetRowOrderForSlot: () => {},
    resetAll: () => {},
    saveNow: () => {},
    exportJson: () =>
      JSON.stringify({ vars: {}, grids: {}, rowOrder: {}, note: "Sin provider de diseño (fuera de /agenda)." }, null, 2),
    getMergedVarStyle: (density) => taskCardDensityVars(density),
    getResolvedGridTemplate: (slot) => TASK_CARD_GRID[slot],
    getRowOrder: (slot) => defaultRowOrderForGrid(slot),
  }
}

export function TaskCardDesignProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false)
  const [varOverrides, setVarOverrides] = useState<Record<string, string>>({})
  const [gridOverrides, setGridOverrides] = useState<Partial<Record<TaskCardGridKey, string>>>({})
  const [rowOrder, setRowOrder] = useState<Partial<Record<TaskCardGridKey, string[]>>>({})

  const snapshot = useMemo(
    () => ({ vars: varOverrides, grids: gridOverrides, rowOrder }),
    [varOverrides, gridOverrides, rowOrder],
  )

  useEffect(() => {
    const { vars, grids, rowOrder: ro } = readStorage()
    setVarOverrides(vars)
    setGridOverrides(grids)
    setRowOrder(ro ?? {})
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const id = window.setTimeout(() => persistToDisk(snapshot), 400)
    return () => window.clearTimeout(id)
  }, [snapshot, hydrated])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue == null) return
      try {
        const p = JSON.parse(e.newValue) as TaskCardDesignPersisted
        setVarOverrides(p.vars ?? {})
        setGridOverrides(p.grids ?? {})
        setRowOrder(p.rowOrder ?? {})
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

  const setRowOrderForSlot = useCallback((slot: TaskCardGridKey, rows: string[]) => {
    setRowOrder((prev) => ({ ...prev, [slot]: [...rows] }))
  }, [])

  const moveRowInSlot = useCallback((slot: TaskCardGridKey, fromIndex: number, toIndex: number) => {
    setRowOrder((prev) => {
      const allowed = new Set(defaultRowOrderForGrid(slot))
      const base = (prev[slot]?.length ? [...prev[slot]!] : defaultRowOrderForGrid(slot)).filter((id) =>
        allowed.has(id),
      )
      if (base.length !== defaultRowOrderForGrid(slot).length) {
        return { ...prev, [slot]: defaultRowOrderForGrid(slot) }
      }
      const nextRows = [...base]
      const [removed] = nextRows.splice(fromIndex, 1)
      nextRows.splice(toIndex, 0, removed)
      return { ...prev, [slot]: nextRows }
    })
  }, [])

  const resetRowOrderForSlot = useCallback((slot: TaskCardGridKey) => {
    setRowOrder((prev) => {
      const next = { ...prev }
      delete next[slot]
      return next
    })
  }, [])

  const resetAll = useCallback(() => {
    setVarOverrides({})
    setGridOverrides({})
    setRowOrder({})
    try {
      window.localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* ignore */
    }
  }, [])

  const saveNow = useCallback(() => {
    persistToDisk(snapshot)
  }, [snapshot])

  const exportJson = useCallback(
    () =>
      JSON.stringify(
        {
          ...snapshot,
          note:
            "Vars + rowOrder + grids (crudo). Si hay texto en grids[slot], tiene prioridad sobre el orden por arrastre.",
        },
        null,
        2,
      ),
    [snapshot],
  )

  const getRowOrder = useCallback(
    (slot: TaskCardGridKey) => {
      const custom = rowOrder[slot]
      if (custom?.length) {
        const allowed = defaultRowOrderForGrid(slot)
        const set = new Set(allowed)
        const filtered = custom.filter((id) => set.has(id))
        if (filtered.length === allowed.length) return filtered
      }
      return defaultRowOrderForGrid(slot)
    },
    [rowOrder],
  )

  const getResolvedGridTemplate = useCallback(
    (slot: TaskCardGridKey) => {
      const raw = gridOverrides[slot]?.trim()
      if (raw) return raw
      const customRows = rowOrder[slot]
      if (customRows?.length) {
        const canonical = defaultRowOrderForGrid(slot)
        const allowedSet = new Set(canonical)
        const filtered = customRows.filter((id) => allowedSet.has(id))
        if (filtered.length === canonical.length) {
          return buildGridTemplateFromRows(slot, filtered)
        }
      }
      return TASK_CARD_GRID[slot]
    },
    [rowOrder, gridOverrides],
  )

  const getMergedVarStyle = useCallback(
    (density: TaskCardDensity) =>
      mergeTaskCardVarOverrides(taskCardDensityVars(density), varOverrides),
    [varOverrides],
  )

  const value = useMemo(
    () =>
      ({
        hydrated,
        varOverrides,
        gridOverrides,
        rowOrder,
        setVarOverride,
        clearVarOverride,
        setGridOverride,
        clearGridOverride,
        setRowOrderForSlot,
        moveRowInSlot,
        resetRowOrderForSlot,
        resetAll,
        saveNow,
        exportJson,
        getMergedVarStyle,
        getResolvedGridTemplate,
        getRowOrder,
      }) satisfies TaskCardDesignApi,
    [
      hydrated,
      varOverrides,
      gridOverrides,
      rowOrder,
      setVarOverride,
      clearVarOverride,
      setGridOverride,
      clearGridOverride,
      setRowOrderForSlot,
      moveRowInSlot,
      resetRowOrderForSlot,
      resetAll,
      saveNow,
      exportJson,
      getMergedVarStyle,
      getResolvedGridTemplate,
      getRowOrder,
    ],
  )

  return <TaskCardDesignContext.Provider value={value}>{children}</TaskCardDesignContext.Provider>
}

export function useTaskCardDesign(): TaskCardDesignApi {
  const ctx = useContext(TaskCardDesignContext)
  return ctx ?? defaultApi()
}
