"use client"

import { useCallback, useEffect, useState, type ReactNode } from "react"
import { CheckCircle2, ChevronDown, HeartPulse, Landmark, RefreshCw } from "lucide-react"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"
import { configConnectionActionClass, configSettingsSectionKickerClass } from "@/lib/config/configSettingsUi"
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

export function ConfigStrategicIntegrationsPanel({
  theme,
  unified = true,
  showHealth = true,
  /**
   * `accordions`: un bloque Finanzas (toggles banca + push + banca CO) y otro Salud (toggle + sync servidor),
   * con `<details>` nativos, para la vista minimal de ajustes.
   */
  layout = "default" as "default" | "accordions",
  /**
   * Contenido a mostrar antes del bloque «servidor» dentro del acordeón Salud
   * (p. ej. atajo iOS y sync del panel unificado).
   */
  beforeHealthServer = null as ReactNode,
}: {
  theme: OrbitaConfigTheme
  /** Misma columna que Google/Hevy, separada por líneas. */
  unified?: boolean
  /** Oculta el bloque de Salud (se usa en la tarjeta unificada de Salud). */
  showHealth?: boolean
  layout?: "default" | "accordions"
  beforeHealthServer?: ReactNode
}) {
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
  const toggleOptions = showHealth ? TOGGLE_OPTIONS : TOGGLE_OPTIONS.filter((item) => item.key !== "health_enabled")

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

  const makeTogglesBlock = (keys: ToggleKey[], compactCopy?: string) => (
    <div
      className={unified ? "px-4 py-3 sm:px-5 sm:py-3.5" : "rounded-2xl border p-5 sm:p-6"}
      style={unified ? undefined : { backgroundColor: theme.surface, borderColor: theme.border }}
    >
      {!unified ? (
        <>
          <p className="text-sm font-semibold" style={{ color: theme.text }}>
            Activación por módulo
          </p>
          <p className="mt-1 text-xs" style={{ color: theme.textMuted }}>
            Salud, banca y avisos. Los tokens viven en el servidor.
          </p>
        </>
      ) : (
        <p className="m-0 text-[11px] leading-snug sm:text-xs" style={{ color: theme.textMuted }}>
          {compactCopy ?? "Activa o desactiva qué piezas pueden conectarse o notificarte (ajustes en servidor)."}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-2.5 sm:gap-2">
        {toggleOptions
          .filter((item) => keys.includes(item.key))
          .map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={busy === "settings"}
              onClick={() =>
                void patchSettings({
                  [item.key]: !settings[item.key],
                } as Partial<IntegrationSettings>)
              }
              className={configConnectionActionClass}
              style={{
                borderColor: settings[item.key] ? theme.accent.health : theme.border,
                color: settings[item.key] ? "#fff" : theme.text,
                backgroundColor: settings[item.key] ? theme.accent.health : theme.surfaceAlt,
              }}
            >
              {settings[item.key] ? "On" : "Off"} · {item.label}
            </button>
          ))}
      </div>
    </div>
  )

  const togglesBlock = makeTogglesBlock(
    toggleOptions.map((o) => o.key),
  )

  const healthBlock = !showHealth
    ? null
    : (
      <div
        className={unified ? "px-4 py-3.5 sm:px-5 sm:py-4" : "rounded-2xl border p-5"}
        style={unified ? undefined : { backgroundColor: theme.surface, borderColor: theme.border }}
        data-orvita-subsection="health-server-sync"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: theme.surfaceAlt, color: theme.accent.health }}
              aria-hidden
            >
              <HeartPulse className="h-4 w-4" />
            </span>
            <p className="min-w-0 text-sm font-semibold leading-snug" style={{ color: theme.text }}>
              Apple Health + Google Fit
            </p>
          </div>
          {healthConnected && <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: theme.accent.health }} aria-label="Conectado" />}
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed sm:text-xs" style={{ color: theme.textMuted }}>
          Import (Atajo) o sincronizar Google Fit según ajustes del servidor.
        </p>
        <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
          <button
            type="button"
            onClick={() => void connectAppleHealth()}
            disabled={busy === "apple-connect" || !settings.health_enabled}
            className={configConnectionActionClass}
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
          >
            {busy === "apple-connect" ? "…" : "Conectar Apple"}
          </button>
          <button
            type="button"
            onClick={() => void importAppleSample()}
            disabled={busy === "apple-import" || !settings.health_enabled}
            className={configConnectionActionClass}
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
          >
            {busy === "apple-import" ? "…" : "Importar muestra"}
          </button>
          <button
            type="button"
            onClick={() => void syncHealth()}
            disabled={busy === "health" || !settings.health_enabled}
            className={configConnectionActionClass}
            style={{ borderColor: theme.accent.health, backgroundColor: theme.accent.health, color: "#fff" }}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {busy === "health" ? "…" : "Sync salud"}
          </button>
        </div>
        <p className="mt-2.5 text-[11px]" style={{ color: theme.textMuted }}>
          {formatRelativeSyncAgo(healthLastSync)} · {healthSource === "apple_health_export" ? "Apple" : healthSource === "google_fit" ? "Google Fit" : "Sin datos"}
        </p>
      </div>
    )

  const bankBlock = (
    <div
      className={unified ? "px-4 py-3.5 sm:px-5 sm:py-4" : "rounded-2xl border p-5"}
      style={unified ? undefined : { backgroundColor: theme.surface, borderColor: theme.border }}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: theme.surfaceAlt, color: theme.accent.finance }}
          aria-hidden
        >
          <Landmark className="h-4 w-4" />
        </span>
        <p className="min-w-0 text-sm font-semibold leading-snug" style={{ color: theme.text }}>
          Banca (CO)
        </p>
      </div>
      <p className="mt-1.5 text-[11px] leading-relaxed sm:text-xs" style={{ color: theme.textMuted }}>
        Bancolombia, Davivienda, Nequi.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
        {(["bancolombia", "davivienda", "nequi"] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => void connectBank(provider)}
            disabled={busy === `bank-${provider}` || !settings.banking_enabled}
            className={configConnectionActionClass}
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
            title={`Conectar ${provider}`}
          >
            {busy === `bank-${provider}` ? "…" : provider[0].toUpperCase() + provider.slice(1)}
          </button>
        ))}
      </div>
      <p className="mt-2.5 text-[11px]" style={{ color: theme.textMuted }}>
        {bankAccounts.length > 0
          ? `${bankAccounts.length} cuenta(s) · ${formatRelativeSyncAgo(bankLastSync)}`
          : `Sin banca · ${formatRelativeSyncAgo(bankLastSync)}`}
      </p>
    </div>
  )

  const foot = (
    <>
      {notice ? <p className="text-xs" style={{ color: theme.textMuted }}>{notice}</p> : null}
      {error ? <p className="text-xs" style={{ color: theme.accent.finance }}>{error}</p> : null}
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
          className={configConnectionActionClass}
          style={{ borderColor: theme.border, color: theme.text }}
        >
          Reintentar
        </button>
      ) : null}
    </>
  )

  const summaryBar = (title: string, hint: string) => (
    <>
      <div className="min-w-0 text-left">
        <p className="m-0 text-[0.95rem] font-medium tracking-tight" style={{ color: theme.text }}>
          {title}
        </p>
        <p className="m-0 mt-0.5 text-xs font-normal" style={{ color: theme.textMuted }}>
          {hint}
        </p>
      </div>
      <ChevronDown
        className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
        style={{ color: theme.textMuted }}
        aria-hidden
      />
    </>
  )

  if (unified && layout === "accordions") {
    return (
      <div className="min-w-0 space-y-2" data-orvita-section="strategic-integrations-accordion" aria-label="Módulos y banca">
        <details
          className="group open:shadow-sm"
          style={{
            backgroundColor: theme.surface,
            borderRadius: "1rem",
            boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.04)",
          }}
        >
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden"
            style={{ color: theme.text }}
          >
            {summaryBar("Finanzas", "Bancos Colombia y avisos.")}
          </summary>
          <div className="flex flex-col gap-0 border-t" style={{ borderColor: theme.border }}>
            {makeTogglesBlock(["banking_enabled", "push_enhanced_enabled"], "Banca y notificaciones inteligentes (servidor).")}
            {bankBlock}
          </div>
        </details>

        {showHealth ? (
          <details
            className="group open:shadow-sm"
            style={{
              backgroundColor: theme.surface,
              borderRadius: "1rem",
              boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.04)",
            }}
          >
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden"
              style={{ color: theme.text }}
            >
              {summaryBar("Salud", "Atajos, Apple Health, Google Fit y sync.")}
            </summary>
            <div
              className="flex flex-col gap-0 border-t"
              style={{ borderColor: theme.border }}
              data-orvita-subsection="health-unified-wrap"
            >
              {beforeHealthServer ? <div className="px-0 pb-0 pt-0">{beforeHealthServer}</div> : null}
              {makeTogglesBlock(["health_enabled"], "Habilita la capa de salud en el servidor (tokens y sync).")}
              {healthBlock}
            </div>
          </details>
        ) : beforeHealthServer ? (
            <div
              className="overflow-hidden rounded-2xl"
              style={{
                backgroundColor: theme.surface,
                boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.04)",
              }}
            >
              {beforeHealthServer}
            </div>
          ) : null}

        <div className="space-y-2 px-1 pt-1 sm:pt-2">{foot}</div>
      </div>
    )
  }

  if (unified) {
    return (
      <div className="min-w-0" aria-labelledby="config-strategic-heading">
        <p
          id="config-strategic-heading"
          className={`${configSettingsSectionKickerClass} m-0`}
          style={{ color: theme.textMuted }}
        >
          Salud, banca y avisos
        </p>
        <div className="flex flex-col divide-y" style={{ borderColor: theme.border }}>
          {togglesBlock}
          {healthBlock}
          {bankBlock}
        </div>
        <div className="space-y-2 px-4 pb-1 pt-2.5 sm:px-5 sm:pb-2 sm:pt-3">{foot}</div>
      </div>
    )
  }

  return (
    <section className="space-y-3" aria-labelledby="config-integraciones-fase1-legacy">
      <h3 id="config-integraciones-fase1-legacy" className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
        Integraciones estratégicas
      </h3>
      <div className="space-y-3">
        {togglesBlock}
        <div className="grid gap-3 lg:grid-cols-2">
          {healthBlock}
          {bankBlock}
        </div>
        {foot}
      </div>
    </section>
  )
}
