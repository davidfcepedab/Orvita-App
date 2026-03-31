"use client"

import { useState } from "react"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { createBrowserClient } from "@/lib/supabase/browser"

type Mode = "login" | "register"

type RegisterPayload = {
  success: boolean
  error?: string
}

const isMock = process.env.NEXT_PUBLIC_APP_MODE === "mock"

const SIGN_IN_TIMEOUT_MS = 35_000
const SESSION_COOKIE_TIMEOUT_MS = 25_000

function withTimeout<T>(promise: Promise<T>, ms: number, timeoutMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = window.setTimeout(() => reject(new Error(timeoutMessage)), ms)
    promise.then(
      (v) => {
        window.clearTimeout(id)
        resolve(v)
      },
      (e) => {
        window.clearTimeout(id)
        reject(e)
      },
    )
  })
}

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [inviteCode, setInviteCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const syncSessionCookie = async (accessToken: string) => {
    const c = typeof AbortController !== "undefined" ? new AbortController() : null
    const timer =
      c != null
        ? window.setTimeout(() => {
            try {
              c.abort()
            } catch {
              /* ignore */
            }
          }, SESSION_COOKIE_TIMEOUT_MS)
        : null
    try {
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        ...(c ? { signal: c.signal } : {}),
      })
      const payload = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string }
      if (!res.ok) {
        throw new Error(
          payload.error ||
            messageForHttpError(res.status, payload.error, res.statusText) ||
            "No se pudo guardar la sesión en el servidor",
        )
      }
    } finally {
      if (timer != null) window.clearTimeout(timer)
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isMock) {
      window.location.href = "/hoy"
      return
    }

    setLoading(true)
    setError(null)

    try {
      const supabase = createBrowserClient()

      if (mode === "register") {
        const regSignal =
          typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
            ? AbortSignal.timeout(45_000)
            : undefined
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            inviteCode: inviteCode.trim() || null,
          }),
          ...(regSignal ? { signal: regSignal } : {}),
        })

        const payload = (await response.json()) as RegisterPayload
        if (!response.ok || !payload.success) {
          throw new Error(messageForHttpError(response.status, payload.error, response.statusText))
        }
      }

      type SignInResponse = {
        data: { session: { access_token: string } | null }
        error: { message?: string } | null
      }
      const signInResult = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }) as Promise<SignInResponse>,
        SIGN_IN_TIMEOUT_MS,
        "El acceso tardó demasiado. Revisa tu conexión o intenta de nuevo.",
      )
      const { data, error: signInError } = signInResult

      if (signInError || !data.session?.access_token) {
        const msg = signInError?.message || "Credenciales inválidas"
        throw new Error(msg)
      }

      await withTimeout(
        syncSessionCookie(data.session.access_token),
        SESSION_COOKIE_TIMEOUT_MS + 5_000,
        "No se pudo confirmar la sesión a tiempo. Intenta de nuevo.",
      )

      if (mode === "register") {
        window.location.href = "/household/invite"
      } else {
        window.location.href = "/hoy"
      }
    } catch (err) {
      let message = err instanceof Error ? err.message : "Error autenticando"
      if (err instanceof Error && err.name === "AbortError") {
        message = "Tiempo agotado al guardar la sesión. Intenta de nuevo."
      }
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {isMock ? "Modo demo" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
        </h1>
        <p className="mt-2 text-sm text-gray-500">
          {isMock
            ? "Estás en modo visual. Puedes entrar sin autenticación real."
            : mode === "login"
              ? "Accede con tu cuenta de Órvita."
              : "Regístrate con email y password. Si tienes invite code, úsalo para unirte a tu hogar."}
        </p>
      </div>

      {isMock ? (
        <div className="space-y-4">
          <div className="rounded-xl border bg-amber-50 p-4 text-sm text-amber-700">
            Auth real desactivada en local. Entrarás con datos de referencia.
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/hoy"
            }}
            className="w-full rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white"
          >
            Entrar en demo
          </button>
        </div>
      ) : (
        <>
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
        </>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  )
}