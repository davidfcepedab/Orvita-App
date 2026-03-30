"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { type ColorTheme, type LayoutMode, useApp, themes } from "@/app/contexts/AppContext"
import { ConfigHouseholdSection } from "@/app/components/orbita-v3/config/ConfigHouseholdSection"
import { ConfigIntegrationsPanel } from "@/app/components/orbita-v3/config/ConfigIntegrationsPanel"
import { designTokens } from "@/src/theme/design-tokens"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { createBrowserClient } from "@/lib/supabase/browser"
import { Monitor, Palette, Sliders } from "lucide-react"
import type { HouseholdMemberDTO } from "@/lib/household/memberTypes"

const HEVY_LAST_SYNC_STORAGE_KEY = "orvita:config:hevyLastSyncIso"

export default function ConfigV3() {
  const { colorTheme, setColorTheme, layoutMode, setLayoutMode } = useApp()
  const theme = themes[colorTheme]
  const [intensity, setIntensity] = useState(50)
  const router = useRouter()
  const searchParams = useSearchParams()
  const connectedFromParam = searchParams.get("connected") === "google"
  const [googleConnected, setGoogleConnected] = useState(connectedFromParam)
  const [googleError, setGoogleError] = useState<string | null>(null)
  const [googleSync, setGoogleSync] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [disconnectingGoogle, setDisconnectingGoogle] = useState(false)
  const [syncingCalendar, setSyncingCalendar] = useState(false)
  const [syncingTasks, setSyncingTasks] = useState(false)
  const [householdInviteCode, setHouseholdInviteCode] = useState<string | null>(null)
  const [householdInviteLoading, setHouseholdInviteLoading] = useState(true)
  const [householdInviteError, setHouseholdInviteError] = useState<string | null>(null)
  const [inviteCopied, setInviteCopied] = useState(false)
  const [members, setMembers] = useState<HouseholdMemberDTO[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [hevyConnected, setHevyConnected] = useState(false)
  const [hevyChecking, setHevyChecking] = useState(true)
  const [hevySyncing, setHevySyncing] = useState(false)
  const [hevyMessage, setHevyMessage] = useState<string | null>(null)
  const [googleLastSyncAt, setGoogleLastSyncAt] = useState<string | null>(null)
  const [hevyLastSyncAt, setHevyLastSyncAt] = useState<string | null>(null)
  const googleRedirectErrorHandled = useRef(false)

  useEffect(() => {
    if (connectedFromParam) {
      setGoogleConnected(true)
    }
  }, [connectedFromParam])

  useEffect(() => {
    if (googleRedirectErrorHandled.current) return
    if (searchParams.get("google_error") !== "1") return
    googleRedirectErrorHandled.current = true
    const raw = searchParams.get("google_error_detail")
    if (raw) {
      try {
        setGoogleError(decodeURIComponent(raw))
      } catch {
        setGoogleError("No se pudo conectar Google. Inténtalo de nuevo o revisa el correo de tu cuenta.")
      }
    } else {
      setGoogleError("No se pudo conectar Google.")
    }
    router.replace("/configuracion", { scroll: false })
  }, [searchParams, router])

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
    let cancelled = false
    ;(async () => {
      try {
        setHouseholdInviteLoading(true)
        setHouseholdInviteError(null)
        const supabase = createBrowserClient()
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) {
          if (!cancelled) {
            setHouseholdInviteLoading(false)
            setHouseholdInviteError("Inicia sesión para ver el código de tu hogar.")
          }
          return
        }
        const res = await fetch("/api/household/invite", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = (await res.json()) as {
          success?: boolean
          data?: { inviteCode: string }
          error?: string
        }
        if (cancelled) return
        if (!res.ok || !payload.success || !payload.data?.inviteCode) {
          throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
        }
        setHouseholdInviteCode(payload.data.inviteCode)
      } catch (e) {
        if (!cancelled) {
          setHouseholdInviteCode(null)
          setHouseholdInviteError(e instanceof Error ? e.message : "No se pudo cargar el código")
        }
      } finally {
        if (!cancelled) setHouseholdInviteLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setMembersLoading(true)
        setMembersError(null)
        const supabase = createBrowserClient()
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) {
          if (!cancelled) {
            setMembersLoading(false)
            setMembersError("Inicia sesión para ver a tu hogar.")
          }
          return
        }
        const res = await fetch("/api/household/members", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = (await res.json()) as {
          success?: boolean
          data?: { members: HouseholdMemberDTO[] }
          error?: string
        }
        if (cancelled) return
        if (!res.ok || !payload.success || !payload.data?.members) {
          throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
        }
        setMembers(payload.data.members)
      } catch (e) {
        if (!cancelled) {
          setMembers([])
          setMembersError(e instanceof Error ? e.message : "No se pudieron cargar los miembros")
        }
      } finally {
        if (!cancelled) setMembersLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setHevyChecking(true)
        setHevyMessage(null)
        const supabase = createBrowserClient()
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token
        if (!token) {
          if (!cancelled) setHevyConnected(false)
          return
        }
        const res = await fetch("/api/integrations/hevy/workouts", {
          cache: "no-store",
          headers: { Authorization: `Bearer ${token}` },
        })
        const payload = (await res.json()) as { success?: boolean }
        if (!cancelled) {
          setHevyConnected(res.ok && payload.success === true)
          if (!res.ok || !payload.success) {
            setHevyMessage("No hay respuesta válida de Hevy (revisa API del servidor o modo mock).")
          }
        }
      } catch {
        if (!cancelled) {
          setHevyConnected(false)
          setHevyMessage("No se pudo comprobar Hevy.")
        }
      } finally {
        if (!cancelled) setHevyChecking(false)
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

  useEffect(() => {
    try {
      const v = window.localStorage.getItem(HEVY_LAST_SYNC_STORAGE_KEY)
      if (v) setHevyLastSyncAt(v)
    } catch {
      /* ignore */
    }
  }, [])

  const getAccessToken = async () => {
    const supabase = createBrowserClient()
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    const token = data.session?.access_token
    if (!token) throw new Error("Sesión no válida")
    return token
  }

  const refreshGoogleLastSync = useCallback(async () => {
    try {
      const supabase = createBrowserClient()
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) return
      const res = await fetch("/api/integrations/google/last-sync", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await res.json()) as { success?: boolean; lastSyncAt?: string | null }
      if (res.ok && payload.success) {
        setGoogleLastSyncAt(payload.lastSyncAt ?? null)
      }
    } catch {
      /* sin red o sesión */
    }
  }, [])

  useEffect(() => {
    void refreshGoogleLastSync()
  }, [refreshGoogleLastSync, googleConnected])

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

  const handleDisconnectGoogle = async () => {
    try {
      setGoogleError(null)
      setGoogleSync(null)
      setDisconnectingGoogle(true)
      const token = await getAccessToken()
      const res = await fetch("/api/integrations/google/disconnect", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await res.json()) as { success?: boolean; error?: string }
      if (!res.ok || !payload.success) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      setGoogleConnected(false)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "No se pudo desconectar Google"
      setGoogleError(message)
    } finally {
      setDisconnectingGoogle(false)
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
      await refreshGoogleLastSync()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error sincronizando"
      setGoogleError(message)
    } finally {
      setSyncingCalendar(false)
      setSyncingTasks(false)
    }
  }

  const handleHevySync = async () => {
    try {
      setHevyMessage(null)
      setHevySyncing(true)
      const token = await getAccessToken()
      const res = await fetch("/api/integrations/hevy/workouts", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await res.json()) as { success?: boolean; trainingDays?: unknown[] }
      if (!res.ok || !payload.success) {
        setHevyConnected(false)
        throw new Error("Sincronización Hevy no disponible")
      }
      setHevyConnected(true)
      const n = Array.isArray(payload.trainingDays) ? payload.trainingDays.length : 0
      setHevyMessage(`Sincronizado: ${n} día(s) con datos recientes.`)
      const now = new Date().toISOString()
      setHevyLastSyncAt(now)
      try {
        window.localStorage.setItem(HEVY_LAST_SYNC_STORAGE_KEY, now)
      } catch {
        /* ignore */
      }
    } catch (error: unknown) {
      setHevyMessage(error instanceof Error ? error.message : "Error sincronizando Hevy")
    } finally {
      setHevySyncing(false)
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
    <div className="mx-auto max-w-5xl space-y-12">
      <header>
        <h2 className="text-3xl font-medium tracking-tight" style={{ color: theme.text }}>
          Configuración del sistema
        </h2>
        <p className="mt-2 text-sm leading-relaxed" style={{ color: theme.textMuted }}>
          Control paramétrico de la interfaz Órbita
        </p>
      </header>

      <ConfigHouseholdSection
        theme={theme}
        householdInviteLoading={householdInviteLoading}
        householdInviteCode={householdInviteCode}
        householdInviteError={householdInviteError}
        inviteCopied={inviteCopied}
        onCopyInvite={() => {
          if (!householdInviteCode) return
          void navigator.clipboard.writeText(householdInviteCode).then(() => {
            setInviteCopied(true)
            window.setTimeout(() => setInviteCopied(false), 2500)
          })
        }}
        members={members}
        membersLoading={membersLoading}
        membersError={membersError}
      />

      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start">
        <div className="space-y-14">
          {/* 2. Entorno de color */}
          <div className="space-y-4">
            <h3
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em]"
              style={{ color: theme.textMuted }}
            >
              <Palette className="h-4 w-4 shrink-0" aria-hidden />
              Entorno de color
            </h3>
            <div className="grid gap-3">
              {themeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setColorTheme(option.id)}
                  className="flex items-center justify-between rounded-2xl border p-4 text-left transition-colors"
                  style={{
                    backgroundColor: colorTheme === option.id ? theme.surfaceAlt : theme.surface,
                    borderColor: colorTheme === option.id ? theme.text : theme.border,
                    boxShadow: colorTheme === option.id ? "0 1px 0 rgba(15, 23, 42, 0.06)" : undefined,
                  }}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  <div className="flex gap-1">
                    {option.colors.map((color) => (
                      <div key={color} className="h-4 w-4 rounded-full border" style={{ backgroundColor: color }} />
                    ))}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 3. Densidad de datos */}
          <div className="space-y-4">
            <h3
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em]"
              style={{ color: theme.textMuted }}
            >
              <Monitor className="h-4 w-4 shrink-0" aria-hidden />
              Densidad de datos
            </h3>
            <div className="grid gap-3">
              {layoutOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLayoutMode(option.id)}
                  className="flex items-center justify-between rounded-2xl border p-4 text-left transition-colors"
                  style={{
                    backgroundColor: layoutMode === option.id ? theme.surfaceAlt : theme.surface,
                    borderColor: layoutMode === option.id ? theme.text : theme.border,
                    boxShadow: layoutMode === option.id ? "0 1px 0 rgba(15, 23, 42, 0.06)" : undefined,
                  }}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                  <div
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: layoutMode === option.id ? theme.accent.health : theme.border }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* 4. Intensidad háptica / animaciones */}
          <div className="space-y-4">
            <h3
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em]"
              style={{ color: theme.textMuted }}
            >
              <Sliders className="h-4 w-4 shrink-0" aria-hidden />
              Intensidad háptica / animaciones
            </h3>
            <div
              className="rounded-2xl border p-6 sm:p-8"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04)",
              }}
            >
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

          {/* 5. Integraciones */}
          <ConfigIntegrationsPanel
            theme={theme}
            googleConnected={googleConnected}
            googleError={googleError}
            googleSync={googleSync}
            connecting={connecting}
            disconnectingGoogle={disconnectingGoogle}
            syncingCalendar={syncingCalendar}
            syncingTasks={syncingTasks}
            onConnectGoogle={() => void handleConnectGoogle()}
            onDisconnectGoogle={() => void handleDisconnectGoogle()}
            onSyncCalendar={() => void handleSync("calendar")}
            onSyncTasks={() => void handleSync("tasks")}
            hevyConnected={hevyConnected}
            hevyChecking={hevyChecking}
            hevySyncing={hevySyncing}
            hevyMessage={hevyMessage}
            onHevySync={() => void handleHevySync()}
            googleLastSyncAt={googleLastSyncAt}
            hevyLastSyncAt={hevyLastSyncAt}
          />
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24">
          <h3 className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
            Vista previa
          </h3>
          <div
            className="flex min-h-[420px] flex-col gap-6 rounded-3xl border-2 p-6 lg:min-h-[500px]"
            style={{ backgroundColor: theme.bg, borderColor: theme.border }}
          >
            <div className="flex items-center justify-between">
              <div className="h-6 w-24 rounded-md" style={{ backgroundColor: theme.surfaceAlt }} />
              <div className="h-8 w-8 rounded-full" style={{ backgroundColor: theme.surfaceAlt }} />
            </div>
            <div className="flex-1 rounded-2xl border p-5" style={{ backgroundColor: theme.surface, borderColor: theme.border }}>
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
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3 w-3/4 max-w-[85%] rounded" style={{ backgroundColor: theme.text, opacity: 0.8 }} />
                      <div className="h-2 w-1/2 max-w-[60%] rounded" style={{ backgroundColor: theme.textMuted, opacity: 0.4 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div
              className="flex h-14 items-center justify-around rounded-2xl border px-3"
              style={{ backgroundColor: theme.surfaceAlt, borderColor: theme.border }}
            >
              {[1, 2, 3, 4].map((item) => (
                <div
                  key={item}
                  className="h-6 w-6 rounded"
                  style={{ backgroundColor: theme.textMuted, opacity: item === 1 ? 0.8 : 0.2 }}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
