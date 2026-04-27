"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Landmark, RefreshCw } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { formatRelativeSyncAgo } from "@/lib/time/formatRelativeSyncAgo"
import { financeApiGet } from "@/lib/finanzas/financeClientFetch"
import { useFinance } from "@/app/finanzas/FinanceContext"

type ConnectedAccount = {
  id: string
  provider: string
  account_name: string
  account_mask: string
  balance_current: number
  last_synced_at: string | null
}

export function ConnectedBankAccountsCard() {
  const finance = useFinance()
  const month = finance?.month
  const touchCapitalData = finance?.touchCapitalData

  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [openBankingVendor, setOpenBankingVendor] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [monthlyNet, setMonthlyNet] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/integrations/banking/accounts", { headers, cache: "no-store" })
      const payload = (await res.json()) as {
        success?: boolean
        accounts?: ConnectedAccount[]
        lastSyncAt?: string | null
        openBankingVendor?: string | null
        error?: string
      }
      if (res.ok && payload.success) {
        setAccounts(payload.accounts ?? [])
        setLastSync(payload.lastSyncAt ?? null)
        setOpenBankingVendor(payload.openBankingVendor ?? null)
      } else {
        setError(payload.error ?? "No se pudo cargar banca conectada.")
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!month) {
      setMonthlyNet(null)
      return
    }
    let cancelled = false
    const run = async () => {
      try {
        const response = await financeApiGet(`/api/orbita/finanzas/overview?month=${encodeURIComponent(month)}`)
        const json = (await response.json()) as { success?: boolean; data?: { net?: number } }
        if (cancelled || !response.ok || !json.success || json.data?.net == null) {
          if (!cancelled) setMonthlyNet(null)
          return
        }
        setMonthlyNet(json.data.net)
      } catch {
        if (!cancelled) setMonthlyNet(null)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [month, finance?.capitalDataEpoch])

  const formatCOP = (n: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
      Math.round(n),
    )

  const registerSandboxLinkAndSync = async () => {
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      const headers = await browserBearerHeaders(true)
      await fetch("/api/integrations/settings", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ banking_enabled: true }),
      })
      const connectRes = await fetch("/api/integrations/banking/connect", {
        method: "POST",
        headers,
        body: JSON.stringify({ provider: "bancolombia", flow: "register" }),
      })
      const connectPayload = (await connectRes.json()) as { success?: boolean; error?: string }
      if (!connectRes.ok || !connectPayload.success) {
        throw new Error(connectPayload.error ?? "No se pudo registrar el link en Belvo Sandbox.")
      }
      const syncRes = await fetch("/api/integrations/banking/sync", { method: "POST", headers: await browserBearerHeaders() })
      const syncPayload = (await syncRes.json()) as { success?: boolean; error?: string }
      if (!syncRes.ok || !syncPayload.success) {
        throw new Error(syncPayload.error ?? "No se pudo sincronizar movimientos.")
      }
      setNotice("Cuenta enlazada en sandbox y movimientos importados.")
      touchCapitalData?.()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error de conexión bancaria.")
    } finally {
      setBusy(false)
    }
  }

  const syncNow = async () => {
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      const headers = await browserBearerHeaders()
      const syncRes = await fetch("/api/integrations/banking/sync", { method: "POST", headers })
      const syncPayload = (await syncRes.json()) as { success?: boolean; error?: string; netMonthly?: number }
      if (!syncRes.ok || !syncPayload.success) {
        throw new Error(syncPayload.error ?? "No se pudo sincronizar.")
      }
      setNotice("Sincronización completada.")
      touchCapitalData?.()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al sincronizar.")
    } finally {
      setBusy(false)
    }
  }

  const openBelvoWidget = async () => {
    setBusy(true)
    setNotice(null)
    setError(null)
    try {
      const headers = await browserBearerHeaders(true)
      await fetch("/api/integrations/settings", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ banking_enabled: true }),
      })
      const res = await fetch("/api/integrations/banking/connect", {
        method: "POST",
        headers,
        body: JSON.stringify({ provider: "bancolombia", flow: "widget" }),
      })
      const payload = (await res.json()) as { success?: boolean; widgetUrl?: string; error?: string }
      if (!res.ok || !payload.success || !payload.widgetUrl) {
        throw new Error(payload.error ?? "No se pudo abrir el widget Belvo.")
      }
      window.location.href = payload.widgetUrl
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error abriendo Belvo.")
      setBusy(false)
    }
  }

  const belvoConnected = accounts.length > 0 && openBankingVendor === "belvo_sandbox"
  const pressureActive = typeof monthlyNet === "number" && monthlyNet < 0

  return (
    <Card className="min-w-0 border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-orbita-secondary">Capital · Integraciones</p>
          <h3 className="mt-1 text-lg font-semibold tracking-tight text-orbita-primary">Banca abierta</h3>
          <p className="mt-1 text-xs leading-relaxed text-orbita-secondary">
            Conexión segura vía Belvo (tokens solo en servidor). Última sincronización visible abajo.
          </p>
        </div>
        <Landmark className="h-5 w-5 shrink-0 text-[var(--color-accent-finance)]" aria-hidden />
      </div>

      {belvoConnected ? (
        <p className="mt-3 rounded-xl border border-orbita-border/55 bg-orbita-surface-alt/35 px-3 py-2 text-xs font-medium text-orbita-primary">
          Conectado vía Belvo Sandbox
          {lastSync ? (
            <span className="mt-0.5 block text-[11px] font-normal text-orbita-secondary">
              Última sincronización: {formatRelativeSyncAgo(lastSync)}
            </span>
          ) : (
            <span className="mt-0.5 block text-[11px] font-normal text-orbita-secondary">Aún sin fecha de sync registrada.</span>
          )}
        </p>
      ) : (
        <p className="mt-3 text-xs text-orbita-secondary">
          {loading ? "Comprobando estado…" : "Sin cuentas Belvo enlazadas. Usa sandbox programático o el widget."}
        </p>
      )}

      {pressureActive ? (
        <div
          className="mt-3 flex gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-accent-danger)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-danger)_9%,var(--color-surface))] px-3 py-2.5"
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-danger)]" aria-hidden />
          <div className="min-w-0 text-xs leading-relaxed text-orbita-primary">
            <p className="m-0 font-semibold">Presión financiera en el mes</p>
            <p className="m-0 mt-0.5 text-orbita-secondary">
              Flujo neto negativo ({formatCOP(monthlyNet!)}). Prioriza egresos y conciliación en Movimientos.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => void syncNow()}
          disabled={busy || accounts.length === 0}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-orbita-primary px-4 text-xs font-semibold text-white shadow-sm active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden />
          {busy ? "Sincronizando…" : "Sincronizar ahora"}
        </button>
        <button
          type="button"
          onClick={() => void registerSandboxLinkAndSync()}
          disabled={busy}
          className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-orbita-border px-4 text-xs font-semibold text-orbita-primary active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
        >
          Sandbox programático
        </button>
        <button
          type="button"
          onClick={() => void openBelvoWidget()}
          disabled={busy}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-orbita-border px-4 text-xs font-semibold text-orbita-primary active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
        >
          Widget Belvo
        </button>
        <Link
          href="/configuracion"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-orbita-border/80 px-4 text-xs font-medium text-orbita-secondary"
        >
          Integraciones
        </Link>
      </div>

      {error ? <p className="mt-2 text-xs text-[var(--color-accent-danger)]">{error}</p> : null}
      {notice ? <p className="mt-2 text-xs text-orbita-secondary">{notice}</p> : null}

      {accounts.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {accounts.slice(0, 6).map((account) => (
            <li key={account.id} className="rounded-xl border border-orbita-border/60 bg-orbita-surface-alt/30 px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-orbita-primary">{account.account_name}</span>
                <span className="capitalize text-orbita-secondary">{account.provider}</span>
              </div>
              <p className="mt-1 text-orbita-secondary">
                {account.account_mask || "****"} · {formatCOP(account.balance_current)}
              </p>
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <p className="mt-3 text-sm text-orbita-secondary">Aún no hay cuentas conectadas.</p>
      ) : null}
    </Card>
  )
}
