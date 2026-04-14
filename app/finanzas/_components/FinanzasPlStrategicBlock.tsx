"use client"

import { useEffect, useMemo, useState } from "react"
import plSpecJson from "../../../docs/finanzas/pl-strategic-center.json"
import { useFinanceOrThrow } from "@/app/finanzas/FinanceContext"
import { PLStrategicCenter } from "@/src/components/finanzas/PLStrategicCenter"
import type { PlStrategicCenterSpec } from "@/src/types/finanzas/pl-strategic-center"
import { isSupabaseEnabled } from "@/lib/checkins/flags"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import {
  mergePlRuntimeWithOverviewFlow,
  type PlOverviewMonthlyRow,
  buildPlStrategicCenterRuntimeFromCoherence,
} from "@/lib/finanzas/plStrategicCenterFromCoherence"

const plSpec = plSpecJson as unknown as PlStrategicCenterSpec

function monthLabelEs(ym: string) {
  const [ys, ms] = ym.split("-")
  const y = Number(ys)
  const m = Number(ms)
  if (!ys || !ms || !Number.isFinite(y) || !Number.isFinite(m)) return ym
  return new Date(y, m - 1, 15).toLocaleDateString("es-CO", { month: "long", year: "numeric" })
}

export function FinanzasPlStrategicBlock() {
  const { month, financeMeta, financeMetaLoading, capitalDataEpoch } = useFinanceOrThrow()
  const [overviewRolling, setOverviewRolling] = useState<readonly PlOverviewMonthlyRow[] | null>(null)

  useEffect(() => {
    if (!isSupabaseEnabled() || !month) return
    let cancelled = false
    void (async () => {
      try {
        const res = await financeApiGet(`/api/orbita/finanzas/overview?month=${encodeURIComponent(month)}`)
        const json = (await res.json()) as {
          success?: boolean
          error?: string
          data?: { flowEvolution?: { rollingYear?: PlOverviewMonthlyRow[] } } | null
        }
        if (cancelled) return
        if (!res.ok || !json.success) {
          setOverviewRolling(null)
          return
        }
        const rows = json.data?.flowEvolution?.rollingYear
        setOverviewRolling(Array.isArray(rows) && rows.length >= 2 ? rows : null)
      } catch {
        if (!cancelled) setOverviewRolling(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [month, capitalDataEpoch])

  const runtimeData = useMemo(() => {
    const c = financeMeta?.coherence
    if (!c) return null
    const base = buildPlStrategicCenterRuntimeFromCoherence(month, monthLabelEs(month), c)
    const flow = isSupabaseEnabled() ? overviewRolling : null
    return mergePlRuntimeWithOverviewFlow(base, flow ?? undefined)
  }, [financeMeta?.coherence, month, overviewRolling])

  if (financeMetaLoading) {
    return (
      <div className="space-y-4 animate-pulse py-2">
        <div className="h-36 rounded-2xl bg-orbita-surface-alt/80 sm:h-44" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-28 rounded-xl bg-orbita-surface-alt/70" />
          <div className="h-28 rounded-xl bg-orbita-surface-alt/70" />
          <div className="h-28 rounded-xl bg-orbita-surface-alt/70" />
          <div className="h-28 rounded-xl bg-orbita-surface-alt/70" />
        </div>
        <div className="h-56 rounded-2xl bg-orbita-surface-alt/55" />
      </div>
    )
  }

  if (!runtimeData) {
    return (
      <p className="rounded-2xl border border-dashed border-orbita-border bg-orbita-surface-alt/20 px-4 py-5 text-sm leading-relaxed text-orbita-secondary">
        Sin P&amp;L estratégico para este periodo (sin coherencia del mes). Revisa movimientos o el resumen
        guardado.
      </p>
    )
  }

  return <PLStrategicCenter spec={plSpec} data={runtimeData} />
}
