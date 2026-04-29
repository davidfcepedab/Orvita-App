"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import clsx from "clsx"
import { useCallback, useEffect, useMemo, useState } from "react"
import { useApp } from "@/app/contexts/AppContext"
import { designTokens } from "@/src/theme/design-tokens"
import { Button } from "@/src/components/ui/Button"
import { getAgendaDisplayTimeZone } from "@/lib/agenda/agendaTimeZone"
import { agendaTodayYmd } from "@/lib/agenda/localDateKey"
import { isAppMockMode } from "@/lib/checkins/flags"
import { ORVITA_AVATAR_UPDATED_EVENT } from "@/lib/profile/avatarUpdatedEvent"
import {
  Activity,
  Calendar,
  HeartPulse,
  DollarSign,
  LayoutDashboard,
  Settings,
  SlidersHorizontal,
  Target,
  Dumbbell,
  SunMoon,
  User,
  LogOut,
  Sparkles,
} from "lucide-react"
import { NotificationsBell } from "@/app/components/NotificationsBell"

type AppShellProps = {
  moduleLabel?: string
  moduleTitle?: string
  primaryAction?: { label: string; onClick?: () => void }
  metaInfo?: string
  showSidebar?: boolean
  children: React.ReactNode
  sidebar?: React.ReactNode
}

export function AppShell({
  moduleLabel,
  moduleTitle,
  primaryAction,
  metaInfo,
  showSidebar = true,
  children,
  sidebar,
}: AppShellProps) {
  const pathname = usePathname()
  const { colorTheme, setColorTheme } = useApp()
  const [open, setOpen] = useState(false)
  const [userName, setUserName] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    let cancelled = false
    const mock = isAppMockMode()
    const sinSesionLabel = mock ? "Usuario demo" : "Invitado"

    if (mock) {
      setUserName("Usuario demo")
      return
    }

    // No cargar @supabase/supabase-js ni llamar a Auth en /auth: menos JS inicial y sin red competiendo con el login.
    if (pathname.startsWith("/auth")) {
      setUserName(null)
      return
    }

    ;(async () => {
      try {
        const { createBrowserClient } = await import("@/lib/supabase/browser")
        const supabase = createBrowserClient() as {
          auth?: {
            getUser?: () => Promise<{
              data?: {
                user?: {
                  user_metadata?: {
                    full_name?: string
                    name?: string
                  }
                  email?: string
                }
              }
            }>
          }
        }

        if (!supabase?.auth?.getUser) {
          if (!cancelled) setUserName(sinSesionLabel)
          return
        }

        const GET_USER_MS = 10_000
        const getUserPromise = supabase.auth.getUser()
        const timeoutPromise = new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("getUser timeout")), GET_USER_MS)
        })

        const { data } = await Promise.race([getUserPromise, timeoutPromise])
        if (cancelled) return
        if (!data?.user) {
          setUserName(sinSesionLabel)
          return
        }
        const rawName =
          data.user.user_metadata?.full_name ??
          data.user.user_metadata?.name ??
          data.user.email ??
          null

        if (!rawName) {
          setUserName(sinSesionLabel)
          return
        }

        const firstName = rawName.trim().split(/\s+/)[0]
        setUserName(firstName || sinSesionLabel)
      } catch {
        if (!cancelled) setUserName(sinSesionLabel)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [pathname])

  const fetchAvatarUrl = useCallback(async () => {
    if (isAppMockMode()) {
      setAvatarUrl(null)
      return
    }
    if (pathname.startsWith("/auth")) {
      setAvatarUrl(null)
      return
    }
    try {
      const { createBrowserClient } = await import("@/lib/supabase/browser")
      const supabase = createBrowserClient()
      const { data } = await supabase.auth.getSession()
      const token = data.session?.access_token
      if (!token) {
        setAvatarUrl(null)
        return
      }
      const res = await fetch("/api/profile/me", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await res.json()) as {
        success?: boolean
        data?: { avatarUrl?: string | null }
      }
      const url = payload.success && payload.data?.avatarUrl?.trim() ? payload.data.avatarUrl.trim() : null
      setAvatarUrl(url)
    } catch {
      setAvatarUrl(null)
    }
  }, [pathname])

  useEffect(() => {
    if (isAppMockMode() || pathname.startsWith("/auth")) {
      setAvatarUrl(null)
      return
    }
    void fetchAvatarUrl()
  }, [pathname, fetchAvatarUrl])

  useEffect(() => {
    const onAvatarUpdated = () => {
      void fetchAvatarUrl()
    }
    window.addEventListener(ORVITA_AVATAR_UPDATED_EVENT, onAvatarUpdated)
    return () => window.removeEventListener(ORVITA_AVATAR_UPDATED_EVENT, onAvatarUpdated)
  }, [fetchAvatarUrl])

  /** Pantalla de acceso: solo el formulario; sin barra superior ni tabs horizontales. */
  const isAuthRoute = pathname.startsWith("/auth")

  const cycleTheme = () => {
    const order = ["arctic", "carbon", "sand", "midnight"] as const
    const base = colorTheme === "custom" ? "arctic" : colorTheme
    const currentIndex = order.indexOf(base as (typeof order)[number])
    const next = order[(currentIndex < 0 ? 0 : currentIndex + 1) % order.length]
    setColorTheme(next)
  }

  const handleLogout = async () => {
    try {
      setLoggingOut(true)
      const { createBrowserClient } = await import("@/lib/supabase/browser")
      const supabase = createBrowserClient() as {
        auth?: { signOut?: () => Promise<{ error?: unknown }> }
      }
      if (supabase?.auth?.signOut) {
        await supabase.auth.signOut()
      }
      await fetch("/api/auth/session", { method: "DELETE" })
      window.location.href = "/auth"
    } finally {
      setLoggingOut(false)
    }
  }

  const headerDateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CO", {
        timeZone: getAgendaDisplayTimeZone(),
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    [],
  )

  const navItems = useMemo(
    () => [
      { path: "/", label: "Inicio", icon: LayoutDashboard },
      { path: "/hoy", label: "Hoy", icon: Target },
      { path: "/agenda", label: "Agenda", icon: Calendar },
      { path: "/habitos", label: "Hábitos", icon: Activity },
      { path: "/finanzas/overview", label: "Capital", icon: DollarSign },
      { path: "/health", label: "Salud", icon: HeartPulse },
      { path: "/training", label: "Entrenamiento", icon: Dumbbell },
      { path: "/decision", label: "Decisión", icon: SlidersHorizontal },
      { path: "/configuracion", label: "Configuración", icon: Settings },
    ],
    []
  )

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isAuthRoute ? "transparent" : "var(--color-background)",
      }}
    >
      {!isAuthRoute ? (
      <header
        className="orbita-chrome-surface border-b border-[color-mix(in_srgb,var(--color-border)_85%,transparent)]"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div className="orbita-shell-inline orbita-header-bar mx-auto max-w-[1400px]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-[var(--spacing-lg)]">
            <div className="flex min-w-0 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full sm:h-[9px] sm:w-[9px]"
                  style={{
                    background:
                      "linear-gradient(145deg, color-mix(in srgb, var(--color-accent-primary) 92%, #fff), var(--color-accent-primary))",
                    boxShadow: "0 0 0 1px color-mix(in srgb, var(--color-accent-primary) 35%, transparent)",
                  }}
                  aria-hidden
                />
                <h1 className="orbita-large-title m-0 max-sm:text-[1.65rem]">Órvita</h1>
                <span className="hidden text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)] sm:inline">
                  Sistema operativo estratégico
                </span>
              </div>
              <span className="pl-[22px] text-[15px] leading-snug tracking-[-0.01em] text-[var(--color-text-primary)] max-sm:text-base max-sm:leading-snug">
                {pathname.startsWith("/auth") && !isAppMockMode()
                  ? "Inicia sesión para continuar"
                  : userName == null
                    ? isAppMockMode()
                      ? "Cargando…"
                      : "…"
                    : `Hola, ${userName}`}
              </span>
            </div>

            <div className="flex w-full flex-wrap items-center gap-2 max-sm:justify-between sm:w-auto sm:justify-end sm:gap-[var(--spacing-md)]">
              <time
                dateTime={agendaTodayYmd()}
                className="min-w-0 max-sm:flex-1 max-sm:text-[12px] max-sm:font-medium shrink-0 text-[11px] capitalize text-[var(--color-text-secondary)] sm:w-auto sm:text-xs"
              >
                {headerDateLabel}
              </time>

              <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-[var(--spacing-md)]">
              <NotificationsBell />

              <button
                className="orbita-header-action orbita-focus-ring max-sm:!min-h-9 max-sm:gap-1 max-sm:px-2 max-sm:py-1 max-sm:text-[10px] max-sm:tracking-[0.1em] sm:min-h-0 sm:py-1.5"
                onClick={cycleTheme}
                type="button"
              >
                <SunMoon className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                Tema
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="orbita-header-action orbita-header-action--surface orbita-focus-ring max-sm:!min-h-9 max-sm:gap-1 max-sm:px-2 max-sm:py-1 max-sm:text-[10px] max-sm:tracking-[0.1em] sm:min-h-0 sm:py-1.5"
              >
                <LogOut className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden />
                {loggingOut ? "Saliendo..." : "Salir"}
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setOpen((prev) => !prev)}
                  className="orbita-icon-button orbita-focus-ring h-16 w-16 overflow-hidden p-0 sm:h-9 sm:w-9"
                  aria-label="Menú de usuario"
                  aria-expanded={open}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" width={64} height={64} />
                  ) : (
                    <User className="h-7 w-7 sm:h-4 sm:w-4" aria-hidden />
                  )}
                </button>
                {open && (
                  <div
                    className="absolute right-0 top-full z-30 mt-1.5 min-w-[160px] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] p-[var(--spacing-sm)]"
                    style={{
                      boxShadow: designTokens.elevation.card,
                    }}
                  >
                    <Link
                      href="/perfil"
                      onClick={() => setOpen(false)}
                      className="orbita-focus-ring flex items-center gap-2 rounded-[var(--radius-button)] px-2 py-2 text-[13px] text-[var(--color-text-secondary)] no-underline transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)]"
                      aria-label="Personalizar perfil, foto y nombre"
                    >
                      <Sparkles size={14} className="shrink-0 text-[var(--color-accent-health)]" aria-hidden />
                      Tu espacio
                    </Link>
                    <Link
                      href="/configuracion"
                      onClick={() => setOpen(false)}
                      className="orbita-focus-ring block rounded-[var(--radius-button)] px-2 py-2 text-[13px] text-[var(--color-text-secondary)] no-underline transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)]"
                    >
                      Configuración
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        setOpen(false)
                        void handleLogout()
                      }}
                      disabled={loggingOut}
                      className="orbita-focus-ring w-full rounded-[var(--radius-button)] px-2 py-2 text-left text-[13px] text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)] disabled:opacity-60"
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "var(--color-text-secondary)",
                        cursor: loggingOut ? "wait" : "pointer",
                      }}
                    >
                      {loggingOut ? "Cerrando sesión..." : "Cerrar sesión"}
                    </button>
                  </div>
                )}
              </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      ) : null}

      {!isAuthRoute ? (
      <nav
        className="orbita-chrome-surface border-b border-[color-mix(in_srgb,var(--color-border)_85%,transparent)]"
        style={{ overflowX: "auto" }}
      >
        <div className="orbita-shell-inline mx-auto max-w-[1400px] py-1.5">
          <div className="flex min-h-[48px] items-stretch gap-1 sm:gap-1.5">
            {navItems.map((item) => {
              const saludActive =
                pathname === "/health" ||
                pathname === "/fisico" ||
                pathname === "/salud" ||
                pathname.startsWith("/salud/")
              const isActive =
                pathname === item.path ||
                (item.path === "/health" && saludActive) ||
                (item.path === "/finanzas/overview" && pathname.startsWith("/finanzas"))
              const Icon = item.icon
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  className={clsx(
                    "orbita-focus-ring flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-[13px] font-medium no-underline transition-[color,background,box-shadow] sm:px-4",
                    isActive ? "orbita-chrome-tab-active" : "orbita-chrome-tab-idle",
                  )}
                >
                  <Icon size={17} strokeWidth={isActive ? 2.35 : 2} aria-hidden />
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
      ) : null}

      <div
        className={clsx(
          "mx-auto grid min-w-0 gap-[var(--layout-gap)]",
          isAuthRoute
            ? "max-w-none w-full px-0 pb-0 pt-0"
            : "orbita-shell-inline max-w-[1400px] pb-10 pt-5 sm:pt-7",
        )}
        style={{
          gridTemplateColumns: showSidebar ? "280px minmax(0, 1fr)" : "minmax(0, 1fr)",
        }}
      >
        {showSidebar && (
          <aside
            style={{
              background: "var(--color-surface)",
              borderRight: "0.5px solid var(--color-border)",
              borderRadius: "var(--radius-card)",
              padding: "var(--spacing-lg)",
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-md)",
            }}
          >
            {sidebar ?? (
              <>
                <p
                  style={{
                    margin: 0,
                    fontSize: designTokens.typography.scale.caption["font-size"],
                    textTransform: "uppercase",
                    letterSpacing: designTokens.typography.scale.caption["letter-spacing"],
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {moduleLabel ?? "Módulo"}
                </p>
                <h2
                  style={{
                    margin: 0,
                    fontSize: designTokens.typography.scale.h1["font-size"],
                    fontWeight: designTokens.typography.scale.h1["font-weight"],
                  }}
                >
                  {moduleTitle ?? "Resumen"}
                </h2>
                {primaryAction && <Button onClick={primaryAction.onClick}>{primaryAction.label}</Button>}
                {metaInfo && (
                  <p
                    style={{
                      margin: 0,
                      fontSize: designTokens.typography.scale["body-sm"]["font-size"],
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    {metaInfo}
                  </p>
                )}
              </>
            )}
          </aside>
        )}
        <main
          className={clsx("min-w-0", isAuthRoute && "w-full")}
          style={{ display: "grid", gap: isAuthRoute ? 0 : "var(--layout-gap)" }}
        >
          {children}
        </main>
      </div>
    </div>
  )
}
