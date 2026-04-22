"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  type ColorTheme,
  type LayoutMode,
  useApp,
  useOrbitaSkin,
  themes,
} from "@/app/contexts/AppContext"
import { OrbitaImageCropDialog } from "@/app/components/OrbitaImageCropDialog"
import { ConfigHouseholdSection } from "@/app/components/orbita-v3/config/ConfigHouseholdSection"
import { ConfigIntegrationsPanel } from "@/app/components/orbita-v3/config/ConfigIntegrationsPanel"
import { ConfigStrategicIntegrationsPanel } from "@/app/components/orbita-v3/config/ConfigStrategicIntegrationsPanel"
import { ConfigNotificationPreferencesPanel } from "@/app/components/orbita-v3/config/ConfigNotificationPreferencesPanel"
import { ConfigPwaInstallPanel } from "@/app/components/orbita-v3/config/ConfigPwaInstallPanel"
import { ConfigPasskeyPanel } from "@/app/components/orbita-v3/config/ConfigPasskeyPanel"
import { designTokens } from "@/src/theme/design-tokens"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { createBrowserClient } from "@/lib/supabase/browser"
import Link from "next/link"
import { ChevronRight, Monitor, Palette, Sliders, Sparkles } from "lucide-react"
import { defaultCustomPalette, normalizeHex, type CustomPalette } from "@/lib/theme/customPalette"
import type { HouseholdMemberDTO } from "@/lib/household/memberTypes"

const HEVY_LAST_SYNC_STORAGE_KEY = "orvita:config:hevyLastSyncIso"

export default function ConfigV3() {
  const { colorTheme, setColorTheme, layoutMode, setLayoutMode, customPalette, setCustomPalette } = useApp()
  const theme = useOrbitaSkin()
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
  const [familyPhotoUrl, setFamilyPhotoUrl] = useState<string | null>(null)
  const [familyPhotoBusy, setFamilyPhotoBusy] = useState(false)
  const [familyPhotoError, setFamilyPhotoError] = useState<string | null>(null)
  const [familyCropOpen, setFamilyCropOpen] = useState(false)
  const [familyCropFile, setFamilyCropFile] = useState<File | null>(null)
  const [paletteDraft, setPaletteDraft] = useState<CustomPalette>(() => defaultCustomPalette())

  useEffect(() => {
    setPaletteDraft(customPalette)
  }, [customPalette])
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
          data?: { inviteCode: string; familyPhotoUrl?: string | null }
          error?: string
        }
        if (cancelled) return
        if (!res.ok || !payload.success || !payload.data?.inviteCode) {
          throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
        }
        setHouseholdInviteCode(payload.data.inviteCode)
        setFamilyPhotoUrl(
          typeof payload.data.familyPhotoUrl === "string" && payload.data.familyPhotoUrl.trim()
            ? payload.data.familyPhotoUrl.trim()
            : null,
        )
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

  const handleUploadFamilyPhoto = async (file: File) => {
    try {
      setFamilyPhotoError(null)
      setFamilyPhotoBusy(true)
      const token = await getAccessToken()
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/household/family-photo", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      const payload = (await res.json()) as {
        success?: boolean
        data?: { familyPhotoUrl?: string }
        error?: string
      }
      if (!res.ok || !payload.success || !payload.data?.familyPhotoUrl) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      setFamilyPhotoUrl(payload.data.familyPhotoUrl)
    } catch (e) {
      setFamilyPhotoError(e instanceof Error ? e.message : "No se pudo subir la foto del hogar")
    } finally {
      setFamilyPhotoBusy(false)
    }
  }

  const themeOptions = useMemo(
    (): { id: ColorTheme; label: string; colors: string[] }[] => [
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
      {
        id: "custom",
        label: "Personalizado (hex)",
        colors: [paletteDraft.background, paletteDraft.surface, paletteDraft.accentHealth],
      },
    ],
    [paletteDraft],
  )

  const layoutOptions: { id: LayoutMode; label: string }[] = [
    { id: "balanced", label: "Balanceado (Estándar)" },
    { id: "compact", label: "Alta densidad (Pro)" },
    { id: "zen", label: "Modo foco (Zen)" },
  ]

  const applyPaletteDraft = () => {
    const next: CustomPalette = {
      background: normalizeHex(paletteDraft.background) ?? customPalette.background,
      surface: normalizeHex(paletteDraft.surface) ?? customPalette.surface,
      text: normalizeHex(paletteDraft.text) ?? customPalette.text,
      textMuted: normalizeHex(paletteDraft.textMuted) ?? customPalette.textMuted,
      accentHealth: normalizeHex(paletteDraft.accentHealth) ?? customPalette.accentHealth,
    }
    setCustomPalette(next)
  }

  const paletteFields: { key: keyof CustomPalette; label: string }[] = [
    { key: "background", label: "Fondo" },
    { key: "surface", label: "Superficie (tarjetas)" },
    { key: "text", label: "Texto principal" },
    { key: "textMuted", label: "Texto secundario" },
    { key: "accentHealth", label: "Acento (salud / primario)" },
  ]

  return (
    <div className="orv-page-shell mx-auto min-w-0 max-w-5xl space-y-7 overflow-x-hidden">
      <header>
        <h2 className="text-2xl font-medium tracking-tight" style={{ color: theme.text }}>
          Configuración del sistema
        </h2>
        <p className="mt-1 text-sm leading-snug" style={{ color: theme.textMuted }}>
          Control paramétrico de la interfaz Órvita
        </p>
      </header>

      <ConfigPwaInstallPanel theme={theme} />
      <ConfigPasskeyPanel theme={theme} />

      <Link
        href="/perfil"
        className="orbita-focus-ring flex items-center justify-between gap-3 rounded-2xl border p-4 no-underline transition-opacity hover:opacity-95"
        style={{
          backgroundColor: theme.surfaceAlt,
          borderColor: theme.border,
          boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04)",
        }}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: theme.surface, color: theme.accent.health }}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight" style={{ color: theme.text }}>
              Tu espacio
            </p>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              Foto y nombre: personaliza cómo te muestra Órvita y gana un poco de gamificación ligera.
            </p>
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0" style={{ color: theme.textMuted }} aria-hidden />
      </Link>

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
        familyPhotoUrl={familyPhotoUrl}
        familyPhotoBusy={familyPhotoBusy}
        familyPhotoError={familyPhotoError}
        onPickFamilyPhoto={(file) => {
          setFamilyCropFile(file)
          setFamilyCropOpen(true)
        }}
        members={members}
        membersLoading={membersLoading}
        membersError={membersError}
      />

      <ConfigNotificationPreferencesPanel theme={theme} />

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(260px,340px)] lg:items-start">
        <div className="space-y-9">
          {/* 2. Entorno de color */}
          <div className="space-y-3">
            <h3
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em]"
              style={{ color: theme.textMuted }}
            >
              <Palette className="h-4 w-4 shrink-0" aria-hidden />
              Entorno de color
            </h3>
            <p className="max-w-2xl text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              Los presets aplican variables CSS en toda la app. «Personalizado» te deja elegir hex; superficie
              alterna, borde y acentos secundarios se derivan automáticamente para mantener contraste legible.
            </p>
            <div className="grid gap-2">
              {themeOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setColorTheme(option.id)}
                  className="flex items-center justify-between rounded-2xl border p-3 text-left transition-colors"
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

            {colorTheme === "custom" ? (
              <div
                className="mt-3 space-y-3 rounded-2xl border p-3 sm:p-4"
                style={{
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                }}
              >
                <p className="text-xs font-medium" style={{ color: theme.text }}>
                  Colores hex
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
                  Formato #RRGGBB. Tras editar, pulsa «Aplicar colores» para guardar y refrescar variables en vivo.
                </p>
                <div className="space-y-3">
                  {paletteFields.map(({ key, label }) => (
                    <div key={key} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                      <label className="w-full min-w-[8rem] text-xs font-medium sm:w-44" style={{ color: theme.text }}>
                        {label}
                      </label>
                      <div className="flex flex-1 flex-wrap items-center gap-2">
                        <input
                          type="color"
                          className="h-10 w-14 cursor-pointer rounded border p-0"
                          style={{ borderColor: theme.border }}
                          value={normalizeHex(paletteDraft[key]) ?? "#888888"}
                          onChange={(e) =>
                            setPaletteDraft((prev) => ({
                              ...prev,
                              [key]: normalizeHex(e.target.value) ?? e.target.value,
                            }))
                          }
                          aria-label={label}
                        />
                        <input
                          type="text"
                          spellCheck={false}
                          className="min-w-[7rem] flex-1 rounded-lg border px-2 py-2 font-mono text-xs"
                          style={{
                            borderColor: theme.border,
                            backgroundColor: theme.surface,
                            color: theme.text,
                          }}
                          value={paletteDraft[key]}
                          onChange={(e) => setPaletteDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-2 text-xs font-medium transition-opacity hover:opacity-90"
                    style={{ borderColor: theme.border, color: theme.text }}
                    onClick={() => setPaletteDraft(defaultCustomPalette())}
                  >
                    Valores base
                  </button>
                  <button
                    type="button"
                    className="rounded-lg border px-3 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
                    style={{
                      borderColor: theme.accent.health,
                      backgroundColor: theme.accent.health,
                      color: "#fff",
                    }}
                    onClick={() => applyPaletteDraft()}
                  >
                    Aplicar colores
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* 3. Densidad de datos */}
          <div className="space-y-3">
            <h3
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em]"
              style={{ color: theme.textMuted }}
            >
              <Monitor className="h-4 w-4 shrink-0" aria-hidden />
              Densidad de datos
            </h3>
            <p className="max-w-2xl text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              Cambia <strong className="font-medium text-[inherit]">--layout-gap</strong> y{" "}
              <strong className="font-medium text-[inherit]">--layout-padding</strong> en toda la app (Inicio, Salud,
              Agenda, etc.). No es solo decorativo.
            </p>
            <div className="grid gap-2">
              {layoutOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setLayoutMode(option.id)}
                  className="flex items-center justify-between rounded-2xl border p-3 text-left transition-colors"
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
          <div className="space-y-3">
            <h3
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em]"
              style={{ color: theme.textMuted }}
            >
              <Sliders className="h-4 w-4 shrink-0" aria-hidden />
              Intensidad háptica / animaciones
            </h3>
            <p className="max-w-2xl text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              Ajusta <strong className="font-medium text-[inherit]">--motion-factor</strong> (p. ej. sombras y
              transiciones en tarjetas). El alcance es acotado; si quieres animación global, habría que extender tokens.
            </p>
            <div
              className="rounded-2xl border p-5 sm:p-6"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04)",
              }}
            >
              <div className="mb-3 flex justify-between text-xs" style={{ color: theme.textMuted }}>
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
          <ConfigStrategicIntegrationsPanel theme={theme} />
        </div>

        <aside className="space-y-3 lg:sticky lg:top-24">
          <h3 className="text-xs font-medium uppercase tracking-[0.14em]" style={{ color: theme.textMuted }}>
            Vista previa
          </h3>
          <p className="text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
            Maqueta de color reactiva al tema (incl. personalizado). El espaciado usa ahora{" "}
            <span className="font-mono text-[10px]">var(--layout-gap)</span> para acercarse a la densidad elegida.
          </p>
          <div
            className="flex min-h-[360px] flex-col rounded-3xl border-2 lg:min-h-[440px]"
            style={{
              backgroundColor: theme.bg,
              borderColor: theme.border,
              gap: "var(--layout-gap)",
              padding: "var(--layout-padding)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="h-6 w-24 rounded-md" style={{ backgroundColor: theme.surfaceAlt }} />
              <div className="h-8 w-8 rounded-full" style={{ backgroundColor: theme.surfaceAlt }} />
            </div>
            <div
              className="flex-1 rounded-2xl border p-5"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                gap: "var(--layout-gap)",
              }}
            >
              <div className="mb-4 h-4 w-1/3 rounded" style={{ backgroundColor: theme.textMuted, opacity: 0.2 }} />
              <div className="flex flex-col" style={{ gap: "var(--layout-gap)" }}>
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
              className="flex h-12 items-center justify-around rounded-2xl border px-3"
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

      <OrbitaImageCropDialog
        open={familyCropOpen}
        onOpenChange={(v) => {
          setFamilyCropOpen(v)
          if (!v) setFamilyCropFile(null)
        }}
        file={familyCropFile}
        aspect={2.35}
        title="Recortar imagen del hogar"
        outputMaxWidth={1920}
        onCropped={(cropped) => {
          void handleUploadFamilyPhoto(cropped)
        }}
      />
    </div>
  )
}
