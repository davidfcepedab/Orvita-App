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

/** Vercel inyecta esto en build; en prod suele haber más cold start (Hobby). */
const isVercelProduction = process.env.NEXT_PUBLIC_VERCEL_ENV === "production"

/** Por intento; hay hasta 2 intentos con pausa entre ellos (Supabase lento / I/O). */
const SIGN_IN_TIMEOUT_PER_ATTEMPT_MS = isVercelProduction ? 24_000 : 20_000
const SIGN_IN_MAX_ATTEMPTS = 2
const SESSION_COOKIE_TIMEOUT_MS = isVercelProduction ? 28_000 : 22_000
const SESSION_COOKIE_MAX_ATTEMPTS = 2

const DB_SLOW_MSG =
  "La base de datos está lenta en este momento. Intenta de nuevo en 10 segundos."

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

type AuthPhase = "register" | "signin" | "session"

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  )
}

function isLikelyNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const m = err.message.toLowerCase()
  return (
    m.includes("failed to fetch") ||
    m.includes("networkerror") ||
    m.includes("load failed") ||
    (err.name === "TypeError" && m.includes("fetch"))
  )
}

function formatLoginError(err: unknown, phase: AuthPhase): string {
  if (isAbortError(err)) {
    if (phase === "session" || phase === "signin") return DB_SLOW_MSG
    if (phase === "register") {
      return "El registro tardó demasiado o se canceló. Revisa la conexión e intenta de nuevo."
    }
    return DB_SLOW_MSG
  }
  if (isLikelyNetworkError(err)) {
    return "No se pudo conectar (red, VPN o bloqueador). Comprueba conexión y que no bloquees peticiones a Supabase ni a tu dominio."
  }
  if (err instanceof Error) return err.message
  return "Error al autenticar."
}

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
  const [busyHint, setBusyHint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const syncSessionCookieOnce = async (accessToken: string) => {
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

  const syncSessionCookieWithRetry = async (accessToken: string) => {
    let lastErr: unknown
    for (let attempt = 0; attempt < SESSION_COOKIE_MAX_ATTEMPTS; attempt += 1) {
      try {
        await withTimeout(
          syncSessionCookieOnce(accessToken),
          SESSION_COOKIE_TIMEOUT_MS + 4_000,
          "__SESSION_TIMEOUT__",
        )
        return
      } catch (e) {
        lastErr = e
        if (
          e instanceof Error &&
          e.message === "__SESSION_TIMEOUT__" &&
          attempt < SESSION_COOKIE_MAX_ATTEMPTS - 1
        ) {
          setBusyHint("Reintentando guardar sesión…")
          await delay(1_000)
          continue
        }
        throw e
      }
    }
    throw lastErr
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (isMock) {
      window.location.href = "/"
      return
    }

    setLoading(true)
    setBusyHint("Conectando con el servicio de acceso…")
    setError(null)

    let phase: AuthPhase = "signin"

    try {
      // Import estático: un `import()` aquí retrasaba todo el login hasta bajar ~el chunk de Supabase.
      const supabase = createBrowserClient()

      if (mode === "register") {
        phase = "register"
        setBusyHint("Creando cuenta…")
        const regMs = isVercelProduction ? 55_000 : 45_000
        const regSignal =
          typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function"
            ? AbortSignal.timeout(regMs)
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

      phase = "signin"
      setBusyHint("Verificando usuario y contraseña…")
      type SignInResponse = {
        data: { session: { access_token: string } | null }
        error: { message?: string } | null
      }

      let signInResult: SignInResponse | null = null
      for (let attempt = 0; attempt < SIGN_IN_MAX_ATTEMPTS; attempt += 1) {
        try {
          signInResult = await withTimeout(
            supabase.auth.signInWithPassword({
              email,
              password,
            }) as Promise<SignInResponse>,
            SIGN_IN_TIMEOUT_PER_ATTEMPT_MS,
            "__SIGNIN_TIMEOUT__",
          )
          break
        } catch (e) {
          if (
            e instanceof Error &&
            e.message === "__SIGNIN_TIMEOUT__" &&
            attempt < SIGN_IN_MAX_ATTEMPTS - 1
          ) {
            setBusyHint("Reintentando inicio de sesión…")
            await delay(900)
            continue
          }
          throw e
        }
      }
      if (!signInResult) throw new Error("__SIGNIN_TIMEOUT__")

      const { data, error: signInError } = signInResult

      if (signInError || !data.session?.access_token) {
        const msg = signInError?.message || "Credenciales inválidas"
        throw new Error(msg)
      }

      phase = "session"
      setBusyHint("Guardando sesión segura…")
      await syncSessionCookieWithRetry(data.session.access_token)

      if (mode === "register") {
        window.location.href = "/household/invite"
      } else {
        window.location.href = "/"
      }
    } catch (err) {
      let message: string
      if (err instanceof Error && err.message === "__SIGNIN_TIMEOUT__") {
        message = DB_SLOW_MSG
      } else if (err instanceof Error && err.message === "__SESSION_TIMEOUT__") {
        message = DB_SLOW_MSG
      } else {
        message = formatLoginError(err, phase)
      }
      setError(message)
    } finally {
      setBusyHint(null)
      setLoading(false)
    }
  }

  const tabActive = "bg-[var(--color-text-primary)] text-[var(--color-background)]"
  const tabIdle = "text-orbita-secondary hover:text-orbita-primary motion-safe:transition-colors"

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center gap-6 px-6 py-12">
      <div
        className="flex flex-col gap-6 rounded-2xl border border-orbita-border bg-orbita-surface p-6 shadow-card"
        aria-busy={loading}
      >
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-orbita-primary">
            {isMock ? "Modo demo" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>
          <p className="mt-2 text-sm text-orbita-secondary">
            {isMock
              ? "Estás en modo visual. Puedes entrar sin autenticación real."
              : mode === "login"
                ? "Accede con tu cuenta de Órvita."
                : "Regístrate con email y password. Si tienes invite code, úsalo para unirte a tu hogar."}
          </p>
        </div>

      {isMock ? (
        <div className="space-y-4">
          <div
            className="rounded-xl border p-4 text-sm text-orbita-primary"
            style={{
              borderColor: "color-mix(in srgb, var(--color-accent-warning) 40%, var(--color-border))",
              background: "color-mix(in srgb, var(--color-accent-warning) 14%, var(--color-surface-alt))",
            }}
          >
            Auth real desactivada en local. Entrarás con datos de referencia.
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/"
            }}
            className="w-full rounded-lg px-4 py-3 text-sm font-semibold text-[var(--color-background)] bg-[var(--color-text-primary)]"
          >
            Entrar en demo
          </button>
        </div>
      ) : (
        <>
          <div className="flex gap-2 rounded-xl border border-orbita-border bg-orbita-surface-alt p-2">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === "login" ? tabActive : tabIdle}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium ${mode === "register" ? tabActive : tabIdle}`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-orbita-primary">
              Email
              <input
                type="email"
                required
                className="mt-2 w-full rounded-lg border border-orbita-border bg-orbita-surface-alt px-3 py-2 text-orbita-primary outline-none placeholder:text-orbita-secondary/70 focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="block text-sm font-medium text-orbita-primary">
              Password
              <input
                type="password"
                required
                className="mt-2 w-full rounded-lg border border-orbita-border bg-orbita-surface-alt px-3 py-2 text-orbita-primary outline-none placeholder:text-orbita-secondary/70 focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {mode === "register" && (
              <label className="block text-sm font-medium text-orbita-primary">
                Invite code (opcional)
                <input
                  type="text"
                  className="mt-2 w-full rounded-lg border border-orbita-border bg-orbita-surface-alt px-3 py-2 text-orbita-primary outline-none placeholder:text-orbita-secondary/70 focus-visible:ring-2 focus-visible:ring-[var(--color-accent-primary)]"
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                />
              </label>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-[var(--color-background)] bg-[var(--color-text-primary)] disabled:opacity-60"
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

      {loading && (
        <p
          className="text-center text-xs text-orbita-secondary motion-safe:animate-pulse"
          role="status"
          aria-live="polite"
        >
          {busyHint ?? "Procesando…"}
        </p>
      )}
      </div>
    </div>
  )
}