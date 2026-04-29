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
  const headerDateLabelMobile = useMemo(
    () =>
      new Intl.DateTimeFormat("es-CO", {
        timeZone: getAgendaDisplayTimeZone(),
        day: "numeric",
        month: "long",
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
          <div className="flex items-center justify-between gap-2 sm:gap-[var(--spacing-lg)]">
            <div className="flex min-w-0 flex-col gap-0.5 sm:gap-1.5">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full sm:h-[9px] sm:w-[9px]"
                  style={{
                    background:
                      "linear-gradient(145deg, color-mix(in srgb, var(--color-accent-primary) 92%, #fff), var(--color-accent-primary))",
                    boxShadow: "0 0 0 1px color-mix(in srgb, var(--color-accent-primary) 35%, transparent)",
                  }}
                  aria-hidden
                />
                <h1 className="orbita-large-title m-0 max-sm:text-[1.55rem]">Órvita</h1>
                <span className="hidden text-[11px] uppercase tracking-[0.18em] text-[var(--color-text-secondary)] sm:inline">
                  Sistema operativo estratégico
                </span>
              </div>
              <span className="min-w-0 truncate pl-[18px] text-[12px] font-medium leading-snug text-[var(--color-text-primary)] sm:hidden">
                {pathname.startsWith("/auth") && !isAppMockMode()
                  ? "Inicia sesión"
                  : userName == null
                    ? isAppMockMode()
                      ? "Cargando…"
                      : "…"
                    : `Hola, ${userName}`}
              </span>
              <time
                dateTime={agendaTodayYmd()}
                className="w-fit pl-[18px] text-[13px] font-medium capitalize leading-snug text-[var(--color-text-secondary)] sm:hidden"
              >
                {headerDateLabelMobile}
              </time>
              <div className="hidden min-w-0 flex-col gap-0.5 pl-[22px] sm:flex">
                <span className="text-[14px] font-medium leading-snug tracking-[-0.01em] text-[var(--color-text-primary)] sm:text-[15px] max-sm:leading-snug">
                  {pathname.startsWith("/auth") && !isAppMockMode()
                    ? "Inicia sesión para continuar"
                    : userName == null
                      ? isAppMockMode()
                        ? "Cargando…"
                        : "…"
                      : `Hola, ${userName}`}
                </span>
                <time
                  dateTime={agendaTodayYmd()}
                  className="w-fit text-[11px] font-medium capitalize leading-snug text-[var(--color-text-secondary)] sm:text-xs sm:font-normal"
                >
                  {headerDateLabel}
                </time>
              </div>
            </div>

            <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 sm:gap-[var(--spacing-md)]">
              <div className="relative order-last shrink-0">
                <button
                  type="button"
                  onClick={() => setOpen((prev) => !prev)}
                  className="orbita-focus-ring relative h-[4.25rem] w-[4.25rem] overflow-hidden rounded-full border-0 bg-[color-mix(in_srgb,var(--color-surface-alt)_92%,transparent)] p-0 shadow-[0_3px_20px_color-mix(in_srgb,var(--color-text-primary)_16%,transparent)] ring-[3px] ring-[color-mix(in_srgb,var(--color-accent-primary)_48%,transparent)] ring-offset-2 ring-offset-[var(--color-background)] transition-[box-shadow,transform] hover:scale-[1.03] hover:shadow-[0_6px_24px_color-mix(in_srgb,var(--color-accent-primary)_22%,transparent)] active:scale-[0.98] sm:h-[3.5rem] sm:w-[3.5rem] sm:ring-2 sm:ring-offset-[3px]"
                  aria-label="Menú de usuario"
                  aria-expanded={open}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" width={64} height={64} />
                  ) : (
                    <User className="mx-auto h-9 w-9 text-[var(--color-text-secondary)] sm:h-7 sm:w-7" aria-hidden />
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

              <NotificationsBell />

              <button
                type="button"
                onClick={cycleTheme}
                aria-label="Cambiar tema"
                className="orbita-header-action orbita-header-icon-slot orbita-focus-ring sm:py-1.5"
              >
                <SunMoon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">Tema</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                aria-label={loggingOut ? "Saliendo" : "Salir"}
                className="orbita-header-action orbita-header-action--surface orbita-header-icon-slot orbita-focus-ring sm:py-1.5"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden />
                <span className="hidden sm:inline">{loggingOut ? "Saliendo..." : "Salir"}</span>
              </button>
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
