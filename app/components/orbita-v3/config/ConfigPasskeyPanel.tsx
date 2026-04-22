"use client"

import { useEffect, useState } from "react"
import { Fingerprint, Pencil, Trash2 } from "lucide-react"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"
import { createBrowserClient } from "@/lib/supabase/browser"
import {
  listOrvitaPasskeys,
  registerOrvitaPasskey,
  removeOrvitaPasskey,
  setLocalPasskeyAlias,
  type OrvitaPasskeyFactor,
} from "@/lib/auth/registerPasskey"
import { isAppMockMode } from "@/lib/checkins/flags"

/**
 * Passkeys (Face ID / Touch ID) vía WebAuthn MFA de Supabase.
 * Tras registrar, el dashboard de Auth del proyecto debe tener MFA/WebAuthn habilitado.
 */
export function ConfigPasskeyPanel({
  theme,
  moduleCard,
  compact = false,
  showHeader = true,
}: {
  theme: OrbitaConfigTheme
  moduleCard?: boolean
  compact?: boolean
  showHeader?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [listBusy, setListBusy] = useState(false)
  const [factors, setFactors] = useState<OrvitaPasskeyFactor[]>([])
  const [msg, setMsg] = useState<string | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState("")

  if (isAppMockMode()) return null

  const loadFactors = async () => {
    setListBusy(true)
    try {
      const supabase = createBrowserClient()
      const res = await listOrvitaPasskeys(supabase)
      if (!res.ok) {
        setMsg(res.error)
        return
      }
      setFactors(res.factors)
    } finally {
      setListBusy(false)
    }
  }

  useEffect(() => {
    void loadFactors()
  }, [])

  return (
    <section
      id="passkeys-section"
      className={moduleCard ? (compact ? "px-3 py-2.5 sm:px-4 sm:py-3" : "px-4 py-3.5 sm:px-5 sm:py-4") : "rounded-2xl border p-4 sm:p-5"}
      style={moduleCard ? undefined : { borderColor: theme.border, backgroundColor: theme.surface }}
    >
      {showHeader ? (
        <div className="flex items-start gap-2.5 sm:gap-3.5">
          <div
            className={`flex shrink-0 items-center justify-center rounded-lg ${compact ? "h-8 w-8" : "h-9 w-9 sm:h-10 sm:w-10"}`}
            style={{ backgroundColor: theme.surfaceAlt, color: theme.accent.finance }}
          >
            <Fingerprint className={compact ? "h-4 w-4" : "h-[1.1rem] w-[1.1rem] sm:h-5 sm:w-5"} aria-hidden />
          </div>
          <div className="min-w-0 flex-1 space-y-0.5">
            <h3 className="text-sm font-semibold leading-snug" style={{ color: theme.text }}>
              Passkey
            </h3>
            <p className="text-[11px] leading-snug sm:text-xs" style={{ color: theme.textMuted }}>
              {compact
                ? "Face ID / Touch ID como segundo factor en este dispositivo."
                : "Añade Face ID / Touch ID como segundo factor en este dispositivo. El inicio principal sigue siendo correo + contraseña o enlace mágico hasta que tu proyecto Supabase active passkeys nativos en el proveedor."}
            </p>
          </div>
        </div>
      ) : null}
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
            if (res.ok) void loadFactors()
          } catch (e) {
            setMsg(e instanceof Error ? e.message : "Error al registrar passkey.")
          } finally {
            setBusy(false)
          }
        }}
        className={`w-full max-w-md rounded-lg border px-3 text-xs font-semibold transition-opacity hover:opacity-95 disabled:opacity-50 ${
          !showHeader ? "mt-0 py-1.5" : compact ? "mt-2 py-2" : "mt-3 py-2.5"
        }`}
        style={{ borderColor: theme.border, color: theme.text, backgroundColor: moduleCard ? "transparent" : theme.surfaceAlt }}
      >
        {busy ? "Registrando…" : showHeader ? (compact ? "Registrar passkey" : "Registrar passkey en este dispositivo") : "Acceso con Face ID o huella"}
      </button>
      <div className="mt-3 space-y-2">
        <p className="text-xs font-semibold" style={{ color: theme.text }}>
          Dispositivos registrados
        </p>
        {listBusy ? (
          <p className="text-xs" style={{ color: theme.textMuted }}>
            Cargando passkeys…
          </p>
        ) : factors.length === 0 ? (
          <p className="text-xs" style={{ color: theme.textMuted }}>
            Aún no hay passkeys registradas.
          </p>
        ) : (
          <div className="space-y-2">
            {factors.map((f) => (
              <div
                key={f.id}
                className="rounded-xl border p-2.5"
                style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}
              >
                {renamingId === f.id ? (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={renameDraft}
                      onChange={(e) => setRenameDraft(e.target.value)}
                      className="w-full rounded-lg border px-2 py-1.5 text-xs"
                      style={{ borderColor: theme.border, backgroundColor: theme.surface, color: theme.text }}
                      placeholder="Nombre del dispositivo"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-lg border px-2 py-1 text-xs"
                        style={{ borderColor: theme.border, color: theme.text }}
                        onClick={() => {
                          setLocalPasskeyAlias(f.id, renameDraft)
                          setRenamingId(null)
                          setRenameDraft("")
                          void loadFactors()
                        }}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border px-2 py-1 text-xs"
                        style={{ borderColor: theme.border, color: theme.textMuted }}
                        onClick={() => {
                          setRenamingId(null)
                          setRenameDraft("")
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold" style={{ color: theme.text }}>
                        {f.friendlyName}
                      </p>
                      <p className="truncate text-[11px]" style={{ color: theme.textMuted }}>
                        {f.status} · {f.id.slice(0, 8)}…
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="rounded-lg border p-1.5"
                        style={{ borderColor: theme.border, color: theme.textMuted }}
                        onClick={() => {
                          setRenamingId(f.id)
                          setRenameDraft(f.friendlyName)
                        }}
                        title="Renombrar (alias local)"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg border p-1.5"
                        style={{ borderColor: theme.border, color: "#dc2626" }}
                        onClick={async () => {
                          if (!window.confirm("¿Eliminar este passkey de tu cuenta?")) return
                          const supabase = createBrowserClient()
                          const res = await removeOrvitaPasskey(supabase, f.id)
                          setMsg(res.ok ? "Passkey eliminada." : res.error)
                          if (res.ok) void loadFactors()
                        }}
                        title="Eliminar"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {msg ? (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
          {msg}
        </p>
      ) : null}
    </section>
  )
}
