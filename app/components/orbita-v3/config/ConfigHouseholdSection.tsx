"use client"

import { useId } from "react"
import { ImagePlus, Users } from "lucide-react"
import type { HouseholdMemberDTO } from "@/lib/household/memberTypes"
import type { OrbitaConfigTheme } from "@/app/components/orbita-v3/config/configThemeTypes"

function memberInitials(displayName: string | null, email: string) {
  const name = (displayName || "").trim()
  const parts = name.split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase()
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  const local = (email.split("@")[0] || email || "?").trim()
  return local.slice(0, 2).toUpperCase() || "?"
}

const subtleButton =
  "rounded-lg border px-3 py-2 text-xs font-medium transition-opacity hover:opacity-90 disabled:opacity-50"

export function ConfigHouseholdSection({
  theme,
  householdInviteLoading,
  householdInviteCode,
  householdInviteError,
  inviteCopied,
  onCopyInvite,
  familyPhotoUrl,
  familyPhotoBusy,
  familyPhotoError,
  onPickFamilyPhoto,
  members,
  membersLoading,
  membersError,
  moduleCard = false,
  variant = "default" as "default" | "minimal",
  integratedLead = false,
}: {
  theme: OrbitaConfigTheme
  householdInviteLoading: boolean
  householdInviteCode: string | null
  householdInviteError: string | null
  inviteCopied: boolean
  onCopyInvite: () => void
  familyPhotoUrl: string | null
  familyPhotoBusy: boolean
  familyPhotoError: string | null
  onPickFamilyPhoto: (file: File) => void
  members: HouseholdMemberDTO[]
  membersLoading: boolean
  membersError: string | null
  /** Dentro de la tarjeta del módulo: sin título duplicado ni caja anidada. */
  moduleCard?: boolean
  /** Vista aligerada: cabecera visual compacta, texto mínimo y lista de miembros limpia. */
  variant?: "default" | "minimal"
  /** Títulos "Hogar" ya están en la tarjeta padre: compactar bloques. */
  integratedLead?: boolean
}) {
  const familyPhotoInputId = useId()
  const headingId = "config-household-heading"
  const isMinimal = variant === "minimal"
  const compact = isMinimal && integratedLead

  if (isMinimal) {
    return (
      <section className={compact ? "space-y-4" : "space-y-8"} aria-labelledby={headingId}>
        <span id={headingId} className="sr-only">
          Hogar y familia
        </span>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="m-0 text-sm font-medium tracking-tight" style={{ color: theme.textMuted }}>
              Imagen del hogar
            </p>
            <input
              id={familyPhotoInputId}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={familyPhotoBusy}
              onChange={(ev) => {
                const file = ev.target.files?.[0] ?? null
                ev.target.value = ""
                if (file) onPickFamilyPhoto(file)
              }}
            />
            <label
              htmlFor={familyPhotoInputId}
              className={`${subtleButton} inline-flex cursor-pointer items-center justify-center text-[11px]`}
              style={{
                borderColor: theme.border,
                color: theme.textMuted,
                backgroundColor: "transparent",
                opacity: familyPhotoBusy ? 0.55 : 1,
                pointerEvents: familyPhotoBusy ? "none" : "auto",
              }}
            >
              <ImagePlus className="h-3.5 w-3.5" aria-hidden />
              {familyPhotoBusy ? "…" : familyPhotoUrl ? "Cambiar" : "Añadir"}
            </label>
          </div>

          {familyPhotoUrl ? (
            <div
              className={`overflow-hidden rounded-2xl ${compact ? "h-56 sm:h-64" : "h-40 sm:h-48"}`}
              style={{ backgroundColor: theme.surfaceAlt }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={familyPhotoUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : (
            <div
              className={`flex items-center justify-center rounded-2xl border border-dashed ${compact ? "h-36 sm:h-40" : "h-28 sm:h-32"}`}
              style={{ borderColor: theme.border, color: theme.textMuted }}
            >
              <span className="text-xs">Sin imagen aún</span>
            </div>
          )}

          {familyPhotoError ? (
            <p className="m-0 text-xs" style={{ color: theme.accent.finance }}>
              {familyPhotoError}
            </p>
          ) : null}
        </div>

        <div className="space-y-3">
          <div>
            <p
              className={`m-0 font-light tracking-[-0.02em] ${compact ? "text-lg sm:text-xl" : "text-2xl sm:text-3xl"}`}
              style={{ color: theme.text }}
            >
              {compact ? "Invitación" : "Código"}
            </p>
            <p className="m-0 mt-1 text-sm" style={{ color: theme.textMuted }}>
              {compact ? "Un código al registrarse." : "Un único código. Lo pegan al crear cuenta."}
            </p>
          </div>

          {householdInviteLoading && (
            <p className="m-0 text-sm" style={{ color: theme.textMuted }}>
              Cargando…
            </p>
          )}
          {!householdInviteLoading && householdInviteCode && (
            <div className="flex flex-row items-stretch gap-2.5 sm:items-center sm:gap-3">
              <code
                className={`flex min-h-[44px] min-w-0 flex-1 items-center justify-center rounded-xl text-center font-medium tracking-[0.2em] ${compact ? "px-3 py-2.5 text-sm sm:text-base" : "rounded-2xl px-5 py-4 text-lg sm:text-xl"}`}
                style={{
                  backgroundColor: theme.surfaceAlt,
                  color: theme.text,
                  boxShadow: "inset 0 0 0 1px rgba(15, 23, 42, 0.06)",
                }}
              >
                {householdInviteCode}
              </code>
              <button
                type="button"
                className="shrink-0 rounded-lg px-4 py-2 text-xs font-semibold transition-opacity hover:opacity-90"
                style={{
                  backgroundColor: theme.accent.health,
                  color: "#fff",
                }}
                onClick={onCopyInvite}
              >
                {inviteCopied ? "Listo" : "Copiar"}
              </button>
            </div>
          )}
          {!householdInviteLoading && householdInviteError && (
            <p className="m-0 text-sm" style={{ color: theme.accent.finance }}>
              {householdInviteError}
            </p>
          )}
        </div>

        <div>
          <p className="m-0 text-xs font-medium uppercase tracking-[0.2em]" style={{ color: theme.textMuted }}>
            En el hogar
          </p>
          {membersLoading && (
            <p className="m-0 mt-4 text-sm" style={{ color: theme.textMuted }}>
              Cargando…
            </p>
          )}
          {!membersLoading && membersError && (
            <p className="m-0 mt-4 text-sm" style={{ color: theme.accent.finance }}>
              {membersError}
            </p>
          )}
          {!membersLoading && !membersError && members.length === 0 && (
            <p className="m-0 mt-4 text-sm" style={{ color: theme.textMuted }}>
              Aún no hay miembros.
            </p>
          )}
          {!membersLoading && members.length > 0 && (
            <ul
              className="m-0 mt-5 list-none space-y-0 divide-y p-0"
              style={{ borderColor: theme.border }}
              aria-label="Miembros del hogar"
            >
              {members.map((m) => {
                const label = m.displayName || m.email || "Miembro"
                return (
                  <li key={m.id} className="flex items-center gap-3 py-3 first:pt-0">
                    <div
                      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold ${compact ? "h-10 w-10 text-[11px]" : "h-8 w-8 text-[10px]"}`}
                      style={{
                        backgroundColor: theme.surfaceAlt,
                        color: theme.text,
                      }}
                      aria-hidden
                    >
                      {m.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={m.avatarUrl}
                          alt=""
                          className="h-full w-full object-cover"
                          width={40}
                          height={40}
                        />
                      ) : (
                        memberInitials(m.displayName, m.email)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: theme.text }}>
                        {label}
                      </p>
                    </div>
                    {m.isOwner ? (
                      <span className="shrink-0 text-[11px] font-medium" style={{ color: theme.textMuted }}>
                        Admin
                      </span>
                    ) : (
                      <span className="shrink-0 text-[11px] font-medium" style={{ color: theme.textMuted }}>
                        Miembro
                      </span>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3" aria-labelledby={headingId}>
      {!moduleCard ? (
        <h3
          id={headingId}
          className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em]"
          style={{ color: theme.textMuted }}
        >
          <Users className="h-4 w-4 shrink-0" aria-hidden />
          Hogar y familia
        </h3>
      ) : (
        <span id={headingId} className="sr-only">
          Hogar y familia
        </span>
      )}

      <div
        className={moduleCard ? "space-y-0" : "rounded-2xl border p-5 sm:p-6"}
        style={
          moduleCard
            ? undefined
            : {
                backgroundColor: theme.surface,
                borderColor: theme.border,
                boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04)",
              }
        }
      >
        <p className="text-sm font-medium" style={{ color: theme.text }}>
          Código de invitación al hogar
        </p>
        <p className="mt-2 max-w-2xl text-xs leading-relaxed" style={{ color: theme.textMuted }}>
          Es único para tu hogar. Compártelo por WhatsApp o correo: quien se registre debe pegarlo al{" "}
          <strong className="font-medium" style={{ color: theme.text }}>
            crear cuenta
          </strong>{" "}
          para unirse al mismo hogar (agenda y capital compartidos).
        </p>

        {householdInviteLoading && (
          <p className="mt-4 text-xs" style={{ color: theme.textMuted }}>
            Cargando código…
          </p>
        )}
        {!householdInviteLoading && householdInviteCode && (
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <code
              className="rounded-xl border px-4 py-2.5 text-base font-semibold tracking-[0.2em] sm:text-lg"
              style={{
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                color: theme.text,
              }}
            >
              {householdInviteCode}
            </code>
            <button
              type="button"
              className={subtleButton}
              style={{ borderColor: theme.border, color: theme.text }}
              onClick={onCopyInvite}
            >
              {inviteCopied ? "Copiado" : "Copiar código"}
            </button>
          </div>
        )}
        {!householdInviteLoading && householdInviteCode && (
          <p className="mt-3 text-[11px] leading-relaxed" style={{ color: theme.textMuted }}>
            Comparte el código de invitación para que otros se unan al hogar.
          </p>
        )}
        {!householdInviteLoading && householdInviteError && (
          <p className="mt-4 text-xs" style={{ color: theme.accent.finance }}>
            {householdInviteError}
          </p>
        )}

        <div className="mt-7 border-t pt-5" style={{ borderColor: theme.border }}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold tracking-tight" style={{ color: theme.text }}>
                Imagen del hogar
              </p>
              <p className="mt-2 max-w-xl text-xs leading-relaxed" style={{ color: theme.textMuted }}>
                Una foto familiar o símbolo compartido: refuerza la identidad del hogar en Órvita (visible para quienes
                comparten este espacio). Al elegir archivo podrás{" "}
                <strong className="font-medium" style={{ color: theme.text }}>
                  recortar y encuadrar
                </strong>{" "}
                antes de subirla.
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
              <input
                id={familyPhotoInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                disabled={familyPhotoBusy}
                onChange={(ev) => {
                  const file = ev.target.files?.[0] ?? null
                  ev.target.value = ""
                  if (file) onPickFamilyPhoto(file)
                }}
              />
              <label
                htmlFor={familyPhotoInputId}
                className={`${subtleButton} inline-flex cursor-pointer items-center justify-center gap-2`}
                style={{
                  borderColor: theme.border,
                  color: theme.text,
                  opacity: familyPhotoBusy ? 0.55 : 1,
                  pointerEvents: familyPhotoBusy ? "none" : "auto",
                }}
              >
                <ImagePlus className="h-3.5 w-3.5" aria-hidden />
                {familyPhotoBusy ? "Subiendo…" : familyPhotoUrl ? "Cambiar imagen" : "Añadir imagen"}
              </label>
            </div>
          </div>

          {familyPhotoError ? (
            <p className="mt-3 text-xs" style={{ color: theme.accent.finance }}>
              {familyPhotoError}
            </p>
          ) : null}

          {familyPhotoUrl ? (
            <div
              className="mt-3 h-52 overflow-hidden rounded-xl border sm:h-60 md:h-64"
              style={{ borderColor: theme.border, backgroundColor: theme.surfaceAlt }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={familyPhotoUrl} alt="Imagen del hogar" className="h-full w-full object-cover" />
            </div>
          ) : (
            <p className="mt-4 text-xs" style={{ color: theme.textMuted }}>
              Aún no hay imagen del hogar.
            </p>
          )}

          <p className="mt-6 text-sm font-semibold tracking-tight" style={{ color: theme.text }}>
            Miembros del hogar actual
          </p>

          {membersLoading && (
            <p className="mt-4 text-xs" style={{ color: theme.textMuted }}>
              Cargando miembros…
            </p>
          )}
          {!membersLoading && membersError && (
            <p className="mt-4 text-xs" style={{ color: theme.accent.finance }}>
              {membersError}
            </p>
          )}
          {!membersLoading && !membersError && members.length === 0 && (
            <p className="mt-4 text-xs" style={{ color: theme.textMuted }}>
              No hay miembros listados.
            </p>
          )}
          {!membersLoading && members.length > 0 && (
            <ul className="mt-4 space-y-2" aria-label="Lista de miembros del hogar">
              {members.map((m) => {
                const label = m.displayName || m.email || "Miembro"
                const secondary = m.displayName ? m.email : null
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
                    style={{
                      borderColor: theme.border,
                      backgroundColor: theme.surfaceAlt,
                    }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-[11px] font-semibold"
                      style={{
                        backgroundColor: theme.border,
                        color: theme.text,
                      }}
                      aria-hidden
                    >
                      {m.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={m.avatarUrl} alt="" className="h-full w-full object-cover" width={40} height={40} />
                      ) : (
                        memberInitials(m.displayName, m.email)
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium" style={{ color: theme.text }}>
                        {label}
                      </p>
                      {secondary ? (
                        <p className="truncate text-xs" style={{ color: theme.textMuted }}>
                          {secondary}
                        </p>
                      ) : null}
                    </div>
                    {m.isOwner ? (
                      <span
                        className="shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide"
                        style={{
                          backgroundColor: theme.surface,
                          color: theme.textMuted,
                          border: `1px solid ${theme.border}`,
                        }}
                      >
                        Administrador
                      </span>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </section>
  )
}
