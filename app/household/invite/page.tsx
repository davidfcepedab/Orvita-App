"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { createBrowserClient } from "@/lib/supabase/browser"

type InvitePayload = {
  inviteCode: string
}

export default function HouseholdInvitePage() {
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const load = async () => {
      try {
        const supabase = createBrowserClient()
        const { data } = await supabase.auth.getSession()
        const token = data.session?.access_token

        if (!token) {
          throw new Error("Sesión inválida. Inicia sesión.")
        }

        const response = await fetch("/api/household/invite", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const payload = (await response.json()) as {
          success: boolean
          data?: InvitePayload
          error?: string
        }

        if (!response.ok || !payload.success || !payload.data) {
          throw new Error(messageForHttpError(response.status, payload.error, response.statusText))
        }

        if (active) {
          setInviteCode(payload.data.inviteCode)
        }
      } catch (err) {
        if (active) {
          const message =
            err instanceof Error ? err.message : "Error cargando invite code"
          setError(message)
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    load()
    return () => {
      active = false
    }
  }, [])

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-orbita-primary">Invite code</h1>
        <p className="mt-2 text-sm text-orbita-secondary">
          Comparte este código con tu hogar para invitar nuevos usuarios.
        </p>
      </div>

      {loading && <p className="text-sm text-orbita-secondary">Cargando...</p>}

      {inviteCode && (
        <div className="rounded-xl border border-orbita-border bg-orbita-surface p-4 text-center text-2xl font-semibold tracking-widest text-orbita-primary shadow-card">
          {inviteCode}
        </div>
      )}

      {error && (
        <div
          className="rounded-lg border p-3 text-sm"
          style={{
            borderColor: "color-mix(in srgb, var(--color-accent-danger) 45%, var(--color-border))",
            background: "color-mix(in srgb, var(--color-accent-danger) 12%, var(--color-surface-alt))",
            color: "var(--color-accent-danger)",
          }}
        >
          {error}
        </div>
      )}

      <Link href="/auth" className="text-sm font-medium text-orbita-secondary underline hover:text-orbita-primary motion-safe:transition-colors">
        Ir a login
      </Link>
    </div>
  )
}
