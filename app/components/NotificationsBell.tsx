"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Bell, Loader2, Radio } from "lucide-react"
import { createBrowserClient } from "@/lib/supabase/browser"
import { isAppMockMode } from "@/lib/checkins/flags"
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
  const wrapRef = useRef<HTMLDivElement>(null)

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
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
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
      else setPushHint("Listo: notificaciones push activas en este dispositivo.")
    } finally {
      setPushBusy(false)
    }
  }

  const onSelfTest = async () => {
    if (mock) return
    const token = await getAccessToken()
    if (!token) return
    setPushBusy(true)
    try {
      await fetch("/api/notifications/self-test", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      })
      void load()
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
          className="orbita-icon-button orbita-focus-ring relative h-11 w-11 cursor-not-allowed opacity-45 sm:h-9 sm:w-9"
        >
          <Bell size={17} strokeWidth={2} className="shrink-0" aria-hidden />
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
        className="orbita-icon-button orbita-focus-ring relative h-11 w-11 sm:h-9 sm:w-9"
      >
        <Bell size={17} strokeWidth={2} className="shrink-0" aria-hidden />
        {unread > 0 ? (
          <span
            className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--color-accent-danger)] ring-2 ring-[var(--color-surface)]"
            aria-hidden
          />
        ) : null}
      </button>

      {open ? (
        <div
          className="absolute right-0 top-[48px] z-[60] flex w-[min(100vw-2rem,380px)] flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-card sm:top-[44px]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] px-3 py-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-text-secondary)]">
              Alertas
            </span>
            {unread > 0 ? (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="orbita-focus-ring rounded-md px-2 py-1 text-[11px] font-medium text-[var(--color-accent-primary)] hover:bg-[var(--color-surface-alt)]"
              >
                Marcar leídas
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(420px,70vh)] overflow-y-auto px-1 py-1">
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
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => void onOpenItem(n)}
                      className="orbita-focus-ring w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-[var(--color-surface-alt)]"
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
                        {new Date(n.created_at).toLocaleString("es-CO", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                        {n.category ? ` · ${n.category}` : ""}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2 border-t border-[color-mix(in_srgb,var(--color-border)_80%,transparent)] bg-[var(--color-surface-alt)]/40 px-3 py-2.5">
            <p className="m-0 text-[10px] leading-snug text-[var(--color-text-secondary)]">
              <strong className="font-semibold text-[var(--color-text-primary)]">Safari iOS:</strong> añade Órvita a la
              pantalla de inicio para recibir Web Push (
              <a
                href="https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/"
                target="_blank"
                rel="noreferrer"
                className="text-[var(--color-accent-primary)] underline-offset-2 hover:underline"
              >
                WebKit
              </a>
              ).
            </p>
            <div className="flex flex-wrap gap-2">
              {isPushSupported() && vapidPublic ? (
                <button
                  type="button"
                  disabled={pushBusy}
                  onClick={() => void onEnablePush()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-primary)] disabled:opacity-60"
                >
                  {pushBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />}
                  Activar push en este dispositivo
                </button>
              ) : null}
              <button
                type="button"
                disabled={pushBusy}
                onClick={() => void onSelfTest()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--color-text-primary)] disabled:opacity-60"
              >
                Probar alerta
              </button>
            </div>
            {!vapidPublic ? (
              <p className="m-0 text-[10px] text-[var(--color-accent-warning)]">
                Configura VAPID en el servidor para habilitar push (ver docs/NOTIFICATIONS.md).
              </p>
            ) : null}
            {pushHint ? <p className="m-0 text-[10px] text-[var(--color-text-secondary)]">{pushHint}</p> : null}
            <Link
              href="/configuracion"
              className="inline-block text-[11px] font-medium text-[var(--color-accent-primary)] hover:underline"
              onClick={() => setOpen(false)}
            >
              Configuración
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
