"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import Link from "next/link"
import { useRouter } from "next/navigation"
import clsx from "clsx"
import { Bell, Check, Loader2, Radio, Trash2 } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { isAppMockMode } from "@/lib/checkins/flags"
import { formatInstantInAgendaTz } from "@/lib/agenda/localDateKey"
import { isPushSupported, subscribeOrvitaPush } from "@/lib/notifications/pushClient"

type NotificationRow = {
  id: string
  title: string
  body: string
  category: string
  link: string | null
  read_at: string | null
  created_at: string
}

async function getAccessToken(): Promise<string | null> {
  const supabase = createBrowserClient() as {
    auth: { getSession: () => Promise<{ data: { session?: { access_token?: string } | null } }> }
  }
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export function NotificationsBell() {
  const router = useRouter()
  const mock = isAppMockMode()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<NotificationRow[]>([])
  const [unread, setUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [pushBusy, setPushBusy] = useState(false)
  const [pushHint, setPushHint] = useState<string | null>(null)
  /** `true` si este navegador ya tiene `PushSubscription` (activaste push aquí). */
  const [pushSubscribed, setPushSubscribed] = useState<boolean | undefined>(undefined)
  const [deletingId, setDeletingId] = useState<string | "all" | null>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const positionPanel = useCallback(() => {
    const anchor = wrapRef.current
    const panel = panelRef.current
    if (!anchor || !panel) return
    const rect = anchor.getBoundingClientRect()
    const margin = 10
    const maxW = 380
    /** `visualViewport` refleja el ancho real en móvil (cromo/iframe); evita usar solo `innerWidth` del padre. */
    const vw =
      window.visualViewport?.width ??
      document.documentElement?.clientWidth ??
      window.innerWidth
    const w = Math.min(maxW, vw - margin * 2)
    let left = rect.right - w
    left = Math.max(margin, Math.min(left, vw - w - margin))
    const top = rect.bottom + 6
    panel.style.position = "fixed"
    panel.style.left = `${Math.round(left)}px`
    panel.style.top = `${Math.round(top)}px`
    panel.style.width = `${Math.round(w)}px`
    panel.style.right = "auto"
    panel.style.zIndex = "100"
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    positionPanel()
    const onReposition = () => positionPanel()
    window.addEventListener("resize", onReposition)
    window.addEventListener("scroll", onReposition, true)
    window.visualViewport?.addEventListener("resize", onReposition)
    window.visualViewport?.addEventListener("scroll", onReposition)
    return () => {
      window.removeEventListener("resize", onReposition)
      window.removeEventListener("scroll", onReposition, true)
      window.visualViewport?.removeEventListener("resize", onReposition)
      window.visualViewport?.removeEventListener("scroll", onReposition)
    }
  }, [open, positionPanel])

  useEffect(() => {
    if (!open || mock) return
    let cancelled = false
    ;(async () => {
      if (!isPushSupported()) {
        if (!cancelled) setPushSubscribed(false)
        return
      }
      try {
        const reg = await navigator.serviceWorker.ready
        const sub = await reg.pushManager.getSubscription()
        if (!cancelled) setPushSubscribed(Boolean(sub))
      } catch {
        if (!cancelled) setPushSubscribed(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, mock])

  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ?? ""

  const load = useCallback(async () => {
    if (mock) return
    const token = await getAccessToken()
    if (!token) return
    setLoading(true)
    try {
      const res = await fetch("/api/notifications?limit=40", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const json = (await res.json()) as {
        success?: boolean
        notifications?: NotificationRow[]
        unreadCount?: number
      }
      if (json.success && Array.isArray(json.notifications)) {
        setItems(json.notifications)
        setUnread(typeof json.unreadCount === "number" ? json.unreadCount : 0)
      }
    } finally {
      setLoading(false)
    }
  }, [mock])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (mock) return
    const id = window.setInterval(() => void load(), 90_000)
    const onVis = () => {
      if (document.visibilityState === "visible") void load()
    }
    document.addEventListener("visibilitychange", onVis)
    return () => {
      window.clearInterval(id)
      document.removeEventListener("visibilitychange", onVis)
    }
  }, [load, mock])

  useEffect(() => {
    if (!open) return
    void load()
  }, [open, load])

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      const t = e.target as Node
      if (wrapRef.current?.contains(t) || panelRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", close)
    return () => document.removeEventListener("mousedown", close)
  }, [open])

  const markRead = async (ids: string[]) => {
    if (mock || ids.length === 0) return
    const token = await getAccessToken()
    if (!token) return
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids }),
    })
    void load()
  }

  const markAllRead = async () => {
    if (mock) return
    const token = await getAccessToken()
    if (!token) return
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ markAllRead: true }),
    })
    void load()
  }

  const deleteNotifications = async (ids: string[]) => {
    if (mock || ids.length === 0) return false
    const token = await getAccessToken()
    if (!token) return false
    const res = await fetch("/api/notifications", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids }),
    })
    const json = (await res.json().catch(() => ({}))) as { success?: boolean }
    return Boolean(res.ok && json.success)
  }

  const deleteOne = async (id: string) => {
    if (mock) return
    setDeletingId(id)
    try {
      await deleteNotifications([id])
    } finally {
      setDeletingId(null)
      void load()
    }
  }

  const deleteAll = async () => {
    if (mock || items.length === 0) return
    if (!window.confirm("¿Borrar todas las alertas de la bandeja? No se puede deshacer.")) return
    setDeletingId("all")
    try {
      await deleteNotifications(items.map((n) => n.id))
    } finally {
      setDeletingId(null)
      void load()
    }
  }

  const onOpenItem = async (n: NotificationRow) => {
    if (!n.read_at) await markRead([n.id])
    setOpen(false)
    const href = n.link && n.link.startsWith("/") ? n.link : "/"
    router.push(href)
  }

  const onEnablePush = async () => {
    setPushHint(null)
    if (!vapidPublic) {
      setPushHint("Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY en el proyecto.")
      return
    }
    const token = await getAccessToken()
    if (!token) {
      setPushHint("Inicia sesión para activar push.")
      return
    }
    setPushBusy(true)
    try {
      const result = await subscribeOrvitaPush(vapidPublic, token)
      if (!result.ok) setPushHint(result.error ?? "No se pudo activar")
      else {
        setPushHint("Listo: notificaciones push activas en este dispositivo.")
        setPushSubscribed(true)
      }
    } finally {
      setPushBusy(false)
    }
  }

  const onSelfTest = async () => {
    if (mock) return
    const token = await getAccessToken()
    if (!token) return
    setPushBusy(true)
    setPushHint(null)
    try {
      const res = await fetch("/api/notifications/self-test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })
      const json = (await res.json()) as {
        success?: boolean
        error?: string
        push?: { sent?: number; errors?: number }
      }
      void load()
      if (!res.ok || !json.success) {
        setPushHint(json.error ?? "No se pudo crear la prueba.")
        return
      }
      const sent = json.push?.sent ?? 0
      if (sent > 0) {
        setPushHint(
          "Push enviado al servicio. Si no ves la burbuja: deja la pestaña en segundo plano o abre el centro de notificaciones del sistema (Chrome a menudo no muestra banner con la pestaña enfocada).",
        )
      } else {
        setPushHint(
          "Entrada en bandeja creada. Push: 0 envíos — revisa permiso del sitio, que /sw.js esté activo y que «Activar push» se haya hecho en este mismo navegador.",
        )
      }
    } finally {
      setPushBusy(false)
    }
  }

  if (mock) {
    return (
      <span
        className="inline-flex shrink-0"
        title="Notificaciones no disponibles en modo demo (mock)."
      >
        <button
          type="button"
          disabled
          aria-label="Notificaciones desactivadas en modo demo"
          className="orbita-icon-button orbita-focus-ring relative h-9 w-9 cursor-not-allowed opacity-45"
        >
          <Bell strokeWidth={2} className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </span>
    )
  }

  return (
    <div ref={wrapRef} className="relative inline-flex shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notificaciones"
        aria-expanded={open}
        className="orbita-icon-button orbita-focus-ring relative h-9 w-9"
      >
        <Bell strokeWidth={2} className="h-4 w-4 shrink-0" aria-hidden />
        {unread > 0 ? (
          <span
            className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-[var(--color-accent-danger)] ring-2 ring-[var(--color-surface)] sm:right-1 sm:top-1 sm:h-2 sm:w-2"
            aria-hidden
          />
        ) : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={panelRef}
              className="flex max-h-[min(520px,calc(100dvh-5rem))] flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-card"
            >
          <div className="flex items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              Alertas
            </span>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-1">
              {unread > 0 ? (
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={() => void markAllRead()}
                  className="orbita-focus-ring rounded-md px-2 py-1 text-[11px] font-medium text-[var(--color-accent-primary)] hover:bg-[var(--color-surface-alt)] disabled:opacity-50"
                >
                  Marcar leídas
                </button>
              ) : null}
              {items.length > 0 ? (
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={() => void deleteAll()}
                  className="orbita-focus-ring rounded-md px-2 py-1 text-[11px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-accent-danger)] disabled:opacity-50"
                >
                  {deletingId === "all" ? "Borrando…" : "Borrar todas"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-1 py-1">
            {loading && items.length === 0 ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-[var(--color-text-secondary)]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Cargando…
              </div>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-[var(--color-text-secondary)]">
                No hay alertas. Cuando el sistema o tus rutinas generen avisos, aparecerán aquí y podrás activar push
                abajo.
              </p>
            ) : (
              <ul className="m-0 list-none space-y-0.5 p-0">
                {items.map((n) => (
                  <li key={n.id} className="flex items-stretch gap-0.5 rounded-lg hover:bg-[var(--color-surface-alt)]">
                    <button
                      type="button"
                      onClick={() => void onOpenItem(n)}
                      className="orbita-focus-ring min-w-0 flex-1 rounded-l-lg px-3 py-2.5 text-left transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-semibold leading-snug text-[var(--color-text-primary)]">
                          {n.title}
                        </span>
                        {!n.read_at ? (
                          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent-primary)]" />
                        ) : null}
                      </div>
                      <p className="mt-0.5 line-clamp-3 text-[12px] leading-snug text-[var(--color-text-secondary)]">
                        {n.body}
                      </p>
                      <p className="mt-1 text-[10px] text-[var(--color-text-secondary)] opacity-80">
                        {formatInstantInAgendaTz(n.created_at)}
                        {n.category ? ` · ${n.category}` : ""}
                      </p>
                    </button>
                    <button
                      type="button"
                      aria-label={`Borrar: ${n.title}`}
                      disabled={deletingId !== null}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        void deleteOne(n.id)
                      }}
                      className="orbita-focus-ring flex w-9 shrink-0 items-center justify-center rounded-r-lg text-[var(--color-text-secondary)] transition hover:bg-[color-mix(in_srgb,var(--color-accent-danger)_12%,transparent)] hover:text-[var(--color-accent-danger)] disabled:opacity-50"
                    >
                      {deletingId === n.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-4 w-4" strokeWidth={2} aria-hidden />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-1 border-t border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[var(--color-surface-alt)]/40 px-2.5 py-2">
            <p className="m-0 text-[9px] leading-tight text-[var(--color-text-secondary)] [text-wrap:pretty]">
              <span className="font-semibold text-[var(--color-text-primary)]">Safari (iOS):</span> añade Órvita a inicio
              para Web Push.{" "}
              <a
                href="https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-accent-primary)] underline-offset-2 hover:underline"
              >
                Notas WebKit
              </a>
            </p>
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <div className="flex flex-wrap items-center gap-1">
                {isPushSupported() && vapidPublic ? (
                  <button
                    type="button"
                    disabled={pushBusy || pushSubscribed === true}
                    onClick={() => void onEnablePush()}
                    title={
                      pushSubscribed === true
                        ? "Este navegador ya tiene suscripción push activa"
                        : "Solicitar permiso y registrar este dispositivo"
                    }
                    className={clsx(
                      "inline-flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium disabled:opacity-60",
                      pushSubscribed === true
                        ? "cursor-default border border-[color-mix(in_srgb,var(--color-accent-health)_28%,transparent)] bg-[var(--color-accent-health)] text-white shadow-sm"
                        : "border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)]",
                    )}
                  >
                    {pushBusy ? (
                      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    ) : pushSubscribed === true ? (
                      <Check className="h-3 w-3 shrink-0" strokeWidth={2.5} aria-hidden />
                    ) : (
                      <Radio className="h-3 w-3 shrink-0" aria-hidden />
                    )}
                    {pushSubscribed === true ? "Push activo" : "Activar push"}
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={pushBusy}
                  onClick={() => void onSelfTest()}
                  className="inline-flex items-center gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-[10px] font-medium text-[var(--color-text-primary)] disabled:opacity-60"
                >
                  Probar alerta
                </button>
              </div>
              <Link
                href="/configuracion"
                className="shrink-0 text-[10px] font-medium text-[var(--color-accent-primary)] hover:underline"
                onClick={() => setOpen(false)}
              >
                Ajustes
              </Link>
            </div>
            {!vapidPublic ? (
              <p
                className="m-0 text-[9px] leading-tight text-[var(--color-accent-warning)]"
                title="Ver docs/NOTIFICATIONS.md en el repositorio"
              >
                Push requiere VAPID en servidor.
              </p>
            ) : null}
            {pushHint ? (
              <p className="m-0 text-[9px] leading-tight text-[var(--color-text-secondary)]">{pushHint}</p>
            ) : null}
          </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
