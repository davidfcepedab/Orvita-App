"use client"

import { useState } from "react"
import { createBrowserClient } from "@/lib/supabase/browser"

type Mode = "login" | "register"

type RegisterPayload = {
  success: boolean
  error?: string
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncSessionCookie = async (accessToken: string) => {
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const supabase = createBrowserClient()

      if (mode === "register") {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            inviteCode: inviteCode.trim() || null,
          }),
        })

        const payload = (await response.json()) as RegisterPayload
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || "No se pudo registrar")
        }
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError || !data.session?.access_token) {
        throw new Error("Credenciales inválidas")
      }

      await syncSessionCookie(data.session.access_token)

      if (mode === "register") {
        window.location.href = "/household/invite"
      } else {
        window.location.href = "/hoy"
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error autenticando"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {mode === "login"
            ? "Accede con tu cuenta de Órvita."
            : "Regístrate con email y password. Si tienes invite code, úsalo para unirte a tu hogar."}
        </p>
      </div>

      <div className="flex gap-2 rounded-xl border p-2">
        <button
          type="button"
          onClick={() => setMode("login")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm ${
            mode === "login" ? "bg-black text-white" : "text-gray-500"
          }`}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={() => setMode("register")}
          className={`flex-1 rounded-lg px-3 py-2 text-sm ${
            mode === "register" ? "bg-black text-white" : "text-gray-500"
          }`}
        >
          Create Account
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
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

        {mode === "register" && (
          <label className="block text-sm font-medium">
            Invite code (opcional)
            <input
              type="text"
              className="mt-2 w-full rounded-lg border px-3 py-2"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
            />
          </label>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading
            ? mode === "login"
              ? "Ingresando..."
              : "Creando cuenta..."
            : mode === "login"
            ? "Entrar"
            : "Registrarme"}
        </button>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  )
}
