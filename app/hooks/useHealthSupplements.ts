"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { createBrowserClient } from "@/lib/supabase/browser"
import { isAppMockMode, isSupabaseEnabled } from "@/lib/checkins/flags"
import { DEFAULT_HEALTH_SUPPLEMENTS } from "@/lib/health/defaultSupplements"
import type { HealthPreferencesPayload, HealthSupplement, SupplementComplianceMap } from "@/lib/health/healthPrefsTypes"
import { isSupplementDaypart } from "@/lib/health/supplementDayparts"
import { normalizeCompliance, todayYmdLocal, trimComplianceMap } from "@/lib/health/supplementComplianceUtils"

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
    const dp = typeof o.daypart === "string" && isSupplementDaypart(o.daypart) ? o.daypart : "manana"
    out.push({
      id,
      name,
      amount,
      active: o.active === true,
      daypart: dp,
      indispensable: o.indispensable === true,
    })
  }
  return out.length > 0 ? out : DEFAULT_HEALTH_SUPPLEMENTS
}

function readLocalPayload(): HealthPreferencesPayload {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(LS_KEY) : null
    if (!raw) {
      return {
        supplements: DEFAULT_HEALTH_SUPPLEMENTS,
        supplementCompliance: {},
      }
    }
    const parsed = JSON.parse(raw) as HealthPreferencesPayload
    return {
      supplements: normalizeList(parsed.supplements),
      supplementCompliance: normalizeCompliance(parsed.supplementCompliance),
    }
  } catch {
    return {
      supplements: DEFAULT_HEALTH_SUPPLEMENTS,
      supplementCompliance: {},
    }
  }
}

function writeLocalPayload(payload: HealthPreferencesPayload) {
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(payload))
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
  const prefsRef = useRef<{
    supplements: HealthSupplement[]
    compliance: SupplementComplianceMap
  }>({
    supplements: DEFAULT_HEALTH_SUPPLEMENTS,
    compliance: {},
  })

  const [supplements, setSupplementsState] = useState<HealthSupplement[]>(DEFAULT_HEALTH_SUPPLEMENTS)
  const [complianceMap, setComplianceMapState] = useState<SupplementComplianceMap>({})
  const [loading, setLoading] = useState(remote)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)

  const pushRemoteInner = useCallback(async (nextS: HealthSupplement[], nextC: SupplementComplianceMap) => {
    if (!remote) return
    try {
      const headers = await buildAuthHeaders()
      const body: HealthPreferencesPayload = {
        supplements: nextS,
        supplementCompliance: trimComplianceMap(nextC),
      }
      const res = await fetch("/api/health/preferences", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
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
      const mergedS = normalizeList(payload.preferences.supplements)
      const mergedC = normalizeCompliance(payload.preferences.supplementCompliance)
      prefsRef.current = { supplements: mergedS, compliance: mergedC }
      setSupplementsState(mergedS)
      setComplianceMapState(mergedC)
      writeLocalPayload({ supplements: mergedS, supplementCompliance: mergedC })
    } catch {
      /* keep local */
    }
  }, [remote])

  const schedulePush = useCallback(() => {
    if (!remote) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const { supplements: s, compliance: c } = prefsRef.current
      void pushRemoteInner(s, c)
    }, 400)
  }, [remote, pushRemoteInner])

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
      const local = readLocalPayload()
      const mergedS = normalizeList(server.supplements ?? local.supplements)
      const mergedC = normalizeCompliance(server.supplementCompliance ?? local.supplementCompliance)
      prefsRef.current = { supplements: mergedS, compliance: mergedC }
      setSupplementsState(mergedS)
      setComplianceMapState(mergedC)
      writeLocalPayload({ supplements: mergedS, supplementCompliance: mergedC })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error")
      const loc = readLocalPayload()
      prefsRef.current = { supplements: loc.supplements ?? DEFAULT_HEALTH_SUPPLEMENTS, compliance: loc.supplementCompliance ?? {} }
      setSupplementsState(loc.supplements ?? DEFAULT_HEALTH_SUPPLEMENTS)
      setComplianceMapState(loc.supplementCompliance ?? {})
    } finally {
      setLoading(false)
    }
  }, [remote])

  useEffect(() => {
    if (mock || !remote) {
      const loc = readLocalPayload()
      prefsRef.current = {
        supplements: loc.supplements ?? DEFAULT_HEALTH_SUPPLEMENTS,
        compliance: loc.supplementCompliance ?? {},
      }
      setSupplementsState(prefsRef.current.supplements)
      setComplianceMapState(prefsRef.current.compliance)
      setLoading(false)
      return
    }
    void mergeRemote()
  }, [mock, remote, mergeRemote])

  useEffect(() => {
    prefsRef.current = { supplements, compliance: complianceMap }
  }, [supplements, complianceMap])

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  const persistBoth = useCallback(
    (nextS: HealthSupplement[], nextC: SupplementComplianceMap) => {
      prefsRef.current = { supplements: nextS, compliance: nextC }
      setSupplementsState(nextS)
      setComplianceMapState(nextC)
      writeLocalPayload({ supplements: nextS, supplementCompliance: nextC })
      if (remote) schedulePush()
    },
    [remote, schedulePush],
  )

  const toggleActive = useCallback(
    (id: string) => {
      const nextS = supplements.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
      persistBoth(nextS, complianceMap)
    },
    [supplements, complianceMap, persistBoth],
  )

  const updateSupplement = useCallback(
    (
      id: string,
      patch: Partial<Pick<HealthSupplement, "name" | "amount" | "daypart" | "indispensable" | "active">>,
    ) => {
      const nextS = supplements.map((s) => (s.id === id ? { ...s, ...patch } : s))
      persistBoth(nextS, complianceMap)
    },
    [supplements, complianceMap, persistBoth],
  )

  const toggleComplianceToday = useCallback(
    (id: string) => {
      const ymd = todayYmdLocal()
      const row = { ...(complianceMap[ymd] ?? {}) }
      row[id] = !row[id]
      const nextC = trimComplianceMap({ ...complianceMap, [ymd]: row })
      persistBoth(supplements, nextC)
    },
    [supplements, complianceMap, persistBoth],
  )

  const takenToday = useCallback(
    (id: string): boolean => {
      const ymd = todayYmdLocal()
      return complianceMap[ymd]?.[id] === true
    },
    [complianceMap],
  )

  const activeCount = useMemo(() => supplements.filter((s) => s.active).length, [supplements])

  return {
    supplements,
    complianceMap,
    activeCount,
    loading,
    error,
    editMode,
    setEditMode,
    toggleActive,
    updateSupplement,
    toggleComplianceToday,
    takenToday,
    refreshRemote: mergeRemote,
  }
}

