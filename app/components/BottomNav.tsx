"use client"

import clsx from "clsx"
import type { LucideIcon } from "lucide-react"
import { Activity, Calendar, Dumbbell, Home, Target } from "lucide-react"
import type { ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"

type TabDef = {
  name: string
  /** Etiqueta opcional con salto suave (p. ej. «Entrenamiento» en pantallas estrechas). */
  label?: ReactNode
  route: string
  icon: LucideIcon
  accent: string
  match: (pathname: string) => boolean
  /** Inicio: anclaje visual al centro de la barra. */
  placement: "left" | "center" | "right"
}

const TABS: TabDef[] = [
  {
    name: "Hábitos",
    route: "/habitos",
    icon: Activity,
    accent: "var(--accent-health-strong)",
    match: (p) => p === "/habitos" || p.startsWith("/habitos/"),
    placement: "left",
  },
  {
    name: "Entrenamiento",
    label: (
      <>
        Entren
        <wbr />
        miento
      </>
    ),
    route: "/training",
    icon: Dumbbell,
    accent: "var(--color-accent-primary)",
    match: (p) => p === "/training" || p.startsWith("/training/"),
    placement: "left",
  },
  {
    name: "Inicio",
    route: "/",
    icon: Home,
    accent: "var(--color-text-primary)",
    match: (p) => p === "/",
    placement: "center",
  },
  {
    name: "Hoy",
    route: "/hoy",
    icon: Target,
    accent: "var(--color-accent-primary)",
    match: (p) => p === "/hoy" || p.startsWith("/hoy/"),
    placement: "right",
  },
  {
    name: "Agenda",
    route: "/agenda",
    icon: Calendar,
    accent: "var(--accent-agenda-strong)",
    match: (p) => p === "/agenda" || p.startsWith("/agenda/"),
    placement: "right",
  },
]

function NavButton({
  tab,
  active,
  onNavigate,
}: {
  tab: TabDef
  active: boolean
  onNavigate: () => void
}) {
  const Icon = tab.icon
  const isCenter = tab.placement === "center"

  return (
    <button
      type="button"
      onClick={onNavigate}
      className={clsx(
        "orbita-focus-ring flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-[var(--radius-card)] px-0.5 transition-[color,background-color,box-shadow,transform] active:opacity-90 sm:min-h-[52px] sm:gap-1",
        isCenter
          ? "relative z-[1] w-[5rem] shrink-0 flex-none sm:w-[5.5rem]"
          : "min-w-0 flex-1 basis-0",
        active ? "orbita-chrome-tab-active" : "orbita-chrome-tab-idle",
        isCenter &&
          !active &&
          "border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[color-mix(in_srgb,var(--color-surface-alt)_55%,transparent)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--color-text-primary)_6%,transparent)]",
        isCenter && active && "shadow-[0_-2px_14px_color-mix(in_srgb,var(--color-text-primary)_10%,transparent)]",
      )}
      style={{
        color: active ? tab.accent : undefined,
      }}
      aria-current={active ? "page" : undefined}
    >
      <Icon
        className={clsx(
          "shrink-0",
          isCenter ? "h-[21px] w-[21px] sm:h-[22px] sm:w-[22px]" : "h-[20px] w-[20px] sm:h-[19px] sm:w-[19px]",
        )}
        strokeWidth={active ? 2.4 : 2}
        aria-hidden
      />
      <span
        className={clsx(
          "w-full text-balance text-center leading-[1.15] tracking-tight",
          isCenter ? "text-[11px] font-semibold sm:text-xs" : "text-[9px] font-medium sm:text-[11px]",
          active && !isCenter && "font-semibold",
          !isCenter && "line-clamp-2 min-h-[2lh] max-w-full break-words",
        )}
      >
        {tab.label ?? tab.name}
      </span>
    </button>
  )
}

export default function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname.startsWith("/auth")) {
    return null
  }

  const left = TABS.filter((t) => t.placement === "left")
  const center = TABS.find((t) => t.placement === "center")!
  const right = TABS.filter((t) => t.placement === "right")

  return (
    <nav
      className="orbita-chrome-surface fixed bottom-0 left-0 right-0 z-[100] border-t border-[color-mix(in_srgb,var(--color-border)_85%,transparent)] pb-[env(safe-area-inset-bottom,0px)] shadow-nav md:hidden"
      aria-label="Navegación principal"
    >
      <div className="orbita-bottom-nav-safe mx-auto grid w-full max-w-[1400px] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 px-2 py-2.5 sm:gap-x-2.5 sm:px-3 sm:py-3">
        <div className="flex min-w-0 items-stretch justify-end gap-1 sm:gap-1.5">
          {left.map((tab) => (
            <NavButton
              key={tab.route}
              tab={tab}
              active={tab.match(pathname)}
              onNavigate={() => router.push(tab.route)}
            />
          ))}
        </div>

        <div className="isolate flex items-center justify-center self-center px-1 sm:px-1.5">
          <NavButton
            tab={center}
            active={center.match(pathname)}
            onNavigate={() => router.push(center.route)}
          />
        </div>

        <div className="flex min-w-0 items-stretch justify-start gap-1 sm:gap-1.5">
          {right.map((tab) => (
            <NavButton
              key={tab.route}
              tab={tab}
              active={tab.match(pathname)}
              onNavigate={() => router.push(tab.route)}
            />
          ))}
        </div>
      </div>
    </nav>
  )
}
