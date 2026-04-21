"use client"

import { useState } from "react"
import { Fingerprint } from "lucide-react"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"
import { createBrowserClient } from "@/lib/supabase/browser"
import { registerOrvitaPasskey } from "@/lib/auth/registerPasskey"
import { isAppMockMode } from "@/lib/checkins/flags"

/**
 * Passkeys (Face ID / Touch ID) vía WebAuthn MFA de Supabase.
 * Tras registrar, el dashboard de Auth del proyecto debe tener MFA/WebAuthn habilitado.
 */
export function ConfigPasskeyPanel({ theme }: { theme: OrbitaConfigTheme }) {
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  if (isAppMockMode()) return null

  return (
    <section
      id="passkeys-section"
      className="rounded-2xl border p-4 sm:p-5"
      style={{ borderColor: theme.border, backgroundColor: theme.surface }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: theme.surfaceAlt, color: theme.accent.finance }}
        >
          <Fingerprint className="h-5 w-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Llave de acceso (Passkey)
          </h3>
          <p className="text-[11px] leading-relaxed sm:text-xs" style={{ color: theme.textMuted }}>
            Añade Face ID / Touch ID como segundo factor en este dispositivo. El inicio principal sigue siendo
            correo + contraseña o enlace mágico hasta que tu proyecto Supabase active passkeys nativos en el
            proveedor.
          </p>
        </div>
      </div>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setMsg(null)
          setBusy(true)
          try {
            const supabase = createBrowserClient()
            const res = await registerOrvitaPasskey(supabase)
            setMsg(res.ok ? "Passkey registrada en este dispositivo." : res.error)
          } catch (e) {
            setMsg(e instanceof Error ? e.message : "Error al registrar passkey.")
          } finally {
            setBusy(false)
          }
        }}
        className="mt-4 w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-opacity hover:opacity-95 disabled:opacity-50"
        style={{ borderColor: theme.border, color: theme.text, backgroundColor: theme.surfaceAlt }}
      >
        {busy ? "Registrando…" : "Registrar passkey en este dispositivo"}
      </button>
      {msg ? (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
          {msg}
        </p>
      ) : null}
    </section>
  )
}
