"use client"

import { Users } from "lucide-react"
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
  members,
  membersLoading,
  membersError,
}: {
  theme: OrbitaConfigTheme
  householdInviteLoading: boolean
  householdInviteCode: string | null
  householdInviteError: string | null
  inviteCopied: boolean
  onCopyInvite: () => void
  members: HouseholdMemberDTO[]
  membersLoading: boolean
  membersError: string | null
}) {
  return (
    <section className="space-y-4" aria-labelledby="config-household-heading">
      <h3
        id="config-household-heading"
        className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.14em]"
        style={{ color: theme.textMuted }}
      >
        <Users className="h-4 w-4 shrink-0" aria-hidden />
        Hogar y familia
      </h3>

      <div
        className="rounded-2xl border p-6 sm:p-8"
        style={{
          backgroundColor: theme.surface,
          borderColor: theme.border,
          boxShadow: "0 1px 0 rgba(15, 23, 42, 0.04)",
        }}
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
          <div className="mt-5 flex flex-wrap items-center gap-3">
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

        <div className="mt-10 border-t pt-8" style={{ borderColor: theme.border }}>
          <p className="text-sm font-semibold tracking-tight" style={{ color: theme.text }}>
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
            <ul className="mt-5 space-y-3" aria-label="Lista de miembros del hogar">
              {members.map((m) => {
                const label = m.displayName || m.email || "Miembro"
                const secondary = m.displayName ? m.email : null
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-4 rounded-xl border px-4 py-3"
                    style={{
                      borderColor: theme.border,
                      backgroundColor: theme.surfaceAlt,
                    }}
                  >
                    <div
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
                      style={{
                        backgroundColor: theme.border,
                        color: theme.text,
                      }}
                      aria-hidden
                    >
                      {memberInitials(m.displayName, m.email)}
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
