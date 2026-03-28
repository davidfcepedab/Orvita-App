"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { createBrowserClient } from "@/lib/supabase/browser"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import { DEFAULT_HEALTH_SUPPLEMENTS } from "@/lib/health/defaultSupplements"
import type { HealthPreferencesPayload, HealthSupplement } from "@/lib/health/healthPrefsTypes"

const LS_KEY = "orbita:health:prefs:v1"

function normalizeList(list: unknown): HealthSupplement[] {
  if (!Array.isArray(list)) return DEFAULT_HEALTH_SUPPLEMENTS
  const out: HealthSupplement[] = []
  for (const item of list) {
    if (!item || typeof item !== "object") continue
    const o = item as Record<string, unknown>
    const id = typeof o.id === "string" ? o.id : ""
    const name = typeof o.name === "string" ? o.name : ""
    const amount = typeof o.amount === "string" ? o.amount : ""
    if (!id || !name) continue
    out.push({
      id,
      name,
      amount,
      active: o.active === true,
    })
  }
  return out.length > 0 ? out : DEFAULT_HEALTH_SUPPLEMENTS
}

function readLocal(): HealthSupplement[] {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null
    if (!raw) return DEFAULT_HEALTH_SUPPLEMENTS
    const parsed = JSON.parse(raw) as HealthPreferencesPayload
    return normalizeList(parsed.supplements)
  } catch {
    return DEFAULT_HEALTH_SUPPLEMENTS
  }
}

function writeLocal(supplements: HealthSupplement[]) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify({ supplements } satisfies HealthPreferencesPayload))
  } catch {
    /* ignore */
  }
}

async function buildAuthHeaders(): Promise<HeadersInit> {
  const base: HeadersInit = { "Content-Type": "application/json" }
  if (isAppMockMode()) return base
  const supabase = createBrowserClient() as {
    auth: { getSession: () => Promise<{ data: { session?: { access_token?: string } | null } }> }
  }
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) return base
  return { ...base, Authorization: `Bearer ${token}` }
}

export function useHealthSupplements() {
  const mock = isAppMockMode()
  const remote = isSupabaseEnabled() && !mock
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [supplements, setSupplementsState] = useState<HealthSupplement[]>(DEFAULT_HEALTH_SUPPLEMENTS)
  const [loading, setLoading] = useState(remote)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)

  const mergeRemote = useCallback(async () => {
    if (!remote) {
      setLoading(false)
      return
    }
    try {
      setError(null)
      const headers = await buildAuthHeaders()
      const res = await fetch("/api/health/preferences", { cache: "no-store", headers })
      const payload = (await res.json()) as {
        success?: boolean
        preferences?: HealthPreferencesPayload
        error?: string
      }
      if (!res.ok || !payload.success) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      const server = payload.preferences ?? {}
      const local = readLocal()
      const merged = normalizeList(server.supplements ?? local)
      setSupplementsState(merged)
      writeLocal(merged)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
      setSupplementsState(readLocal())
    } finally {
      setLoading(false)
    }
  }, [remote])

  useEffect(() => {
    if (mock || !remote) {
      setSupplementsState(readLocal())
      setLoading(false)
      return
    }
    void mergeRemote()
  }, [mock, remote, mergeRemote])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const pushRemote = useCallback(
    async (next: HealthSupplement[]) => {
      if (!remote) return
      try {
        const headers = await buildAuthHeaders()
        const res = await fetch("/api/health/preferences", {
          method: "POST",
          headers,
          body: JSON.stringify({ supplements: next } satisfies HealthPreferencesPayload),
        })
        const payload = (await res.json()) as {
          success?: boolean
          preferences?: HealthPreferencesPayload
          error?: string
        }
        if (!res.ok || !payload.success || !payload.preferences) {
          setError(messageForHttpError(res.status, payload.error, res.statusText))
          return
        }
        const merged = normalizeList(payload.preferences.supplements)
        setSupplementsState(merged)
        writeLocal(merged)
      } catch {
        /* keep local */
      }
    },
    [remote],
  )

  const setSupplements = useCallback(
    (updater: HealthSupplement[] | ((prev: HealthSupplement[]) => HealthSupplement[])) => {
      setSupplementsState((prev) => {
        const next = typeof updater === "function" ? (updater as (p: HealthSupplement[]) => HealthSupplement[])(prev) : updater
        writeLocal(next)
        if (remote) {
          if (debounceRef.current) clearTimeout(debounceRef.current)
          debounceRef.current = setTimeout(() => {
            void pushRemote(next)
          }, 400)
        }
        return next
      })
    },
    [remote, pushRemote],
  )

  const toggleActive = useCallback(
    (id: string) => {
      setSupplements((prev) => prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s)))
    },
    [setSupplements],
  )

  const updateSupplement = useCallback(
    (id: string, patch: Partial<Pick<HealthSupplement, "name" | "amount">>) => {
      setSupplements((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    },
    [setSupplements],
  )

  const activeCount = useMemo(() => supplements.filter((s) => s.active).length, [supplements])

  return {
    supplements,
    activeCount,
    loading,
    error,
    editMode,
    setEditMode,
    toggleActive,
    updateSupplement,
    setSupplements,
    refreshRemote: mergeRemote,
  }
}
