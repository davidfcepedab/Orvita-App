"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Landmark, RefreshCw } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { formatRelativeSyncAgo } from "@/lib/time/formatRelativeSyncAgo"

type ConnectedAccount = {
  id: string
  provider: string
  account_name: string
  account_mask: string
  balance_current: number
  last_synced_at: string | null
}

export function ConnectedBankAccountsCard() {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [lastSync, setLastSync] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/integrations/banking/accounts", { headers, cache: "no-store" })
      const payload = (await res.json()) as {
        success?: boolean
        accounts?: ConnectedAccount[]
        lastSyncAt?: string | null
      }
      if (res.ok && payload.success) {
        setAccounts(payload.accounts ?? [])
        setLastSync(payload.lastSyncAt ?? null)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  const connectAndSync = async () => {
    setBusy(true)
    setNotice(null)
    try {
      const headers = await browserBearerHeaders(true)
      await fetch("/api/integrations/settings", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ banking_enabled: true }),
      })
      await fetch("/api/integrations/banking/connect", {
        method: "POST",
        headers,
        body: JSON.stringify({ provider: "bancolombia" }),
      })
      await fetch("/api/integrations/banking/sync", { method: "POST", headers: await browserBearerHeaders() })
      setNotice("Banco conectado y conciliado. Revisa presión operativa en Capital.")
      await load()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="min-w-0 border-[color-mix(in_srgb,var(--color-border)_75%,transparent)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-orbita-secondary">Capital · Integraciones</p>
          <h3 className="mt-1 text-lg font-semibold text-orbita-primary">Cuentas conectadas</h3>
          <p className="mt-1 text-xs text-orbita-secondary">Bancolombia, Davivienda y Nequi con sincronización operativa.</p>
        </div>
        <Landmark className="h-5 w-5 text-[var(--color-accent-finance)]" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void connectAndSync()}
          disabled={busy}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-orbita-border px-4 text-xs font-semibold text-orbita-primary"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {busy ? "Conectando…" : "Conectar banco"}
        </button>
        <Link
          href="/configuracion"
          className="inline-flex min-h-[44px] items-center rounded-xl border border-orbita-border px-4 text-xs font-semibold text-orbita-secondary"
        >
          Gestionar integraciones
        </Link>
      </div>

      <p className="mt-3 text-[11px] text-orbita-secondary">{loading ? "Cargando estado…" : formatRelativeSyncAgo(lastSync)}</p>
      {notice ? <p className="mt-1 text-xs text-orbita-secondary">{notice}</p> : null}

      {accounts.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {accounts.slice(0, 4).map((account) => (
            <li key={account.id} className="rounded-xl border border-orbita-border/60 bg-orbita-surface-alt/30 px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-orbita-primary">{account.account_name}</span>
                <span className="capitalize text-orbita-secondary">{account.provider}</span>
              </div>
              <p className="mt-1 text-orbita-secondary">
                {account.account_mask || "****"} · {new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(account.balance_current)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-orbita-secondary">Aún no hay cuentas conectadas.</p>
      )}
    </Card>
  )
}
