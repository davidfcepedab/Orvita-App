/** Disparar tras guardar foto de perfil para refrescar cromo (header, etc.). */
export const ORVITA_AVATAR_UPDATED_EVENT = "orvita:avatar-updated"

export function dispatchAvatarUpdated() {
  if (typeof window === "undefined") return
  window.dispatchEvent(new Event(ORVITA_AVATAR_UPDATED_EVENT))
}
