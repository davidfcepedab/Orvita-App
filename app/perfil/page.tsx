"use client"

import { useCallback, useEffect, useId, useState } from "react"
import Link from "next/link"
import { Sparkles, Camera, Save, ChevronLeft } from "lucide-react"
import { useOrbitaSkin } from "@/app/contexts/AppContext"
import { OrbitaImageCropDialog } from "@/app/components/OrbitaImageCropDialog"
import { createBrowserClient } from "@/lib/supabase/browser"
import { messageForHttpError } from "@/lib/api/friendlyHttpError"
import { dispatchAvatarUpdated } from "@/lib/profile/avatarUpdatedEvent"

type ProfileMePayload = {
  email: string
  displayName: string | null
  avatarUrl: string | null
  householdFamilyPhotoUrl: string | null
  completeness: number
}

export default function PerfilPage() {
  const theme = useOrbitaSkin()
  const fileInputId = useId()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [householdFamilyPhotoUrl, setHouseholdFamilyPhotoUrl] = useState<string | null>(null)
  const [completeness, setCompleteness] = useState(0)
  const [savingName, setSavingName] = useState(false)
  const [nameMessage, setNameMessage] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null)
  const [avatarCropOpen, setAvatarCropOpen] = useState(false)
  const [avatarCropFile, setAvatarCropFile] = useState<File | null>(null)

  const getAccessToken = useCallback(async () => {
    const supabase = createBrowserClient()
    const { data, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    const token = data.session?.access_token
    if (!token) throw new Error("Inicia sesión para personalizar tu perfil.")
    return token
  }, [])

  const loadProfile = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const token = await getAccessToken()
      const res = await fetch("/api/profile/me", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await res.json()) as {
        success?: boolean
        data?: ProfileMePayload
        error?: string
      }
      if (!res.ok || !payload.success || !payload.data) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      const d = payload.data
      setEmail(d.email)
      setDisplayName(d.displayName ?? "")
      setAvatarUrl(d.avatarUrl)
      setHouseholdFamilyPhotoUrl(d.householdFamilyPhotoUrl)
      setCompleteness(d.completeness)
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar tu perfil")
    } finally {
      setLoading(false)
    }
  }, [getAccessToken])

  useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  const handleSaveName = async () => {
    setNameMessage(null)
    setSavingName(true)
    try {
      const supabase = createBrowserClient()
      const trimmed = displayName.trim()
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: trimmed || null },
      })
      if (updateError) throw updateError
      setNameMessage("Nombre guardado.")
      const token = await getAccessToken()
      const res = await fetch("/api/profile/me", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      })
      const payload = (await res.json()) as { success?: boolean; data?: ProfileMePayload }
      if (res.ok && payload.success && payload.data) {
        setCompleteness(payload.data.completeness)
      }
    } catch (e) {
      setNameMessage(e instanceof Error ? e.message : "No se pudo guardar el nombre")
    } finally {
      setSavingName(false)
    }
  }

  const handleAvatarFile = async (file: File | null) => {
    if (!file) return
    setAvatarMessage(null)
    setUploadingAvatar(true)
    try {
      const token = await getAccessToken()
      const body = new FormData()
      body.append("file", file)
      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      })
      const payload = (await res.json()) as {
        success?: boolean
        data?: { avatarUrl?: string }
        error?: string
      }
      if (!res.ok || !payload.success || !payload.data?.avatarUrl) {
        throw new Error(messageForHttpError(res.status, payload.error, res.statusText))
      }
      setAvatarUrl(payload.data.avatarUrl)
      setAvatarMessage("Foto actualizada.")
      const resMe = await fetch("/api/profile/me", {
        cache: "no-store",
        headers: { Authorization: `Bearer ${token}` },
      })
      const mePayload = (await resMe.json()) as { success?: boolean; data?: ProfileMePayload }
      if (resMe.ok && mePayload.success && mePayload.data) {
        setCompleteness(mePayload.data.completeness)
      }
      dispatchAvatarUpdated()
    } catch (e) {
      setAvatarMessage(e instanceof Error ? e.message : "No se pudo subir la foto")
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <div className="mx-auto min-w-0 max-w-2xl space-y-8 px-4 pb-16 pt-6 sm:px-6 sm:pt-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/configuracion"
          className="orbita-focus-ring inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium no-underline transition-colors hover:opacity-90"
          style={{ borderColor: theme.border, color: theme.textMuted }}
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
          Configuración
        </Link>
      </div>

      <header className="space-y-2">
        <div className="flex items-center gap-2" style={{ color: theme.accent.health }}>
          <Sparkles className="h-5 w-5 shrink-0" aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-[0.16em]">Tu espacio en Órvita</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl" style={{ color: theme.text }}>
          Hazlo sentir tuyo
        </h1>
        <p className="max-w-xl text-sm leading-relaxed" style={{ color: theme.textMuted }}>
          Un perfil con nombre y foto ayuda a que la app se sienta más cercana — y tu hogar puede tener su propia
          imagen desde Configuración.
        </p>
      </header>

      {loading ? (
        <p className="text-sm" style={{ color: theme.textMuted }}>
          Cargando…
        </p>
      ) : null}
      {error ? (
        <p className="text-sm" style={{ color: theme.accent.finance }}>
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <div className="space-y-8">
          <section
            className="rounded-2xl border p-6 sm:p-8"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04)",
            }}
            aria-labelledby="perfil-sentido-heading"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 id="perfil-sentido-heading" className="text-sm font-semibold" style={{ color: theme.text }}>
                  Sentido de pertenencia
                </h2>
                <p className="mt-1 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                  Cada detalle suma: nombre para mostrarte, tu foto y la imagen del hogar (en configuración) suben este
                  indicador.
                </p>
              </div>
              <div className="w-full max-w-[220px] shrink-0 space-y-2 sm:text-right">
                <p className="text-2xl font-semibold tabular-nums" style={{ color: theme.text }}>
                  {completeness}
                  <span className="text-sm font-medium opacity-70">%</span>
                </p>
                <div
                  className="h-2 w-full overflow-hidden rounded-full"
                  style={{ backgroundColor: theme.border }}
                  role="progressbar"
                  aria-valuenow={completeness}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Completitud del perfil"
                >
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${completeness}%`, backgroundColor: theme.accent.health }}
                  />
                </div>
              </div>
            </div>
          </section>

          <section
            className="rounded-2xl border p-6 sm:p-8"
            style={{
              backgroundColor: theme.surface,
              borderColor: theme.border,
              boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04)",
            }}
          >
            <h2 className="text-sm font-semibold" style={{ color: theme.text }}>
              Foto y nombre
            </h2>
            <p className="mt-2 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              Al elegir imagen se abre un recorte cuadrado antes de subirla (también verás tu foto en el botón del menú
              superior).
            </p>
            <div className="mt-6 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                <div
                  className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 text-lg font-semibold"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.surfaceAlt,
                    color: theme.text,
                  }}
                >
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" width={96} height={96} />
                  ) : (
                    <span aria-hidden>{(displayName || email || "?").slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <input
                  id={fileInputId}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(ev) => {
                    const f = ev.target.files?.[0] ?? null
                    ev.target.value = ""
                    if (f) {
                      setAvatarCropFile(f)
                      setAvatarCropOpen(true)
                    }
                  }}
                />
                <label
                  htmlFor={fileInputId}
                  className="orbita-focus-ring absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border shadow-sm"
                  style={{
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                  title="Cambiar foto"
                >
                  <Camera className="h-4 w-4" aria-hidden />
                  <span className="sr-only">Cambiar foto de perfil</span>
                </label>
              </div>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-xs" style={{ color: theme.textMuted }}>
                  Correo (solo lectura)
                </p>
                <p className="truncate text-sm font-medium" style={{ color: theme.text }}>
                  {email || "—"}
                </p>
                <label className="block text-xs font-medium" style={{ color: theme.textMuted }} htmlFor="perfil-nombre">
                  Nombre para mostrarte
                </label>
                <input
                  id="perfil-nombre"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full max-w-md rounded-xl border px-3 py-2 text-sm outline-none ring-teal-500/25 focus:ring-2"
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.surfaceAlt,
                    color: theme.text,
                  }}
                  placeholder="Ej. David"
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => void handleSaveName()}
                    disabled={savingName}
                    className="orbita-focus-ring inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition-opacity disabled:opacity-50"
                    style={{ borderColor: theme.border, color: theme.text }}
                  >
                    <Save className="h-3.5 w-3.5" aria-hidden />
                    {savingName ? "Guardando…" : "Guardar nombre"}
                  </button>
                  {uploadingAvatar ? (
                    <span className="text-xs" style={{ color: theme.textMuted }}>
                      Subiendo foto…
                    </span>
                  ) : null}
                </div>
                {nameMessage ? (
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    {nameMessage}
                  </p>
                ) : null}
                {avatarMessage ? (
                  <p className="text-xs" style={{ color: theme.textMuted }}>
                    {avatarMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </section>

          {householdFamilyPhotoUrl ? (
            <section
              className="rounded-2xl border p-6 sm:p-8"
              style={{
                backgroundColor: theme.surface,
                borderColor: theme.border,
                boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04)",
              }}
            >
              <h2 className="text-sm font-semibold" style={{ color: theme.text }}>
                Tu hogar en Órvita
              </h2>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                Ya hay una imagen familiar. Puedes cambiarla en{" "}
                <Link href="/configuracion" className="font-medium underline-offset-2 hover:underline" style={{ color: theme.text }}>
                  Configuración → Hogar y familia
                </Link>
                .
              </p>
              <div
                className="mt-4 h-72 overflow-hidden rounded-xl border sm:h-80 md:h-[22rem]"
                style={{ borderColor: theme.border }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={householdFamilyPhotoUrl}
                  alt="Imagen del hogar"
                  className="h-full w-full object-cover"
                />
              </div>
            </section>
          ) : (
            <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
              Suma la foto del hogar en{" "}
              <Link href="/configuracion" className="font-medium underline-offset-2 hover:underline" style={{ color: theme.text }}>
                Configuración
              </Link>{" "}
              para que todos identifiquen el espacio compartido.
            </p>
          )}
        </div>
      ) : null}

      <OrbitaImageCropDialog
        open={avatarCropOpen}
        onOpenChange={(v) => {
          setAvatarCropOpen(v)
          if (!v) setAvatarCropFile(null)
        }}
        file={avatarCropFile}
        aspect={1}
        title="Recortar foto de perfil"
        outputMaxWidth={640}
        onCropped={(cropped) => {
          void handleAvatarFile(cropped)
        }}
      />
    </div>
  )
}
