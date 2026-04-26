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
import { ConfigAccordion } from "@/app/components/orbita-v3/config/ConfigAccordion"
import { ConfigConnectionPill } from "@/app/components/orbita-v3/config/ConfigConnectionPill"
import { ConfigHealthUnifiedPanel } from "@/app/components/orbita-v3/config/ConfigHealthUnifiedPanel"
import { designTokens } from "@/src/theme/design-tokens"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { createBrowserClient } from "@/lib/supabase/browser"
import Link from "next/link"
import { Bell, CalendarDays, Dumbbell, KeyRound, Monitor, Palette, Settings2, Smartphone, User } from "lucide-react"
import { defaultCustomPalette, normalizeHex, type CustomPalette } from "@/lib/theme/customPalette"
import type { HouseholdMemberDTO } from "@/lib/household/memberTypes"

const HEVY_LAST_SYNC_STORAGE_KEY = "orvita:config:hevyLastSyncIso"

export default function ConfigV3() {
  const { colorTheme, setColorTheme, layoutMode, setLayoutMode, customPalette, setCustomPalette } = useApp()
  const theme = useOrbitaSkin()
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
  const [profile, setProfile] = useState<{
    displayName: string | null
    email: string
    avatarUrl: string | null
  } | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

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
    let cancelled = false
    ;(async () => {
      try {
        setProfileLoading(true)
        const res = await fetch("/api/profile/me", { cache: "no-store" })
        const payload = (await res.json()) as {
          success?: boolean
          data?: { displayName: string | null; email: string; avatarUrl: string | null }
        }
        if (cancelled || !res.ok || !payload.success || !payload.data) {
          if (!cancelled) setProfile(null)
          return
        }
        setProfile(payload.data)
      } catch {
        if (!cancelled) setProfile(null)
      } finally {
        if (!cancelled) setProfileLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
        const payload = (await res.json()) as { success?: boolean; error?: string; code?: string }
        if (!cancelled) {
          const ok = res.ok && payload.success === true
          setHevyConnected(ok)
          if (!ok) {
            if (res.status === 503 && payload.code === "not_configured") {
              setHevyMessage(
                "Hevy aún no está conectado en el servidor. Si despliegas tú el proyecto, añade HEVY_BASE_URL y HEVY_API_KEY.",
              )
            } else {
              setHevyMessage(
                payload.error ?? "No pudimos conectar con Hevy. Revisa la app, tu conexión o inténtalo más tarde.",
              )
            }
          } else {
            setHevyMessage(null)
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
    document.documentElement.style.setProperty("--motion-factor", "0.85")
  }, [])

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
      const payload = (await res.json()) as {
        success?: boolean
        trainingDays?: unknown[]
        error?: string
        code?: string
      }
      if (!res.ok || !payload.success) {
        setHevyConnected(false)
        if (res.status === 503 && payload.code === "not_configured") {
          throw new Error(
            "Hevy no está conectado en el servidor. Si administras el despliegue, configura HEVY_BASE_URL y HEVY_API_KEY.",
          )
        }
        throw new Error(
          payload.error ?? "No pudimos conectar con Hevy. Revisa la app, tu conexión o vuelve a intentar.",
        )
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
        label: "Personalizado (tus colores)",
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

  const appearanceHint = useMemo(() => {
    const themeShort: Record<ColorTheme, string> = {
      arctic: "Claro",
      carbon: "Oscuro",
      sand: "Cálido",
      midnight: "Profundo",
      custom: "Personal",
    }
    const layoutShort: Record<LayoutMode, string> = {
      balanced: "Equilibrado",
      compact: "Compacto",
      zen: "Foco",
    }
    return `${themeShort[colorTheme]} · ${layoutShort[layoutMode]}`
  }, [colorTheme, layoutMode])

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

  const homeRole = useMemo(() => {
    const email = profile?.email?.trim().toLowerCase()
    if (!email) return "Tu espacio"
    const m = members.find((x) => x.email.trim().toLowerCase() === email)
    return m?.isOwner ? "Administrador" : "Miembro"
  }, [members, profile?.email])

  const pageVariant = searchParams.get("v") || "0"
  const isAltCard = pageVariant === "1"
  const isDense = pageVariant === "2"
  const sectionGap = isDense ? "space-y-7 sm:space-y-8" : "space-y-8 sm:space-y-10"
  const maxW = isDense ? "max-w-xl" : "max-w-2xl"
  const cardShell = isAltCard
    ? "shadow-[0_1px_0_rgba(15,23,42,0.05)] ring-1 ring-black/[0.05]"
    : "shadow-[0_1px_0_rgba(15,23,42,0.04),0_0_0_1px_rgba(15,23,42,0.04)]"
  const profileSubtitle = profile?.email
    ? `${homeRole} · ${profile.email}`
    : !profile?.email && profile
      ? homeRole
      : null

  return (
    <main
      className={`orbita-page-stack config-page--minimal mx-auto w-full min-w-0 ${maxW} ${sectionGap} overflow-x-hidden px-4 py-8 sm:px-6 sm:py-10 md:py-12 lg:max-w-4xl`}
      aria-label="Configuración y conexiones"
      data-config-variant={pageVariant}
      data-config-variant-hint="v0 default · v1 ring · v2 dense"
    >
      {/* 1. Título + perfil (compacto) */}
      <section
        className="scroll-mt-16"
        data-orvita-section="profile-hero"
        aria-label="Ajustes y tu perfil"
      >
        <div className="mb-1.5 max-w-2xl sm:mb-1">
          <p
            className="m-0 text-[0.65rem] font-medium uppercase tracking-[0.2em] sm:text-[0.7rem]"
            style={{ color: theme.textMuted }}
          >
            Centro de mando
          </p>
          <h1
            className="m-0 mt-1 text-2xl font-light tracking-[-0.03em] sm:mt-1.5 sm:text-3xl"
            style={{ color: theme.text }}
          >
            Ajustes
          </h1>
          <p
            className="m-0 mt-1 text-sm font-normal leading-snug sm:max-w-md"
            style={{ color: theme.textMuted }}
          >
            Tiempo, energía y dinero, sin ruido.
          </p>
        </div>
        <div
          className={`mt-2 flex min-w-0 flex-wrap items-center gap-2 sm:mt-2.5 sm:gap-3 ${
            profileLoading || profileSubtitle ? "sm:justify-between" : "sm:justify-end"
          }`}
        >
          {profileLoading ? (
            <p className="m-0 min-w-0 flex-1 text-xs sm:text-sm" style={{ color: theme.textMuted }} aria-live="polite">
              Cargando perfil…
            </p>
          ) : profileSubtitle ? (
            <p className="m-0 min-w-0 flex-1 text-xs sm:text-sm" style={{ color: theme.textMuted }}>
              {profileSubtitle}
            </p>
          ) : null}
          <div className="flex min-w-0 basis-full flex-wrap items-center justify-start gap-1.5 sm:basis-auto sm:w-auto sm:justify-end sm:pl-0">
            <a
              href="#config-pwa"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-[11px] font-medium no-underline transition-opacity hover:opacity-90"
              style={{
                color: theme.text,
                backgroundColor: theme.surfaceAlt,
                boxShadow: "0 0 0 1px rgba(15,23,42,0.08)",
              }}
            >
              <Smartphone className="h-3.5 w-3.5 opacity-80" aria-hidden />
              Instalar app
            </a>
            <a
              href="#config-passkey"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-[11px] font-medium no-underline transition-opacity hover:opacity-90"
              style={{
                color: theme.text,
                backgroundColor: theme.surfaceAlt,
                boxShadow: "0 0 0 1px rgba(15,23,42,0.08)",
              }}
            >
              <KeyRound className="h-3.5 w-3.5 opacity-80" aria-hidden />
              Face ID o huella
            </a>
            <Link
              href="/perfil"
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-transparent px-3 py-1.5 text-[11px] font-medium no-underline transition-opacity hover:opacity-90"
              style={{
                color: theme.text,
                backgroundColor: theme.surfaceAlt,
                boxShadow: "0 0 0 1px rgba(15,23,42,0.08)",
              }}
            >
              <User className="h-3.5 w-3.5 opacity-80" aria-hidden />
              Editar perfil
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Hogar */}
      <section className="scroll-mt-6 pt-1 sm:pt-1.5" data-orvita-section="household">
        <div
          className={`mt-1 overflow-hidden rounded-2xl p-5 sm:p-6 ${cardShell}`}
          style={{ backgroundColor: theme.surface }}
        >
          <div className="mb-4 border-b pb-3 sm:mb-5 sm:pb-4" style={{ borderColor: theme.border }}>
            <h2
              className="m-0 text-[0.65rem] font-medium uppercase tracking-[0.2em] sm:text-xs"
              style={{ color: theme.textMuted }}
            >
              Hogar
            </h2>
            <p className="m-0 mt-1.5 text-lg font-light tracking-[-0.02em] sm:text-xl" style={{ color: theme.text }}>
              Código, imagen, personas
            </p>
          </div>
          <ConfigHouseholdSection
            moduleCard
            integratedLead
            variant="minimal"
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
        </div>
      </section>

      {/* 3. Conexiones */}
      <section className="scroll-mt-6" data-orvita-section="connections" aria-label="Conexiones">
        <h2
          className="m-0 text-[0.65rem] font-medium uppercase tracking-[0.2em] sm:text-xs"
          style={{ color: theme.textMuted }}
        >
          Conexiones
        </h2>
        <p className="m-0 mt-1 text-base font-light tracking-[-0.02em] sm:text-lg" style={{ color: theme.text }}>
          Cada conexión muestra su estado sin abrirla
        </p>
        <div className="mt-4 space-y-2 sm:mt-5">
          <ConfigAccordion
            theme={theme}
            cardVariant={isAltCard ? "alt" : "default"}
            data-orvita-subsection="google-calendar"
            leadingContainerStyle={{ backgroundColor: "rgba(59, 130, 246, 0.1)" }}
            leading={<CalendarDays className="h-4 w-4" style={{ color: theme.accent.agenda }} />}
            title="Google"
            description="Calendario y tareas con la misma cuenta"
            trailing={
              <ConfigConnectionPill
                state={
                  googleError
                    ? "error"
                    : connecting
                      ? "checking"
                      : googleConnected
                        ? "connected"
                        : "disconnected"
                }
                errorLabel="Revisar"
                connectedLabel="Conectado"
                disconnectedLabel="Sin conectar"
              />
            }
          >
            <ConfigIntegrationsPanel
              theme={theme}
              accordionMode
              only="google"
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
              unified
            />
          </ConfigAccordion>

          <ConfigAccordion
            theme={theme}
            cardVariant={isAltCard ? "alt" : "default"}
            data-orvita-subsection="hevy"
            leadingContainerStyle={{ backgroundColor: "rgba(148, 163, 184, 0.18)" }}
            leading={<Dumbbell className="h-4 w-4" style={{ color: theme.textMuted }} />}
            title="Hevy"
            description="Rutina y entrenamientos en Órvita"
            trailing={
              <ConfigConnectionPill
                state={
                  hevyChecking || hevySyncing
                    ? "checking"
                    : hevyMessage && !hevyMessage.startsWith("Sincronizado:")
                      ? "error"
                      : hevyConnected
                        ? "connected"
                        : "disconnected"
                }
                errorLabel="Revisar"
                connectedLabel="Conectado"
                disconnectedLabel="Conectar"
                onDisconnectedClick={
                  hevyConnected || hevyChecking || hevySyncing ? undefined : () => void handleHevySync()
                }
              />
            }
          >
            <ConfigIntegrationsPanel
              theme={theme}
              accordionMode
              only="hevy"
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
              unified
            />
          </ConfigAccordion>
        </div>

        <div className="mt-1.5" id="conexion-salud" data-orvita-section="strategic-stack">
          <ConfigStrategicIntegrationsPanel
            theme={theme}
            unified
            layout="accordions"
            showHealth
            cardVariant={isAltCard ? "alt" : "default"}
            beforeHealthServer={
              <div className="border-b" style={{ borderColor: theme.border }}>
                <ConfigHealthUnifiedPanel theme={theme} embedInStrategic />
              </div>
            }
          />
        </div>
      </section>

      {/* 4. Sistema — colapsable */}
      <section className="scroll-mt-6 pb-6" data-orvita-section="system" aria-label="Sistema y preferencias">
        <h2
          className="m-0 text-[0.65rem] font-medium uppercase tracking-[0.2em] sm:text-xs"
          style={{ color: theme.textMuted }}
        >
          Sistema
        </h2>
        <p className="m-0 mt-1 text-base font-light tracking-[-0.02em] sm:text-lg" style={{ color: theme.text }}>
          Cómo se siente y cómo se instala
        </p>
        <div className="mt-3 space-y-2 sm:mt-4">
        <ConfigAccordion
          theme={theme}
          cardVariant={isAltCard ? "alt" : "default"}
          data-orvita-section="sistema-accordion"
          leadingContainerStyle={{ backgroundColor: "rgba(148, 163, 184, 0.18)" }}
          leading={<Settings2 className="h-4 w-4" style={{ color: theme.textMuted }} />}
          title="Instalación y acceso"
          description="PWA, biometría y dónde está el atajo de salud"
        >
          <div className="space-y-2">
            <div
              className="rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3"
              style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}
              data-orvita-section="install-and-profile"
              id="config-sistema-app"
            >
              <div className="grid min-w-0 gap-2 sm:grid-cols-2 sm:gap-2.5">
                <div id="config-pwa" className="min-w-0 flex-1 scroll-mt-24">
                  <ConfigPwaInstallPanel theme={theme} moduleCard compact showHeader={false} />
                </div>
                <div id="config-passkey" className="min-w-0 flex-1 scroll-mt-24">
                  <ConfigPasskeyPanel theme={theme} moduleCard compact showHeader={false} />
                </div>
              </div>
            </div>

            <div className="px-0 py-0" data-orvita-section="shortcuts-hint">
              <div className="rounded-xl border px-3 py-2.5 sm:px-3.5 sm:py-3" style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}>
                <p className="m-0 text-xs font-medium" style={{ color: theme.text }}>
                  Atajos
                </p>
                <p className="m-0 mt-1 text-[12px] leading-relaxed" style={{ color: theme.textMuted }}>
                  El atajo de importación vive en{" "}
                  <a
                    href="#conexion-salud"
                    className="font-medium underline-offset-2 hover:underline"
                    style={{ color: theme.accent.health }}
                  >
                    Conexiones → Salud
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </ConfigAccordion>

        <ConfigAccordion
          className="mt-2"
          theme={theme}
          data-orvita-section="appearance"
          id="config-appearance"
          leadingContainerStyle={{ backgroundColor: "rgba(16, 185, 129, 0.12)" }}
          leading={<Palette className="h-4 w-4" />}
          title="Aspecto"
          description={appearanceHint}
        >
          <div className="flex flex-col gap-4 sm:gap-5">
            <div className="space-y-3">
              <h3
                className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em]"
                style={{ color: theme.textMuted }}
              >
                <Palette className="h-4 w-4 shrink-0" aria-hidden />
                Paleta
              </h3>
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
                    Tus colores
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
                    Hex o selector; luego «Aplicar colores».
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
                Densidad
              </h3>
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
          </div>
        </ConfigAccordion>

        <ConfigAccordion
          className="mt-2"
          theme={theme}
          data-orvita-section="notifications"
          id="config-notif-chip"
          leadingContainerStyle={{ backgroundColor: "rgba(14, 165, 233, 0.12)" }}
          leading={<Bell className="h-4 w-4" aria-hidden />}
          title="Notificaciones"
          description="Inbox, push y enfoque"
        >
          <ConfigNotificationPreferencesPanel theme={theme} embedded />
        </ConfigAccordion>
        </div>
      </section>

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
    </main>
  )
}
