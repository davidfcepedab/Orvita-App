"use client"

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { CheckCircle2, HeartPulse, Landmark, RefreshCw } from "lucide-react"
import { ConfigAccordion, type ConfigAccordionCardVariant } from "@/app/components/orbita-v3/config/ConfigAccordion"
import { ConfigConnectionPill } from "@/app/components/orbita-v3/config/ConfigConnectionPill"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"
import { configConnectionActionClass, configSettingsSectionKickerClass } from "@/lib/config/configSettingsUi"
import { formatRelativeSyncAgo } from "@/lib/time/formatRelativeSyncAgo"

/** Relativo breve para una línea bajo el título "Salud" (muestra / import, no solo "sync" servidor). */
function formatShortSampleAgo(iso: string | null | undefined): string {
  if (!iso) return "sin fecha"
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return "sin fecha"
  const diff = Date.now() - t
  if (diff < 0) return "reciente"
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "hace un momento"
  if (min < 60) return `hace ${min} min`
  const hrs = Math.floor(min / 60)
  if (hrs < 48) return `hace ${hrs} h`
  const days = Math.floor(hrs / 24)
  return `hace ${days} d`
}

function healthSourceLabel(source: string | null | undefined) {
  if (source === "apple_health_export") return "Apple"
  if (source === "google_fit") return "Google Fit"
  return "—"
}

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
  { key: "banking_enabled", label: "Banca abierta (Belvo Sandbox)" },
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
  cardVariant = "default" as ConfigAccordionCardVariant,
}: {
  theme: OrbitaConfigTheme
  /** Misma columna que Google/Hevy, separada por líneas. */
  unified?: boolean
  /** Oculta el bloque de Salud (se usa en la tarjeta unificada de Salud). */
  showHealth?: boolean
  layout?: "default" | "accordions"
  beforeHealthServer?: ReactNode
  /** Alinea sombras con otras conexiones (`?v=1` en configuración). */
  cardVariant?: ConfigAccordionCardVariant
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
  const [loadPending, setLoadPending] = useState(true)
  const toggleOptions = showHealth ? TOGGLE_OPTIONS : TOGGLE_OPTIONS.filter((item) => item.key !== "health_enabled")

  const load = useCallback(async () => {
    setLoadPending(true)
    try {
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
    } finally {
      setLoadPending(false)
    }
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

  const syncBankingOnly = async () => {
    setBusy("bank-sync")
    setError(null)
    setNotice(null)
    try {
      const headers = await browserBearerHeaders()
      const syncRes = await fetch("/api/integrations/banking/sync", { method: "POST", headers })
      const syncPayload = (await syncRes.json()) as { success?: boolean; error?: string }
      if (!syncRes.ok || !syncPayload.success) {
        throw new Error(syncPayload.error ?? "No se pudo sincronizar banca")
      }
      await load()
      setNotice("Belvo Sandbox: sincronización completada.")
    } catch (e) {
      setLastFailedAction("banking")
      setError(e instanceof Error ? e.message : "Error sincronizando banca")
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
        body: JSON.stringify({ provider, flow: "register" }),
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

  const makeTogglesBlock = (
    keys: ToggleKey[],
    compactCopy: string | undefined,
    layout: "default" | "accordion",
  ) => {
    if (layout === "accordion") {
      return (
        <div className="border-b px-4 py-3 sm:px-5 sm:py-3.5" style={{ borderColor: theme.border }}>
          {compactCopy ? (
            <p className="m-0 mb-2 text-[11px] leading-relaxed sm:text-xs" style={{ color: theme.textMuted }}>
              {compactCopy}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-1.5">
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
                  className="inline-flex min-h-8 items-center justify-center rounded-full border px-3 py-1 text-[11px] font-medium transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
                  style={{
                    borderColor: settings[item.key] ? theme.accent.health : theme.border,
                    color: settings[item.key] ? "#fff" : theme.text,
                    backgroundColor: settings[item.key] ? theme.accent.health : theme.surfaceAlt,
                    boxShadow: "none",
                  }}
                >
                  {item.label}
                </button>
              ))}
          </div>
        </div>
      )
    }
    return (
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
                {item.label}
              </button>
            ))}
        </div>
      </div>
    )
  }

  const togglesBlock = makeTogglesBlock(toggleOptions.map((o) => o.key), undefined, "default")

  const healthBlock = !showHealth
    ? null
    : (
      <div
        className={unified ? "px-4 py-3.5 sm:px-5 sm:py-4" : "rounded-2xl border p-5"}
        style={unified ? undefined : { backgroundColor: theme.surface, borderColor: theme.border }}
        data-orvita-subsection="health-server-sync"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ backgroundColor: theme.surfaceAlt, color: theme.accent.health }}
              aria-hidden
            >
              <HeartPulse className="h-4 w-4" />
            </span>
            <div>
              <p className="min-w-0 text-sm font-semibold leading-snug" style={{ color: theme.text }}>
                Apple Health + Google Fit
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
                Sincroniza o importa desde el atajo.
              </p>
            </div>
          </div>
          {healthConnected ? <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: theme.accent.health }} aria-label="Conectado" /> : null}
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
          <button
            type="button"
            onClick={() => void connectAppleHealth()}
            disabled={busy === "apple-connect" || !settings.health_enabled}
            className={configConnectionActionClass}
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
            title="Marca Apple Health como conexión activa en el servidor (prioridad import / atajo)."
          >
            {busy === "apple-connect" ? "…" : "Conectar Apple"}
          </button>
          <button
            type="button"
            onClick={() => void importAppleSample()}
            disabled={busy === "apple-import" || !settings.health_enabled}
            className={configConnectionActionClass}
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
            title="No usa el atajo del iPhone: solo llama al endpoint de import con cuerpo vacío (diagnóstico). Datos reales: atajo + token arriba."
          >
            {busy === "apple-import" ? "…" : "Probar import (web)"}
          </button>
          <button
            type="button"
            onClick={() => void syncHealth()}
            disabled={busy === "health" || !settings.health_enabled}
            className={configConnectionActionClass}
            style={{ borderColor: theme.accent.health, backgroundColor: theme.accent.health, color: "#fff" }}
            title="Si ya importaste desde el iPhone, refresca estado; si no hay Apple, intenta Google Fit o semilla de respaldo según tu cuenta."
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {busy === "health" ? "…" : "Sincronizar salud"}
          </button>
        </div>
        <p className="mt-2.5 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
          {healthLastSync
            ? `Origen: ${healthSourceLabel(healthSource)} · ${formatShortSampleAgo(healthLastSync)} (muestra).`
            : "Sin filas aún. Usa el atajo o los botones de arriba."}
        </p>
      </div>
    )

  const healthBlockAccordion = !showHealth
    ? null
    : (
        <div
          className="px-4 py-3.5 sm:px-5 sm:py-4"
          style={unified ? undefined : { backgroundColor: theme.surface, borderColor: theme.border }}
          data-orvita-subsection="health-server-sync"
        >
          <div className="flex min-w-0 flex-row items-start justify-between gap-3 sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="m-0 text-sm font-medium" style={{ color: theme.text }}>
                Apple y Google
              </p>
              <p className="m-0 mt-0.5 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
                Estado y sincronización rápida.
              </p>
            </div>
            <button
              type="button"
              disabled={busy === "settings"}
              onClick={() => void patchSettings({ health_enabled: !settings.health_enabled })}
              className="shrink-0 select-none rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] transition [transition-property:box-shadow,transform,opacity] active:scale-[0.99] disabled:pointer-events-none disabled:opacity-40"
              style={{
                borderColor: settings.health_enabled ? theme.accent.health : theme.border,
                color: settings.health_enabled ? "#fff" : theme.textMuted,
                backgroundColor: settings.health_enabled ? theme.accent.health : theme.surfaceAlt,
                boxShadow: settings.health_enabled ? "none" : "0 1px 0 rgba(15,23,42,0.04)",
              }}
              aria-pressed={settings.health_enabled}
              title="Activa o desactiva el módulo Salud en el servidor."
            >
              {settings.health_enabled ? "Activo" : "Activar"}
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => void syncHealth()}
              disabled={busy === "health" || !settings.health_enabled}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-semibold transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
              style={{ borderColor: theme.accent.health, backgroundColor: theme.accent.health, color: "#fff" }}
              title="Refresca estado con la fuente disponible."
            >
              {busy === "health" ? "…" : "Sincronizar"}
            </button>
            <button
              type="button"
              onClick={() => void connectAppleHealth()}
              disabled={busy === "apple-connect" || !settings.health_enabled}
              className="inline-flex min-h-9 items-center justify-center rounded-lg border px-3 py-1.5 text-xs font-medium transition hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
              style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
              title="Marca Apple Health como fuente preferida."
            >
              {busy === "apple-connect" ? "…" : "Conectar Apple"}
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
            {healthLastSync
              ? `Origen: ${healthSourceLabel(healthSource)} · ${formatShortSampleAgo(healthLastSync)}.`
              : "Sin muestras todavía. Usa el atajo y luego sincroniza."}
          </p>
        </div>
      )

  const bankBlock = (
    <div
      className={unified ? "px-4 py-3.5 sm:px-5 sm:py-4" : "rounded-2xl border p-5"}
      style={unified ? undefined : { backgroundColor: theme.surface, borderColor: theme.border }}
    >
      <p className="m-0 text-sm font-medium" style={{ color: theme.text }}>
        Banca abierta (Belvo Sandbox)
      </p>
      <p className="m-0 mt-1 text-[11px] leading-relaxed sm:text-xs" style={{ color: theme.textMuted }}>
        Agregación en sandbox: credenciales en servidor, link y widget según Belvo. Colombia (Bancolombia, Davivienda, Nequi) según institución configurada en Vercel.
      </p>
      <p className="m-0 mt-2 text-[11px] leading-relaxed sm:text-xs" style={{ color: theme.textMuted }}>
        <span style={{ color: theme.text }}>username_type:</span> Órvita envía{" "}
        <span className="font-semibold" style={{ color: theme.text }}>
          103
        </span>{" "}
        por defecto (variable <span style={{ color: theme.text }}>BANKING_BELVO_SANDBOX_USERNAME_TYPE</span> si Belvo
        exige 104). País{" "}
        <span className="font-semibold" style={{ color: theme.text }}>
          BR (mock)
        </span>{" "}
        en sandbox. CO se activará cuando tu tenant Belvo tenga catálogo Colombia.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => void syncBankingOnly()}
          disabled={busy === "bank-sync" || !settings.banking_enabled || bankAccounts.length === 0}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold transition hover:-translate-y-[1px] hover:shadow-sm disabled:pointer-events-none disabled:opacity-40"
          style={{ borderColor: theme.accent.finance, color: "#fff", backgroundColor: theme.accent.finance }}
          title="Importar movimientos y actualizar saldos desde Belvo."
        >
          <RefreshCw className="h-3 w-3.5" aria-hidden />
          {busy === "bank-sync" ? "…" : "Sincronizar ahora"}
        </button>
        {(["bancolombia", "davivienda", "nequi"] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => void connectBank(provider)}
            disabled={busy === `bank-${provider}` || !settings.banking_enabled}
            className="inline-flex min-h-8 min-w-[8.25rem] items-center justify-between gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition hover:-translate-y-[1px] hover:shadow-sm disabled:pointer-events-none disabled:opacity-40"
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
            title={`Registrar link sandbox · ${provider}`}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accent.finance }} />
            <span>{busy === `bank-${provider}` ? "…" : provider[0].toUpperCase() + provider.slice(1)}</span>
          </button>
        ))}
      </div>
      <p className="mt-2.5 text-[11px]" style={{ color: theme.textMuted }}>
        {bankAccounts.length > 0
          ? `${bankAccounts.length} cuenta(s) vía Belvo Sandbox · ${formatRelativeSyncAgo(bankLastSync)}`
          : `Sin cuentas · ${formatRelativeSyncAgo(bankLastSync)}`}
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

  const showStrategicLoadError = Boolean(error && lastFailedAction === null && !loadPending)

  const healthClosedLine = useMemo(() => {
    if (loadPending) return "Comprobando estado…"
    if (!settings.health_enabled) return "Módulo apagado en el servidor"
    if (!healthConnected) return "Sin muestras en el servidor aún"
    return `${healthSourceLabel(healthSource)} · ${formatShortSampleAgo(healthLastSync)}`
  }, [loadPending, settings.health_enabled, healthConnected, healthSource, healthLastSync])

  const finanzasPill =
    error && (lastFailedAction === "banking" || showStrategicLoadError) ? (
      <ConfigConnectionPill state="error" errorLabel="Revisar" />
    ) : !settings.banking_enabled ? (
      <ConfigConnectionPill state="disabled" disconnectedLabel="Banca inactiva" />
    ) : bankAccounts.length > 0 ? (
      <ConfigConnectionPill state="connected" connectedLabel="Belvo listo" />
    ) : (
      <ConfigConnectionPill state="disconnected" disconnectedLabel="Conectar" />
    )

  const saludPill =
    error && lastFailedAction === "health" ? (
      <ConfigConnectionPill state="error" errorLabel="Revisar" />
    ) : loadPending ? (
      <ConfigConnectionPill state="checking" />
    ) : !settings.health_enabled ? (
      <ConfigConnectionPill state="disabled" disconnectedLabel="Módulo off" />
    ) : healthConnected ? (
      <ConfigConnectionPill state="connected" connectedLabel="Con muestras" />
    ) : (
      <ConfigConnectionPill state="disconnected" disconnectedLabel="Pendiente" />
    )

  if (unified && layout === "accordions") {
    return (
      <div className="min-w-0 space-y-2" data-orvita-section="strategic-integrations-accordion" aria-label="Módulos y banca">
        <ConfigAccordion
          theme={theme}
          cardVariant={cardVariant}
          leadingContainerStyle={{ backgroundColor: "rgba(56, 189, 248, 0.14)" }}
          leading={<Landmark className="h-4 w-4" style={{ color: theme.accent.finance }} />}
          title="Finanzas"
          description="Banca en Colombia, Nequi, avisos"
          trailing={finanzasPill}
        >
          <div className="flex flex-col gap-0">
            {makeTogglesBlock(
              ["banking_enabled", "push_enhanced_enabled"],
              "Banca abierta (Belvo Sandbox) y avisos del sistema.",
              "accordion",
            )}
            {bankBlock}
          </div>
        </ConfigAccordion>

        {showHealth ? (
          <ConfigAccordion
            id="acordeon-config-salud-integracion"
            theme={theme}
            cardVariant={cardVariant}
            leadingContainerStyle={{ backgroundColor: "rgba(16, 185, 129, 0.14)" }}
            leading={<HeartPulse className="h-4 w-4" style={{ color: theme.accent.health }} />}
            title="Salud"
            description={healthClosedLine}
            trailing={saludPill}
          >
            <div className="flex flex-col gap-0" data-orvita-subsection="health-unified-wrap">
              {beforeHealthServer ? (
                <div className="px-0 pb-0 pt-0">{beforeHealthServer}</div>
              ) : null}
              {healthBlockAccordion}
            </div>
          </ConfigAccordion>
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
