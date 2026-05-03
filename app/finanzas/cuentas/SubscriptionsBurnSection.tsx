"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Ban, ChevronDown, Pause, Pencil, Plus, Trash2 } from "lucide-react"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { UI_SUBSCRIPTIONS_LOCAL_STORAGE } from "@/lib/checkins/flags"
import { financeApiDelete, financeApiGet, financeApiJson } from "@/lib/finanzas/financeClientFetch"
import {
  ensureLocalSubscriptionsSeeded,
  readSubscriptionsFromLocalStorage,
  upsertLocalSubscription,
  deleteLocalSubscription,
} from "@/lib/finanzas/subscriptionsLocal"
import {
  BILLING_FREQUENCY_OPTIONS,
  chargeToMonthly,
  daysUntilRenewalFromDay,
  monthlyToChargeInput,
  nextRenewalIsoFromDay,
  type BillingFrequency,
} from "@/lib/finanzas/subscriptionBilling"
import type { SubscriptionStatus, UserSubscription } from "@/lib/finanzas/userSubscriptionsTypes"
import {
  SUBSCRIPTION_CATEGORIES,
  subscriptionActiveBurn,
  subscriptionPotentialSaving,
} from "@/lib/finanzas/userSubscriptionsTypes"
import { normalizeUserSubscription } from "@/lib/finanzas/userSubscriptionsNormalize"
import { financeCardMicroLabelClass, financeSectionEyebrowClass } from "../_components/financeChrome"
import { CuentasModalShell } from "./CuentasModalShell"
import { arcticPanel, formatMoney } from "./cuentasFormat"
import { cn } from "@/lib/utils"

export type SubscriptionsBurnSectionProps = {
  supabaseEnabled: boolean
  baselineMonthlyIncome: number
  onSubscriptionSimulatorMonthlyChange: (monthlyCOP: number) => void
  bridgeHost?: boolean
  accessDeepLinkEditor?: boolean
  openManageSignal?: number
  onSubscriptionsPersisted?: () => void
}

function newLocalId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function renewalShortLabel(day: number) {
  return `Día ${day}`
}

function impactLabel(amount: number, baselineIncome: number) {
  if (baselineIncome <= 0) return amount >= 200_000 ? "Alto" : amount >= 80_000 ? "Medio" : "Bajo"
  const pct = (amount / baselineIncome) * 100
  if (pct >= 8) return "Alto"
  if (pct >= 3) return "Medio"
  return "Bajo"
}

function impactTone(label: string) {
  if (label === "Alto") return "text-rose-600 bg-rose-50 border-rose-100"
  if (label === "Medio") return "text-amber-700 bg-amber-50 border-amber-100"
  return "text-orbita-secondary bg-orbita-surface-alt border-orbita-border"
}

function subscriptionInitials(name: string) {
  const parts = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (parts.length >= 2) {
    const a = parts[0]!.charAt(0)
    const b = parts[1]!.charAt(0)
    return `${a}${b}`.toUpperCase()
  }
  const w = parts[0] ?? "?"
  return w.slice(0, 2).toUpperCase()
}

function avatarGradientForLabel(label: string) {
  let h = 0
  for (let i = 0; i < label.length; i += 1) {
    h = (h + label.charCodeAt(i) * (i + 3)) % 360
  }
  const h2 = (h + 48) % 360
  return `linear-gradient(135deg, hsl(${h} 62% 42%), hsl(${h2} 58% 32%))`
}

type SubManageRow = {
  id: string
  name: string
  category: string
  billing_frequency: BillingFrequency
  chargeAtFrequency: number
  renewal_day: number
  include_in_simulator: boolean
  status: SubscriptionStatus
  _isNew?: boolean
}

function toManageRow(s: UserSubscription): SubManageRow {
  const n = normalizeUserSubscription(s)
  return {
    id: n.id,
    name: n.name,
    category: n.category,
    billing_frequency: n.billing_frequency,
    chargeAtFrequency: monthlyToChargeInput(n.amount_monthly, n.billing_frequency),
    renewal_day: n.renewal_day,
    include_in_simulator: n.include_in_simulator,
    status: n.status,
  }
}

function rowToUserSubscription(r: SubManageRow): Omit<UserSubscription, "created_at" | "updated_at"> {
  const amount_monthly = chargeToMonthly(r.chargeAtFrequency, r.billing_frequency)
  const renewal_date = nextRenewalIsoFromDay(r.renewal_day)
  return {
    id: r.id,
    name: r.name.trim(),
    category: r.category,
    amount_monthly,
    renewal_date,
    billing_frequency: r.billing_frequency,
    renewal_day: r.renewal_day,
    include_in_simulator: r.include_in_simulator,
    active: r.status === "active",
    status: r.status,
  }
}

export function SubscriptionsBurnSection({
  supabaseEnabled,
  baselineMonthlyIncome,
  onSubscriptionSimulatorMonthlyChange,
  bridgeHost = false,
  accessDeepLinkEditor = true,
  openManageSignal = 0,
  onSubscriptionsPersisted,
}: SubscriptionsBurnSectionProps) {
  const [rows, setRows] = useState<UserSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [subscriptionsExpanded, setSubscriptionsExpanded] = useState(false)

  const [manageOpen, setManageOpen] = useState(false)
  const [manageRows, setManageRows] = useState<SubManageRow[]>([])
  const [manageInitialIds, setManageInitialIds] = useState<Set<string>>(new Set())
  const [manageErr, setManageErr] = useState<string | null>(null)

  const searchParams = useSearchParams()
  const editorSubsConsumedRef = useRef(false)
  const lastOpenManageSignalRef = useRef(0)

  const reload = useCallback(async () => {
    setLoading(true)
    setSaveErr(null)
    try {
      if (supabaseEnabled) {
        const res = await financeApiGet("/api/orbita/finanzas/subscriptions")
        const json = (await res.json()) as {
          success?: boolean
          data?: { subscriptions?: UserSubscription[] }
          error?: string
        }
        if (!res.ok || !json.success) {
          throw new Error(messageForHttpError(res.status, json.error, res.statusText))
        }
        setRows((json.data?.subscriptions ?? []).map((s) => normalizeUserSubscription(s)))
      } else {
        setRows(ensureLocalSubscriptionsSeeded().map((s) => normalizeUserSubscription(s)))
      }
    } catch (e) {
      setRows(readSubscriptionsFromLocalStorage().map((s) => normalizeUserSubscription(s)))
      if (supabaseEnabled) {
        const msg =
          e instanceof Error && e.message
            ? e.message
            : "No se pudieron cargar suscripciones; revisa sesión o datos locales."
        setSaveErr(msg)
      }
    } finally {
      setLoading(false)
    }
  }, [supabaseEnabled])

  useEffect(() => {
    void reload()
  }, [reload])

  const monthlyBurn = useMemo(
    () => rows.filter(subscriptionActiveBurn).reduce((a, s) => a + s.amount_monthly, 0),
    [rows],
  )

  const potentialSaving = useMemo(() => rows.reduce((a, s) => a + subscriptionPotentialSaving(s), 0), [rows])

  const simulatorMonthly = useMemo(
    () =>
      rows
        .filter((s) => subscriptionActiveBurn(s) && s.include_in_simulator)
        .reduce((a, s) => a + s.amount_monthly, 0),
    [rows],
  )

  useEffect(() => {
    onSubscriptionSimulatorMonthlyChange(simulatorMonthly)
  }, [simulatorMonthly, onSubscriptionSimulatorMonthlyChange])

  const openManage = () => {
    setManageErr(null)
    setManageRows(rows.map(toManageRow))
    setManageInitialIds(new Set(rows.map((r) => r.id)))
    setManageOpen(true)
  }

  useEffect(() => {
    if (!accessDeepLinkEditor) return
    if (searchParams.get("editor") !== "suscripciones") {
      editorSubsConsumedRef.current = false
      return
    }
    if (loading || editorSubsConsumedRef.current) return
    editorSubsConsumedRef.current = true
    setManageErr(null)
    setManageRows(rows.map(toManageRow))
    setManageInitialIds(new Set(rows.map((r) => r.id)))
    setManageOpen(true)
  }, [accessDeepLinkEditor, loading, rows, searchParams])

  useEffect(() => {
    if (!openManageSignal || openManageSignal <= lastOpenManageSignalRef.current) return
    if (loading) return
    lastOpenManageSignalRef.current = openManageSignal
    setManageErr(null)
    setManageRows(rows.map(toManageRow))
    setManageInitialIds(new Set(rows.map((r) => r.id)))
    setManageOpen(true)
  }, [openManageSignal, loading, rows])

  const openManageWithNewRow = () => {
    setManageErr(null)
    setManageInitialIds(new Set(rows.map((r) => r.id)))
    setManageRows([
      ...rows.map(toManageRow),
      {
        id: newLocalId(),
        name: "",
        category: "Software",
        billing_frequency: "monthly",
        chargeAtFrequency: 50_000,
        renewal_day: 5,
        include_in_simulator: true,
        status: "active",
        _isNew: true,
      },
    ])
    setManageOpen(true)
  }

  const addManageRow = () => {
    setManageRows((r) => [
      ...r,
      {
        id: newLocalId(),
        name: "",
        category: "Software",
        billing_frequency: "monthly",
        chargeAtFrequency: 50_000,
        renewal_day: 5,
        include_in_simulator: true,
        status: "active",
        _isNew: true,
      },
    ])
  }

  const saveManage = async () => {
    setManageErr(null)
    for (const row of manageRows) {
      if (!row.name.trim()) {
        setManageErr("Cada fila necesita nombre.")
        return
      }
      if (!(SUBSCRIPTION_CATEGORIES as readonly string[]).includes(row.category)) {
        setManageErr("Categoría no válida en una fila.")
        return
      }
    }

    const currentIds = new Set(manageRows.map((r) => r.id))
    const toDelete = [...manageInitialIds].filter((id) => !currentIds.has(id))

    if (supabaseEnabled) {
      try {
        for (const id of toDelete) {
          const res = await financeApiDelete(`/api/orbita/finanzas/subscriptions?id=${encodeURIComponent(id)}`)
          const json = (await res.json()) as { success?: boolean; error?: string }
          if (!res.ok || !json.success) {
            throw new Error(messageForHttpError(res.status, json.error, res.statusText))
          }
        }
        for (const row of manageRows) {
          const payload = rowToUserSubscription(row)
          if (row._isNew) {
            const res = await financeApiJson("/api/orbita/finanzas/subscriptions", {
              method: "POST",
              body: {
                name: payload.name,
                category: payload.category,
                amount_monthly: payload.amount_monthly,
                renewal_date: payload.renewal_date,
                billing_frequency: payload.billing_frequency,
                renewal_day: payload.renewal_day,
                include_in_simulator: payload.include_in_simulator,
                status: payload.status,
              },
            })
            const json = (await res.json()) as { success?: boolean; error?: string }
            if (!res.ok || !json.success) throw new Error(messageForHttpError(res.status, json.error, res.statusText))
          } else {
            const res = await financeApiJson("/api/orbita/finanzas/subscriptions", {
              method: "PATCH",
              body: {
                id: row.id,
                name: payload.name,
                category: payload.category,
                amount_monthly: payload.amount_monthly,
                renewal_date: payload.renewal_date,
                billing_frequency: payload.billing_frequency,
                renewal_day: payload.renewal_day,
                include_in_simulator: payload.include_in_simulator,
                status: payload.status,
              },
            })
            const json = (await res.json()) as { success?: boolean; error?: string }
            if (!res.ok || !json.success) throw new Error(messageForHttpError(res.status, json.error, res.statusText))
          }
        }
        await reload()
        setManageOpen(false)
        onSubscriptionsPersisted?.()
      } catch (e) {
        setManageErr(e instanceof Error ? e.message : "No se pudieron guardar suscripciones")
      }
      return
    }

    let next = [...rows]
    for (const id of toDelete) {
      next = deleteLocalSubscription(id, next)
    }
    for (const row of manageRows) {
      const payload = rowToUserSubscription(row)
      const full: UserSubscription = {
        ...payload,
        created_at: rows.find((x) => x.id === row.id)?.created_at,
        updated_at: rows.find((x) => x.id === row.id)?.updated_at,
      }
      next = upsertLocalSubscription(normalizeUserSubscription(full), next)
    }
    setRows(next.map((s) => normalizeUserSubscription(s)))
    setManageOpen(false)
    onSubscriptionsPersisted?.()
  }

  const setStatus = async (s: UserSubscription, status: UserSubscription["status"]) => {
    const patchRow = (r: UserSubscription): UserSubscription => ({
      ...r,
      status,
      active: status === "active",
    })
    if (supabaseEnabled) {
      setRows((prev) => prev.map((r) => (r.id === s.id ? patchRow(r) : r)))
      setSaveErr(null)
      try {
        const res = await financeApiJson("/api/orbita/finanzas/subscriptions", {
          method: "PATCH",
          body: { id: s.id, status },
        })
        const json = (await res.json()) as { success?: boolean; error?: string }
        if (!res.ok || !json.success) throw new Error(json.error || "Error")
        await reload()
      } catch {
        setSaveErr("No se pudo actualizar el estado")
        await reload()
      }
      return
    }
    setRows(upsertLocalSubscription(patchRow(s), rows).map((x) => normalizeUserSubscription(x)))
  }

  const significantSaving = potentialSaving >= 120_000

  const activeSubscriptions = useMemo(
    () => rows.filter((s) => subscriptionActiveBurn(s)),
    [rows],
  )

  const topBurnSubscriptions = useMemo(() => {
    return [...activeSubscriptions].sort((a, b) => b.amount_monthly - a.amount_monthly).slice(0, 3)
  }, [activeSubscriptions])

  const moreActiveThanTop = Math.max(0, activeSubscriptions.length - topBurnSubscriptions.length)

  /** Una línea para vista colapsada: prioriza mayor gasto mensual. */
  const collapsedSummaryText = useMemo(() => {
    if (activeSubscriptions.length === 0) {
      const anyRow = rows.length > 0
      return anyRow
        ? "Sin activas este mes: revisá pausadas/canceladas o reactivá desde la tabla."
        : "Sin servicios registrados: agregá streaming, apps o membresías."
    }
    const sorted = [...activeSubscriptions].sort((a, b) => b.amount_monthly - a.amount_monthly)
    const top = sorted.slice(0, 3).map((s) => s.name.trim()).filter(Boolean)
    const rest = activeSubscriptions.length - top.length
    const head = top.join(" · ")
    return rest > 0 ? `${head} · +${rest} más` : head
  }, [activeSubscriptions, rows.length])

  const freqLabel = (f: BillingFrequency) => BILLING_FREQUENCY_OPTIONS.find((o) => o.value === f)?.label ?? f

  return (
    <>
    <section
      id="capital-suscripciones"
      className={cn("scroll-mt-24 space-y-4", bridgeHost && "hidden")}
      aria-hidden={bridgeHost}
    >
      <div className={arcticPanel}>
        <div className="flex w-full items-stretch">
          <button
            type="button"
            onClick={() => setSubscriptionsExpanded((v) => !v)}
            className="min-w-0 flex-1 touch-manipulation px-2 py-2 text-left sm:px-2.5 sm:py-2"
            aria-expanded={subscriptionsExpanded}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <h2 className={financeSectionEyebrowClass}>Suscripciones recurrentes</h2>
                {!subscriptionsExpanded ? (
                  <span className="text-[10px] leading-tight text-orbita-muted sm:text-[11px]">
                    Pausar o cancelar reduce lo fijo.
                  </span>
                ) : (
                  <span className="text-[10px] leading-tight text-orbita-muted sm:text-[11px]">Toca para colapsar.</span>
                )}
              </div>

              {!subscriptionsExpanded ? (
                <div className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0">
                      <p className="text-lg font-bold tabular-nums leading-none text-orbita-primary sm:text-xl">
                        ${formatMoney(monthlyBurn)}
                      </p>
                      <span className={cn(financeCardMicroLabelClass, "text-orbita-muted")}>/ mes</span>
                      <span className="text-[11px] tabular-nums text-orbita-secondary">
                        {activeSubscriptions.length === 0
                          ? "Sin activas"
                          : `${activeSubscriptions.length} activa${activeSubscriptions.length === 1 ? "" : "s"}`}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-[11px] leading-snug text-orbita-secondary [text-wrap:pretty]">
                      <span className={cn(financeCardMicroLabelClass, "text-orbita-muted")}>Resumen · </span>
                      {collapsedSummaryText}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:flex-nowrap sm:justify-end">
                    {topBurnSubscriptions.length > 0 ? (
                      <div className="flex items-center" aria-hidden>
                        <div className="flex shrink-0 -space-x-1.5 pl-0.5">
                          {topBurnSubscriptions.map((s) => (
                            <div
                              key={s.id}
                              className="flex h-7 w-7 items-center justify-center rounded-full border-2 border-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] text-[9px] font-bold text-white shadow-sm ring-1 ring-orbita-border/35 sm:h-8 sm:w-8 sm:text-[10px]"
                              style={{ background: avatarGradientForLabel(s.name) }}
                              title={s.name}
                            >
                              {subscriptionInitials(s.name)}
                            </div>
                          ))}
                        </div>
                        {moreActiveThanTop > 0 ? (
                          <span
                            className="-ml-0.5 flex h-7 min-w-[1.75rem] items-center justify-center rounded-full border-2 border-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] bg-orbita-surface-alt px-1 text-[9px] font-bold tabular-nums text-orbita-primary shadow-sm ring-1 ring-orbita-border/35 sm:h-8 sm:min-w-[2rem] sm:text-[10px]"
                            title={`${moreActiveThanTop} más`}
                          >
                            +{moreActiveThanTop}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="rounded-full border border-dashed border-orbita-border/70 bg-orbita-surface-alt/80 px-2 py-0.5 text-[10px] text-orbita-secondary">
                        Sin recurrentes
                      </span>
                    )}

                    {potentialSaving > 0 ? (
                      <p className="text-[10px] font-semibold text-emerald-700 sm:text-[11px]">
                        +${formatMoney(potentialSaving)}{" "}
                        <span className="font-normal text-emerald-700/85">ahorro</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </button>
          <div className="flex shrink-0 flex-col items-end justify-between gap-0.5 border-l border-orbita-border/30 py-1.5 pl-1.5 pr-1.5 sm:py-2 sm:pl-2 sm:pr-2">
            <button
              type="button"
              onClick={() => {
                setSubscriptionsExpanded(true)
                openManage()
              }}
              className="text-[10px] font-semibold text-orbita-secondary underline decoration-orbita-border/80 underline-offset-2 hover:text-orbita-primary sm:text-[11px]"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setSubscriptionsExpanded((v) => !v)}
              className="rounded-md p-0.5 text-orbita-secondary hover:bg-orbita-surface-alt"
              aria-label={subscriptionsExpanded ? "Colapsar" : "Expandir"}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-200 sm:h-[18px] sm:w-[18px] ${subscriptionsExpanded ? "rotate-180" : ""}`}
                aria-hidden
              />
            </button>
          </div>
        </div>

        {subscriptionsExpanded ? (
          <div className="space-y-3 border-t border-orbita-border p-3 sm:p-3.5">
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
              <p className="max-w-xl text-xs text-orbita-secondary sm:text-sm">
                Tabla permanente (todos los meses). Usa <span className="font-medium">Editar</span> para filas y
                columnas completas.
              </p>
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
                  Total mensual
                </p>
                <p className="text-2xl font-semibold tabular-nums text-orbita-primary sm:text-3xl">
                  ${formatMoney(monthlyBurn)}
                </p>
              </div>
            </div>

            {!supabaseEnabled ? (
              <div className="rounded-2xl border-[0.5px] border-amber-200/90 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
                <span className="font-medium">Almacenamiento en este navegador.</span> {UI_SUBSCRIPTIONS_LOCAL_STORAGE}
              </div>
            ) : null}

            <div className="overflow-x-auto rounded-2xl border-[0.5px] border-orbita-border/80 bg-orbita-surface shadow-sm">
              {loading ? (
                <p className="p-6 text-center text-sm text-orbita-secondary">Cargando suscripciones…</p>
              ) : (
                <table className="w-full min-w-[1100px] border-collapse text-left text-[11px] sm:text-xs">
                  <thead>
                    <tr className="border-b border-orbita-border bg-orbita-surface-alt text-[9px] font-semibold uppercase tracking-wide text-orbita-secondary sm:text-[10px]">
                      <th className="px-2 py-2 font-medium">Nombre</th>
                      <th className="px-2 py-2 font-medium">Categoría</th>
                      <th className="px-2 py-2 font-medium">Frecuencia</th>
                      <th className="px-2 py-2 text-right font-medium">Costo (COP)</th>
                      <th className="px-2 py-2 font-medium">Día renov.</th>
                      <th className="px-2 py-2 text-right font-medium">Días</th>
                      <th className="px-2 py-2 font-medium">Renovación</th>
                      <th className="px-2 py-2 font-medium">Impacto</th>
                      <th className="px-2 py-2 font-medium">Simulador</th>
                      <th className="px-2 py-2 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => {
                      const active = subscriptionActiveBurn(s)
                      const imp = impactLabel(s.amount_monthly, baselineMonthlyIncome)
                      const charge = monthlyToChargeInput(s.amount_monthly, s.billing_frequency)
                      const daysLeft = daysUntilRenewalFromDay(s.renewal_day)
                      const nextIso = nextRenewalIsoFromDay(s.renewal_day)
                      return (
                        <tr
                          key={s.id}
                          className={`border-b border-orbita-border/70 ${!active ? "bg-orbita-surface-alt/40" : ""}`}
                        >
                          <td className="px-2 py-2 align-middle">
                            <p className="font-semibold text-orbita-primary">{s.name}</p>
                            {!active ? (
                              <p className="mt-0.5 text-[10px] text-orbita-secondary">
                                {s.status === "paused" ? "Pausada" : "Cancelada"}
                              </p>
                            ) : null}
                          </td>
                          <td className="max-w-[100px] px-2 py-2 align-middle text-orbita-secondary">{s.category}</td>
                          <td className="whitespace-nowrap px-2 py-2 align-middle">{freqLabel(s.billing_frequency)}</td>
                          <td className="whitespace-nowrap px-2 py-2 text-right align-middle font-semibold tabular-nums">
                            ${formatMoney(charge)}
                          </td>
                          <td className="whitespace-nowrap px-2 py-2 align-middle tabular-nums">{s.renewal_day}</td>
                          <td className="whitespace-nowrap px-2 py-2 text-right align-middle tabular-nums">{daysLeft}</td>
                          <td className="whitespace-nowrap px-2 py-2 align-middle text-orbita-secondary">
                            {renewalShortLabel(s.renewal_day)} · {nextIso.slice(5).replace("-", "/")}
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <span
                              className={`inline-flex rounded-full border-[0.5px] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${impactTone(imp)}`}
                            >
                              {imp}
                            </span>
                          </td>
                          <td className="px-2 py-2 align-middle text-orbita-secondary">
                            {s.include_in_simulator ? "Sí" : "No"}
                          </td>
                          <td className="px-2 py-2 align-middle">
                            <div className="flex flex-wrap justify-end gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setSubscriptionsExpanded(true)
                                  openManage()
                                }}
                                className="inline-flex min-h-8 items-center rounded-lg border border-orbita-border bg-orbita-surface px-2 py-1 text-[10px] font-medium text-orbita-primary hover:bg-orbita-surface-alt"
                              >
                                <Pencil className="mr-1 h-3 w-3" aria-hidden />
                                Tabla
                              </button>
                              {active ? (
                                <button
                                  type="button"
                                  onClick={() => void setStatus(s, "paused")}
                                  className="inline-flex min-h-8 items-center rounded-lg border border-orbita-border px-2 py-1 text-[10px] font-medium hover:bg-orbita-surface-alt"
                                >
                                  <Pause className="mr-1 h-3 w-3" aria-hidden />
                                  Pausar
                                </button>
                              ) : s.status === "paused" ? (
                                <button
                                  type="button"
                                  onClick={() => void setStatus(s, "active")}
                                  className="inline-flex min-h-8 items-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-800"
                                >
                                  Reactivar
                                </button>
                              ) : null}
                              {active || s.status === "paused" ? (
                                <button
                                  type="button"
                                  onClick={() => void setStatus(s, "cancelled")}
                                  className="inline-flex min-h-8 items-center rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[10px] font-medium text-rose-800"
                                >
                                  <Ban className="mr-1 h-3 w-3" aria-hidden />
                                  Cancelar
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              <div className="border-t border-orbita-border p-3 sm:p-4">
                <button
                  type="button"
                  onClick={() => {
                    setSubscriptionsExpanded(true)
                    openManageWithNewRow()
                  }}
                  className="flex min-h-[40px] w-full touch-manipulation items-center justify-center gap-1.5 rounded-xl border border-orbita-border/90 bg-orbita-surface py-2.5 text-xs font-medium text-orbita-primary hover:bg-orbita-surface-alt"
                >
                  <Plus className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                  Agregar suscripción
                </button>
              </div>
            </div>

            <div
              className={`flex flex-col gap-3 rounded-2xl border-[0.5px] p-5 sm:flex-row sm:items-center sm:justify-between ${
                significantSaving
                  ? "border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 to-white"
                  : "border-orbita-border/80 bg-orbita-surface-alt/50"
              }`}
              aria-live="polite"
              aria-atomic="true"
            >
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-orbita-secondary">
                  Ahorro potencial mensual
                </p>
                <p
                  className={`mt-1 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${
                    significantSaving ? "text-emerald-700" : "text-orbita-primary"
                  }`}
                >
                  +${formatMoney(potentialSaving)}
                </p>
                <p className="mt-1 text-xs text-orbita-secondary sm:text-sm">
                  Suma mensual de lo que ya no pagas en suscripciones pausadas o canceladas (se actualiza al instante).
                </p>
              </div>
              {significantSaving ? (
                <span className="inline-flex w-full shrink-0 items-center justify-center rounded-full border border-emerald-300 bg-emerald-100 px-4 py-2.5 text-center text-xs font-semibold text-emerald-900 shadow-sm sm:w-auto sm:py-1.5">
                  ≥ $120.000 COP — oportunidad de liberar flujo
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {saveErr ? <p className="text-sm text-rose-600">{saveErr}</p> : null}
    </section>

      <CuentasModalShell
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Suscripciones"
        subtitle="Costo por frecuencia, día de renovación (1–28) y categoría. Guardá para aplicar."
        wide
        compact
      >
        <div className="max-h-[min(70vh,480px)] overflow-y-auto overflow-x-hidden md:max-h-[min(78vh,540px)]">
          {/* Móvil: tarjetas apiladas, sin scroll horizontal */}
          <div className="space-y-2 md:hidden">
            {manageRows.map((row) => {
              const monthlyEq = chargeToMonthly(row.chargeAtFrequency, row.billing_frequency)
              const imp = impactLabel(monthlyEq, baselineMonthlyIncome)
              const daysLeft = daysUntilRenewalFromDay(row.renewal_day)
              const nextIso = nextRenewalIsoFromDay(row.renewal_day)
              const nextShort = nextIso.slice(5).replace("-", "/")
              return (
                <div
                  key={row.id}
                  className="rounded-lg border border-orbita-border/70 bg-orbita-surface p-2.5 shadow-sm"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <input
                      className="h-8 min-h-8 min-w-0 flex-1 rounded-md border border-orbita-border/80 bg-orbita-surface px-2 text-[12px] text-orbita-primary placeholder:text-orbita-muted"
                      placeholder="Nombre"
                      value={row.name}
                      onChange={(e) =>
                        setManageRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))
                      }
                    />
                    <button
                      type="button"
                      className="shrink-0 rounded-md p-1.5 text-orbita-muted hover:bg-orbita-surface-alt hover:text-rose-600"
                      aria-label="Quitar suscripción"
                      onClick={() => setManageRows((rs) => rs.filter((r) => r.id !== row.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                    </button>
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-2">
                    <div className="min-w-0">
                      <span className={cn(financeCardMicroLabelClass, "text-orbita-muted")}>Categoría</span>
                      <select
                        className="mt-0.5 h-8 w-full rounded-md border border-orbita-border/80 bg-orbita-surface px-1 text-[11px] text-orbita-primary"
                        value={row.category}
                        onChange={(e) =>
                          setManageRows((rs) =>
                            rs.map((r) => (r.id === row.id ? { ...r, category: e.target.value } : r)),
                          )
                        }
                      >
                        {SUBSCRIPTION_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0">
                      <span className={cn(financeCardMicroLabelClass, "text-orbita-muted")}>Frecuencia</span>
                      <select
                        className="mt-0.5 h-8 w-full rounded-md border border-orbita-border/80 bg-orbita-surface px-1 text-[11px] text-orbita-primary"
                        value={row.billing_frequency}
                        onChange={(e) =>
                          setManageRows((rs) =>
                            rs.map((r) =>
                              r.id === row.id
                                ? { ...r, billing_frequency: e.target.value as BillingFrequency }
                                : r,
                            ),
                          )
                        }
                      >
                        {BILLING_FREQUENCY_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0">
                      <span className={cn(financeCardMicroLabelClass, "text-orbita-muted")}>Costo</span>
                      <input
                        type="number"
                        inputMode="numeric"
                        className="mt-0.5 h-8 w-full rounded-md border border-orbita-border/80 bg-orbita-surface px-2 text-[11px] tabular-nums text-orbita-primary"
                        value={row.chargeAtFrequency || ""}
                        onChange={(e) =>
                          setManageRows((rs) =>
                            rs.map((r) =>
                              r.id === row.id
                                ? { ...r, chargeAtFrequency: Math.max(0, Number(e.target.value)) }
                                : r,
                            ),
                          )
                        }
                      />
                    </div>
                    <div className="min-w-0">
                      <span className={cn(financeCardMicroLabelClass, "text-orbita-muted")}>Día ren.</span>
                      <select
                        className="mt-0.5 h-8 w-full rounded-md border border-orbita-border/80 bg-orbita-surface px-1 text-[11px] text-orbita-primary"
                        value={row.renewal_day}
                        onChange={(e) =>
                          setManageRows((rs) =>
                            rs.map((r) =>
                              r.id === row.id ? { ...r, renewal_day: Number(e.target.value) } : r,
                            ),
                          )
                        }
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-orbita-border/40 pt-2 text-[10px] tabular-nums text-orbita-secondary">
                    <span>
                      <span className="text-orbita-muted">Días: </span>
                      {daysLeft}
                    </span>
                    <span className="text-orbita-border">·</span>
                    <span>
                      <span className="text-orbita-muted">Próx.: </span>
                      {nextShort}
                    </span>
                    <span
                      className={cn(
                        "ml-auto inline-flex rounded-full border-[0.5px] px-1.5 py-0.5 text-[8px] font-semibold uppercase",
                        impactTone(imp),
                      )}
                    >
                      {imp}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-orbita-secondary">
                      <input
                        type="checkbox"
                        checked={row.include_in_simulator}
                        onChange={(e) =>
                          setManageRows((rs) =>
                            rs.map((r) =>
                              r.id === row.id ? { ...r, include_in_simulator: e.target.checked } : r,
                            ),
                          )
                        }
                        className="h-3.5 w-3.5 shrink-0 rounded border-orbita-border"
                      />
                      Incl. en simulador
                    </label>
                    <select
                      className="h-8 w-full rounded-md border border-orbita-border/80 bg-orbita-surface px-2 text-[11px] text-orbita-primary"
                      value={row.status}
                      onChange={(e) =>
                        setManageRows((rs) =>
                          rs.map((r) =>
                            r.id === row.id ? { ...r, status: e.target.value as SubscriptionStatus } : r,
                          ),
                        )
                      }
                    >
                      <option value="active">Activa</option>
                      <option value="paused">Pausada</option>
                      <option value="cancelled">Cancelada</option>
                    </select>
                  </div>
                </div>
              )
            })}
          </div>

          {/* md+: tabla densa; scroll vertical solo */}
          <div className="hidden md:block md:overflow-x-hidden">
            <table className="w-full table-fixed border-collapse text-left text-[10px] sm:text-[11px]">
              <thead className="sticky top-0 z-[1] border-b border-orbita-border/70 bg-[color-mix(in_srgb,var(--color-surface-alt)_92%,var(--color-surface))]">
                <tr className="text-[8px] font-medium uppercase tracking-[0.06em] text-orbita-muted sm:text-[9px]">
                  <th className="w-[14%] px-1 py-1.5 font-medium">Nombre</th>
                  <th className="w-[11%] px-1 py-1.5 font-medium">Cat.</th>
                  <th className="w-[11%] px-1 py-1.5 font-medium">Frec.</th>
                  <th className="w-[10%] px-1 py-1.5 font-medium">Costo</th>
                  <th className="w-[6%] px-1 py-1.5 font-medium">Día</th>
                  <th className="w-[5%] px-1 py-1.5 text-right font-medium">D.</th>
                  <th className="w-[9%] px-1 py-1.5 font-medium">Próx.</th>
                  <th className="w-[9%] px-1 py-1.5 font-medium">Imp.</th>
                  <th className="w-[5%] px-1 py-1.5 text-center font-medium">Sim</th>
                  <th className="w-[12%] px-1 py-1.5 font-medium">Estado</th>
                  <th className="w-7 px-0 py-1.5 sm:w-8" aria-hidden />
                </tr>
              </thead>
              <tbody>
                {manageRows.map((row) => {
                  const monthlyEq = chargeToMonthly(row.chargeAtFrequency, row.billing_frequency)
                  const imp = impactLabel(monthlyEq, baselineMonthlyIncome)
                  const daysLeft = daysUntilRenewalFromDay(row.renewal_day)
                  const nextIso = nextRenewalIsoFromDay(row.renewal_day)
                  return (
                    <tr key={row.id} className="border-b border-orbita-border/40 align-top last:border-0">
                      <td className="px-1 py-1">
                        <input
                          className="h-8 w-full min-w-0 truncate rounded-md border border-orbita-border/80 bg-orbita-surface px-1.5 text-[10px] text-orbita-primary sm:text-[11px]"
                          value={row.name}
                          title={row.name}
                          onChange={(e) =>
                            setManageRows((rs) =>
                              rs.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)),
                            )
                          }
                        />
                      </td>
                      <td className="px-1 py-1">
                        <select
                          className="h-8 w-full min-w-0 rounded-md border border-orbita-border/80 bg-orbita-surface px-0.5 text-[10px] text-orbita-primary sm:text-[11px]"
                          value={row.category}
                          onChange={(e) =>
                            setManageRows((rs) =>
                              rs.map((r) => (r.id === row.id ? { ...r, category: e.target.value } : r)),
                            )
                          }
                        >
                          {SUBSCRIPTION_CATEGORIES.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <select
                          className="h-8 w-full min-w-0 rounded-md border border-orbita-border/80 bg-orbita-surface px-0.5 text-[10px] text-orbita-primary sm:text-[11px]"
                          value={row.billing_frequency}
                          onChange={(e) =>
                            setManageRows((rs) =>
                              rs.map((r) =>
                                r.id === row.id
                                  ? { ...r, billing_frequency: e.target.value as BillingFrequency }
                                  : r,
                              ),
                            )
                          }
                        >
                          {BILLING_FREQUENCY_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1">
                        <input
                          type="number"
                          inputMode="numeric"
                          className="h-8 w-full min-w-0 rounded-md border border-orbita-border/80 bg-orbita-surface px-1 text-[10px] tabular-nums text-orbita-primary sm:text-[11px]"
                          value={row.chargeAtFrequency || ""}
                          onChange={(e) =>
                            setManageRows((rs) =>
                              rs.map((r) =>
                                r.id === row.id
                                  ? { ...r, chargeAtFrequency: Math.max(0, Number(e.target.value)) }
                                  : r,
                              ),
                            )
                          }
                        />
                      </td>
                      <td className="px-1 py-1">
                        <select
                          className="h-8 w-full min-w-0 rounded-md border border-orbita-border/80 bg-orbita-surface px-0.5 text-[10px] text-orbita-primary sm:text-[11px]"
                          value={row.renewal_day}
                          onChange={(e) =>
                            setManageRows((rs) =>
                              rs.map((r) =>
                                r.id === row.id ? { ...r, renewal_day: Number(e.target.value) } : r,
                              ),
                            )
                          }
                        >
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-1 py-1 text-right tabular-nums text-[10px] text-orbita-secondary sm:text-[11px]">
                        {daysLeft}
                      </td>
                      <td
                        className="max-w-0 overflow-hidden truncate px-1 py-1 text-[10px] text-orbita-secondary sm:text-[11px]"
                        title={nextIso}
                      >
                        {nextIso.slice(5).replace("-", "/")}
                      </td>
                      <td className="px-1 py-1">
                        <span
                          className={`inline-flex max-w-full truncate rounded-full border-[0.5px] px-1 py-0.5 text-[7px] font-semibold uppercase sm:text-[8px] ${impactTone(imp)}`}
                        >
                          {imp}
                        </span>
                      </td>
                      <td className="px-1 py-1 text-center">
                        <input
                          type="checkbox"
                          checked={row.include_in_simulator}
                          onChange={(e) =>
                            setManageRows((rs) =>
                              rs.map((r) =>
                                r.id === row.id ? { ...r, include_in_simulator: e.target.checked } : r,
                              ),
                            )
                          }
                          className="h-3.5 w-3.5 rounded border-orbita-border"
                        />
                      </td>
                      <td className="px-1 py-1">
                        <select
                          className="h-8 w-full min-w-0 rounded-md border border-orbita-border/80 bg-orbita-surface px-0.5 text-[10px] text-orbita-primary sm:text-[11px]"
                          value={row.status}
                          onChange={(e) =>
                            setManageRows((rs) =>
                              rs.map((r) =>
                                r.id === row.id ? { ...r, status: e.target.value as SubscriptionStatus } : r,
                              ),
                            )
                          }
                        >
                          <option value="active">Activa</option>
                          <option value="paused">Pausada</option>
                          <option value="cancelled">Cancelada</option>
                        </select>
                      </td>
                      <td className="px-0 py-1 text-center">
                        <button
                          type="button"
                          className="inline-flex rounded-md p-1 text-orbita-muted hover:bg-orbita-surface-alt hover:text-rose-600"
                          aria-label="Quitar fila"
                          onClick={() => setManageRows((rs) => rs.filter((r) => r.id !== row.id))}
                        >
                          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        {manageErr ? <p className="mt-2 text-[11px] leading-snug text-rose-600 sm:text-xs">{manageErr}</p> : null}
        <p className="mt-1.5 text-[10px] leading-snug text-orbita-muted sm:text-[11px]">
          Equiv. mensual activas: $
          {formatMoney(
            manageRows
              .filter((r) => r.status === "active")
              .reduce((a, r) => a + chargeToMonthly(r.chargeAtFrequency, r.billing_frequency), 0),
          )}
        </p>
        <div className="mt-3 flex flex-col gap-2 border-t border-orbita-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={addManageRow}
            className="h-9 touch-manipulation rounded-md border border-orbita-border/80 bg-orbita-surface px-3 text-xs font-medium text-orbita-primary hover:bg-orbita-surface-alt"
          >
            + Fila
          </button>
          <button
            type="button"
            onClick={() => void saveManage()}
            className="h-9 touch-manipulation rounded-md bg-[var(--color-text-primary)] px-4 text-xs font-semibold text-[var(--color-surface)] active:opacity-90"
          >
            Guardar
          </button>
        </div>
      </CuentasModalShell>
    </>
  )
}
