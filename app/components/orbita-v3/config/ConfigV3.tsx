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
import { ConfigConnectionPill } from "@/app/components/orbita-v3/config/ConfigConnectionPill"
import { ConfigHealthUnifiedPanel } from "@/app/components/orbita-v3/config/ConfigHealthUnifiedPanel"
import { designTokens } from "@/src/theme/design-tokens"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { createBrowserClient } from "@/lib/supabase/browser"
import Link from "next/link"
import { CalendarDays, ChevronDown, Dumbbell, KeyRound, Monitor, Palette, Sliders, Smartphone, User } from "lucide-react"
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
  const sectionGap = isDense ? "space-y-8 sm:space-y-10" : "space-y-10 sm:space-y-12"
  const maxW = isDense ? "max-w-xl" : "max-w-2xl"
  const cardShell = isAltCard
    ? "shadow-[0_1px_0_rgba(15,23,42,0.05)] ring-1 ring-black/[0.05]"
    : "shadow-[0_1px_0_rgba(15,23,42,0.04),0_0_0_1px_rgba(15,23,42,0.04)]"
  const displayName =
    profile?.displayName?.trim() ||
    (profile?.email ? profile.email.split("@")[0] : null) ||
    "Cuenta"

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
        <div className="mb-3 max-w-2xl sm:mb-2">
          <p
            className="m-0 text-[0.65rem] font-medium uppercase tracking-[0.2em] sm:text-[0.7rem]"
            style={{ color: theme.textMuted }}
          >
            Centro de mando
          </p>
          <h1
            className="m-0 mt-1.5 text-2xl font-light tracking-[-0.03em] sm:mt-2 sm:text-3xl"
            style={{ color: theme.text }}
          >
            Ajustes
          </h1>
          <p
            className="m-0 mt-1.5 text-sm font-normal leading-snug sm:max-w-md"
            style={{ color: theme.textMuted }}
          >
            Tiempo, energía y dinero, sin ruido.
          </p>
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:mt-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
          <div className="flex min-w-0 items-end gap-4">
            {profileLoading ? (
              <div
                className="h-[4.5rem] w-[4.5rem] shrink-0 animate-pulse rounded-full"
                style={{ backgroundColor: theme.surfaceAlt }}
                aria-hidden
              />
            ) : (
              <div
                className="relative h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-full"
                style={{ backgroundColor: theme.surfaceAlt, boxShadow: "0 0 0 1px rgba(15,23,42,0.06)" }}
              >
                {profile?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    width={72}
                    height={72}
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{ color: theme.textMuted }}
                    aria-hidden
                  >
                    <User className="h-7 w-7" />
                  </div>
                )}
              </div>
            )}
            <div className="min-w-0 pb-0.5">
              <p className="m-0 text-lg font-light leading-tight tracking-[-0.02em] sm:text-xl" style={{ color: theme.text }}>
                {profileLoading ? "…" : displayName}
              </p>
              <p className="m-0 mt-0.5 text-xs sm:text-sm" style={{ color: theme.textMuted }}>
                {homeRole}
                {profile?.email ? ` · ${profile.email}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:shrink-0 sm:justify-end sm:pb-0.5 sm:pl-2">
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
              PWA
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
              Passkey
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
              Perfil
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Hogar */}
      <section className="scroll-mt-6" data-orvita-section="household">
        <div
          className={`mt-1 overflow-hidden rounded-2xl p-5 sm:p-6 ${cardShell}`}
          style={{ backgroundColor: theme.surface }}
        >
          <div className="mb-5 border-b pb-4 sm:mb-6 sm:pb-5" style={{ borderColor: theme.border }}>
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
          Un gesto, un bloque
        </p>
        <div className="mt-4 space-y-1.5 sm:mt-5">
          <details
            className="group open:shadow-sm"
            style={{
              backgroundColor: theme.surface,
              borderRadius: "1rem",
              boxShadow: isAltCard
                ? "0 1px 0 rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.06)"
                : "0 1px 0 rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.04)",
            }}
            data-orvita-subsection="google-calendar"
          >
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 sm:px-4 [&::-webkit-details-marker]:hidden"
              style={{ color: theme.text }}
            >
              <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: theme.surfaceAlt }}
                  aria-hidden
                >
                  <CalendarDays className="h-4 w-4" style={{ color: theme.accent.agenda }} />
                </span>
                <div className="min-w-0 text-left">
                  <p className="m-0 text-sm font-medium tracking-tight" style={{ color: theme.text }}>
                    Google
                  </p>
                  <p className="m-0 mt-0.5 text-[12px] leading-snug" style={{ color: theme.textMuted }}>
                    Mantén tu calendario y tareas alineados.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ConfigConnectionPill
                  state={connecting ? "checking" : googleConnected ? "connected" : "disconnected"}
                  connectedLabel="Conectado"
                  disconnectedLabel="Conectar"
                />
                <ChevronDown
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                  style={{ color: theme.textMuted }}
                  aria-hidden
                />
              </div>
            </summary>
            <div className="border-t" style={{ borderColor: theme.border }}>
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
            </div>
          </details>

          <details
            className="group open:shadow-sm"
            style={{
              backgroundColor: theme.surface,
              borderRadius: "1rem",
              boxShadow: isAltCard
                ? "0 1px 0 rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.06)"
                : "0 1px 0 rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.04)",
            }}
            data-orvita-subsection="hevy"
          >
            <summary
              className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 sm:px-4 [&::-webkit-details-marker]:hidden"
              style={{ color: theme.text }}
            >
              <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
                <span
                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: theme.surfaceAlt }}
                  aria-hidden
                >
                  <Dumbbell className="h-4 w-4" style={{ color: theme.textMuted }} />
                </span>
                <div className="min-w-0 text-left">
                  <p className="m-0 text-sm font-medium tracking-tight" style={{ color: theme.text }}>
                    Hevy
                  </p>
                  <p className="m-0 mt-0.5 text-[12px] leading-snug" style={{ color: theme.textMuted }}>
                    Registra y revisa entrenamientos.
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <ConfigConnectionPill
                  state={hevyChecking ? "checking" : hevySyncing ? "checking" : hevyConnected ? "connected" : "disconnected"}
                  connectedLabel="Conectado"
                  disconnectedLabel="Conectar"
                />
                <ChevronDown
                  className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                  style={{ color: theme.textMuted }}
                  aria-hidden
                />
              </div>
            </summary>
            <div className="border-t" style={{ borderColor: theme.border }}>
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
            </div>
          </details>
        </div>

        <div className="mt-1.5" id="conexion-salud" data-orvita-section="strategic-stack">
          <ConfigStrategicIntegrationsPanel
            theme={theme}
            unified
            layout="accordions"
            showHealth
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
          App, aspecto y atajos
        </p>
        <details
          className="group mt-4 sm:mt-5"
          style={{
            backgroundColor: theme.surface,
            borderRadius: "1rem",
            boxShadow: isAltCard
              ? "0 1px 0 rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.06)"
              : "0 1px 0 rgba(15, 23, 42, 0.04), 0 0 0 1px rgba(15, 23, 42, 0.04)",
          }}
        >
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-3.5 sm:px-4 sm:py-4 [&::-webkit-details-marker]:hidden"
            style={{ color: theme.text }}
          >
            <div className="min-w-0 text-left">
              <p className="m-0 text-sm font-medium" style={{ color: theme.text }}>
                Más ajustes
              </p>
              <p className="m-0 mt-0.5 text-[11px]" style={{ color: theme.textMuted }}>
                PWA, passkey, atajos, aspecto
              </p>
            </div>
            <ChevronDown
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
              style={{ color: theme.textMuted }}
              aria-hidden
            />
          </summary>
          <div className="space-y-0 border-t" style={{ borderColor: theme.border }}>
            <div className="border-b" style={{ borderColor: theme.border }} data-orvita-section="install-and-profile" id="config-sistema-app">
              <div className="px-3 py-1.5 text-[0.6rem] font-medium uppercase tracking-[0.2em] sm:px-4" style={{ color: theme.textMuted }}>
                Aplicación
              </div>
              <div id="config-pwa" className="min-w-0 scroll-mt-20">
                <ConfigPwaInstallPanel theme={theme} moduleCard compact />
              </div>
              <div id="config-passkey" className="min-w-0 scroll-mt-20">
                <ConfigPasskeyPanel theme={theme} moduleCard compact />
              </div>
            </div>

            <div
              className="border-b"
              style={{ borderColor: theme.border }}
              data-orvita-section="shortcuts-hint"
            >
              <div className="px-3 py-3 sm:px-4">
                <p className="m-0 text-xs font-medium" style={{ color: theme.text }}>
                  Atajos
                </p>
                <p className="m-0 mt-1.5 text-[12px] leading-relaxed" style={{ color: theme.textMuted }}>
                  El atajo de salud está en{" "}
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

            <div className="overflow-hidden" data-orvita-section="appearance" id="config-appearance">
              <details className="group border-t border-transparent">
                <summary
                  className="flex cursor-pointer list-none items-center justify-between gap-3 border-b px-4 py-4 sm:px-5 sm:py-3.5 [&::-webkit-details-marker]:hidden"
                  style={{ borderColor: theme.border }}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9"
                      style={{ backgroundColor: theme.surfaceAlt, color: theme.accent.health }}
                      aria-hidden
                    >
                      <Palette className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 text-left">
                      <p className="m-0 text-sm font-medium tracking-tight" style={{ color: theme.text }}>
                        Aspecto y comodidad
                      </p>
                      <p className="m-0 mt-0.5 text-xs" style={{ color: theme.textMuted }}>
                        Paleta, densidad y movimiento
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-180"
                    style={{ color: theme.textMuted }}
                    aria-hidden
                  />
                </summary>
                <div className="flex flex-col gap-6 p-4 sm:p-5">
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

          {/* 4. Intensidad háptica / animaciones */}
          <div className="space-y-3">
            <h3
              className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em]"
              style={{ color: theme.textMuted }}
            >
              <Sliders className="h-4 w-4 shrink-0" aria-hidden />
              Movimiento
            </h3>
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
                </div>
              </details>
            </div>
          </div>
        </details>

        <details
          className="group mt-2"
          data-orvita-section="notifications"
          id="config-notif-chip"
          style={{
            backgroundColor: theme.surface,
            borderRadius: "9999px",
            boxShadow: "0 0 0 1px rgba(15, 23, 42, 0.08)",
          }}
        >
          <summary
            className="flex cursor-pointer list-none items-center justify-between gap-2 px-3.5 py-2.5 sm:px-4 [&::-webkit-details-marker]:hidden"
            style={{ color: theme.text }}
          >
            <span className="text-[12px] font-medium sm:text-sm" style={{ color: theme.text }}>
              Notificaciones
            </span>
            <div className="flex items-center gap-2">
              <span
                className="hidden shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium sm:inline sm:text-xs"
                style={{ backgroundColor: theme.surfaceAlt, color: theme.textMuted }}
              >
                Inbox + push
              </span>
              <ChevronDown
                className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-180"
                style={{ color: theme.textMuted }}
                aria-hidden
              />
            </div>
          </summary>
          <div
            className="mt-1 rounded-2xl border p-1.5 sm:p-2"
            style={{ borderColor: theme.border, backgroundColor: theme.surface }}
          >
            <ConfigNotificationPreferencesPanel theme={theme} />
          </div>
        </details>
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
