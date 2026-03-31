"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Ban, ChevronDown, Pause, Pencil, Plus } from "lucide-react"
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
import { CuentasModalShell } from "./CuentasModalShell"
import { arcticPanel, formatMoney } from "./cuentasFormat"

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
}: {
  supabaseEnabled: boolean
  baselineMonthlyIncome: number
  onSubscriptionSimulatorMonthlyChange: (monthlyCOP: number) => void
}) {
  const [rows, setRows] = useState<UserSubscription[]>([])
  const [loading, setLoading] = useState(true)
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [subscriptionsExpanded, setSubscriptionsExpanded] = useState(false)

  const [manageOpen, setManageOpen] = useState(false)
  const [manageRows, setManageRows] = useState<SubManageRow[]>([])
  const [manageInitialIds, setManageInitialIds] = useState<Set<string>>(new Set())
  const [manageErr, setManageErr] = useState<string | null>(null)

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

  const freqLabel = (f: BillingFrequency) => BILLING_FREQUENCY_OPTIONS.find((o) => o.value === f)?.label ?? f

  return (
    <section id="capital-suscripciones" className="scroll-mt-24 space-y-4">
      <div className={arcticPanel}>
        <div className="flex w-full items-start">
          <button
            type="button"
            onClick={() => setSubscriptionsExpanded((v) => !v)}
            className="min-w-0 flex-1 touch-manipulation px-3 py-2.5 text-left sm:px-3.5 sm:py-3"
            aria-expanded={subscriptionsExpanded}
          >
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-orbita-secondary sm:text-sm">
                  Suscripciones recurrentes
                </h2>
                {!subscriptionsExpanded ? (
                  <span className="text-[10px] text-orbita-secondary sm:text-[11px]">
                    Pausar o cancelar reduce el gasto fijo.
                  </span>
                ) : (
                  <span className="text-[10px] text-orbita-secondary sm:text-[11px]">Toca para colapsar.</span>
                )}
              </div>

              {!subscriptionsExpanded ? (
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-between">
                  <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <p className="text-xl font-bold tabular-nums text-orbita-primary sm:text-2xl">
                      ${formatMoney(monthlyBurn)}
                    </p>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-orbita-secondary">
                      / mes
                    </span>
                    <span className="text-[11px] text-orbita-secondary">
                      {activeSubscriptions.length === 0
                        ? "Sin activas"
                        : `${activeSubscriptions.length} activa${activeSubscriptions.length === 1 ? "" : "s"}`}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {topBurnSubscriptions.length > 0 ? (
                      <div className="flex items-center" aria-hidden>
                        <div className="flex shrink-0 -space-x-2 pl-0.5">
                          {topBurnSubscriptions.map((s) => (
                            <div
                              key={s.id}
                              className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white shadow-sm ring-1 ring-orbita-border/40"
                              style={{ background: avatarGradientForLabel(s.name) }}
                              title={s.name}
                            >
                              {subscriptionInitials(s.name)}
                            </div>
                          ))}
                        </div>
                        {moreActiveThanTop > 0 ? (
                          <span
                            className="-ml-0.5 flex h-9 min-w-[2.25rem] items-center justify-center rounded-full border-2 border-white bg-orbita-surface-alt px-1.5 text-[10px] font-bold tabular-nums text-orbita-primary shadow-sm ring-1 ring-orbita-border/40"
                            title={`${moreActiveThanTop} más`}
                          >
                            +{moreActiveThanTop}
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <span className="rounded-full border border-dashed border-orbita-border/80 bg-orbita-surface-alt px-2.5 py-1 text-[10px] text-orbita-secondary">
                        Sin recurrentes
                      </span>
                    )}

                    {potentialSaving > 0 ? (
                      <p className="text-xs font-semibold text-emerald-700 sm:text-sm">
                        +${formatMoney(potentialSaving)}{" "}
                        <span className="font-normal text-emerald-600/90">ahorro</span>
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </button>
          <div className="flex shrink-0 flex-col items-end gap-0.5 py-2 pr-2 sm:py-3 sm:pr-3">
            <button
              type="button"
              onClick={() => {
                setSubscriptionsExpanded(true)
                openManage()
              }}
              className="text-[11px] font-medium text-orbita-secondary underline decoration-orbita-border/80 underline-offset-4 hover:text-orbita-primary"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={() => setSubscriptionsExpanded((v) => !v)}
              className="rounded-lg p-1 text-orbita-secondary hover:bg-orbita-surface-alt"
              aria-label={subscriptionsExpanded ? "Colapsar" : "Expandir"}
            >
              <ChevronDown
                className={`h-5 w-5 transition-transform duration-200 ${subscriptionsExpanded ? "rotate-180" : ""}`}
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

      <CuentasModalShell
        open={manageOpen}
        onClose={() => setManageOpen(false)}
        title="Gestionar suscripciones"
        subtitle="Tabla editable: costo según frecuencia, día de renovación (1–28) y categoría. Guarda para aplicar."
        wide
      >
        <div className="max-h-[min(72vh,560px)] overflow-auto">
          <table className="w-full min-w-[960px] border-collapse text-left text-[11px] sm:text-xs">
            <thead className="sticky top-0 z-[1] border-b border-orbita-border bg-orbita-surface-alt">
              <tr className="text-[9px] font-semibold uppercase tracking-wide text-orbita-secondary">
                <th className="px-2 py-2">Nombre</th>
                <th className="px-2 py-2">Categoría</th>
                <th className="px-2 py-2">Frecuencia</th>
                <th className="px-2 py-2">Costo</th>
                <th className="px-2 py-2">Día ren.</th>
                <th className="px-2 py-2">Días</th>
                <th className="px-2 py-2">Renovación</th>
                <th className="px-2 py-2">Impacto</th>
                <th className="px-2 py-2">Sim.</th>
                <th className="px-2 py-2">Estado</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {manageRows.map((row) => {
                const monthlyEq = chargeToMonthly(row.chargeAtFrequency, row.billing_frequency)
                const imp = impactLabel(monthlyEq, baselineMonthlyIncome)
                const daysLeft = daysUntilRenewalFromDay(row.renewal_day)
                const nextIso = nextRenewalIsoFromDay(row.renewal_day)
                return (
                  <tr key={row.id} className="border-b border-orbita-border/60 align-top">
                    <td className="px-2 py-1.5">
                      <input
                        className="min-h-8 w-full min-w-[6rem] rounded-lg border border-orbita-border px-2 py-1"
                        value={row.name}
                        onChange={(e) =>
                          setManageRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, name: e.target.value } : r)))
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        className="min-h-8 w-full min-w-[5.5rem] rounded-lg border border-orbita-border px-1 py-1"
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
                    <td className="px-2 py-1.5">
                      <select
                        className="min-h-8 w-full min-w-[5rem] rounded-lg border border-orbita-border px-1 py-1"
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
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        className="min-h-8 w-full min-w-[4.5rem] rounded-lg border border-orbita-border px-2 py-1 tabular-nums"
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
                    <td className="px-2 py-1.5">
                      <select
                        className="min-h-8 w-full rounded-lg border border-orbita-border px-1 py-1"
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
                    <td className="px-2 py-1.5 text-right tabular-nums text-orbita-secondary">{daysLeft}</td>
                    <td className="px-2 py-1.5 whitespace-nowrap text-orbita-secondary">
                      {nextIso.slice(5).replace("-", "/")}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`inline-flex rounded-full border-[0.5px] px-1.5 py-0.5 text-[9px] font-semibold uppercase ${impactTone(imp)}`}
                      >
                        {imp}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
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
                        className="h-4 w-4 rounded border-orbita-border"
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        className="min-h-8 w-full min-w-[4.5rem] rounded-lg border border-orbita-border px-1 py-1"
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
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        className="text-[10px] text-rose-600 underline"
                        onClick={() => setManageRows((rs) => rs.filter((r) => r.id !== row.id))}
                      >
                        Quitar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {manageErr ? <p className="mt-2 text-sm text-rose-600">{manageErr}</p> : null}
        <p className="mt-2 text-[10px] text-orbita-secondary">
          Equiv. mensual total (activas en esta tabla): $
          {formatMoney(
            manageRows
              .filter((r) => r.status === "active")
              .reduce((a, r) => a + chargeToMonthly(r.chargeAtFrequency, r.billing_frequency), 0),
          )}
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-between">
          <button
            type="button"
            onClick={addManageRow}
            className="min-h-[44px] touch-manipulation rounded-xl border border-orbita-border bg-orbita-surface px-4 py-2.5 text-sm font-medium hover:bg-orbita-surface-alt"
          >
            + Agregar fila
          </button>
          <button
            type="button"
            onClick={() => void saveManage()}
            className="min-h-[44px] touch-manipulation rounded-xl bg-[var(--color-text-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-surface)] active:opacity-90"
          >
            Guardar cambios
          </button>
        </div>
      </CuentasModalShell>
    </section>
  )
}
