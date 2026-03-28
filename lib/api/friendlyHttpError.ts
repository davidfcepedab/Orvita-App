/**
 * Mensaje unificado en cliente cuando la API responde 401 (sesión ausente o token inválido).
 */
export const AUTH_REQUIRED_MESSAGE = "Inicia sesión para ver tus datos reales."

/**
 * Construye un mensaje legible a partir del status HTTP y el cuerpo de error de la API.
 */
export function messageForHttpError(
  status: number,
  bodyError?: string | null,
  statusText?: string | null,
): string {
  if (status === 401) return AUTH_REQUIRED_MESSAGE
  const trimmed = typeof bodyError === "string" ? bodyError.trim() : ""
  if (trimmed) return trimmed
  const st = typeof statusText === "string" ? statusText.trim() : ""
  if (st) return `${st} (${status})`
  return `No se pudo completar la solicitud (${status}).`
}
