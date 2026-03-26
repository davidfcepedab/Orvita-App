"use client"

import { useEffect, useState } from "react"
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
          throw new Error(payload.error || "No se pudo cargar invite code")
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
        <h1 className="text-3xl font-semibold tracking-tight">Invite code</h1>
        <p className="mt-2 text-sm text-gray-500">
          Comparte este código con tu hogar para invitar nuevos usuarios.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando...</p>}

      {inviteCode && (
        <div className="rounded-xl border bg-white p-4 text-center text-2xl font-semibold tracking-widest">
          {inviteCode}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <a
        href="/auth/login"
        className="text-sm font-medium text-gray-600 underline"
      >
        Ir a login
      </a>
    </div>
  )
}
