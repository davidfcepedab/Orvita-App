/**
 * Origen canónico del sitio (un solo dominio en producción: orvita.app).
 *
 * - Producción: define `NEXT_PUBLIC_SITE_URL=https://orvita.app` en Vercel.
 * - Previews: si no hay variable, usa `VERCEL_URL` (dominio del despliegue).
 * - Local: sin ambas, cae en orvita.app solo para metadatos; no afecta fetch.
 */
export function siteOrigin(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, "")

  const vercel = process.env.VERCEL_URL?.trim()
  if (vercel) {
    const host = vercel.replace(/^https?:\/\//i, "")
    return `https://${host}`
  }

  return "https://orvita.app"
}
