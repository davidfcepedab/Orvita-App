"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { type ColorTheme, type LayoutMode, useApp, themes } from "@/app/contexts/AppContext"
import { designTokens } from "@/src/theme/design-tokens"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { createBrowserClient } from "@/lib/supabase/browser"
import { Monitor, Palette, Sliders } from "lucide-react"

export default function ConfigV3() {
  const { colorTheme, setColorTheme, layoutMode, setLayoutMode } = useApp()
  const theme = themes[colorTheme]
  const [intensity, setIntensity] = useState(50)
  const searchParams = useSearchParams()
  const connectedFromParam = searchParams.get("connected") === "google"
  const [googleConnected, setGoogleConnected] = useState(connectedFromParam)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [googleSync, setGoogleSync] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [syncingCalendar, setSyncingCalendar] = useState(false)
  const [syncingTasks, setSyncingTasks] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    if (connectedFromParam) {
      setGoogleConnected(true)
    }
  }, [connectedFromParam])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const supabase = createBrowserClient()
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token || cancelled) return
        const res = await fetch("/api/google/calendar", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = (await res.json()) as { success?: boolean; connected?: boolean }
        if (!cancelled && res.ok && payload.success && payload.connected) {
          setGoogleConnected(true)
        }
      } catch {
        /* sin sesión o red: no cambiar estado */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const factor = 0.6 + (intensity / 100) * 0.8
    document.documentElement.style.setProperty("--motion-factor", factor.toFixed(2))
  }, [intensity])

  const getAccessToken = async () => {
    const supabase = createBrowserClient()
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    const token = data.session?.access_token
    if (!token) throw new Error("Sesión no válida")
    return token
  }

  const handleConnectGoogle = async () => {
    try {
      setGoogleError(null)
      setConnecting(true)
      const token = await getAccessToken()
      const res = await fetch("/api/auth/google/start", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await res.json()) as { success?: boolean; url?: string; error?: string }
      if (!res.ok || !payload.url) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      window.location.href = payload.url
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error conectando Google"
      setGoogleError(message)
    } finally {
      setConnecting(false)
    }
  }

  const handleSync = async (kind: "calendar" | "tasks") => {
    try {
      setGoogleError(null)
      setGoogleSync(null)
      if (kind === "calendar") setSyncingCalendar(true)
      if (kind === "tasks") setSyncingTasks(true)
      const token = await getAccessToken()
      const res = await fetch(`/api/integrations/google/${kind}/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await res.json()) as {
        success?: boolean
        imported?: number
        updated?: number
        error?: string
      }
      if (!res.ok || !payload.success) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      const imported = payload.imported ?? 0
      const updated = payload.updated ?? 0
      setGoogleSync(`${kind === "calendar" ? "Calendario" : "Tareas"}: ${imported} importados, ${updated} actualizados`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error sincronizando"
      setGoogleError(message)
    } finally {
      setSyncingCalendar(false)
      setSyncingTasks(false)
    }
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      const supabase = createBrowserClient()
      await supabase.auth.signOut()
      await fetch("/api/auth/session", { method: "DELETE" })
      window.location.href = "/auth"
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo cerrar sesión"
      setGoogleError(message)
    } finally {
      setLoggingOut(false)
    }
  }

  const themeOptions: { id: ColorTheme; label: string; colors: string[] }[] = [
    {
      id: "arctic",
      label: "Arctic (Claro)",
      colors: [
        designTokens.colors.arctic.background,
        designTokens.colors.arctic["accent-health"],
        designTokens.colors.arctic["accent-finance"],
      ],
    },
    {
      id: "carbon",
      label: "Carbon (Oscuro)",
      colors: [
        designTokens.colors.carbon.background,
        designTokens.colors.carbon["accent-health"],
        designTokens.colors.carbon["accent-finance"],
      ],
    },
    {
      id: "sand",
      label: "Sand (Cálido)",
      colors: [
        designTokens.colors.sand.background,
        designTokens.colors.sand["accent-health"],
        designTokens.colors.sand["accent-finance"],
      ],
    },
    {
      id: "midnight",
      label: "Midnight (Profundo)",
      colors: [themes.midnight.bg, themes.midnight.accent.health, themes.midnight.accent.finance],
    },
  ]

  const layoutOptions: { id: LayoutMode; label: string }[] = [
    { id: "balanced", label: "Balanceado (Estándar)" },
    { id: "compact", label: "Alta densidad (Pro)" },
    { id: "zen", label: "Modo foco (Zen)" },
  ]

  return (
    <div className="mx-auto max-w-4xl space-y-12">
      <div>
        <h2 className="text-3xl tracking-tight">Configuración del sistema</h2>
        <p className="text-sm" style={{ color: theme.textMuted }}>
          Control paramétrico de la interfaz Órbita
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-8">
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
              <Palette className="h-4 w-4" />
              Entorno de color
            </h3>
            <div className="grid gap-3">
              {themeOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setColorTheme(option.id)}
                  className="flex items-center justify-between rounded-xl border p-4"
                  style={{
                    backgroundColor: colorTheme === option.id ? theme.surfaceAlt : theme.surface,
                    borderColor: colorTheme === option.id ? theme.text : theme.border,
                  }}
                >
                  <span className="text-sm">{option.label}</span>
                  <div className="flex gap-1">
                    {option.colors.map((color) => (
                      <div key={color} className="h-4 w-4 rounded-full border" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
              <Monitor className="h-4 w-4" />
              Densidad de datos
            </h3>
            <div className="grid gap-3">
              {layoutOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setLayoutMode(option.id)}
                  className="flex items-center justify-between rounded-xl border p-4"
                  style={{
                    backgroundColor: layoutMode === option.id ? theme.surfaceAlt : theme.surface,
                    borderColor: layoutMode === option.id ? theme.text : theme.border,
                  }}
                >
                  <span className="text-sm">{option.label}</span>
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: layoutMode === option.id ? theme.accent.health : theme.border }} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="flex items-center gap-2 text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
              <Sliders className="h-4 w-4" />
              Intensidad háptica / animaciones
            </h3>
            <div className="rounded-xl border p-6" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="mb-4 flex justify-between text-xs" style={{ color: theme.textMuted }}>
                <span>Sutil</span>
                <span>Inmersivo</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={intensity}
                onChange={(event) => setIntensity(Number(event.target.value))}
                className="w-full cursor-pointer appearance-none rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
              Integraciones
            </h3>
            <div className="rounded-xl border p-6" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
              <p className="text-sm">Google (Calendario + Tareas)</p>
              <p className="text-xs" style={{ color: theme.textMuted }}>
                Conecta tu cuenta para sincronizar agenda y tareas.
              </p>
                </div>
                {googleConnected ? (
                  <span className="text-xs">Google conectado ✅</span>
                ) : (
                  <button
                    onClick={handleConnectGoogle}
                    className="rounded-lg border px-3 py-2 text-xs"
                    style={{ borderColor: theme.border }}
                    disabled={connecting}
                  >
                    {connecting ? "Conectando..." : "Conectar Google"}
                  </button>
                )}
              </div>

              {googleConnected && (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={() => handleSync("calendar")}
                    className="rounded-lg border px-3 py-2 text-xs"
                    style={{ borderColor: theme.border }}
                    disabled={syncingCalendar}
                  >
                    {syncingCalendar ? "Sincronizando..." : "Sincronizar calendario"}
                  </button>
                  <button
                    onClick={() => handleSync("tasks")}
                    className="rounded-lg border px-3 py-2 text-xs"
                    style={{ borderColor: theme.border }}
                    disabled={syncingTasks}
                  >
                    {syncingTasks ? "Sincronizando..." : "Sincronizar tareas"}
                  </button>
                </div>
              )}

              {googleSync && (
                <p className="mt-3 text-xs" style={{ color: theme.textMuted }}>
                  {googleSync}
                </p>
              )}
              {googleError && (
                <p className="mt-3 text-xs" style={{ color: theme.accent.finance }}>
                  {googleError}
                </p>
              )}
            </div>
          </div>
        </div>

          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
              Vista previa
            </h3>
            <div className="flex h-[500px] flex-col gap-6 rounded-3xl border-2 p-8" style={{ backgroundColor: theme.bg, borderColor: theme.border }}>
            <div className="flex items-center justify-between">
              <div className="h-6 w-24 rounded-md" style={{ backgroundColor: theme.surfaceAlt }} />
              <div className="h-8 w-8 rounded-full" style={{ backgroundColor: theme.surfaceAlt }} />
            </div>
            <div className="flex-1 rounded-2xl border p-6" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <div className="mb-6 h-4 w-1/3 rounded" style={{ backgroundColor: theme.textMuted, opacity: 0.2 }} />
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center gap-4">
                    <div
                      className="h-10 w-10 rounded-xl"
                      style={{
                        backgroundColor: item === 1 ? theme.accent.finance : theme.surfaceAlt,
                        opacity: item === 1 ? 1 : 0.5,
                      }}
                    />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded" style={{ backgroundColor: theme.text, opacity: 0.8 }} />
                      <div className="h-2 w-1/2 rounded" style={{ backgroundColor: theme.textMuted, opacity: 0.4 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex h-16 items-center justify-around rounded-2xl border px-4" style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}>
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-6 w-6 rounded" style={{ backgroundColor: theme.textMuted, opacity: item === 1 ? 0.8 : 0.2 }} />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xs uppercase tracking-wider" style={{ color: theme.textMuted }}>
              Sesión
            </h3>
            <div className="rounded-xl border p-6" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="rounded-lg border px-3 py-2 text-xs"
                style={{ borderColor: theme.border }}
              >
                {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
