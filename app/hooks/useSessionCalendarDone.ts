"use client"

import { useCallback, useEffect, useState } from "react"

const STORAGE_KEY = "orvita-agenda-cal-ui-done-v1"

/** Completado visual solo en sesión (Calendar no expone API de “hecho” en Órvita). */
export function useSessionCalendarDone() {
  const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const arr = JSON.parse(raw) as unknown
      if (!Array.isArray(arr)) return
      setDoneIds(new Set(arr.filter((x): x is string => typeof x === "string")))
    } catch {
      /* ignore */
    }
  }, [])

  const persist = useCallback((next: Set<string>) => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
    } catch {
      /* ignore */
    }
  }, [])

  const isDone = useCallback((id: string) => doneIds.has(id), [doneIds])

  const toggle = useCallback(
    (id: string) => {
      setDoneIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        persist(next)
        return next
      })
    },
    [persist],
  )

  return { isCalendarUiDone: isDone, toggleCalendarUiDone: toggle }
}
