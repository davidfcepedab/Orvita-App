"use client"

import { useEffect, useState } from "react"
import { Fingerprint, KeyRound, Loader2, Lock, Mail } from "lucide-react"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { createBrowserClient } from "@/lib/supabase/browser"
import { listOrvitaPasskeys } from "@/lib/auth/registerPasskey"
import { LoginHeader } from "@/app/auth/_components/LoginHeader"
import { AppleStyleButton } from "@/app/auth/_components/AppleStyleButton"
import { MagicLinkExplanation } from "@/app/auth/_components/MagicLinkExplanation"
import { StrategicPreview } from "@/app/auth/_components/StrategicPreview"

type Mode = "login" | "register"

type RegisterPayload = {
  success: boolean
  error?: string
}

const isMock = process.env.NEXT_PUBLIC_APP_MODE === "mock"

/** Google OAuth en el dashboard de Supabase + URL de retorno. */
const googleSignInEnabled = process.env.NEXT_PUBLIC_AUTH_GOOGLE_SIGN_IN === "1"

type AuthChannel = "password" | "magic"

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
  const [oauthLoading, setOauthLoading] = useState(false)
  const [authChannel, setAuthChannel] = useState<AuthChannel>("magic")
  const [magicSent, setMagicSent] = useState(false)

  /** Tras OAuth (p. ej. Apple), sincroniza cookie de sesión y redirige si ya hay sesión. */
  useEffect(() => {
    if (isMock) return
    let cancelled = false

    async function resumeOAuthSession() {
      try {
        const supabase = createBrowserClient()
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (cancelled || !session?.access_token) return
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { Authorization: `Bearer ${session.access_token}` },
        })
        if (!res.ok || cancelled) return
        window.location.replace("/hoy")
      } catch {
        /* sin sesión o error de red */
      }
    }

    void resumeOAuthSession()
    return () => {
      cancelled = true
    }
  }, [isMock])

  const switchMode = (next: Mode) => {
    setMode(next)
    setError(null)
    setMagicSent(false)
    setAuthChannel("password")
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
      window.location.href = "/hoy"
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
        window.location.href = "/hoy"
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
   * Password AutoFill (Safari / iOS): `username` en correo como identificador en login y alta;
   * `current-password` / `new-password` en contraseña.
   * @see https://developer.apple.com/documentation/security/enabling-password-autofill-on-an-html-input-element
   */
  const emailAutoComplete = "username"
  const passwordAutoComplete = mode === "login" ? "current-password" : "new-password"

  /** Reglas mínimas para sugerencias de contraseña fuerte en Safari (Supabase ≥ 6). */
  const newPasswordRules = "minlength: 6; allowed: ascii-printable;"

  const fieldClass =
    "mt-2 w-full min-h-[44px] rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface-alt px-3 py-2.5 text-base text-orbita-primary outline-none placeholder:text-orbita-secondary/65 transition-[box-shadow,background-color,border-color] duration-200 placeholder:transition-opacity focus-visible:border-[color-mix(in_srgb,var(--color-accent-primary)_42%,var(--color-border))] focus-visible:bg-orbita-surface focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--color-accent-primary)_35%,transparent)] touch-manipulation disabled:cursor-not-allowed disabled:opacity-60"

  const primaryBtnClass =
    "min-h-[44px] w-full touch-manipulation rounded-[var(--radius-button)] px-4 py-3 text-base font-semibold text-[var(--color-background)] bg-[var(--color-text-primary)] shadow-sm transition-[transform,opacity,box-shadow] duration-200 hover:shadow-md active:scale-[0.99] motion-reduce:transform-none disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none disabled:hover:shadow-none"

  const appleBtnClass =
    "flex min-h-[44px] w-full touch-manipulation items-center justify-center gap-2 rounded-[var(--radius-button)] border border-black/10 bg-black px-4 py-3 text-base font-semibold text-white shadow-sm transition-[opacity,box-shadow] duration-200 hover:bg-neutral-900 hover:shadow-md active:opacity-95 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50"

  const googleBtnClass =
    "flex min-h-[44px] w-full touch-manipulation items-center justify-center gap-2 rounded-[var(--radius-button)] border border-orbita-border bg-orbita-surface px-4 py-3 text-base font-semibold text-orbita-primary shadow-sm transition-[opacity,box-shadow] duration-200 hover:bg-orbita-surface-alt hover:shadow-md active:opacity-95 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50"

  const handleGoogleSignIn = async () => {
    if (isMock || !googleSignInEnabled) return
    setOauthLoading(true)
    setError(null)
    try {
      const supabase = createBrowserClient()
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${origin}/auth`,
          skipBrowserRedirect: false,
        },
      })
      if (oauthError) throw oauthError
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar sesión con Google.")
    } finally {
      setOauthLoading(false)
    }
  }

  const handlePasskeySignIn = async () => {
    if (isMock) {
      window.location.href = "/hoy"
      return
    }
    setOauthLoading(true)
    setError(null)
    setBusyHint("Validando Face ID / Touch ID…")
    try {
      const supabase = createBrowserClient()
      const listed = await listOrvitaPasskeys(supabase)
      if (!listed.ok || listed.factors.length === 0) {
        throw new Error("No tienes passkeys registradas aún. Entra con Google o enlace mágico y registra una en Configuración.")
      }
      const verified = listed.factors.find((f) => f.status === "verified") ?? listed.factors[0]
      const webauthn = (supabase.auth as unknown as { webauthn?: { authenticate?: (x: { factorId: string }) => Promise<unknown> } }).webauthn
      if (!webauthn?.authenticate) {
        throw new Error("Tu navegador no soporta login passkey en esta versión.")
      }
      const authRes = (await webauthn.authenticate({ factorId: verified.id })) as {
        error?: { message?: string } | null
      }
      if (authRes?.error?.message) throw new Error(authRes.error.message)

      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session?.access_token) throw new Error("No se pudo establecer la sesión con passkey.")
      await syncSessionCookieWithRetry(session.access_token)
      window.location.href = "/hoy"
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo iniciar con passkey.")
    } finally {
      setBusyHint(null)
      setOauthLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (isMock) return
    if (!email.trim()) {
      setError("Introduce tu correo para el enlace mágico.")
      return
    }
    setLoading(true)
    setError(null)
    setMagicSent(false)
    setBusyHint("Enviando enlace seguro…")
    try {
      const supabase = createBrowserClient()
      const origin = typeof window !== "undefined" ? window.location.origin : ""
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${origin}/auth`,
          shouldCreateUser: mode === "register",
        },
      })
      if (otpError) throw otpError
      setMagicSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo enviar el enlace.")
    } finally {
      setBusyHint(null)
      setLoading(false)
    }
  }

  return (
    <div
      className="relative min-h-[100dvh] w-full overflow-hidden"
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
        background:
          "radial-gradient(120% 90% at 30% -5%, rgba(0, 212, 255, 0.16), transparent 40%), linear-gradient(160deg, #0A0A0A 0%, #1C2526 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-[0.16] [background-image:radial-gradient(rgba(255,255,255,0.35)_0.6px,transparent_0.6px)] [background-size:3px_3px]" />
      <main
        className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col justify-end px-[max(20px,env(safe-area-inset-left))] pb-[max(20px,env(safe-area-inset-bottom))] pt-[max(20px,env(safe-area-inset-top))] sm:justify-center"
        id="auth-main"
      >
        <section
          className="w-full rounded-[20px] border border-white/15 bg-white/[0.06] p-5 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.95)] backdrop-blur-2xl sm:p-6"
          aria-busy={loading || oauthLoading}
        >
          <LoginHeader />

          <div className="mt-5 space-y-3">
            <AppleStyleButton
              onClick={() => void handlePasskeySignIn()}
              disabled={loading || oauthLoading}
              variant="light"
              icon={<Fingerprint className="h-5 w-5" />}
              ariaLabel="Continuar con Face ID o Touch ID"
            >
              {oauthLoading ? "Verificando passkey…" : "Continuar con Face ID / Touch ID"}
            </AppleStyleButton>

            {googleSignInEnabled ? (
              <AppleStyleButton
                onClick={() => void handleGoogleSignIn()}
                disabled={loading || oauthLoading}
                variant="black"
                icon={
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden className="shrink-0">
                    <path
                      fill="#FFC107"
                      d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
                    />
                    <path
                      fill="#FF3D00"
                      d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.166 0 9.86-1.977 13.409-5.197l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
                    />
                  </svg>
                }
                ariaLabel="Continuar con Google"
              >
                {oauthLoading ? "Abriendo Google…" : "Continuar con Google"}
              </AppleStyleButton>
            ) : null}
          </div>
          <div className="mt-5 flex gap-1 rounded-2xl border border-white/15 bg-white/[0.04] p-1">
            <button
              type="button"
              onClick={() => setAuthChannel("password")}
              className={`min-h-11 flex-1 rounded-[14px] px-3 text-sm font-semibold transition-all ${
                authChannel === "password" ? "bg-white text-[#0E1214]" : "text-[#D1D9DB]"
              }`}
            >
              Contraseña
            </button>
            <button
              type="button"
              onClick={() => setAuthChannel("magic")}
              className={`min-h-11 flex-1 rounded-[14px] px-3 text-sm font-semibold transition-all ${
                authChannel === "magic" ? "bg-white text-[#0E1214]" : "text-[#D1D9DB]"
              }`}
            >
              Enlace mágico
            </button>
          </div>

          <div
            id="auth-form-panel"
            role="tabpanel"
            tabIndex={-1}
            className="mt-4"
          >
            {authChannel === "magic" ? (
              <div className="space-y-3">
                <MagicLinkExplanation />
                <label className="block text-sm font-semibold text-white/90" htmlFor="auth-email-magic">
                  Correo electrónico
                  <input
                    id="auth-email-magic"
                    name="email"
                    type="email"
                    autoComplete={emailAutoComplete}
                    inputMode="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="send"
                    required
                    disabled={loading || oauthLoading}
                    className="mt-2 min-h-11 w-full rounded-[16px] border border-white/20 bg-black/35 px-4 text-base text-white outline-none placeholder:text-[#9FAEB2] focus:ring-2 focus:ring-[#00D4FF]/50"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                {magicSent ? (
                  <div
                    className="rounded-[16px] border border-[#00D4FF]/35 bg-[#00D4FF]/10 p-3 text-sm leading-relaxed text-[#DBF8FF]"
                    style={{
                      boxShadow: "0 14px 24px -18px rgba(0, 212, 255, 0.6)",
                    }}
                    role="status"
                  >
                    Revisa tu correo: te enviamos un enlace seguro. Al abrirlo te llevamos directo a Hoy.
                  </div>
                ) : null}
                <AppleStyleButton onClick={() => void handleMagicLink()} disabled={loading || oauthLoading} variant="glass" icon={<Mail className="h-4 w-4" />}>
                  {loading ? "Enviando…" : mode === "register" ? "Enviar enlace de registro" : "Enviar enlace de acceso"}
                </AppleStyleButton>
              </div>
            ) : (
              <form
                id="auth-form"
                onSubmit={handleSubmit}
                className="space-y-5"
                autoComplete="on"
                name={mode === "login" ? "signin" : "signup"}
              >
                <label className="block text-sm font-semibold text-white/90" htmlFor="auth-email">
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
                    disabled={loading || oauthLoading}
                    className="mt-2 min-h-11 w-full rounded-[16px] border border-white/20 bg-black/35 px-4 text-base text-white outline-none placeholder:text-[#9FAEB2] focus:ring-2 focus:ring-[#00D4FF]/50"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>

                <label className="block text-sm font-semibold text-white/90" htmlFor="auth-password">
                  Contraseña
                  {mode === "register" ? (
                    <span className="mt-1 block text-xs font-normal text-[#A9B7BA]">Mínimo 6 caracteres</span>
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
                    disabled={loading || oauthLoading}
                    className="mt-2 min-h-11 w-full rounded-[16px] border border-white/20 bg-black/35 px-4 text-base text-white outline-none placeholder:text-[#9FAEB2] focus:ring-2 focus:ring-[#00D4FF]/50"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </label>

                {mode === "register" && (
                  <label className="block text-sm font-semibold text-white/90" htmlFor="auth-invite">
                    Código de invitación (opcional)
                    <input
                      id="auth-invite"
                      name="inviteCode"
                      type="text"
                      autoComplete="off"
                      enterKeyHint="done"
                      disabled={loading || oauthLoading}
                      className="mt-2 min-h-11 w-full rounded-[16px] border border-white/20 bg-black/35 px-4 text-base text-white outline-none placeholder:text-[#9FAEB2] focus:ring-2 focus:ring-[#00D4FF]/50"
                      value={inviteCode}
                      onChange={(event) => setInviteCode(event.target.value)}
                      placeholder="Si te invitaron al hogar"
                    />
                  </label>
                )}

                <button
                  type="submit"
                  disabled={loading || oauthLoading}
                  className="min-h-11 w-full rounded-[18px] bg-white px-4 text-[15px] font-semibold text-[#111417] shadow-[0_12px_26px_-16px_rgba(255,255,255,0.85)] transition-all active:scale-[0.985] disabled:opacity-50"
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
            )}
          </div>

          <div className="mt-4">
            <StrategicPreview />
          </div>

          {error ? (
            <div
              className="mt-4 rounded-[16px] border border-[#ff6b6b]/35 bg-[#ff6b6b]/10 p-3 text-sm leading-relaxed text-[#FFD9D9]"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          ) : null}

          {(loading || oauthLoading) && busyHint ? (
            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[#B7C5C9]" role="status" aria-live="polite">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>{busyHint}</span>
            </div>
          ) : null}

          {isMock ? (
            <button
              type="button"
              onClick={() => (window.location.href = "/hoy")}
              className="mt-4 min-h-11 w-full rounded-[18px] border border-[#00D4FF]/45 bg-[#00D4FF]/15 text-sm font-semibold text-[#DDF8FF] transition-all active:scale-[0.985]"
            >
              Entrar en demo
            </button>
          ) : null}
        </section>
      </main>
    </div>
  )
}