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
import { cn } from "@/lib/utils"

/**
 * Passkeys (Face ID / Touch ID) vía WebAuthn MFA de Supabase.
 * Tras registrar, el dashboard de Auth del proyecto debe tener MFA/WebAuthn habilitado.
 */
export function ConfigPasskeyPanel({ theme, className }: { theme: OrbitaConfigTheme; className?: string }) {
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
      className={cn("orv-glass-panel orv-fade-lift rounded-[1.1rem] border p-4 sm:p-5", className)}
      style={{ borderColor: theme.border }}
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
            if (res.ok) void loadFactors()
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
      <div className="mt-4 space-y-2">
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
