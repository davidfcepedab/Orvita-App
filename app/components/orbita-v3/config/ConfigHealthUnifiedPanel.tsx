"use client"

import { useCallback, useEffect, useState } from "react"
import { CheckCircle2, HeartPulse, RefreshCw } from "lucide-react"
import { ConfigSettingsSection } from "@/app/components/orbita-v3/config/ConfigSettingsSection"
import type { OrbitaThemeSkin } from "@/app/contexts/AppContext"
import { browserBearerHeaders } from "@/lib/api/browserBearerHeaders"
import { configConnectionActionClass } from "@/lib/config/configSettingsUi"
import { formatRelativeSyncAgo } from "@/lib/time/formatRelativeSyncAgo"
import { ConfigAppleShortcutPanel } from "./ConfigAppleShortcutPanel"

type IntegrationSettings = {
  health_enabled: boolean
  updated_at: string | null
}

const defaultSettings: IntegrationSettings = {
  health_enabled: false,
  updated_at: null,
}

export function ConfigHealthUnifiedPanel({
  theme,
  /** Solo atajo + nota; el sync en servidor vive en el panel estratégico. */
  embedInStrategic = false,
}: {
  theme: OrbitaThemeSkin
  embedInStrategic?: boolean
}) {
  const [settings, setSettings] = useState<IntegrationSettings>(defaultSettings)
  const [healthConnected, setHealthConnected] = useState(false)
  const [healthLastSync, setHealthLastSync] = useState<string | null>(null)
  const [healthSource, setHealthSource] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const headers = await browserBearerHeaders()
    const [settingsRes, healthRes] = await Promise.all([
      fetch("/api/integrations/settings", { headers, cache: "no-store" }),
      fetch("/api/integrations/health/metrics", { headers, cache: "no-store" }),
    ])

    const settingsPayload = (await settingsRes.json()) as { success?: boolean; settings?: IntegrationSettings; error?: string }
    if (!settingsRes.ok || !settingsPayload.success || !settingsPayload.settings) {
      throw new Error(settingsPayload.error ?? "No se pudo cargar configuración de salud")
    }
    setSettings(settingsPayload.settings)

    const healthPayload = (await healthRes.json()) as {
      success?: boolean
      latest?: { observed_at?: string | null; source?: string | null } | null
    }
    setHealthConnected(Boolean(healthPayload.success && healthPayload.latest))
    setHealthLastSync(healthPayload.latest?.observed_at ?? null)
    setHealthSource(healthPayload.latest?.source ?? null)
  }, [])

  useEffect(() => {
    void load().catch((e) => setError(e instanceof Error ? e.message : "No se pudo cargar Salud"))
  }, [load])

  const toggleHealth = async () => {
    setBusy("settings")
    setError(null)
    setNotice(null)
    try {
      const headers = await browserBearerHeaders(true)
      const res = await fetch("/api/integrations/settings", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ health_enabled: !settings.health_enabled }),
      })
      const payload = (await res.json()) as { success?: boolean; settings?: IntegrationSettings; error?: string }
      if (!res.ok || !payload.success || !payload.settings) throw new Error(payload.error ?? "No se pudo actualizar Salud")
      setSettings(payload.settings)
      setNotice(payload.settings.health_enabled ? "Salud automática activada." : "Salud automática desactivada.")
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error actualizando Salud")
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
      const payload = (await res.json()) as { success?: boolean; syncedAt?: string; source?: string; error?: string; connectionLabel?: string }
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "No se pudo sincronizar salud")
      setHealthConnected(true)
      setHealthLastSync(payload.syncedAt ?? new Date().toISOString())
      setHealthSource(payload.source ?? healthSource)
      setNotice(payload.connectionLabel ?? (payload.source === "apple_health_export" ? "Conectado vía Apple Health." : "Conectado vía Google Fit."))
    } catch (e) {
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
      const payload = (await res.json()) as { success?: boolean; imported?: number; error?: string; notice?: string }
      if (!res.ok || !payload.success) throw new Error(payload.error ?? "No se pudo importar Apple Health")
      await load()
      setNotice(payload.notice ?? `Apple Health importado (${payload.imported ?? 0} registro(s)).`)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error importando Apple Health")
    } finally {
      setBusy(null)
    }
  }

  if (embedInStrategic) {
    return (
      <div
        className="px-3 py-3 sm:px-4 sm:py-4"
        data-orvita-section="health-iphone-shortcut-embed"
        style={{ color: theme.text }}
      >
        <div className="mb-3 flex min-w-0 items-start gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: theme.surfaceAlt, color: theme.accent.health }}
            aria-hidden
          >
            <HeartPulse className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="m-0 text-sm font-medium leading-snug" style={{ color: theme.text }}>
              Atajo en el iPhone
            </p>
            <p className="m-0 mt-0.5 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
              Instala y ejecuta. Luego sincroniza abajo.
            </p>
          </div>
        </div>
        <div className="min-w-0">
          <ConfigAppleShortcutPanel theme={theme} moduleCard />
        </div>
      </div>
    )
  }

  return (
    <ConfigSettingsSection
      theme={theme}
      title="Salud"
      description="Instala el atajo en el iPhone y sincroniza Apple Health o Google Fit en un mismo bloque."
      icon={<HeartPulse className="h-4 w-4" aria-hidden />}
      container="card"
      listStyle="insetGrouped"
      dataOrvitaSection="health-iphone-shortcut"
    >
      <div className="space-y-3">
        <ConfigAppleShortcutPanel theme={theme} moduleCard />
        <div className="rounded-xl border px-3 py-3 sm:px-4 sm:py-3.5" style={{ borderColor: theme.border, backgroundColor: theme.surface }}>
          <p className="text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: theme.textMuted }}>
            Permisos en Salud → Atajos
          </p>
          <p className="mt-1 text-[11px] leading-relaxed sm:text-xs" style={{ color: theme.textMuted }}>
            El atajo oficial envía: pasos, minutos de ejercicio, energía activa, HRV, FC en reposo y entrenamientos. El agregado automático de sueño se omitió
            en Atajos (provocaba «Acción desconocida» en muchos dispositivos); puedes añadir sueño a mano en el flujo o en la guía. En Salud → Atajos, activa
            lectura de lo que vayas a leer.
            Otras métricas (peso, SpO2, presión, etc.) pueden enviarse como números extra en el JSON; hoy se guardan en metadatos, no en columnas
            principales.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed sm:text-xs" style={{ color: theme.textMuted }}>
            “Acción desconocida” o un diccionario con “0 elementos” no se arregla dando más permisos: el flujo del atajo está roto o incompleto. Borra
            copias viejas, reinstala el .shortcut desde Órvita en Safari y vuelve a probar.
          </p>
        </div>
      </div>

      <div
        className="space-y-3 rounded-xl px-2 pb-1 pt-2 sm:px-3 sm:pt-3"
        data-orvita-subsection="health-server-sync"
        style={{ backgroundColor: theme.surface, color: theme.text }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: theme.surfaceAlt, color: theme.accent.health }} aria-hidden>
              <HeartPulse className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold leading-snug" style={{ color: theme.text }}>
                Apple Health + Google Fit
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed sm:text-xs" style={{ color: theme.textMuted }}>
                Importa desde el atajo o sincroniza según los ajustes del servidor.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void toggleHealth()}
            disabled={busy === "settings"}
            className={configConnectionActionClass}
            style={{
              borderColor: settings.health_enabled ? theme.accent.health : theme.border,
              color: settings.health_enabled ? "#fff" : theme.text,
              backgroundColor: settings.health_enabled ? theme.accent.health : theme.surfaceAlt,
              whiteSpace: "nowrap",
            }}
          >
            {busy === "settings" ? "…" : settings.health_enabled ? "On · Salud automática" : "Off · Salud automática"}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => void connectAppleHealth()}
            disabled={busy === "apple-connect" || !settings.health_enabled}
            className={configConnectionActionClass}
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
            title="Marca Apple Health como conexión activa en el servidor."
          >
            {busy === "apple-connect" ? "…" : "Conectar Apple"}
          </button>
          <button
            type="button"
            onClick={() => void importAppleSample()}
            disabled={busy === "apple-import" || !settings.health_enabled}
            className={configConnectionActionClass}
            style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
            title="No ejecuta el atajo del iPhone: POST al import con cuerpo vacío (diagnóstico). Datos reales: atajo en Configuración."
          >
            {busy === "apple-import" ? "…" : "Probar import (web)"}
          </button>
          <button
            type="button"
            onClick={() => void syncHealth()}
            disabled={busy === "health" || !settings.health_enabled}
            className={configConnectionActionClass}
            style={{ borderColor: theme.accent.health, backgroundColor: theme.accent.health, color: "#fff" }}
            title="Refresca estado según última importación Apple o Google Fit."
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {busy === "health" ? "…" : "Sync salud"}
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px]" style={{ color: theme.textMuted }}>
          {healthConnected && <CheckCircle2 className="h-4 w-4 shrink-0" style={{ color: theme.accent.health }} aria-label="Conectado" />}
          <span>
            {formatRelativeSyncAgo(healthLastSync)} ·{" "}
            {healthSource === "apple_health_export" ? "Apple" : healthSource === "google_fit" ? "Google Fit" : "Sin datos"}
          </span>
        </div>

        {notice ? (
          <p className="text-[11px]" style={{ color: theme.textMuted }}>
            {notice}
          </p>
        ) : null}
        {error ? (
          <p className="text-[11px]" style={{ color: theme.accent.finance }}>
            {error}
          </p>
        ) : null}
      </div>
    </ConfigSettingsSection>
  )
}
