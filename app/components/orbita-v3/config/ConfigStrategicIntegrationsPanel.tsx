"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, HeartPulse, Landmark, RefreshCw } from "lucide-react"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"
import { formatRelativeSyncAgo } from "@/lib/time/formatRelativeSyncAgo"

type IntegrationSettings = {
  health_enabled: boolean
  banking_enabled: boolean
  push_enhanced_enabled: boolean
  updated_at: string | null
}

type BankingAccount = {
  id: string
  provider: string
  account_name: string
  account_mask: string
  balance_current: number
  last_synced_at: string | null
}
type ToggleKey = "health_enabled" | "banking_enabled" | "push_enhanced_enabled"
const TOGGLE_OPTIONS: Array<{ key: ToggleKey; label: string }> = [
  { key: "health_enabled", label: "Salud automática" },
  { key: "banking_enabled", label: "Banca abierta" },
  { key: "push_enhanced_enabled", label: "Push inteligente" },
]

const defaultSettings: IntegrationSettings = {
  health_enabled: false,
  banking_enabled: false,
  push_enhanced_enabled: true,
  updated_at: null,
}

export function ConfigStrategicIntegrationsPanel({ theme }: { theme: OrbitaConfigTheme }) {
  const [settings, setSettings] = useState<IntegrationSettings>(defaultSettings)
  const [healthConnected, setHealthConnected] = useState(false)
  const [healthLastSync, setHealthLastSync] = useState<string | null>(null)
  const [healthSource, setHealthSource] = useState<string | null>(null)
  const [bankAccounts, setBankAccounts] = useState<BankingAccount[]>([])
  const [bankLastSync, setBankLastSync] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [lastFailedAction, setLastFailedAction] = useState<"health" | "banking" | null>(null)

  const load = useCallback(async () => {
    const headers = await browserBearerHeaders()
    const [settingsRes, healthRes, bankingRes] = await Promise.all([
      fetch("/api/integrations/settings", { headers, cache: "no-store" }),
      fetch("/api/integrations/health/metrics", { headers, cache: "no-store" }),
      fetch("/api/integrations/banking/accounts", { headers, cache: "no-store" }),
    ])

    const settingsPayload = (await settingsRes.json()) as { success?: boolean; settings?: IntegrationSettings; error?: string }
    if (!settingsRes.ok || !settingsPayload.success || !settingsPayload.settings) {
      throw new Error(settingsPayload.error ?? "No se pudo cargar configuración de integraciones")
    }
    setSettings(settingsPayload.settings)

    const healthPayload = (await healthRes.json()) as {
      success?: boolean
      latest?: { observed_at?: string | null; source?: string | null } | null
    }
    setHealthConnected(Boolean(healthPayload.success && healthPayload.latest))
    setHealthLastSync(healthPayload.latest?.observed_at ?? null)
    setHealthSource(healthPayload.latest?.source ?? null)

    const bankingPayload = (await bankingRes.json()) as {
      success?: boolean
      accounts?: BankingAccount[]
      lastSyncAt?: string | null
    }
    setBankAccounts(bankingPayload.accounts ?? [])
    setBankLastSync(bankingPayload.lastSyncAt ?? null)
  }, [])

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar integraciones"))
  }, [load])

  const patchSettings = async (patch: Partial<IntegrationSettings>) => {
    setError(null)
    setNotice(null)
    setBusy("settings")
    try {
      const headers = await browserBearerHeaders(true)
      const res = await fetch("/api/integrations/settings", {
        method: "PATCH",
        headers,
        body: JSON.stringify(patch),
      })
      const payload = (await res.json()) as { success?: boolean; settings?: IntegrationSettings; error?: string }
      if (!res.ok || !payload.success || !payload.settings) {
        throw new Error(payload.error ?? "No se pudo actualizar configuración")
      }
      setSettings(payload.settings)
      setNotice("Preferencias de integraciones actualizadas.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error actualizando integraciones")
    } finally {
      setBusy(null)
    }
  }

  const syncHealth = async () => {
    setBusy("health")
    setError(null)
    setNotice(null)
    try {
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/integrations/health/sync", { method: "POST", headers })
      const payload = (await res.json()) as {
        success?: boolean
        syncedAt?: string
        source?: string
        error?: string
        connectionLabel?: string
      }
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "No se pudo sincronizar salud")
      setHealthConnected(true)
      setHealthLastSync(payload.syncedAt ?? new Date().toISOString())
      setHealthSource(payload.source ?? healthSource)
      setNotice(
        payload.connectionLabel ??
          (payload.source === "apple_health_export"
            ? "Conectado vía Apple Health."
            : "Conectado vía Google Fit."),
      )
    } catch (e) {
      setLastFailedAction("health")
      setError(e instanceof Error ? e.message : "Error de sincronización de salud")
    } finally {
      setBusy(null)
    }
  }

  const connectAppleHealth = async () => {
    setBusy("apple-connect")
    setError(null)
    setNotice(null)
    try {
      const headers = await browserBearerHeaders()
      const res = await fetch("/api/integrations/health/apple/connect", { method: "POST", headers })
      const payload = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "No se pudo conectar Apple Health")
      await load()
      setNotice("Apple Health conectado. Puedes importar exportaciones cuando quieras.")
    } catch (e) {
      setLastFailedAction("health")
      setError(e instanceof Error ? e.message : "Error conectando Apple Health")
    } finally {
      setBusy(null)
    }
  }

  const importAppleSample = async () => {
    setBusy("apple-import")
    setError(null)
    setNotice(null)
    try {
      const headers = await browserBearerHeaders(true)
      const res = await fetch("/api/integrations/health/apple/import", {
        method: "POST",
        headers,
        body: JSON.stringify({ entries: [] }),
      })
      const payload = (await res.json()) as {
        success?: boolean
        imported?: number
        error?: string
        notice?: string
      }
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "No se pudo importar Apple Health")
      await load()
      setNotice(
        payload.notice ??
          `Apple Health importado (${payload.imported ?? 0} registro(s)).`,
      )
    } catch (e) {
      setLastFailedAction("health")
      setError(e instanceof Error ? e.message : "Error importando Apple Health")
    } finally {
      setBusy(null)
    }
  }

  const connectBank = async (provider: "bancolombia" | "davivienda" | "nequi") => {
    setBusy(`bank-${provider}`)
    setError(null)
    setNotice(null)
    try {
      const headers = await browserBearerHeaders(true)
      const connectRes = await fetch("/api/integrations/banking/connect", {
        method: "POST",
        headers,
        body: JSON.stringify({ provider }),
      })
      const connectPayload = (await connectRes.json()) as { success?: boolean; error?: string; connectionLabel?: string }
      if (!connectRes.ok || !connectPayload.success) {
        throw new Error(connectPayload.error ?? "No se pudo conectar banco")
      }
      const syncRes = await fetch("/api/integrations/banking/sync", {
        method: "POST",
        headers: await browserBearerHeaders(),
      })
      const syncPayload = (await syncRes.json()) as { success?: boolean; error?: string }
      if (!syncRes.ok || !syncPayload.success) {
        throw new Error(syncPayload.error ?? "No se pudo sincronizar banca")
      }
      await load()
      setNotice(connectPayload.connectionLabel ?? `Conectado a ${provider[0].toUpperCase()}${provider.slice(1)}.`)
    } catch (e) {
      setLastFailedAction("banking")
      setError(e instanceof Error ? e.message : "Error conectando banco")
    } finally {
      setBusy(null)
    }
  }

  return (
    <section className="space-y-3" aria-labelledby="config-integraciones-fase1">
      <h3 id="config-integraciones-fase1" className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
        Integraciones estratégicas (Fase 1)
      </h3>

      <div className="rounded-2xl border p-5 sm:p-6" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold" style={{ color: theme.text }}>Activación por módulo</p>
            <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>
              Activa salud, banca y push mejorado. Tokens OAuth se quedan solo en servidor.
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {TOGGLE_OPTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={busy === "settings"}
              onClick={() =>
                void patchSettings({
                  [item.key]: !settings[item.key],
                } as Partial<IntegrationSettings>)
              }
              className="min-h-[44px] rounded-xl border px-3 text-xs font-semibold text-left"
              style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
            >
              {settings[item.key] ? "Conectado" : "Desactivado"} · {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-2xl border p-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-4 w-4" style={{ color: theme.accent.health }} />
              <p className="text-sm font-semibold" style={{ color: theme.text }}>Apple Health (prioridad) + Google Fit</p>
            </div>
            {healthConnected && <CheckCircle2 className="h-4 w-4" style={{ color: theme.accent.health }} />}
          </div>
          <p className="mt-2 text-xs" style={{ color: theme.textMuted }}>
            Fuente primaria: Apple Health vía import seguro (Shortcut/export). Fallback: Google Fit.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void connectAppleHealth()}
              disabled={busy === "apple-connect" || !settings.health_enabled}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 text-xs font-semibold"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              {busy === "apple-connect" ? "Conectando…" : "Conectar Apple Health"}
            </button>
            <button
              type="button"
              onClick={() => void importAppleSample()}
              disabled={busy === "apple-import" || !settings.health_enabled}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 text-xs font-semibold"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              {busy === "apple-import" ? "Importando…" : "Importar muestra Apple"}
            </button>
            <button
              type="button"
              onClick={() => void syncHealth()}
              disabled={busy === "health" || !settings.health_enabled}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border px-4 text-xs font-semibold"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              {busy === "health" ? "Sincronizando…" : "Sincronizar salud"}
            </button>
          </div>
          <p className="mt-3 text-[11px]" style={{ color: theme.textMuted }}>{formatRelativeSyncAgo(healthLastSync)}</p>
          <p className="mt-1 text-[11px]" style={{ color: theme.textMuted }}>
            Fuente actual: {healthSource === "apple_health_export" ? "Apple Health" : healthSource === "google_fit" ? "Google Fit" : "Sin datos"}
          </p>
        </div>

        <div className="rounded-2xl border p-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4" style={{ color: theme.accent.finance }} />
            <p className="text-sm font-semibold" style={{ color: theme.text }}>Banca abierta (CO)</p>
          </div>
          <p className="mt-2 text-xs" style={{ color: theme.textMuted }}>Conecta Bancolombia, Davivienda o Nequi para conciliación automática.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {(["bancolombia", "davivienda", "nequi"] as const).map((provider) => (
              <button
                key={provider}
                type="button"
                onClick={() => void connectBank(provider)}
                disabled={busy === `bank-${provider}` || !settings.banking_enabled}
                className="min-h-[44px] rounded-xl border px-3 text-xs font-semibold capitalize"
                style={{ borderColor: theme.border, color: theme.text }}
              >
                {busy === `bank-${provider}` ? "Conectando…" : `Conectar ${provider}`}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[11px]" style={{ color: theme.textMuted }}>
            {(bankAccounts.length > 0
              ? `Conectado a ${bankAccounts[0]?.provider?.[0]?.toUpperCase() ?? ""}${bankAccounts[0]?.provider?.slice(1) ?? "banco"} (${bankAccounts.length} cuenta(s))`
              : "No conectado") +
              " · " + formatRelativeSyncAgo(bankLastSync)}
          </p>
        </div>
      </div>

      {notice && <p className="text-xs" style={{ color: theme.textMuted }}>{notice}</p>}
      {error && <p className="text-xs" style={{ color: theme.accent.finance }}>{error}</p>}
      {error && lastFailedAction ? (
        <button
          type="button"
          onClick={() => {
            if (lastFailedAction === "health") {
              void syncHealth()
            } else {
              void connectBank("bancolombia")
            }
          }}
          className="min-h-[44px] rounded-xl border px-4 text-xs font-semibold"
          style={{ borderColor: theme.border, color: theme.text }}
        >
          Reintentar conexión
        </button>
      ) : null}
    </section>
  )
}
