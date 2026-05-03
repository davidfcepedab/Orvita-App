"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, Landmark, RefreshCw, Unlink } from "lucide-react"
import { Card } from "@/src/components/ui/Card"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { buildBelvoBankingSyncChip } from "@/lib/finanzas/bankingBelvoSyncChip"
import { financeApiDelete, financeApiGet } from "@/lib/finanzas/financeClientFetch"
import { useFinance } from "@/app/finanzas/FinanceContext"
import { financeCardMicroLabelClass } from "@/app/finanzas/_components/financeChrome"
import { cn } from "@/lib/utils"
import { saludHexToRgba } from "@/lib/salud/saludThemeStyles"

type ConnectedAccount = {
  id: string
  provider: string
  account_name: string
  account_mask: string
  balance_current: number
  last_synced_at: string | null
}

export function ConnectedBankAccountsCard({ embedded = false }: { embedded?: boolean }) {
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
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)

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

  const unlinkAccount = async (accountId: string) => {
    const ok = window.confirm(
      "¿Desvincular esta cuenta? Se borrarán en Órvita los movimientos importados desde esta conexión.",
    )
    if (!ok) return

    setUnlinkingId(accountId)
    setNotice(null)
    setError(null)
    try {
      const res = await financeApiDelete(`/api/integrations/banking/accounts/${encodeURIComponent(accountId)}`)
      const payload = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !payload.success) {
        throw new Error(payload.error ?? "No se pudo desvincular la cuenta.")
      }
      setNotice("Cuenta desvinculada.")
      touchCapitalData?.()
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al desvincular.")
    } finally {
      setUnlinkingId(null)
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
  const belvoSyncChip = buildBelvoBankingSyncChip(lastSync)

  const body = (
    <>
      <div className={cn("flex flex-wrap items-start justify-between gap-2 sm:gap-3", embedded && "gap-2")}>
        <div className="min-w-0">
          {!embedded ? (
            <p className={financeCardMicroLabelClass}>Conexión</p>
          ) : null}
          <h3
            className={cn(
              "font-semibold tracking-tight text-orbita-primary",
              embedded ? "mt-0 text-sm leading-snug sm:text-base" : "mt-0.5 text-base sm:text-lg",
            )}
          >
            Banco por internet
          </h3>
          <p
            className={cn(
              "leading-snug text-orbita-secondary",
              embedded
                ? "mt-0.5 max-w-[62ch] text-[10px] sm:text-[11px]"
                : "mt-1 text-[11px] leading-relaxed sm:text-xs",
            )}
          >
            {embedded
              ? "Belvo enlace seguro; Órvita no guarda tu clave. Sync abajo."
              : "Enlace seguro (Belvo); nosotros no guardamos tu clave del banco. La última sincronización aparece abajo."}
          </p>
        </div>
        <Landmark
          className={cn(
            "shrink-0 text-[var(--color-accent-finance)]",
            embedded ? "h-4 w-4 sm:h-[18px] sm:w-[18px]" : "h-5 w-5",
          )}
          aria-hidden
        />
      </div>

      {belvoConnected ? (
        <div
          className={cn("flex flex-wrap items-center gap-2", embedded ? "mt-2" : "mt-3")}
          role="status"
          aria-label={`Belvo: ${belvoSyncChip.label}. Ambiente de prueba.`}
        >
          <span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.16em] text-orbita-secondary">
            Belvo
          </span>
          <span
            className="inline-flex min-w-0 max-w-[min(100%,22rem)] flex-1 items-center gap-1.5 rounded-md border px-2 py-0.5 text-[9px] font-medium leading-tight sm:max-w-[24rem] sm:text-[10px]"
            style={{
              borderColor: saludHexToRgba(belvoSyncChip.fg, 0.22),
              backgroundColor: belvoSyncChip.bg,
              color: belvoSyncChip.fg,
            }}
          >
            <span className="h-1 w-1 shrink-0 rounded-full bg-current opacity-80" aria-hidden />
            <span className="min-w-0 truncate">{belvoSyncChip.label}</span>
          </span>
          <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-orbita-muted sm:text-[10px]">
            Prueba
          </span>
        </div>
      ) : (
        <p className={cn("text-[11px] text-orbita-secondary sm:text-xs", embedded ? "mt-2" : "mt-3")}>
          {loading
            ? "Revisando conexión…"
            : "Todavía no hay cuentas enlazadas. Podés probar con la cuenta demo o abrir la ventana del banco."}
        </p>
      )}

      {pressureActive ? (
        <div
          className={cn(
            "flex gap-2 rounded-xl border border-[color-mix(in_srgb,var(--color-accent-danger)_42%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-danger)_9%,var(--color-surface))] px-3 py-2.5",
            embedded ? "mt-2 py-2" : "mt-3",
          )}
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent-danger)]" aria-hidden />
          <div className="min-w-0 text-[11px] leading-relaxed text-orbita-primary sm:text-xs">
            <p className="m-0 font-semibold">Este mes va rojo</p>
            <p className="m-0 mt-0.5 text-orbita-secondary">
              El flujo del mes es negativo ({formatCOP(monthlyNet!)}). Conviene revisar gastos en Movimientos.
            </p>
          </div>
        </div>
      ) : null}

      <div className={cn("flex flex-wrap gap-1.5 sm:gap-2", embedded ? "mt-2.5" : "mt-4")}>
        <button
          type="button"
          onClick={() => void syncNow()}
          disabled={busy || accounts.length === 0}
          className="inline-flex min-h-[32px] items-center justify-center gap-1.5 rounded-lg bg-orbita-primary px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-sm transition hover:opacity-95 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40 sm:min-h-[34px] sm:px-3"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} aria-hidden />
          {busy ? "Sincronizando…" : "Actualizar"}
        </button>
        <button
          type="button"
          onClick={() => void registerSandboxLinkAndSync()}
          disabled={busy}
          className="inline-flex min-h-[32px] items-center justify-center rounded-lg border border-amber-400/55 bg-amber-500/12 px-2.5 py-1.5 text-[11px] font-semibold text-amber-950 shadow-sm transition hover:bg-amber-500/18 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40 dark:border-amber-500/40 dark:bg-amber-500/14 dark:text-amber-50 dark:hover:bg-amber-500/22 sm:min-h-[34px] sm:px-3"
        >
          Cuenta demo
        </button>
        <button
          type="button"
          onClick={() => void openBelvoWidget()}
          disabled={busy}
          className="inline-flex min-h-[32px] items-center justify-center rounded-lg border border-sky-400/50 bg-sky-500/12 px-2.5 py-1.5 text-[11px] font-semibold text-sky-950 shadow-sm transition hover:bg-sky-500/18 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40 dark:border-sky-500/45 dark:bg-sky-500/14 dark:text-sky-50 dark:hover:bg-sky-500/22 sm:min-h-[34px] sm:px-3"
        >
          Ventana del banco
        </button>
        <Link
          href="/configuracion"
          className="inline-flex min-h-[32px] items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--color-accent-finance)_38%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-accent-finance)_10%,var(--color-surface))] px-2.5 py-1.5 text-[11px] font-semibold text-orbita-primary transition hover:bg-[color-mix(in_srgb,var(--color-accent-finance)_16%,var(--color-surface))] active:scale-[0.99] sm:min-h-[34px] sm:px-3"
        >
          Más opciones
        </Link>
      </div>

      {error ? <p className="mt-2 text-xs text-[var(--color-accent-danger)]">{error}</p> : null}
      {error && /username_type|tipo de usuario/i.test(error) ? (
        <p className="mt-1 text-[11px] leading-relaxed text-orbita-secondary">
          Si el mensaje sigue apareciendo, revisá la configuración de integraciones o pedí ayuda con los datos de Belvo en tu
          cuenta.
        </p>
      ) : null}
      {notice ? <p className={cn("text-xs text-orbita-secondary", embedded ? "mt-1.5" : "mt-2")}>{notice}</p> : null}

      <p
        className={cn(
          "text-[10px] leading-relaxed text-orbita-muted sm:text-[11px]",
          embedded ? "mt-2" : "mt-3",
        )}
      >
        Modo prueba activo para desarrollo. En producción se usan bancos de tu país cuando Belvo los tiene disponibles.
      </p>

      {accounts.length > 0 ? (
        <ul className={cn(embedded ? "mt-2 space-y-1.5" : "mt-3 space-y-2")}>
          {accounts.slice(0, 6).map((account) => (
            <li
              key={account.id}
              className={cn(
                "rounded-xl border border-orbita-border/60 bg-orbita-surface-alt/30 px-3 py-2 text-xs",
                embedded && "py-1.5",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-orbita-primary">{account.account_name}</span>
                    <span className="shrink-0 capitalize text-orbita-secondary">{account.provider}</span>
                  </div>
                  <p className="mt-1 text-orbita-secondary">
                    {account.account_mask || "****"} · {formatCOP(account.balance_current)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void unlinkAccount(account.id)}
                  disabled={busy || unlinkingId === account.id}
                  className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-orbita-border/70 bg-orbita-surface/40 px-2 py-1 text-[10px] font-semibold text-orbita-secondary transition hover:border-[color-mix(in_srgb,var(--color-accent-danger)_45%,var(--color-border))] hover:text-[var(--color-accent-danger)] disabled:pointer-events-none disabled:opacity-40 sm:text-[11px]"
                  title="Desvincular cuenta"
                >
                  <Unlink className="h-3 w-3" aria-hidden />
                  {unlinkingId === account.id ? "…" : "Desvincular"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : !loading ? (
        <p className={cn("text-sm text-orbita-secondary", embedded ? "mt-2" : "mt-3")}>Aún no hay cuentas conectadas.</p>
      ) : null}
    </>
  )

  return embedded ? (
    <div className="min-w-0">{body}</div>
  ) : (
    <Card className="min-w-0 rounded-xl border border-orbita-border/55 bg-orbita-surface p-4 shadow-sm sm:p-5">{body}</Card>
  )
}
