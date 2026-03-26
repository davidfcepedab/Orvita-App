"use client"

import { useState } from "react"
import { createBrowserClient } from "@/lib/supabase/browser"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          inviteCode: inviteCode.trim() || null,
        }),
      })

      const payload = (await response.json()) as {
        success: boolean
        error?: string
      }

      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "No se pudo registrar")
      }

      const supabase = createBrowserClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        throw new Error("Registro exitoso, pero no se pudo iniciar sesión")
      }

      setSuccess(true)
      window.location.href = "/household/invite"
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error registrando usuario"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Crear cuenta</h1>
        <p className="mt-2 text-sm text-gray-500">
          Regístrate con email y password. Si tienes invite code, úsalo para
          unirte a tu hogar.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            required
            className="mt-2 w-full rounded-lg border px-3 py-2"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        <label className="block text-sm font-medium">
          Password
          <input
            type="password"
            required
            className="mt-2 w-full rounded-lg border px-3 py-2"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <label className="block text-sm font-medium">
          Invite code (opcional)
          <input
            type="text"
            className="mt-2 w-full rounded-lg border px-3 py-2"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Creando cuenta..." : "Registrarme"}
        </button>
      </form>

      <div className="rounded-xl border border-dashed p-4 text-sm text-gray-500">
        Google OAuth listo para activar cuando habilites el proveedor en
        Supabase. (Coming soon)
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-600">
          Registro exitoso. Redirigiendo...
        </div>
      )}
    </div>
  )
}
