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

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
  }

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

  const tabActive =
    "bg-orbita-surface text-orbita-primary shadow-sm ring-1 ring-orbita-border/60 motion-safe:transition-all"
  const tabIdle =
    "text-orbita-secondary hover:bg-orbita-surface/60 hover:text-orbita-primary motion-safe:transition-colors"

  /**
   * Autocompletado alineado con Password AutoFill (Safari / iOS): pareja username + current-password
   * en inicio de sesión; email + new-password en alta. Ver documentación de Apple sobre seguridad y formularios.
   * @see https://developer.apple.com/documentation/security/password_autofill
   */
  const emailAutoComplete = mode === "login" ? "username" : "email"
  const passwordAutoComplete = mode === "login" ? "current-password" : "new-password"

  /** Reglas mínimas para sugerencias de contraseña fuerte en Safari (Supabase ≥ 6). */
  const newPasswordRules = "minlength: 6; allowed: ascii-printable;"

  const fieldClass =
    "mt-2 w-full min-h-[44px] rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface-alt px-3 py-2.5 text-base text-orbita-primary outline-none placeholder:text-orbita-secondary/65 transition-[box-shadow,background-color,border-color] duration-200 placeholder:transition-opacity focus-visible:border-[color-mix(in_srgb,var(--color-accent-primary)_42%,var(--color-border))] focus-visible:bg-orbita-surface focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-accent-primary)_35%,transparent)] touch-manipulation disabled:cursor-not-allowed disabled:opacity-60"

  const primaryBtnClass =
    "min-h-[44px] w-full touch-manipulation rounded-[var(--radius-button)] px-4 py-3 text-base font-semibold text-[var(--color-background)] bg-[var(--color-text-primary)] shadow-sm transition-[transform,opacity,box-shadow] duration-200 hover:shadow-md active:scale-[0.99] motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:shadow-none"

  return (
    <main
      className="mx-auto flex min-h-[100dvh] min-h-[-webkit-fill-available] w-full max-w-[26rem] flex-col justify-center gap-8 pl-[max(1.25rem,env(safe-area-inset-left,0px))] pr-[max(1.25rem,env(safe-area-inset-right,0px))] pb-[max(2rem,env(safe-area-inset-bottom,0px))] pt-[max(1.25rem,env(safe-area-inset-top,0px))] sm:pl-6 sm:pr-6 sm:pb-12 sm:pt-8"
      id="auth-main"
    >
      <div
        className="flex flex-col gap-7 rounded-[var(--radius-card)] border border-orbita-border/80 bg-orbita-surface/95 p-6 shadow-card ring-1 ring-orbita-border/25 backdrop-blur-[2px] sm:p-7"
        aria-busy={loading}
      >
        <header className="space-y-2">
          <p className="text-overline font-semibold uppercase tracking-[0.16em] text-[var(--color-accent-primary)]">
            Órvita
          </p>
          <h1 className="font-display text-[1.65rem] font-semibold leading-tight tracking-tight text-orbita-primary sm:text-3xl">
            {isMock ? "Modo demo" : mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
          </h1>
          <p className="text-[0.9375rem] leading-relaxed text-orbita-secondary">
            {isMock
              ? "Estás en modo visual. Puedes entrar sin autenticación real."
              : mode === "login"
                ? "Accede con tu cuenta de Órvita."
                : "Regístrate con correo y contraseña. Si tienes código de invitación, podrás unirte a un hogar existente."}
          </p>
        </header>

      {isMock ? (
        <div className="space-y-4">
          <div
            className="rounded-[var(--radius-button)] border p-4 text-sm leading-relaxed text-orbita-primary"
            style={{
              borderColor: "color-mix(in srgb, var(--color-accent-warning) 40%, var(--color-border))",
              background: "color-mix(in srgb, var(--color-accent-warning) 14%, var(--color-surface-alt))",
            }}
          >
            Auth real desactivada en local. Entrarás con datos de referencia.
          </div>
          <button type="button" onClick={() => (window.location.href = "/")} className={primaryBtnClass}>
            Entrar en demo
          </button>
        </div>
      ) : (
        <>
          <div
            className="flex gap-1.5 rounded-[var(--radius-button)] border border-orbita-border/70 bg-[color-mix(in_srgb,var(--color-surface-alt)_88%,var(--color-border))] p-1.5 shadow-inner"
            role="tablist"
            aria-label="Tipo de acceso"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "login"}
              id="tab-login"
              disabled={loading}
              onClick={() => switchMode("login")}
              className={`flex-1 min-h-[44px] rounded-md px-3 py-2.5 text-base font-semibold touch-manipulation disabled:cursor-not-allowed disabled:opacity-50 ${mode === "login" ? tabActive : tabIdle}`}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "register"}
              id="tab-register"
              disabled={loading}
              onClick={() => switchMode("register")}
              className={`flex-1 min-h-[44px] rounded-md px-3 py-2.5 text-base font-semibold touch-manipulation disabled:cursor-not-allowed disabled:opacity-50 ${mode === "register" ? tabActive : tabIdle}`}
            >
              Crear cuenta
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
            role="tabpanel"
            aria-labelledby={mode === "login" ? "tab-login" : "tab-register"}
            autoComplete="on"
            name={mode === "login" ? "signin" : "signup"}
          >
            <label className="block text-sm font-semibold text-orbita-primary" htmlFor="auth-email">
              Correo electrónico
              <input
                id="auth-email"
                name="email"
                type="email"
                autoComplete={emailAutoComplete}
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                enterKeyHint="next"
                required
                disabled={loading}
                className={fieldClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label className="block text-sm font-semibold text-orbita-primary" htmlFor="auth-password">
              Contraseña
              {mode === "register" ? (
                <span className="mt-1 block text-xs font-normal text-orbita-secondary">Mínimo 6 caracteres</span>
              ) : null}
              <input
                id="auth-password"
                name="password"
                type="password"
                autoComplete={passwordAutoComplete}
                required
                {...(mode === "register" ? { minLength: 6 } : {})}
                {...(mode === "register"
                  ? ({
                      passwordrules: newPasswordRules,
                    } as React.InputHTMLAttributes<HTMLInputElement> & { passwordrules?: string })
                  : {})}
                enterKeyHint={mode === "register" ? "next" : "go"}
                disabled={loading}
                className={fieldClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {mode === "register" && (
              <label className="block text-sm font-semibold text-orbita-primary" htmlFor="auth-invite">
                Código de invitación (opcional)
                <input
                  id="auth-invite"
                  name="inviteCode"
                  type="text"
                  autoComplete="off"
                  enterKeyHint="done"
                  disabled={loading}
                  className={fieldClass}
                  value={inviteCode}
                  onChange={(event) => setInviteCode(event.target.value)}
                  placeholder="Si te invitaron al hogar"
                />
              </label>
            )}

            <button type="submit" disabled={loading} className={primaryBtnClass}>
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
          className="rounded-[var(--radius-button)] border p-4 text-sm leading-relaxed"
          style={{
            borderColor: "color-mix(in srgb, var(--color-accent-danger) 45%, var(--color-border))",
            background: "color-mix(in srgb, var(--color-accent-danger) 10%, var(--color-surface-alt))",
            color: "var(--color-accent-danger)",
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {loading && (
        <div
          className="flex items-center justify-center gap-2.5 text-center text-xs text-orbita-secondary"
          role="status"
          aria-live="polite"
        >
          <span
            className="inline-block h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-orbita-border border-t-[var(--color-accent-primary)] motion-reduce:animate-none"
            aria-hidden
          />
          <span className="motion-safe:animate-pulse">{busyHint ?? "Procesando…"}</span>
        </div>
      )}
      </div>
    </main>
  )
}