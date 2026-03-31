"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { AlertTriangle, ChevronDown, TrendingUp } from "lucide-react"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import type { CuentasKpis } from "@/lib/finanzas/cuentasDashboard"
import { dayFromIso, isoDateInMonth } from "@/lib/finanzas/commitmentAnchorDate"
import type { FlowCommitment } from "@/lib/finanzas/flowCommitmentsTypes"
import {
  readFlowCommitmentsFromLocalStorage,
  writeFlowCommitmentsToLocalStorage,
} from "@/lib/finanzas/flowCommitmentsLocal"
import { CuentasModalShell } from "./CuentasModalShell"
import { arcticPanel, formatMoney } from "./cuentasFormat"

type FlowRow = { month: string; ingresos: number; gasto_operativo: number; flujo: number }

const COMMITMENT_DAY_OPTIONS = Array.from({ length: 31 }, (_, i) => i + 1)

function isIncomeCommitment(c: FlowCommitment) {
  return c.flowType === "income"
}

function obligationCategoryLabel(name: string): string {
  const n = name.toLowerCase()
  if (n.includes("arriendo") || n.includes("vivienda") || n.includes("rent") || n.includes("alquiler")) return "Rent Payment"
  if (n.includes("seguro") && (n.includes("salud") || n.includes("health"))) return "Health Insurance"
  if (n.includes("seguro")) return "Insurance"
  if (n.includes("internet") || n.includes("utilities") || n.includes("servicio")) return "Utilities"
  return "Fixed expense"
}

function newId() {
  return typeof crypto !== "undefined" && crypto.randomUUID 
    ? crypto.randomUUID() 
    : `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function CashFlowSimulatorSection({
  month,
  kpis,
  supabaseEnabled,
  subscriptionFixedMonthly,
  onApplyPaymentPlan,
}: {
  month: string
  kpis: CuentasKpis | null
  supabaseEnabled: boolean
  subscriptionFixedMonthly: number
  onApplyPaymentPlan: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [incomeBase, setIncomeBase] = useState(0)
  const [rolling, setRolling] = useState<FlowRow[]>([])
  const [commitments, setCommitments] = useState<FlowCommitment[]>([])
  const [commitmentsHydrated, setCommitmentsHydrated] = useState(false)
  const [commitOpen, setCommitOpen] = useState(false)
  const [commitSaveErr, setCommitSaveErr] = useState<string | null>(null)
  const [commitModalRows, setCommitModalRows] = useState<Record<string, unknown>[]>([])
  const [commitModalInitialIds, setCommitModalInitialIds] = useState<Set<string>>(new Set())
  const [simulatorExpanded, setSimulatorExpanded] = useState(false)

  const [ingresosAdjustPct, setIngresosAdjustPct] = useState(0)
  const [gastosFijos, setGastosFijos] = useState(0)
  const [gastosVariables, setGastosVariables] = useState(0)
  const [ahorroObjetivo, setAhorroObjetivo] = useState(0)

  const safeKpis = kpis || { deudaCuotaMensual: 0, totalLiquidez: 0 }

  const load = useCallback(async () => {
    if (!month) return
    setLoading(true)
    setErr(null)

    try {
      const res = await financeApiGet(`/api/orbita/finanzas/overview?month=${encodeURIComponent(month)}`)
      const json = await res.json()

      if (!res.ok || !json.success || !json.data) {
        throw new Error(messageForHttpError(res.status, json.error))
      }

      const d = json.data
      const inc = Number(d.income) || 0
      setIncomeBase(inc)
      setRolling(d.flowEvolution?.rollingYear ?? [])

      // ... (el resto de la lógica de seeded commitments se mantiene similar)

      const defaultFijos = Math.round(safeKpis.deudaCuotaMensual * 0.42)
      const defaultVar = Math.round(inc * 0.32)
      setGastosFijos((f) => (f === 0 ? defaultFijos : f))
      setGastosVariables((v) => (v === 0 ? defaultVar : v))
      setAhorroObjetivo((a) => (a === 0 ? Math.max(0, Math.round(inc * 0.08)) : a))

    } catch (e) {
      setErr(e instanceof Error ? e.message : "Sin datos de overview")
      setIncomeBase(5_000_000)
      setGastosFijos(Math.round(safeKpis.deudaCuotaMensual * 0.42))
      setGastosVariables(1_200_000)
    } finally {
      setLoading(false)
    }
  }, [month, safeKpis.deudaCuotaMensual])

  useEffect(() => {
    void load()
  }, [load])

  // ... (el resto del componente se mantiene igual, solo con safeKpis para evitar null)

  const ingresosEstimados = useMemo(() => {
    // tu lógica actual...
    return Math.max(0, Math.round(incomeBase * (1 + ingresosAdjustPct / 100)))
  }, [incomeBase, ingresosAdjustPct])

  const totalGastosMes = useMemo(() => {
    return Math.max(0, gastosFijos + subscriptionFixedMonthly + gastosVariables + ahorroObjetivo)
  }, [gastosFijos, subscriptionFixedMonthly, gastosVariables, ahorroObjetivo])

  const disponible = useMemo(() => ingresosEstimados - totalGastosMes, [ingresosEstimados, totalGastosMes])

  return (
    <section className="space-y-5">
      {/* ... tu UI actual ... */}
      {loading && <p className="text-sm text-orbita-secondary">Cargando simulador…</p>}
      {err && <p className="text-sm text-amber-800">Vista limitada: {err}</p>}

      {/* Resto del componente sin cambios mayores */}
    </section>
  )
}