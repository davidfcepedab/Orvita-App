"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Ban, ChevronDown, Pause, Pencil, Plus } from "lucide-react"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { UI_SUBSCRIPTIONS_LOCAL_STORAGE } from "@/lib/checkins/flags"
import { financeApiGet, financeApiJson } from "@/lib/finanzas/financeClientFetch"
import {
  ensureLocalSubscriptionsSeeded,
  readSubscriptionsFromLocalStorage,
  upsertLocalSubscription,
} from "@/lib/finanzas/subscriptionsLocal"
import type { UserSubscription } from "@/lib/finanzas/userSubscriptionsTypes"
import {
  SUBSCRIPTION_CATEGORIES,
  subscriptionActiveBurn,
  subscriptionPotentialSaving,
} from "@/lib/finanzas/userSubscriptionsTypes"
import { CuentasModalShell } from "./CuentasModalShell"
import { arcticPanel, formatMoney } from "./cuentasFormat"

function newLocalId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function renewalLabel(iso: string) {
  if (!iso || iso.length < 10) return "—"
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number)
  const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]
  if (!y || !m || !d) return iso
  return `${MONTH_SHORT[m - 1] ?? m} ${d}`
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
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<UserSubscription | null>(null)
  const [draft, setDraft] = useState({
    name: "",
    category: "Software" as string,
    amount_monthly: 0,
    renewal_date: new Date().toISOString().slice(0, 10),
    include_in_simulator: true,
  })
  const [saveErr, setSaveErr] = useState<string | null>(null)
  const [subscriptionsExpanded, setSubscriptionsExpanded] = useState(false)

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
        setRows(json.data?.subscriptions ?? [])
      } else {
        setRows(ensureLocalSubscriptionsSeeded())
      }
    } catch (e) {
      setRows(readSubscriptionsFromLocalStorage())
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

  const openAdd = () => {
    setEditing(null)
    setDraft({
      name: "",
      category: "Software",
      amount_monthly: 80_000,
      renewal_date: new Date().toISOString().slice(0, 10),
      include_in_simulator: true,
    })
    setFormOpen(true)
    setSaveErr(null)
  }

  const openEdit = (s: UserSubscription) => {
    setEditing(s)
    setDraft({
      name: s.name,
      category: s.category,
      amount_monthly: s.amount_monthly,
      renewal_date: s.renewal_date.slice(0, 10),
      include_in_simulator: s.include_in_simulator,
    })
    setFormOpen(true)
    setSaveErr(null)
  }

  const submitForm = async () => {
    setSaveErr(null)
    const name = draft.name.trim()
    if (!name) {
      setSaveErr("Nombre requerido")
      return
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.renewal_date)) {
      setSaveErr("Fecha inválida")
      return
    }

    if (supabaseEnabled) {
      try {
        if (editing) {
          const res = await financeApiJson("/api/orbita/finanzas/subscriptions", {
            method: "PATCH",
            body: {
              id: editing.id,
              name,
              category: draft.category,
              amount_monthly: draft.amount_monthly,
              renewal_date: draft.renewal_date,
              include_in_simulator: draft.include_in_simulator,
              status: editing.status,
            },
          })
          const json = (await res.json()) as { success?: boolean; error?: string }
          if (!res.ok || !json.success) throw new Error(json.error || "Error")
        } else {
          const res = await financeApiJson("/api/orbita/finanzas/subscriptions", {
            method: "POST",
            body: {
              name,
              category: draft.category,
              amount_monthly: draft.amount_monthly,
              renewal_date: draft.renewal_date,
              include_in_simulator: draft.include_in_simulator,
              status: "active",
            },
          })
          const json = (await res.json()) as { success?: boolean; error?: string }
          if (!res.ok || !json.success) throw new Error(json.error || "Error")
        }
        setFormOpen(false)
        await reload()
      } catch (e) {
        setSaveErr(e instanceof Error ? e.message : "Error al guardar")
      }
      return
    }

    const row: UserSubscription = editing
      ? {
          ...editing,
          name,
          category: draft.category,
          amount_monthly: draft.amount_monthly,
          renewal_date: draft.renewal_date,
          include_in_simulator: draft.include_in_simulator,
        }
      : {
          id: newLocalId(),
          name,
          category: draft.category,
          amount_monthly: draft.amount_monthly,
          renewal_date: draft.renewal_date,
          include_in_simulator: draft.include_in_simulator,
          active: true,
          status: "active",
        }
    setRows(upsertLocalSubscription(row, rows))
    setFormOpen(false)
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
    setRows(upsertLocalSubscription(patchRow(s), rows))
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

  return (
    <section id="capital-suscripciones" className="scroll-mt-24 space-y-4">
      <div className={arcticPanel}>
        <div className="flex w-full items-start">
          <button
            type="button"
            onClick={() => setSubscriptionsExpanded((v) => !v)}
            className="min-w-0 flex-1 touch-manipulation p-3 text-left sm:p-3.5"
            aria-expanded={subscriptionsExpanded}
          >
            <div className="min-w-0">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-orbita-secondary">
              Suscripciones recurrentes
            </h2>
            <p className="mt-1 text-xs text-orbita-secondary sm:text-sm">
              {subscriptionsExpanded
                ? "Toca para colapsar el detalle."
                : "Renovaciones recurrentes y ahorro potencial al pausar o cancelar."}
            </p>

            {!subscriptionsExpanded ? (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Total mensual</p>
                  <p className="mt-0.5 text-2xl font-bold tabular-nums text-orbita-primary sm:text-3xl">
                    ${formatMoney(monthlyBurn)}
                  </p>
                  <p className="mt-1 text-[11px] text-orbita-secondary">
                    {activeSubscriptions.length === 0
                      ? "Ninguna suscripción activa"
                      : `${activeSubscriptions.length} activa${activeSubscriptions.length === 1 ? "" : "s"}`}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {topBurnSubscriptions.length > 0 ? (
                    <div className="flex items-center" aria-hidden>
                      <div className="flex shrink-0 -space-x-2.5 pl-1">
                        {topBurnSubscriptions.map((s) => (
                          <div
                            key={s.id}
                            className="flex h-11 w-11 items-center justify-center rounded-full border-[2.5px] border-white text-[11px] font-bold text-white shadow-md ring-1 ring-orbita-border/50"
                            style={{ background: avatarGradientForLabel(s.name) }}
                            title={s.name}
                          >
                            {subscriptionInitials(s.name)}
                          </div>
                        ))}
                      </div>
                      {moreActiveThanTop > 0 ? (
                        <span
                          className="-ml-1 flex h-11 min-w-[2.75rem] items-center justify-center rounded-full border-[2.5px] border-white bg-orbita-surface-alt px-2 text-[11px] font-bold tabular-nums text-orbita-primary shadow-sm ring-1 ring-orbita-border/50"
                          title={`${moreActiveThanTop} más`}
                        >
                          +{moreActiveThanTop}
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <span className="rounded-full border border-dashed border-orbita-border bg-orbita-surface-alt px-3 py-2 text-xs text-orbita-secondary">
                      Sin cargos recurrentes
                    </span>
                  )}

                  {potentialSaving > 0 ? (
                    <p className="text-sm font-semibold text-emerald-700">
                      +${formatMoney(potentialSaving)}{" "}
                      <span className="font-normal text-emerald-600/90">ahorro potencial</span>
                    </p>
                  ) : null}
                </div>
              </div>
            ) : null}
            </div>
          </button>
          <div className="flex shrink-0 flex-col items-end gap-0.5 py-3 pr-2 sm:py-3.5 sm:pr-3">
            <button
              type="button"
              onClick={() => setSubscriptionsExpanded(true)}
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
                Lista editable en tabla; pausa o cancela desde acciones.
              </p>
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-orbita-secondary">Total mensual</p>
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
                <table className="w-full min-w-[720px] border-collapse text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-orbita-border bg-orbita-surface-alt text-[10px] font-semibold uppercase tracking-wide text-orbita-secondary">
                      <th className="px-3 py-2.5 font-medium">Nombre</th>
                      <th className="px-3 py-2.5 font-medium">Categoría</th>
                      <th className="px-3 py-2.5 text-right font-medium">Mensual (COP)</th>
                      <th className="px-3 py-2.5 font-medium">Renovación</th>
                      <th className="px-3 py-2.5 font-medium">Impacto</th>
                      <th className="px-3 py-2.5 font-medium">Simulador</th>
                      <th className="px-3 py-2.5 text-right font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((s) => {
                      const active = subscriptionActiveBurn(s)
                      const imp = impactLabel(s.amount_monthly, baselineMonthlyIncome)
                      return (
                        <tr
                          key={s.id}
                          className={`border-b border-orbita-border/70 ${!active ? "bg-orbita-surface-alt/40" : ""}`}
                        >
                          <td className="px-3 py-2.5 align-middle">
                            <p className="font-semibold text-orbita-primary">{s.name}</p>
                            {!active ? (
                              <p className="mt-0.5 text-[10px] text-orbita-secondary">
                                {s.status === "paused" ? "Pausada" : "Cancelada"}
                              </p>
                            ) : null}
                          </td>
                          <td className="max-w-[140px] px-3 py-2.5 align-middle text-orbita-secondary">
                            {s.category}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 text-right align-middle font-semibold tabular-nums text-orbita-primary">
                            ${formatMoney(s.amount_monthly)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-orbita-secondary">
                            {renewalLabel(s.renewal_date)}
                          </td>
                          <td className="px-3 py-2.5 align-middle">
                            <span
                              className={`inline-flex rounded-full border-[0.5px] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${impactTone(imp)}`}
                            >
                              {imp}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 align-middle text-orbita-secondary">
                            {s.include_in_simulator ? "Sí" : "No"}
                          </td>
                          <td className="px-3 py-2.5 align-middle">
                            <div className="flex flex-wrap justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEdit(s)}
                                className="inline-flex min-h-9 items-center justify-center rounded-lg border border-orbita-border bg-orbita-surface px-2 py-1 text-[11px] font-medium text-orbita-primary hover:bg-orbita-surface-alt"
                              >
                                <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden />
                                Editar
                              </button>
                              {active ? (
                                <button
                                  type="button"
                                  onClick={() => void setStatus(s, "paused")}
                                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-orbita-border px-2 py-1 text-[11px] font-medium text-orbita-primary hover:bg-orbita-surface-alt"
                                >
                                  <Pause className="mr-1 h-3.5 w-3.5" aria-hidden />
                                  Pausar
                                </button>
                              ) : s.status === "paused" ? (
                                <button
                                  type="button"
                                  onClick={() => void setStatus(s, "active")}
                                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
                                >
                                  Reactivar
                                </button>
                              ) : null}
                              {active || s.status === "paused" ? (
                                <button
                                  type="button"
                                  onClick={() => void setStatus(s, "cancelled")}
                                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-800 hover:bg-rose-100"
                                >
                                  <Ban className="mr-1 h-3.5 w-3.5" aria-hidden />
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
                  onClick={openAdd}
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
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Editar suscripción" : "Nueva suscripción"}
        subtitle="Cargos recurrentes mensuales (completa fila por fila)."
      >
        <div className="space-y-4">
          <table className="w-full border-collapse text-sm">
            <tbody className="align-top">
              <tr className="border-b border-orbita-border/60">
                <th className="w-[32%] py-2.5 pr-3 text-left text-xs font-medium text-orbita-secondary sm:w-1/4">
                  Nombre
                </th>
                <td className="py-2.5">
                  <input
                    className="min-h-[40px] w-full rounded-lg border border-orbita-border px-3 py-2 text-orbita-primary"
                    value={draft.name}
                    onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                  />
                </td>
              </tr>
              <tr className="border-b border-orbita-border/60">
                <th className="py-2.5 pr-3 text-left text-xs font-medium text-orbita-secondary">Categoría</th>
                <td className="py-2.5">
                  <select
                    className="min-h-[40px] w-full rounded-lg border border-orbita-border px-3 py-2 text-orbita-primary"
                    value={draft.category}
                    onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                  >
                    {SUBSCRIPTION_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
              <tr className="border-b border-orbita-border/60">
                <th className="py-2.5 pr-3 text-left text-xs font-medium text-orbita-secondary">Monto / mes</th>
                <td className="py-2.5">
                  <input
                    type="number"
                    min={0}
                    className="min-h-[40px] w-full rounded-lg border border-orbita-border px-3 py-2 text-orbita-primary"
                    placeholder="COP"
                    value={draft.amount_monthly || ""}
                    onChange={(e) => setDraft((d) => ({ ...d, amount_monthly: Number(e.target.value) }))}
                  />
                </td>
              </tr>
              <tr className="border-b border-orbita-border/60">
                <th className="py-2.5 pr-3 text-left text-xs font-medium text-orbita-secondary">Renovación</th>
                <td className="py-2.5">
                  <input
                    type="date"
                    className="min-h-[40px] w-full rounded-lg border border-orbita-border px-3 py-2 text-orbita-primary"
                    value={draft.renewal_date}
                    onChange={(e) => setDraft((d) => ({ ...d, renewal_date: e.target.value }))}
                  />
                </td>
              </tr>
              <tr>
                <th className="py-2.5 pr-3 text-left text-xs font-medium text-orbita-secondary">Simulador</th>
                <td className="py-2.5">
                  <label className="flex cursor-pointer items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={draft.include_in_simulator}
                      onChange={(e) => setDraft((d) => ({ ...d, include_in_simulator: e.target.checked }))}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-orbita-border"
                    />
                    <span className="text-xs leading-snug text-orbita-secondary">
                      Incluir como gasto fijo recurrente en el simulador de flujo
                    </span>
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
          {saveErr ? <p className="text-sm text-rose-600">{saveErr}</p> : null}
          <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="min-h-[44px] touch-manipulation rounded-xl border border-orbita-border px-4 py-2.5 text-sm font-medium text-orbita-primary hover:bg-orbita-surface-alt"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={() => void submitForm()}
              className="min-h-[44px] touch-manipulation rounded-xl bg-[var(--color-text-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--color-surface)] active:opacity-90"
            >
              Guardar
            </button>
          </div>
        </div>
      </CuentasModalShell>
    </section>
  )
}
